import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@resourcehive/database';

describe('OrganizationsController (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let jwtToken: string;
  let adminJwtToken: string;
  let prisma: PrismaService;

  const demoUserId = '00000000-0000-4000-8000-000000000001';
  const demoOrganizationId = '00000000-0000-4000-8000-000000000002';

  // For deep hierarchy test
  const deepAdminUserId = '00000000-0000-4000-8000-000000000030';
  const rootOrgId = '00000000-0000-4000-8000-000000000031';
  const childOrgId = '00000000-0000-4000-8000-000000000032';
  const grandchildOrgId = '00000000-0000-4000-8000-000000000033';
  const otherTenantOrgId = '00000000-0000-4000-8000-000000000034';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

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
        role: 'member',
      },
      { secret },
    );

    adminJwtToken = jwtService.sign(
      {
        sub: deepAdminUserId,
        email: 'deep-admin@example.edu',
        organizationId: rootOrgId,
        role: 'admin',
      },
      { secret },
    );
  });

  afterAll(async () => {
    // delete created items
    await prisma.organizationMembership.deleteMany({
      where: { userId: deepAdminUserId },
    });
    await prisma.organization
      .delete({ where: { id: grandchildOrgId } })
      .catch(() => { });
    await prisma.organization
      .delete({ where: { id: childOrgId } })
      .catch(() => { });
    await prisma.organization
      .delete({ where: { id: rootOrgId } })
      .catch(() => { });
    await prisma.organization
      .delete({ where: { id: otherTenantOrgId } })
      .catch(() => { });
    await prisma.user.deleteMany({ where: { id: deepAdminUserId } });
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
});
