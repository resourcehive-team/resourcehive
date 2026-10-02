import { UnauthorizedException } from "@nestjs/common";
import { AccessTokenVerifier } from "@resourcehive/service-auth";
import { RealtimeGateway } from "./realtime.gateway";

function fakeSocket(headers: Record<string, string> = {}) {
  return {
    handshake: { headers },
    data: {} as Record<string, unknown>,
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  };
}

describe("RealtimeGateway", () => {
  const verify = jest.fn();
  const gateway = new RealtimeGateway({
    verify,
  } as unknown as AccessTokenVerifier);
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));
  (gateway as unknown as { server: unknown }).server = { to };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("joins the caller's user room once authenticated via cookie", async () => {
    verify.mockResolvedValue({ userId: "user-1", email: "a@b.edu" });
    const socket = fakeSocket({
      cookie: "resourcehive_access_token=good-token",
    });

    await gateway.handleConnection(socket as never);

    expect(verify).toHaveBeenCalledWith("good-token");
    expect(socket.join).toHaveBeenCalledWith("user:user-1");
    expect(socket.disconnect).not.toHaveBeenCalled();
  });

  it("disconnects sockets that fail authentication", async () => {
    verify.mockRejectedValue(new UnauthorizedException());
    const socket = fakeSocket({ cookie: "resourcehive_access_token=bad" });

    await gateway.handleConnection(socket as never);

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it("disconnects sockets with no credentials at all", async () => {
    const socket = fakeSocket();

    await gateway.handleConnection(socket as never);

    expect(verify).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it("joins and leaves a resource room on request", () => {
    const socket = fakeSocket();

    gateway.handleWatchResource(socket as never, "resource-1");
    expect(socket.join).toHaveBeenCalledWith("resource:resource-1");

    gateway.handleUnwatchResource(socket as never, "resource-1");
    expect(socket.leave).toHaveBeenCalledWith("resource:resource-1");
  });

  it("ignores non-string resource ids", () => {
    const socket = fakeSocket();

    gateway.handleWatchResource(socket as never, 42);

    expect(socket.join).not.toHaveBeenCalled();
  });

  it("joins and leaves an organization room on request", () => {
    const socket = fakeSocket();

    gateway.handleWatchOrganization(socket as never, "org-1");
    expect(socket.join).toHaveBeenCalledWith("organization:org-1");

    gateway.handleUnwatchOrganization(socket as never, "org-1");
    expect(socket.leave).toHaveBeenCalledWith("organization:org-1");
  });

  it("ignores non-string organization ids", () => {
    const socket = fakeSocket();

    gateway.handleWatchOrganization(socket as never, 42);

    expect(socket.join).not.toHaveBeenCalled();
  });

  it("fans a booking event out to the resource, organization, and recipient rooms", () => {
    gateway.emitBookingEvent({
      kind: "booking.event",
      eventId: "event-1",
      eventType: "booking.confirmed",
      eventVersion: 1,
      producer: "booking-service",
      correlationId: "booking-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: {
        rootOrganizationId: "root-1",
        bookingId: "booking-1",
        userId: "user-1",
        resourceId: "resource-1",
        resourceName: "Robotics Lab",
        organizationId: "org-1",
        startsAt: "2026-01-01T10:00:00.000Z",
      },
    });

    expect(to).toHaveBeenCalledWith("resource:resource-1");
    expect(to).toHaveBeenCalledWith("organization:org-1");
    expect(to).toHaveBeenCalledWith("user:user-1");
    expect(emit).toHaveBeenCalledTimes(3);
  });

  it("only fans out to resource and organization rooms when no recipient user is present", () => {
    gateway.emitBookingEvent({
      kind: "booking.event",
      eventId: "event-2",
      eventType: "slot.created",
      eventVersion: 1,
      producer: "booking-service",
      correlationId: "slot-1",
      occurredAt: "2026-01-01T00:00:00.000Z",
      payload: {
        rootOrganizationId: "root-1",
        slotId: "slot-1",
        resourceId: "resource-1",
        resourceName: "Robotics Lab",
        organizationId: "org-1",
        startsAt: "2026-01-01T10:00:00.000Z",
      },
    });

    expect(to).toHaveBeenCalledWith("resource:resource-1");
    expect(to).toHaveBeenCalledWith("organization:org-1");
    expect(to).not.toHaveBeenCalledWith(expect.stringMatching(/^user:/));
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
