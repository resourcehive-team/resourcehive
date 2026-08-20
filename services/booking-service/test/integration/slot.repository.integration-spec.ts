import { randomUUID } from "node:crypto";
import { PrismaService } from "@resourcehive/database";
import { SlotRepository } from "../../src/slots/slot.repository";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("SlotRepository integration", () => {
  const prisma = new PrismaService();
  const repository = new SlotRepository(prisma);
  const ownerId = randomUUID();
  const firstTenantId = randomUUID();
  const secondTenantId = randomUUID();
  const resourceId = randomUUID();

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    await prisma.$connect();
    await prisma.user.create({
      data: {
        id: ownerId,
        email: `slot-owner-${ownerId}@example.edu`,
        passwordHash: "integration-test-only",
        firstName: "Slot",
        lastName: "Owner",
      },
    });
    await prisma.organization.createMany({
      data: [
        {
          id: firstTenantId,
          name: "First test tenant",
          type: "ROOT",
          rootOrganizationId: firstTenantId,
          createdBy: ownerId,
        },
        {
          id: secondTenantId,
          name: "Second test tenant",
          type: "ROOT",
          rootOrganizationId: secondTenantId,
          createdBy: ownerId,
        },
      ],
    });
    await prisma.resource.create({
      data: {
        id: resourceId,
        name: "Integration test resource",
        ownerOrganizationId: firstTenantId,
        rootOrganizationId: firstTenantId,
        createdByUserId: ownerId,
        pointCost: 10,
      },
    });
  });

  it("creates and reads a slot only through the matching tenant", async () => {
    const slot = await repository.create({
      resourceId,
      rootOrganizationId: firstTenantId,
      startsAt: new Date("2030-08-01T10:00:00.000Z"),
      endsAt: new Date("2030-08-01T11:00:00.000Z"),
    });

    await expect(
      repository.findById({
        slotId: slot.id,
        rootOrganizationId: firstTenantId,
      }),
    ).resolves.toMatchObject({ id: slot.id, resourceId });

    await expect(
      repository.findById({
        slotId: slot.id,
        rootOrganizationId: secondTenantId,
      }),
    ).resolves.toBeNull();
  });

  it("preserves the database slot-overlap constraint", async () => {
    await expect(
      repository.create({
        resourceId,
        rootOrganizationId: firstTenantId,
        startsAt: new Date("2030-08-01T10:30:00.000Z"),
        endsAt: new Date("2030-08-01T11:30:00.000Z"),
      }),
    ).rejects.toBeDefined();
  });

  afterAll(async () => {
    await prisma.resourceSlot.deleteMany({ where: { resourceId } });
    await prisma.resource.delete({ where: { id: resourceId } });
    await prisma.organization.deleteMany({
      where: { id: { in: [firstTenantId, secondTenantId] } },
    });
    await prisma.user.delete({ where: { id: ownerId } });
    await prisma.$disconnect();
  });
});
