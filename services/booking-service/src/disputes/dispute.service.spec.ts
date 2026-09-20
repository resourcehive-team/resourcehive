import { ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { BookingAuthorizationService } from "../authorization/booking-authorization.service";
import { SlotRepository } from "../slots/slot.repository";
import { DisputeRepository } from "./dispute.repository";
import { DisputeService } from "./dispute.service";

describe("DisputeService", () => {
  const transaction = {
    booking: { findFirst: jest.fn() },
    bookingDispute: { findUnique: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
    organizationMembership: { findMany: jest.fn() },
  } as unknown as PrismaService;
  const authorization = {
    resolve: jest.fn().mockResolvedValue({
      userId: "admin-id",
      organizationId: "org-id",
      rootOrganizationId: "root-id",
      role: "ADMIN",
    }),
  } as unknown as BookingAuthorizationService;
  const slots = {
    canManageResource: jest.fn(),
  } as unknown as SlotRepository;
  const applyTransition = jest.fn();
  const disputes = {
    create: jest.fn(),
    addEvent: jest.fn(),
    findById: jest.fn(),
    applyTransition,
  } as unknown as DisputeRepository;
  const service = new DisputeService(prisma, authorization, slots, disputes);
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "org-id",
    role: "member",
  };

  beforeEach(() => jest.clearAllMocks());

  it("rejects opening a dispute for a booking that is not completed", async () => {
    transaction.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      status: "CONFIRMED",
    });

    await expect(
      service.open(
        { bookingId: "booking-id", reason: "DAMAGED", description: "broken" },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects opening a second dispute for the same booking", async () => {
    transaction.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      status: "COMPLETED",
    });
    transaction.bookingDispute.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      service.open(
        { bookingId: "booking-id", reason: "DAMAGED", description: "broken" },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("requires resource-management authority to update a dispute", async () => {
    jest.spyOn(disputes, "findById").mockResolvedValue({
      id: "dispute-id",
      status: "OPEN",
      submittedByUserId: "someone-else",
      resolutionNotes: null,
      booking: {
        userId: "someone-else",
        status: "COMPLETED",
        resourceSlot: {
          resource: {
            id: "resource-id",
            ownerOrganizationId: "org-id",
            unavailableDisputeId: null,
          },
        },
      },
    } as never);
    jest.spyOn(slots, "canManageResource").mockResolvedValue(false);

    await expect(
      service.transition("dispute-id", { status: "UNDER_REVIEW" }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires resolution notes to resolve a dispute", async () => {
    jest.spyOn(disputes, "findById").mockResolvedValue({
      id: "dispute-id",
      status: "OPEN",
      submittedByUserId: "someone-else",
      resolutionNotes: null,
      booking: {
        userId: "someone-else",
        status: "COMPLETED",
        resourceSlot: {
          resource: {
            id: "resource-id",
            ownerOrganizationId: "org-id",
            unavailableDisputeId: null,
          },
        },
      },
    } as never);
    jest.spyOn(slots, "canManageResource").mockResolvedValue(true);

    await expect(
      service.transition("dispute-id", { status: "RESOLVED" }, user),
    ).rejects.toBeInstanceOf(Error);
    expect(applyTransition).not.toHaveBeenCalled();
  });
});
