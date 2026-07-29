import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@resourcehive/database';

describe('OrganizationsController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;

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

    expect(response.body.id).toBe(demoOrganizationId);
  });
});
