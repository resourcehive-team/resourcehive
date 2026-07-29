import { AccessTokenVerifier } from "@resourcehive/service-auth";
import { NotificationRepository } from "../notifications/notification.repository";
import { NotificationGateway } from "./notification.gateway";
import { AuthenticatedNotificationSocket } from "./notification-websocket.types";

describe("NotificationGateway", () => {
  const verifier = { verify: jest.fn() } as unknown as AccessTokenVerifier;
  const notifications = {
    isActiveUser: jest.fn(),
  } as unknown as NotificationRepository;
  const gateway = new NotificationGateway(verifier, notifications);
  let middleware:
    | ((
        socket: AuthenticatedNotificationSocket,
        next: (error?: Error) => void,
      ) => void)
    | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = undefined;
    gateway.afterInit({
      use: (
        handler: (
          socket: AuthenticatedNotificationSocket,
          next: (error?: Error) => void,
        ) => void,
      ) => {
        middleware = handler;
      },
    } as never);
  });

  function runMiddleware(
    socket: AuthenticatedNotificationSocket,
  ): Promise<Error | undefined> {
    return new Promise((resolve) => {
      middleware?.(socket, (error) => resolve(error));
    });
  }

  it("authenticates an active user and assigns only the private user room", async () => {
    const identity = {
      userId: "user-id",
      email: "user@example.edu",
      organizationId: "organization-id",
      role: "member",
    };
    const verify = jest.spyOn(verifier, "verify").mockResolvedValue(identity);
    const active = jest
      .spyOn(notifications, "isActiveUser")
      .mockResolvedValue(true);
    const socket = createSocket("valid-token");
    const error = await runMiddleware(socket.client);
    await gateway.handleConnection(socket.client);

    expect(verify).toHaveBeenCalledWith("valid-token");
    expect(active).toHaveBeenCalledWith("user-id");
    expect(error).toBeUndefined();
    expect(socket.join).toHaveBeenCalledWith("user:user-id");
    expect(socket.emit).toHaveBeenCalledWith(
      "notification.connection.ready",
      expect.objectContaining({
        eventType: "notification.connection.ready",
        eventVersion: 1,
      }),
    );
  });

  it("rejects a connection without a handshake token", async () => {
    const socket = createSocket(undefined);
    const error = await runMiddleware(socket.client);

    expect(error).toEqual(new Error("Authentication failed"));
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens with the generic connection error", async () => {
    jest
      .spyOn(verifier, "verify")
      .mockRejectedValue(new Error("expired token"));
    const socket = createSocket("secret-token-value");
    const error = await runMiddleware(socket.client);

    expect(error).toEqual(new Error("Authentication failed"));
  });

  it("rejects a suspended user even when the token is valid", async () => {
    jest.spyOn(verifier, "verify").mockResolvedValue({
      userId: "suspended-user",
      email: "user@example.edu",
      organizationId: null,
      role: null,
    });
    jest.spyOn(notifications, "isActiveUser").mockResolvedValue(false);
    const socket = createSocket("valid-token");
    const error = await runMiddleware(socket.client);

    expect(error).toEqual(new Error("Authentication failed"));
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("supports independent sockets for the same authenticated user", async () => {
    const first = createSocket("first-token", "socket-1");
    const second = createSocket("second-token", "socket-2");
    jest.spyOn(verifier, "verify").mockResolvedValue({
      userId: "user-id",
      email: "user@example.edu",
      organizationId: null,
      role: null,
    });
    jest.spyOn(notifications, "isActiveUser").mockResolvedValue(true);

    await runMiddleware(first.client);
    await runMiddleware(second.client);
    await gateway.handleConnection(first.client);
    await gateway.handleConnection(second.client);

    expect(first.join).toHaveBeenCalledWith("user:user-id");
    expect(second.join).toHaveBeenCalledWith("user:user-id");
    gateway.handleDisconnect(first.client);
    expect(second.disconnect).not.toHaveBeenCalled();
  });
});

function createSocket(
  token?: string,
  id = "socket-id",
): {
  client: AuthenticatedNotificationSocket;
  join: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
} {
  const join = jest.fn().mockResolvedValue(undefined);
  const emit = jest.fn();
  const disconnect = jest.fn();
  const client = {
    id,
    handshake: { auth: token === undefined ? {} : { token } },
    data: {},
    join,
    emit,
    disconnect,
  } as unknown as AuthenticatedNotificationSocket;
  return { client, join, emit, disconnect };
}
