import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@resourcehive/database';

describe('ResourcesController (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let jwtToken: string;
  let adminJwtToken: string;
  let prisma: PrismaService;
  let createdResourceId: string;

  const demoUserId = '00000000-0000-4000-8000-000000000099';
  const demoOrganizationId = '00000000-0000-4000-8000-000000000002';
  const adminUserId = '00000000-0000-4000-8000-000000000011';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);

    // Create a dummy admin user in the database
    await prisma.user.upsert({
      where: { id: adminUserId },
      update: {},
      create: {
        id: adminUserId,
        email: 'admin-resource-test@example.edu',
        passwordHash: 'dummy',
        firstName: 'Admin',
        lastName: 'Test',
      }
    });

    // Create a dummy member user
    await prisma.user.upsert({
      where: { id: demoUserId },
      update: {},
      create: {
        id: demoUserId,
        email: 'member-resource-test@example.edu',
        passwordHash: 'dummy',
        firstName: 'Member',
        lastName: 'Test',
      }
    });

    const configService = app.get(ConfigService);
    const secret = configService.get<string>('JWT_SECRET') || 'development-only-resourcehive-secret-change-before-production';
    const jwtService = app.get(JwtService);
    
    // Regular Member Token
    jwtToken = jwtService.sign({
      sub: demoUserId,
      email: 'demo@example.edu',
      organizationId: demoOrganizationId,
      role: 'member',
    }, { secret });

    // Admin Token
    adminJwtToken = jwtService.sign({
      sub: adminUserId,
      email: 'admin@example.edu',
      organizationId: demoOrganizationId,
      role: 'admin',
    }, { secret });
    
    // Make sure admin is in the org
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: adminUserId, organizationId: demoOrganizationId } },
      update: { role: 'ADMIN', status: 'APPROVED' },
      create: { userId: adminUserId, organizationId: demoOrganizationId, role: 'ADMIN', status: 'APPROVED' }
    });
    
    // Make sure member is in the org
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: demoUserId, organizationId: demoOrganizationId } },
      update: { role: 'MEMBER', status: 'APPROVED' },
      create: { userId: demoUserId, organizationId: demoOrganizationId, role: 'MEMBER', status: 'APPROVED' }
    });
  });

  afterAll(async () => {
    // Cleanup the resources we created during tests
    if (createdResourceId) {
      await prisma.resource.deleteMany({ where: { id: createdResourceId }});
    }
    await app.close();
  });

  it('should not allow regular members to create a resource (403 Forbidden)', async () => {
    return request(app.getHttpServer())
      .post(`/resources/organization/${demoOrganizationId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        name: 'Member Attempt Resource',
      })
      .expect(403);
  });

  it('should allow Admins to create a resource (201 Created)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/resources/organization/${demoOrganizationId}`)
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send({
        name: 'E2E Test Conference Room',
        description: 'Testing pagination and CRUD',
        pointCost: 10
      })
      .expect(201);
      
    createdResourceId = res.body.id;
    expect(res.body.name).toBe('E2E Test Conference Room');
  });

  it('should fetch paginated resources', async () => {
    // Create a few more dummy resources directly in DB just to test limit
    await prisma.resource.createMany({
      data: [
        { name: 'Dummy 1', ownerOrganizationId: demoOrganizationId, rootOrganizationId: demoOrganizationId, createdByUserId: adminUserId },
        { name: 'Dummy 2', ownerOrganizationId: demoOrganizationId, rootOrganizationId: demoOrganizationId, createdByUserId: adminUserId },
        { name: 'Dummy 3', ownerOrganizationId: demoOrganizationId, rootOrganizationId: demoOrganizationId, createdByUserId: adminUserId },
      ]
    });

    const res = await request(app.getHttpServer())
      .get(`/resources/organization/${demoOrganizationId}?page=1&limit=2`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
      
    expect(res.body.data.length).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.total).toBeGreaterThanOrEqual(4); 
    
    // Clean up dummies
    await prisma.resource.deleteMany({ where: { name: { startsWith: 'Dummy ' } } });
  });

  it('should filter resources by search query', async () => {
    const res = await request(app.getHttpServer())
      .get(`/resources/organization/${demoOrganizationId}?search=E2E Test`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);
      
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('E2E Test Conference Room');
  });
});
