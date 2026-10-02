import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@resourcehive/database";
import { DisputeRepository } from "./dispute.repository";
import { DisputeService } from "./dispute.service";

describe("DisputeService", () => {
  const organizationMembership = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };
  const transaction = {
    organizationMembership,
    booking: { findFirst: jest.fn() },
    bookingDispute: { findUnique: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
    organizationMembership,
  } as unknown as PrismaService;
  const create = jest.fn();
  const addEvent = jest.fn();
  const findById = jest.fn();
  const findMine = jest.fn();
  const findForOwnerOrganizations = jest.fn();
  const applyTransition = jest.fn();
  const disputes = {
    create,
    addEvent,
    findById,
    findMine,
    findForOwnerOrganizations,
    applyTransition,
  } as unknown as DisputeRepository;
  const service = new DisputeService(prisma, disputes);
  const user = {
    userId: "user-id",
    email: "user@example.edu",
    organizationId: "org-id",
    rootOrganizationId: "root-id",
    role: "member",
  };
  const dispute = {
    id: "dispute-id",
    bookingId: "booking-id",
    rootOrganizationId: "root-id",
    resolverOrganizationId: "owner-org-id",
    submittedByUserId: "user-id",
    reason: "BROKEN",
    description: "broken",
    evidence: null,
    status: "OPEN",
    resolutionNotes: null,
    reviewedByUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    submittedByUser: { firstName: "User", lastName: "One", email: user.email },
    booking: {
      id: "booking-id",
      userId: "user-id",
      status: "COMPLETED",
      resourceSlot: {
        startsAt: new Date("2030-01-01T10:00:00Z"),
        endsAt: new Date("2030-01-01T11:00:00Z"),
        resource: {
          id: "resource-id",
          name: "Lab",
          ownerOrganizationId: "owner-org-id",
          ownerOrganization: { id: "owner-org-id", name: "Faculty" },
          unavailableDisputeId: null,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    organizationMembership.findFirst.mockResolvedValue({ id: "membership-id" });
  });

  it("assigns the dispute to the booked resource owner, not the submitter department", async () => {
    transaction.booking.findFirst.mockResolvedValue({
      id: "booking-id",
      status: "COMPLETED",
      resourceSlot: { resource: { ownerOrganizationId: "owner-org-id" } },
    });
    transaction.bookingDispute.findUnique.mockResolvedValue(null);
    create.mockResolvedValue(dispute);

    await service.open(
      { bookingId: "booking-id", reason: "BROKEN", description: " broken " },
      user,
    );

    expect(transaction.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        // Jest's matcher is typed as any; this assertion inspects the generated Prisma filter.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          organization: { rootOrganizationId: "root-id", status: "ACTIVE" },
        }),
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        resolverOrganizationId: "owner-org-id",
        rootOrganizationId: "root-id",
        description: "broken",
      }),
      transaction,
    );
    expect(addEvent).toHaveBeenCalledWith(
      "dispute-id",
      user.userId,
      null,
      "OPEN",
      "Dispute opened",
      "root-id",
      transaction,
    );
  });

  it("requires an active university membership to submit a dispute", async () => {
    organizationMembership.findFirst.mockResolvedValue(null);
    await expect(
      service.open(
        { bookingId: "booking-id", reason: "BROKEN", description: "broken" },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.booking.findFirst).not.toHaveBeenCalled();
  });

  it("lists disputes for direct owner admins in the active university only", async () => {
    organizationMembership.findMany.mockResolvedValue([
      { organizationId: "owner-org-id" },
    ]);
    findForOwnerOrganizations.mockResolvedValue([dispute]);

    await expect(service.listForOrg(user)).resolves.toEqual([dispute]);
    expect(organizationMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          userId: user.userId,
          role: "ADMIN",
          status: "APPROVED",
          organization: { rootOrganizationId: "root-id", status: "ACTIVE" },
        }),
      }),
    );
    expect(findForOwnerOrganizations).toHaveBeenCalledWith(["owner-org-id"]);
  });

  it("denies a sibling organization admin access to the dispute", async () => {
    findById.mockResolvedValue(dispute);
    organizationMembership.findFirst.mockResolvedValue(null);
    await expect(
      service.getById("dispute-id", { ...user, userId: "sibling" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          userId: "sibling",
          organizationId: "owner-org-id",
        }),
      }),
    );
  });

  it("requires direct resource owner admin membership for dispute details", async () => {
    findById.mockResolvedValue(dispute);
    organizationMembership.findFirst.mockResolvedValue(null);
    await expect(service.getById("dispute-id", user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("acknowledges once and records the status change", async () => {
    findById.mockResolvedValue(dispute);
    applyTransition.mockResolvedValue({ ...dispute, status: "UNDER_REVIEW" });

    await expect(
      service.transition("dispute-id", { status: "UNDER_REVIEW" }, user),
    ).resolves.toMatchObject({ status: "UNDER_REVIEW" });
    expect(applyTransition).toHaveBeenCalledWith(
      "dispute-id",
      "OPEN",
      "resource-id",
      user.userId,
      expect.objectContaining({ status: "UNDER_REVIEW" }),
      false,
      transaction,
    );
    expect(addEvent).toHaveBeenCalledWith(
      "dispute-id",
      user.userId,
      "OPEN",
      "UNDER_REVIEW",
      undefined,
      "root-id",
      transaction,
    );
  });

  it("returns a conflict when another update wins the status change", async () => {
    findById.mockResolvedValue(dispute);
    applyTransition.mockRejectedValue(
      new ConflictException("This dispute has changed."),
    );

    await expect(
      service.transition("dispute-id", { status: "UNDER_REVIEW" }, user),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(addEvent).not.toHaveBeenCalled();
  });

  it("requires notes when closing a dispute", async () => {
    findById.mockResolvedValue(dispute);
    await expect(
      service.transition("dispute-id", { status: "RESOLVED" }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(applyTransition).not.toHaveBeenCalled();
  });
});
