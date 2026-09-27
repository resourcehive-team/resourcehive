import { ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { DisputeRepository } from "./dispute.repository";
import { DisputeService } from "./dispute.service";

describe("DisputeService", () => {
  const transaction = {
    booking: { findFirst: jest.fn() },
    bookingDispute: { findUnique: jest.fn() },
  };
  const membershipFindFirst = jest.fn();
  const membershipFindMany = jest.fn();
  const organizationFindUnique = jest.fn();
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
    organizationMembership: {
      findFirst: membershipFindFirst,
      findMany: membershipFindMany,
    },
    organization: { findUnique: organizationFindUnique },
  } as unknown as PrismaService;
  const applyTransition = jest.fn();
  const createDispute = jest.fn();
  const disputes = {
    create: createDispute,
    addEvent: jest.fn(),
    findById: jest.fn(),
    findForResolverOrganizations: jest.fn(),
    applyTransition,
  } as unknown as DisputeRepository;
  const service = new DisputeService(prisma, disputes);
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "org-id",
    role: "member",
  };

  beforeEach(() => jest.clearAllMocks());

  it("rejects opening a dispute for a booking that is not completed", async () => {
    membershipFindFirst.mockResolvedValue({
      organizationId: "org-id",
      role: "MEMBER",
    });
    transaction.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      status: "CONFIRMED",
    });

    await expect(
      service.open(
        { bookingId: "booking-id", reason: "BROKEN", description: "broken" },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects opening a second dispute for the same booking", async () => {
    membershipFindFirst.mockResolvedValue({
      organizationId: "org-id",
      role: "MEMBER",
    });
    transaction.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      status: "COMPLETED",
    });
    transaction.bookingDispute.findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      service.open(
        { bookingId: "booking-id", reason: "BROKEN", description: "broken" },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects opening a dispute when the user has no organization", async () => {
    membershipFindFirst.mockResolvedValue(null);

    await expect(
      service.open(
        { bookingId: "booking-id", reason: "BROKEN", description: "broken" },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.booking.findFirst).not.toHaveBeenCalled();
  });

  it("escalates an admin's dispute to their parent organization", async () => {
    membershipFindFirst.mockResolvedValue({
      organizationId: "child-org-id",
      role: "ADMIN",
    });
    organizationFindUnique.mockResolvedValue({ parentId: "parent-org-id" });
    transaction.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      status: "COMPLETED",
    });
    transaction.bookingDispute.findUnique.mockResolvedValue(null);
    createDispute.mockResolvedValue({ id: "dispute-id", status: "OPEN" });

    await service.open(
      { bookingId: "booking-id", reason: "BROKEN", description: "broken" },
      user,
    );

    expect(createDispute).toHaveBeenCalledWith(
      expect.objectContaining({ resolverOrganizationId: "parent-org-id" }),
      transaction,
    );
  });

  it("rejects a tenant (root organization) admin opening a dispute", async () => {
    membershipFindFirst.mockResolvedValue({
      organizationId: "root-org-id",
      role: "ADMIN",
    });
    organizationFindUnique.mockResolvedValue({ parentId: null });

    await expect(
      service.open(
        { bookingId: "booking-id", reason: "BROKEN", description: "broken" },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.booking.findFirst).not.toHaveBeenCalled();
  });

  it("requires resolver-organization admin authority to update a dispute", async () => {
    jest.spyOn(disputes, "findById").mockResolvedValue({
      id: "dispute-id",
      status: "OPEN",
      submittedByUserId: "someone-else",
      resolverOrganizationId: "org-id",
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
    membershipFindFirst.mockResolvedValue(null);

    await expect(
      service.transition("dispute-id", { status: "UNDER_REVIEW" }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires resolution notes to resolve a dispute", async () => {
    jest.spyOn(disputes, "findById").mockResolvedValue({
      id: "dispute-id",
      status: "OPEN",
      submittedByUserId: "someone-else",
      resolverOrganizationId: "org-id",
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
    membershipFindFirst.mockResolvedValue({ id: "membership-id" });

    await expect(
      service.transition("dispute-id", { status: "RESOLVED" }, user),
    ).rejects.toBeInstanceOf(Error);
    expect(applyTransition).not.toHaveBeenCalled();
  });
});
