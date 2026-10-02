import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  PrismaService,
  runWithUniversityContext,
} from "@resourcehive/database";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { DisputeRepository } from "../../src/disputes/dispute.repository";
import { DisputeService } from "../../src/disputes/dispute.service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

describeWithDatabase("Dispute routing integration", () => {
  const owner = new PrismaClient({
    datasources: { db: { url: testDatabaseUrl } },
  });
  const app = new PrismaService();
  const service = new DisputeService(app, new DisputeRepository(app));
  const ids = {
    submitter: randomUUID(),
    ownerAdmin: randomUUID(),
    siblingAdmin: randomUUID(),
    otherAdmin: randomUUID(),
    rootA: randomUUID(),
    ownerOrganization: randomUUID(),
    siblingOrganization: randomUUID(),
    rootB: randomUUID(),
    otherOrganization: randomUUID(),
    resource: randomUUID(),
    slot: randomUUID(),
    booking: randomUUID(),
  };
  const rootAUser = {
    userId: ids.submitter,
    email: "submitter@example.test",
    organizationId: ids.siblingOrganization,
    rootOrganizationId: ids.rootA,
    role: "MEMBER",
  };
  const rootAOwnerAdmin = {
    userId: ids.ownerAdmin,
    email: "owner-admin@example.test",
    organizationId: ids.ownerOrganization,
    rootOrganizationId: ids.rootA,
    role: "ADMIN",
  };
  const rootASiblingAdmin = {
    userId: ids.siblingAdmin,
    email: "sibling-admin@example.test",
    organizationId: ids.siblingOrganization,
    rootOrganizationId: ids.rootA,
    role: "ADMIN",
  };
  const rootBOwnerAdmin = {
    userId: ids.otherAdmin,
    email: "other-admin@example.test",
    organizationId: ids.otherOrganization,
    rootOrganizationId: ids.rootB,
    role: "ADMIN",
  };
  let disputeId: string | undefined;

  beforeAll(async () => {
    await Promise.all([owner.$connect(), app.$connect()]);
    await owner.user.createMany({
      data: [
        [ids.submitter, "submitter"],
        [ids.ownerAdmin, "owner-admin"],
        [ids.siblingAdmin, "sibling-admin"],
        [ids.otherAdmin, "other-admin"],
      ].map(([id, label]) => ({
        id,
        email: `${label}-${id}@example.test`,
        passwordHash: "integration-test-only",
        firstName: String(label),
        lastName: "Fixture",
        emailVerifiedAt: new Date(),
      })),
    });

    await owner.organization.createMany({
      data: [
        [ids.rootA, "Dispute University A", "UNIVERSITY", null, ids.rootA],
        [
          ids.ownerOrganization,
          "Resource Owner Department",
          "DEPARTMENT",
          ids.rootA,
          ids.rootA,
        ],
        [
          ids.siblingOrganization,
          "Submitter Department",
          "DEPARTMENT",
          ids.rootA,
          ids.rootA,
        ],
        [ids.rootB, "Dispute University B", "UNIVERSITY", null, ids.rootB],
        [
          ids.otherOrganization,
          "Other University Department",
          "DEPARTMENT",
          ids.rootB,
          ids.rootB,
        ],
      ].map(([id, name, type, parentId, rootOrganizationId]) => ({
        id,
        name,
        type,
        parentId,
        rootOrganizationId,
        createdBy: ids.ownerAdmin,
      })),
    });

    await owner.organizationMembership.createMany({
      data: [
        {
          userId: ids.submitter,
          organizationId: ids.siblingOrganization,
          role: "MEMBER",
          status: "APPROVED",
        },
        {
          userId: ids.ownerAdmin,
          organizationId: ids.ownerOrganization,
          role: "ADMIN",
          status: "APPROVED",
        },
        {
          userId: ids.siblingAdmin,
          organizationId: ids.siblingOrganization,
          role: "ADMIN",
          status: "APPROVED",
        },
        {
          userId: ids.otherAdmin,
          organizationId: ids.otherOrganization,
          role: "ADMIN",
          status: "APPROVED",
        },
      ],
    });
    await owner.resource.create({
      data: {
        id: ids.resource,
        name: "Department Instruments Lab",
        ownerOrganizationId: ids.ownerOrganization,
        rootOrganizationId: ids.rootA,
        createdByUserId: ids.ownerAdmin,
      },
    });
    await owner.resourceSlot.create({
      data: {
        id: ids.slot,
        resourceId: ids.resource,
        rootOrganizationId: ids.rootA,
        startsAt: new Date("2035-05-01T10:00:00Z"),
        endsAt: new Date("2035-05-01T11:00:00Z"),
      },
    });
    await owner.booking.create({
      data: {
        id: ids.booking,
        resourceSlotId: ids.slot,
        rootOrganizationId: ids.rootA,
        userId: ids.submitter,
        status: "COMPLETED",
      },
    });
  });

  it("routes to the resource owner and permits only its active direct admins", async () => {
    const submitted = await runWithUniversityContext(
      { userId: ids.submitter, rootOrganizationId: ids.rootA },
      () =>
        service.open(
          {
            bookingId: ids.booking,
            reason: "BROKEN",
            description: "The controls are damaged.",
          },
          rootAUser,
        ),
    );
    disputeId = submitted.id;
    expect(submitted.resolverOrganizationId).toBe(ids.ownerOrganization);
    expect(submitted.booking.resourceSlot.resource.name).toBe(
      "Department Instruments Lab",
    );
    expect(submitted.booking.resourceSlot.resource.ownerOrganization.name).toBe(
      "Resource Owner Department",
    );
    expect(submitted.booking.resourceSlot.startsAt).toEqual(
      new Date("2035-05-01T10:00:00Z"),
    );

    const ownerDisputes = await runWithUniversityContext(
      { userId: ids.ownerAdmin, rootOrganizationId: ids.rootA },
      () => service.listForOrg(rootAOwnerAdmin),
    );
    expect(ownerDisputes.map(({ id }) => id)).toContain(submitted.id);

    const siblingDisputes = await runWithUniversityContext(
      { userId: ids.siblingAdmin, rootOrganizationId: ids.rootA },
      () => service.listForOrg(rootASiblingAdmin),
    );
    expect(siblingDisputes).toEqual([]);
    await expect(
      runWithUniversityContext(
        { userId: ids.submitter, rootOrganizationId: ids.rootA },
        () => service.getById(submitted.id, rootAUser),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      runWithUniversityContext(
        { userId: ids.siblingAdmin, rootOrganizationId: ids.rootA },
        () =>
          service.transition(
            submitted.id,
            { status: "UNDER_REVIEW" },
            rootASiblingAdmin,
          ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const otherUniversityDisputes = await runWithUniversityContext(
      { userId: ids.otherAdmin, rootOrganizationId: ids.rootB },
      () => service.listForOrg(rootBOwnerAdmin),
    );
    expect(otherUniversityDisputes).toEqual([]);

    const acknowledged = await runWithUniversityContext(
      { userId: ids.ownerAdmin, rootOrganizationId: ids.rootA },
      () =>
        service.transition(
          submitted.id,
          { status: "UNDER_REVIEW" },
          rootAOwnerAdmin,
        ),
    );
    expect(acknowledged.status).toBe("UNDER_REVIEW");
    await expect(
      runWithUniversityContext(
        { userId: ids.ownerAdmin, rootOrganizationId: ids.rootA },
        () =>
          service.transition(
            submitted.id,
            { status: "UNDER_REVIEW" },
            rootAOwnerAdmin,
          ),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      owner.bookingDisputeEvent.count({
        where: {
          disputeId: submitted.id,
          fromStatus: "OPEN",
          toStatus: "UNDER_REVIEW",
        },
      }),
    ).resolves.toBe(1);
  });

  afterAll(async () => {
    if (disputeId) {
      await owner.bookingDisputeEvent.deleteMany({ where: { disputeId } });
      await owner.bookingDispute.deleteMany({ where: { id: disputeId } });
    }
    await owner.booking.deleteMany({ where: { id: ids.booking } });
    await owner.resourceSlot.deleteMany({ where: { id: ids.slot } });
    await owner.resource.deleteMany({ where: { id: ids.resource } });
    await owner.organizationMembership.deleteMany({
      where: {
        userId: {
          in: [ids.submitter, ids.ownerAdmin, ids.siblingAdmin, ids.otherAdmin],
        },
      },
    });
    await owner.organization.deleteMany({
      where: {
        id: {
          in: [
            ids.ownerOrganization,
            ids.siblingOrganization,
            ids.otherOrganization,
            ids.rootA,
            ids.rootB,
          ],
        },
      },
    });
    await owner.user.deleteMany({
      where: {
        id: {
          in: [ids.submitter, ids.ownerAdmin, ids.siblingAdmin, ids.otherAdmin],
        },
      },
    });
    await Promise.all([owner.$disconnect(), app.$disconnect()]);
  });
});
