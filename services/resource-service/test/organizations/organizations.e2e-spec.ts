import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  PrismaClient,
  UniversityContextInterceptor,
} from '@resourcehive/database';

describe('OrganizationsController (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let jwtToken: string;
  let adminJwtToken: string;
  let prisma: PrismaClient;

  const demoUserId = '00000000-0000-4000-8000-000000000001';
  const demoOrganizationId = '00000000-0000-4000-8000-000000000002';

  // For deep hierarchy test
  const deepAdminUserId = '00000000-0000-4000-8000-000000000030';
  const rootOrgId = '00000000-0000-4000-8000-000000000031';
  const childOrgId = '00000000-0000-4000-8000-000000000032';
  const grandchildOrgId = '00000000-0000-4000-8000-000000000033';
  const otherTenantOrgId = '00000000-0000-4000-8000-000000000034';
  const createdChildIds: string[] = [];
  const createdDomainIds: string[] = [];
  const createdAllowlistIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new UniversityContextInterceptor());
    await app.init();

    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });

    // Setup deep hierarchy user
    await prisma.user.upsert({
      where: { id: deepAdminUserId },
      update: {},
      create: {
        id: deepAdminUserId,
        email: 'deep-admin@example.edu',
        passwordHash: 'dummy',
        firstName: 'Deep',
        lastName: 'Admin',
        emailVerifiedAt: new Date(),
      },
    });

    // Setup deep hierarchy orgs
    await prisma.organization.upsert({
      where: { id: rootOrgId },
      update: {},
      create: {
        id: rootOrgId,
        name: 'Root Org',
        type: 'UNIVERSITY',
        rootOrganizationId: rootOrgId,
        createdBy: deepAdminUserId,
      },
    });
    await prisma.organization.upsert({
      where: { id: childOrgId },
      update: {},
      create: {
        id: childOrgId,
        name: 'Child Org',
        type: 'FACULTY',
        rootOrganizationId: rootOrgId,
        parentId: rootOrgId,
        createdBy: deepAdminUserId,
      },
    });
    await prisma.organization.upsert({
      where: { id: grandchildOrgId },
      update: {},
      create: {
        id: grandchildOrgId,
        name: 'Grandchild Org',
        type: 'DEPARTMENT',
        rootOrganizationId: rootOrgId,
        parentId: childOrgId,
        createdBy: deepAdminUserId,
      },
    });

    // Setup other tenant
    await prisma.organization.upsert({
      where: { id: otherTenantOrgId },
      update: {},
      create: {
        id: otherTenantOrgId,
        name: 'Other Tenant',
        type: 'UNIVERSITY',
        rootOrganizationId: otherTenantOrgId,
        createdBy: deepAdminUserId,
      },
    });

    // Memberships for deep hierarchy user
    // ADMIN at root
    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: deepAdminUserId,
          organizationId: rootOrgId,
        },
      },
      update: { role: 'ADMIN', status: 'APPROVED' },
      create: {
        userId: deepAdminUserId,
        organizationId: rootOrgId,
        role: 'ADMIN',
        status: 'APPROVED',
      },
    });
    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: deepAdminUserId,
          organizationId: childOrgId,
        },
      },
      update: { role: 'ADMIN', status: 'APPROVED' },
      create: {
        userId: deepAdminUserId,
        organizationId: childOrgId,
        role: 'ADMIN',
        status: 'APPROVED',
      },
    });
    // MEMBER at grandchild (direct member role)
    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: deepAdminUserId,
          organizationId: grandchildOrgId,
        },
      },
      update: { role: 'MEMBER', status: 'APPROVED' },
      create: {
        userId: deepAdminUserId,
        organizationId: grandchildOrgId,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    });

    const configService = app.get(ConfigService);
    const secret =
      configService.get<string>('JWT_SECRET') ||
      'development-only-resourcehive-secret-change-before-production';
    const jwtService = app.get(JwtService);

    jwtToken = jwtService.sign(
      {
        sub: demoUserId,
        email: 'demo@example.edu',
        organizationId: demoOrganizationId,
        rootOrganizationId: demoOrganizationId,
        role: 'member',
      },
      { secret },
    );

    adminJwtToken = jwtService.sign(
      {
        sub: deepAdminUserId,
        email: 'deep-admin@example.edu',
        organizationId: rootOrgId,
        rootOrganizationId: rootOrgId,
        role: 'admin',
      },
      { secret },
    );
  });

  afterAll(async () => {
    for (const organizationId of createdChildIds) {
      const membership = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: deepAdminUserId,
            organizationId,
          },
        },
      });
      if (membership) {
        // The audit table is append-only for application roles. This client is
        // the owner in the disposable integration database, so disable only
        // the append-only trigger while removing test fixtures.
        await prisma.$executeRawUnsafe(
          'ALTER TABLE organization_membership_audits DISABLE TRIGGER organization_membership_audits_append_only',
        );
        try {
          await prisma.organizationMembershipAudit.deleteMany({
            where: { membershipId: membership.id },
          });
          await prisma.organizationMembership.delete({
            where: { id: membership.id },
          });
        } finally {
          await prisma.$executeRawUnsafe(
            'ALTER TABLE organization_membership_audits ENABLE TRIGGER organization_membership_audits_append_only',
          );
        }
      }
    }
    await prisma.organizationEmailDomain.deleteMany({
      where: { id: { in: createdDomainIds } },
    });
    await prisma.organizationEmailAllowlist.deleteMany({
      where: { id: { in: createdAllowlistIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: createdChildIds } },
    });
    // delete created items
    await prisma.pointTransaction
      .deleteMany({
        where: { sourceOrganizationId: rootOrgId },
      })
      .catch(() => {});
    await prisma.organizationMembership.deleteMany({
      where: { userId: deepAdminUserId },
    });
    await prisma.organization
      .delete({ where: { id: grandchildOrgId } })
      .catch(() => {});
    await prisma.organization
      .delete({ where: { id: childOrgId } })
      .catch(() => {});
    await prisma.organization
      .delete({ where: { id: rootOrgId } })
      .catch(() => {});
    await prisma.organization
      .delete({ where: { id: otherTenantOrgId } })
      .catch(() => {});
    await prisma.$disconnect();
    await app.close();
  });

  it('gets organizations for the user', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations/roots')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('gets a specific organization', async () => {
    const response = await request(app.getHttpServer())
      .get(`/organizations/${demoOrganizationId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    const body = response.body as { id: string };
    expect(body.id).toBe(demoOrganizationId);
  });

  describe('Deep Hierarchy Admin Inheritance', () => {
    it('creates a department and assigns an existing university member as its admin', async () => {
      const response = await request(app.getHttpServer())
        .post(`/organizations/${childOrgId}/children`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({
          name: 'Test Computer Science',
          type: 'DEPARTMENT',
          adminEmail: 'deep-admin@example.edu',
        })
        .expect(201);

      const body = response.body as {
        organization: { id: string; rootOrganizationId: string };
        administrator: { email: string };
      };
      const createdId = body.organization.id;
      createdChildIds.push(createdId);
      expect(body.organization.rootOrganizationId).toBe(rootOrgId);
      expect(body.administrator.email).toBe('deep-admin@example.edu');
      const membership = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: deepAdminUserId,
            organizationId: createdId,
          },
        },
      });
      expect(membership).toMatchObject({ role: 'ADMIN', status: 'APPROVED' });
      const audit = await prisma.organizationMembershipAudit.findFirst({
        where: { membershipId: membership?.id, action: 'ADMIN_GRANTED' },
      });
      expect(audit).not.toBeNull();
    });

    it('allows a university admin to create a faculty beneath the university', async () => {
      const response = await request(app.getHttpServer())
        .post(`/organizations/${rootOrgId}/children`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({
          name: `Faculty ${Date.now()}`,
          type: 'FACULTY',
          adminEmail: 'deep-admin@example.edu',
        })
        .expect(201);

      const body = response.body as {
        organization: {
          id: string;
          parentId: string;
          rootOrganizationId: string;
        };
      };
      createdChildIds.push(body.organization.id);
      expect(body.organization).toMatchObject({
        parentId: rootOrgId,
        rootOrganizationId: rootOrgId,
      });
    });

    it('denies child creation by a regular member and across universities', async () => {
      await request(app.getHttpServer())
        .post(`/organizations/${rootOrgId}/children`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'Forbidden Faculty',
          type: 'FACULTY',
          adminEmail: 'demo@example.edu',
        })
        .expect(403);

      await request(app.getHttpServer())
        .post(`/organizations/${otherTenantOrgId}/children`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({
          name: 'Other Faculty',
          type: 'FACULTY',
          adminEmail: 'deep-admin@example.edu',
        })
        .expect(403);
    });

    it('normalizes email rules and allows admins to manage them', async () => {
      const domain = `test-${Date.now()}.mrt.ac.lk`;
      const addedDomain = await request(app.getHttpServer())
        .post(`/organizations/${childOrgId}/email-domains`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ domain: domain.toUpperCase(), autoJoin: true })
        .expect(201);
      const domainBody = addedDomain.body as {
        id: string;
        domain: string;
        autoJoin: boolean;
      };
      createdDomainIds.push(domainBody.id);
      expect(domainBody).toMatchObject({ domain, autoJoin: true });
      await request(app.getHttpServer())
        .post(`/organizations/${childOrgId}/email-domains`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ domain })
        .expect(409);

      await request(app.getHttpServer())
        .patch(`/organizations/${childOrgId}/email-domains/${domainBody.id}`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ autoJoin: false })
        .expect(200);

      const addedEmail = await request(app.getHttpServer())
        .post(`/organizations/${childOrgId}/allowlist`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ email: 'STUDENT@EXAMPLE.EDU' })
        .expect(201);
      const emailBody = addedEmail.body as { id: string; email: string };
      createdAllowlistIds.push(emailBody.id);
      expect(emailBody.email).toBe('student@example.edu');
      await request(app.getHttpServer())
        .post(`/organizations/${childOrgId}/allowlist`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ email: 'student@example.edu' })
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/organizations/${childOrgId}/allowlist/${emailBody.id}`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      createdAllowlistIds.pop();
      await request(app.getHttpServer())
        .delete(`/organizations/${childOrgId}/email-domains/${domainBody.id}`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
      createdDomainIds.pop();
    });

    it('should allow inherited admin to access grandchild organization (200 OK)', async () => {
      // The deep admin is ADMIN on root, MEMBER on grandchild.
      // Admin inheritance should override the direct MEMBER role.
      await request(app.getHttpServer())
        .get(`/organizations/${grandchildOrgId}/email-domains`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(200);
    });

    it('should prevent access to another tenant organization (403 Forbidden)', async () => {
      // The user is not a member of otherTenantOrgId and should be denied access
      await request(app.getHttpServer())
        .get(`/organizations/${otherTenantOrgId}/email-domains`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .expect(403);
    });
  });

  describe('Organization Moderation', () => {
    it('should update organization details (200 OK)', async () => {
      await request(app.getHttpServer())
        .patch(`/organizations/${rootOrgId}`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({ status: 'SUSPENDED', name: 'Updated Root Org' })
        .expect(200);

      const updatedOrg = await prisma.organization.findUnique({
        where: { id: rootOrgId },
      });
      expect(updatedOrg?.status).toBe('SUSPENDED');
      expect(updatedOrg?.name).toBe('Updated Root Org');
      await prisma.organization.update({
        where: { id: rootOrgId },
        data: { status: 'ACTIVE' },
      });
    });
  });

  describe('Semester Points Allocation', () => {
    it('should allocate points to members and return count', async () => {
      const uniqueSemester = `Semester-1/2026-${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post(`/organizations/${rootOrgId}/semester-points`)
        .set('Authorization', `Bearer ${adminJwtToken}`)
        .send({
          targetOrganizationIds: [rootOrgId],
          amount: 500,
          semesterName: uniqueSemester,
        })
        .expect(201);

      expect(response.body).toHaveProperty('count');
      const body = response.body as { count: number };
      expect(typeof body.count).toBe('number');

      const transactions = await prisma.pointTransaction.findMany({
        where: {
          sourceOrganizationId: rootOrgId,
          transactionType: 'SEMESTER_ALLOCATION',
          description: uniqueSemester,
        },
      });
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0].amount).toBe(500);
      expect(transactions[0].description).toBe(uniqueSemester);
    });

    it('should reject if not admin', async () => {
      // jwtToken is a normal member
      await request(app.getHttpServer())
        .post(`/organizations/${rootOrgId}/semester-points`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          targetOrganizationIds: [rootOrgId],
          amount: 500,
          semesterName: 'Semester-1/2026',
        })
        .expect(403);
    });
  });
});
