import { PrismaService } from "@resourcehive/database";
import { SlotResourceNotFoundError } from "./slot.errors";
import { SlotRepository } from "./slot.repository";

describe("SlotRepository", () => {
  const resourceSlot = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  };
  const transactionResource = { findFirst: jest.fn() };
  const transactionSlot = { create: jest.fn() };
  const transaction = {
    resource: transactionResource,
    resourceSlot: transactionSlot,
  };
  const prisma = {
    resourceSlot,
    $transaction: jest.fn(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  } as unknown as PrismaService;
  const repository = new SlotRepository(prisma);

  beforeEach(() => jest.clearAllMocks());

  it("scopes a slot lookup through the resource tenant", async () => {
    resourceSlot.findFirst.mockResolvedValue(null);

    await repository.findById({
      slotId: "slot-id",
      rootOrganizationId: "tenant-id",
    });

    expect(resourceSlot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "slot-id",
          resource: { rootOrganizationId: "tenant-id" },
        },
      }),
    );
  });

  it("lists slots with tenant, date, pagination, and stable ordering", async () => {
    resourceSlot.findMany.mockResolvedValue([]);
    const start = new Date("2026-08-01T00:00:00.000Z");
    const end = new Date("2026-09-01T00:00:00.000Z");

    await repository.findByResource({
      resourceId: "resource-id",
      rootOrganizationId: "tenant-id",
      startsAtOrAfter: start,
      startsBefore: end,
      skip: 10,
      take: 20,
    });

    expect(resourceSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          resourceId: "resource-id",
          resource: { rootOrganizationId: "tenant-id" },
          startsAt: { gte: start, lt: end },
        },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        skip: 10,
        take: 20,
      }),
    );
  });

  it("creates a slot only after finding the resource in the tenant", async () => {
    transactionResource.findFirst.mockResolvedValue({ id: "resource-id" });
    transactionSlot.create.mockResolvedValue({ id: "slot-id" });
    const startsAt = new Date("2026-08-01T10:00:00.000Z");
    const endsAt = new Date("2026-08-01T11:00:00.000Z");

    await repository.create({
      resourceId: "resource-id",
      rootOrganizationId: "tenant-id",
      startsAt,
      endsAt,
    });

    expect(transactionResource.findFirst).toHaveBeenCalledWith({
      where: {
        id: "resource-id",
        rootOrganizationId: "tenant-id",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    expect(transactionSlot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { resourceId: "resource-id", startsAt, endsAt },
      }),
    );
  });

  it("refuses to create a slot for a resource outside the tenant", async () => {
    transactionResource.findFirst.mockResolvedValue(null);

    await expect(
      repository.create({
        resourceId: "resource-id",
        rootOrganizationId: "wrong-tenant",
        startsAt: new Date("2026-08-01T10:00:00.000Z"),
        endsAt: new Date("2026-08-01T11:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(SlotResourceNotFoundError);

    expect(transactionSlot.create).not.toHaveBeenCalled();
  });
});
