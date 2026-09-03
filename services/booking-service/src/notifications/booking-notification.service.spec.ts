import { PrismaService } from "@resourcehive/database";
import { NotificationClientService } from "@resourcehive/notification-client";
import { BookingNotificationService } from "./booking-notification.service";

describe("BookingNotificationService", () => {
  const findUser = jest.fn();
  const findAdministrators = jest.fn();
  const send = jest.fn();
  const prisma = {
    user: { findUnique: findUser },
    organizationMembership: { findMany: findAdministrators },
  } as unknown as PrismaService;
  const service = new BookingNotificationService(prisma, {
    send,
  } as unknown as NotificationClientService);
  const booking = {
    bookingId: "booking-id",
    userId: "student-id",
    studentEmail: "student@example.edu",
    resourceName: "Robotics Lab",
    startsAt: new Date("2030-08-01T10:00:00.000Z"),
    ownerOrganizationId: "organization-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findUser.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === "student-id"
          ? {
              firstName: "Alice",
              lastName: "Perera",
              email: "student@example.edu",
            }
          : {
              firstName: "Admin",
              lastName: "User",
              email: "admin@example.edu",
            },
      ),
    );
    findAdministrators.mockResolvedValue([
      { userId: "admin-id" },
      { userId: "other-admin-id" },
    ]);
    send.mockResolvedValue({});
  });

  it("notifies the student and administrators when a booking is confirmed", async () => {
    await service.bookingConfirmed(booking);

    expect(send).toHaveBeenCalledWith({
      recipientUserId: "student-id",
      title: "Booking confirmed",
      message:
        "Your booking for Robotics Lab on 2030-08-01T10:00:00.000Z has been confirmed.",
      correlationId: "booking-id",
      channels: ["IN_APP", "PUSH"],
    });
    expect(send).toHaveBeenCalledWith({
      recipientUserId: "admin-id",
      title: "New booking",
      message: "Alice Perera booked Robotics Lab for 2030-08-01T10:00:00.000Z.",
      correlationId: "booking-id",
      channels: ["IN_APP", "PUSH"],
    });
  });

  it("notifies the student and administrators when the student cancels", async () => {
    await service.bookingCancelled({
      ...booking,
      actorUserId: "student-id",
      cancelledByUser: true,
      reason: "Plans changed",
      refundPoints: 13,
      slotStatus: "PUBLISHED",
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "student-id",
        title: "Booking cancelled",
        message:
          "Your booking for Robotics Lab on 2030-08-01T10:00:00.000Z was cancelled. Reason: Plans changed. 13 points were refunded.",
        channels: ["IN_APP", "PUSH"],
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "admin-id",
        title: "Booking cancelled by user",
        message:
          "Alice Perera cancelled their booking for Robotics Lab on 2030-08-01T10:00:00.000Z. Reason: Plans changed.",
        channels: ["IN_APP", "PUSH"],
      }),
    );
  });

  it("notifies the student and other administrators after an admin cancellation", async () => {
    await service.bookingCancelled({
      ...booking,
      actorUserId: "admin-id",
      cancelledByUser: false,
      reason: "Resource unavailable",
      refundPoints: 25,
      slotStatus: "WITHDRAWN",
    });

    expect(findAdministrators).toHaveBeenCalledWith({
      where: {
        organizationId: "organization-id",
        role: "ADMIN",
        status: "APPROVED",
        userId: { notIn: ["admin-id"] },
      },
      select: { userId: true },
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "student-id",
        title: "Booking cancelled by administrator",
        channels: ["IN_APP", "PUSH"],
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "other-admin-id",
        title: "Booking cancelled",
        message:
          "The booking for Alice Perera and Robotics Lab was cancelled by Admin User. The slot is now WITHDRAWN.",
        channels: ["IN_APP"],
      }),
    );
  });

  it("notifies the student and other administrators after completion", async () => {
    await service.bookingCompleted({ ...booking, actorUserId: "admin-id" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "student-id",
        title: "Booking completed",
        channels: ["IN_APP", "PUSH"],
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "other-admin-id",
        title: "Booking completed",
        message:
          "The booking for Alice Perera and Robotics Lab was completed by Admin User.",
        channels: ["IN_APP"],
      }),
    );
  });

  it("notifies other administrators when a slot is created", async () => {
    await service.slotCreated({
      slotId: "slot-id",
      actorUserId: "admin-id",
      resourceName: "Robotics Lab",
      startsAt: new Date("2030-08-01T10:00:00.000Z"),
      endsAt: new Date("2030-08-01T11:00:00.000Z"),
      ownerOrganizationId: "organization-id",
    });

    expect(send).toHaveBeenCalledWith({
      recipientUserId: "other-admin-id",
      title: "Slot created",
      message:
        "A slot for Robotics Lab from 2030-08-01T10:00:00.000Z to 2030-08-01T11:00:00.000Z was created by Admin User.",
      correlationId: "slot-id",
      channels: ["IN_APP"],
    });
  });

  it("does not fail a booking operation when notification publishing fails", async () => {
    send.mockRejectedValue(new Error("Kafka unavailable"));

    await expect(service.bookingConfirmed(booking)).resolves.toBeUndefined();
  });
});
