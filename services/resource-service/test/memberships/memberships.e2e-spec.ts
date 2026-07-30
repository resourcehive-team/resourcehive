import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@resourcehive/database';

describe('MembershipsController (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let jwtToken: string;
  let filePrisma: PrismaService;

  const demoUserId = '00000000-0000-4000-8000-000000000001';
  const demoOrganizationId = '00000000-0000-4000-8000-000000000002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const configService = app.get(ConfigService);
    const secret = configService.get<string>('JWT_SECRET') || 'development-only-resourcehive-secret-change-before-production';
    const jwtService = app.get(JwtService);
    const prisma = app.get(PrismaService);
    filePrisma = prisma;

    // Ensure demo user is an ADMIN for these tests, as the routes require AdminGuard
    await prisma.organizationMembership.updateMany({
      where: { userId: demoUserId, organizationId: demoOrganizationId },
      data: { role: 'ADMIN' }
    });
    
    jwtToken = jwtService.sign({
      sub: demoUserId,
      email: 'demo@example.edu',
      organizationId: demoOrganizationId,
      role: 'member',
    }, { secret });
  });

  afterAll(async () => {
    await app.close();
  });

  it('gets my memberships', async () => {
    const prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(`SELECT 1`);
    const response = await request(app.getHttpServer())
      .get('/memberships/my-memberships')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('gets members of the demo organization', async () => {
    const response = await request(app.getHttpServer())
      .get(`/memberships/organization/${demoOrganizationId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('rejects access if user is not a member of the organization (Cross-Tenant check)', async () => {
    const randomOrgId = '00000000-0000-4000-8000-000000000999';
    
    await request(app.getHttpServer())
      .get(`/memberships/organization/${randomOrgId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(403);
  });

  it('approves a membership request', async () => {
    const targetUserId = '00000000-0000-4000-8000-000000000888';
    const prisma = app.get(PrismaService);

    // Create or update a dummy user to satisfy foreign key constraints
    await prisma.user.upsert({
      where: { id: targetUserId },
      update: {},
      create: {
        id: targetUserId,
        email: 'target-approve-test@example.edu',
        passwordHash: 'dummyhash',
        firstName: 'Target',
        lastName: 'User'
      }
    });

    const jwtService = app.get(JwtService);
    const configService = app.get(ConfigService);
    const secret = configService.get<string>('JWT_SECRET') || 'development-only-resourcehive-secret-change-before-production';

    // Generate JWT for the target user
    const targetJwtToken = jwtService.sign({
      sub: targetUserId,
      email: 'target-approve-test@example.edu',
      organizationId: demoOrganizationId,
      role: 'member',
    }, { secret });

    // Delete any leftover membership from previous failed test runs
    await prisma.organizationMembership.deleteMany({
      where: { userId: targetUserId }
    });

    // Target user requests membership
    await request(app.getHttpServer())
      .post(`/memberships/${demoOrganizationId}/request`)
      .set('Authorization', `Bearer ${targetJwtToken}`)
      .expect(201); 

    // Ensure the approving user (demoUserId) has ADMIN role in DB
    await prisma.organizationMembership.update({
      where: { userId_organizationId: { userId: demoUserId, organizationId: demoOrganizationId } },
      data: { role: 'ADMIN' }
    });

    // Admin user (demoUserId) approves the membership
    await request(app.getHttpServer())
      .patch(`/memberships/organization/${demoOrganizationId}/users/${targetUserId}/approve`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
      
    // Cleanup
    await prisma.organizationMembership.deleteMany({
      where: { userId: targetUserId }
    });
    
    await prisma.user.delete({
      where: { id: targetUserId }
    });

  });

  it('allows access via deep ancestor administrator inheritance', async () => {
    const { PrismaClient } = require('@resourcehive/database');
    const freshPrisma = new PrismaClient();
    await freshPrisma.$connect();

    const deepRootId = '00000000-0000-4000-8000-000000000100';
    const deepChildId = '00000000-0000-4000-8000-000000000101';
    const deepGrandchildId = '00000000-0000-4000-8000-000000000102';

    // Cleanup any leftovers from previous failed runs first!
    await freshPrisma.organizationMembership.deleteMany({
      where: { organizationId: { in: [deepRootId, deepChildId, deepGrandchildId] } }
    });
    await freshPrisma.organization.deleteMany({
      where: { id: { in: [deepGrandchildId, deepChildId, deepRootId] } }
    });

    // 1. Create a deep hierarchy
    await freshPrisma.organization.create({
      data: {
        id: deepRootId,
        name: 'Deep Root Org',
        type: 'UNIVERSITY',
        rootOrganizationId: deepRootId,
        createdBy: demoUserId,
      }
    });

    await freshPrisma.organization.create({
      data: {
        id: deepChildId,
        name: 'Deep Child Org',
        type: 'FACULTY',
        parentId: deepRootId,
        rootOrganizationId: deepRootId,
        createdBy: demoUserId,
      }
    });

    await freshPrisma.organization.create({
      data: {
        id: deepGrandchildId,
        name: 'Deep Grandchild Org',
        type: 'DEPARTMENT',
        parentId: deepChildId,
        rootOrganizationId: deepRootId,
        createdBy: demoUserId,
      }
    });

    // 2. Grant demo user ADMIN role ONLY on the Root
    await freshPrisma.organizationMembership.create({
      data: {
        userId: demoUserId,
        organizationId: deepRootId,
        role: 'ADMIN',
        status: 'APPROVED',
      }
    });

    // 3. Verify user can access Grandchild endpoint (inherited from Root -> Child -> Grandchild)
    await request(app.getHttpServer())
      .get(`/memberships/organization/${deepGrandchildId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    // Cleanup
    await freshPrisma.organizationMembership.delete({
      where: { userId_organizationId: { userId: demoUserId, organizationId: deepRootId } }
    });
    await freshPrisma.organization.deleteMany({
      where: { id: { in: [deepGrandchildId, deepChildId, deepRootId] } }
    });
    await freshPrisma.$disconnect();
  });
});
