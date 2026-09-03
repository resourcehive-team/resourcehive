import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { NotificationClientService } from "@resourcehive/notification-client";

interface BookingNotificationInput {
  bookingId: string;
  userId: string;
  studentEmail: string;
  resourceName: string;
  startsAt: Date;
  ownerOrganizationId: string;
}

interface BookingCancellationNotificationInput extends BookingNotificationInput {
  actorUserId: string;
  cancelledByUser: boolean;
  reason?: string;
  refundPoints: number;
  slotStatus: string;
}

interface BookingCompletionNotificationInput extends BookingNotificationInput {
  actorUserId: string;
}

interface SlotCreatedNotificationInput {
  slotId: string;
  actorUserId: string;
  resourceName: string;
  startsAt: Date;
  endsAt: Date;
  ownerOrganizationId: string;
}

@Injectable()
export class BookingNotificationService {
  private readonly logger = new Logger(BookingNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationClientService,
  ) {}

  async bookingConfirmed(input: BookingNotificationInput): Promise<void> {
    await this.safelyNotify(
      "booking confirmation",
      input.bookingId,
      async () => {
        const studentName = await this.userDisplayName(
          input.userId,
          input.studentEmail,
        );
        const time = input.startsAt.toISOString();
        await Promise.all([
          this.send(
            input.userId,
            "Booking confirmed",
            `Your booking for ${input.resourceName} on ${time} has been confirmed.`,
            input.bookingId,
            ["IN_APP", "PUSH"],
          ),
          this.sendToAdministrators(
            input.ownerOrganizationId,
            [],
            "New booking",
            `${studentName} booked ${input.resourceName} for ${time}.`,
            input.bookingId,
            ["IN_APP", "PUSH"],
          ),
        ]);
      },
    );
  }

  async bookingCancelled(
    input: BookingCancellationNotificationInput,
  ): Promise<void> {
    await this.safelyNotify(
      "booking cancellation",
      input.bookingId,
      async () => {
        const studentName = await this.userDisplayName(
          input.userId,
          input.studentEmail,
        );
        const time = input.startsAt.toISOString();
        const reason = this.reasonText(input.reason);
        const studentMessage = input.cancelledByUser
          ? `Your booking for ${input.resourceName} on ${time} was cancelled.${reason} ${input.refundPoints} points were refunded.`
          : `Your booking for ${input.resourceName} on ${time} was cancelled by an administrator.${reason} ${input.refundPoints} points were refunded.`;

        const studentNotification = this.send(
          input.userId,
          input.cancelledByUser
            ? "Booking cancelled"
            : "Booking cancelled by administrator",
          studentMessage,
          input.bookingId,
          ["IN_APP", "PUSH"],
        );

        if (input.cancelledByUser) {
          await Promise.all([
            studentNotification,
            this.sendToAdministrators(
              input.ownerOrganizationId,
              [],
              "Booking cancelled by user",
              `${studentName} cancelled their booking for ${input.resourceName} on ${time}.${reason}`,
              input.bookingId,
              ["IN_APP", "PUSH"],
            ),
          ]);
          return;
        }

        const adminName = await this.userDisplayName(
          input.actorUserId,
          "An administrator",
        );
        await Promise.all([
          studentNotification,
          this.sendToAdministrators(
            input.ownerOrganizationId,
            [input.actorUserId],
            "Booking cancelled",
            `The booking for ${studentName} and ${input.resourceName} was cancelled by ${adminName}. The slot is now ${input.slotStatus}.`,
            input.bookingId,
            ["IN_APP"],
          ),
        ]);
      },
    );
  }

  async bookingCompleted(
    input: BookingCompletionNotificationInput,
  ): Promise<void> {
    await this.safelyNotify("booking completion", input.bookingId, async () => {
      const [studentName, adminName] = await Promise.all([
        this.userDisplayName(input.userId, input.studentEmail),
        this.userDisplayName(input.actorUserId, "An administrator"),
      ]);
      const time = input.startsAt.toISOString();
      await Promise.all([
        this.send(
          input.userId,
          "Booking completed",
          `Your booking for ${input.resourceName} on ${time} has been marked as completed.`,
          input.bookingId,
          ["IN_APP", "PUSH"],
        ),
        this.sendToAdministrators(
          input.ownerOrganizationId,
          [input.actorUserId],
          "Booking completed",
          `The booking for ${studentName} and ${input.resourceName} was completed by ${adminName}.`,
          input.bookingId,
          ["IN_APP"],
        ),
      ]);
    });
  }

  async slotCreated(input: SlotCreatedNotificationInput): Promise<void> {
    await this.safelyNotify("slot creation", input.slotId, async () => {
      const adminName = await this.userDisplayName(
        input.actorUserId,
        "An administrator",
      );
      await this.sendToAdministrators(
        input.ownerOrganizationId,
        [input.actorUserId],
        "Slot created",
        `A slot for ${input.resourceName} from ${input.startsAt.toISOString()} to ${input.endsAt.toISOString()} was created by ${adminName}.`,
        input.slotId,
        ["IN_APP"],
      );
    });
  }

  private async sendToAdministrators(
    organizationId: string,
    excludedUserIds: string[],
    title: string,
    message: string,
    correlationId: string,
    channels: Array<"IN_APP" | "PUSH">,
  ): Promise<void> {
    const administrators = await this.prisma.organizationMembership.findMany({
      where: {
        organizationId,
        role: "ADMIN",
        status: "APPROVED",
        ...(excludedUserIds.length > 0
          ? { userId: { notIn: excludedUserIds } }
          : {}),
      },
      select: { userId: true },
    });
    const results = await Promise.allSettled(
      administrators.map(({ userId }) =>
        this.send(userId, title, message, correlationId, channels),
      ),
    );
    const failures = results.filter(({ status }) => status === "rejected");
    if (failures.length > 0) {
      throw new Error(
        `${failures.length} administrator notification(s) could not be published`,
      );
    }
  }

  private send(
    recipientUserId: string,
    title: string,
    message: string,
    correlationId: string,
    channels: Array<"IN_APP" | "PUSH">,
  ) {
    return this.notifications.send({
      recipientUserId,
      title,
      message,
      correlationId,
      channels,
    });
  }

  private async userDisplayName(
    userId: string,
    fallback: string,
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    if (!user) return fallback;
    const fullName = [user.firstName, user.lastName]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");
    return fullName || user.email;
  }

  private reasonText(reason?: string): string {
    const trimmed = reason?.trim();
    return trimmed ? ` Reason: ${trimmed}.` : "";
  }

  private async safelyNotify(
    operation: string,
    correlationId: string,
    callback: () => Promise<void>,
  ): Promise<void> {
    try {
      await callback();
    } catch (error) {
      this.logger.error(
        `Unable to publish ${operation} notifications for ${correlationId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
