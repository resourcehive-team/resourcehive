import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaService } from "@resourcehive/database";
import {
  AccessTokenVerifier,
  AuthenticatedUser,
} from "@resourcehive/service-auth";
import { io, Socket } from "socket.io-client";
import { AppModule } from "../src/app.module";

describe("Notification WebSocket authentication (e2e)", () => {
  let app: INestApplication;
  let baseUrl: string;
  const sockets: Socket[] = [];
  const authenticatedUser: AuthenticatedUser = {
    userId: "00000000-0000-4000-8000-000000000003",
    email: "user@example.edu",
    organizationId: "00000000-0000-4000-8000-000000000002",
    role: "member",
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: authenticatedUser.userId }),
        },
      })
      .overrideProvider(AccessTokenVerifier)
      .useValue({
        verify: jest.fn((token: string) => {
          if (token !== "valid-token") throw new Error("invalid");
          return Promise.resolve(authenticatedUser);
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, "127.0.0.1");
    baseUrl = `${await app.getUrl()}/notifications`;
  });

  it("connects an active user and receives the readiness event", async () => {
    const socket = createClient("valid-token");
    const payload = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        socket.on("notification.connection.ready", resolve);
        socket.on("connect_error", reject);
      },
    );

    expect(payload).toMatchObject({
      eventType: "notification.connection.ready",
      eventVersion: 1,
    });
  });

  it("rejects a connection with an invalid token generically", async () => {
    const socket = createClient("invalid-token");
    const error = await new Promise<Error>((resolve) => {
      socket.on("connect_error", resolve);
    });
    expect(error.message).toBe("Authentication failed");
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await app.close();
  });

  function createClient(token: string): Socket {
    const socket = io(baseUrl, {
      path: "/notifications/socket.io",
      transports: ["websocket"],
      reconnection: false,
      auth: { token },
    });
    sockets.push(socket);
    return socket;
  }
});
