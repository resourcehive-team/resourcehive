import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { BookingEventV1 } from "@resourcehive/notification-client";
import { AccessTokenVerifier, extractAccessToken } from "@resourcehive/service-auth";
import { Server, Socket } from "socket.io";

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function userRoom(userId: string): string {
  return `user:${userId}`;
}

function resourceRoom(resourceId: string): string {
  return `resource:${resourceId}`;
}

@WebSocketGateway({
  path: "/realtime/socket.io",
  cors: {
    origin: allowedOrigins(),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(private readonly verifier: AccessTokenVerifier) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = extractAccessToken({ headers: client.handshake.headers });
      const user = await this.verifier.verify(token);
      client.data.userId = user.userId;
      await client.join(userRoom(user.userId));
    } catch (error) {
      this.logger.warn(
        `Rejecting unauthenticated realtime connection: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      client.disconnect(true);
    }
  }

  @SubscribeMessage("resource.watch")
  handleWatchResource(client: Socket, resourceId: unknown): void {
    if (typeof resourceId !== "string" || !resourceId) return;
    void client.join(resourceRoom(resourceId));
  }

  @SubscribeMessage("resource.unwatch")
  handleUnwatchResource(client: Socket, resourceId: unknown): void {
    if (typeof resourceId !== "string" || !resourceId) return;
    void client.leave(resourceRoom(resourceId));
  }

  emitBookingEvent(event: BookingEventV1): void {
    const message = {
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      payload: event.payload,
    };
    this.server.to(resourceRoom(event.payload.resourceId)).emit("booking.event", message);
    if (event.payload.userId) {
      this.server.to(userRoom(event.payload.userId)).emit("booking.event", message);
    }
  }
}
