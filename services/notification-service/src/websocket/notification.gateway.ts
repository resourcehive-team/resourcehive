import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import {
  AccessTokenVerifier,
  AuthenticatedUser,
} from "@resourcehive/service-auth";
import { Server } from "socket.io";
import { NotificationRepository } from "../notifications/notification.repository";
import {
  AuthenticatedNotificationSocket,
  NotificationServerEvents,
  NotificationSocketData,
} from "./notification-websocket.types";

type NotificationServer = Server<
  Record<string, never>,
  NotificationServerEvents,
  Record<string, never>,
  NotificationSocketData
>;

const websocketOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

@WebSocketGateway({
  namespace: "/notifications",
  path: "/notifications/socket.io",
  transports: ["websocket"],
  cors: { origin: websocketOrigins },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: NotificationServer;

  constructor(
    private readonly verifier: AccessTokenVerifier,
    private readonly notifications: NotificationRepository,
  ) {}

  afterInit(server: NotificationServer): void {
    server.use((socket, next) => {
      void this.authenticate(socket)
        .then((user) => {
          socket.data.authenticatedUser = user;
          next();
        })
        .catch(() => {
          this.logger.warn(`Rejected notification socket ${socket.id}`);
          next(new Error("Authentication failed"));
        });
    });
  }

  async handleConnection(
    client: AuthenticatedNotificationSocket,
  ): Promise<void> {
    const user = client.data.authenticatedUser;
    if (!user) {
      client.disconnect(true);
      return;
    }

    await client.join(this.roomFor(user.userId));
    client.emit("notification.connection.ready", {
      eventType: "notification.connection.ready",
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
    });
    this.logger.log(`Authenticated notification socket ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedNotificationSocket): void {
    this.logger.log(`Disconnected notification socket ${client.id}`);
  }

  emitCreated(
    userId: string,
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      createdAt: Date;
    },
  ): void {
    this.server.to(this.roomFor(userId)).emit("notification.created", {
      eventType: "notification.created",
      eventVersion: 1,
      occurredAt: new Date().toISOString(),
      notification: {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  }

  private async authenticate(
    socket: AuthenticatedNotificationSocket,
  ): Promise<AuthenticatedUser> {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token.trim()) {
      throw new Error("Authentication failed");
    }

    const user = await this.verifier.verify(token);
    if (!(await this.notifications.isActiveUser(user.userId))) {
      throw new Error("Authentication failed");
    }
    return user;
  }

  private roomFor(userId: string): string {
    return `user:${userId}`;
  }
}
