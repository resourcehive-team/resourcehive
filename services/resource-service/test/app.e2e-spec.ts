import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AppController (e2e)', () => {
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

    // Generate a valid token for testing so we can access protected routes
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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) health check', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('/organizations/roots accepts the shared authentication cookie', () => {
    return request(app.getHttpServer())
      .get('/organizations/roots')
      .set('Cookie', `resourcehive_access_token=${jwtToken}`)
      .expect(200);
  });

  it('/organizations/roots rejects an unauthenticated request', () => {
    return request(app.getHttpServer()).get('/organizations/roots').expect(401);
  });
});
