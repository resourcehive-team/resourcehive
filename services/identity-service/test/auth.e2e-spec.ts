import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface LoginResponse {
  message: string;
  token: string;
}

describe('Authentication Flow (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let jwtToken: string;
  const testEmail = process.env.DEMO_USER_EMAIL ?? 'demo@example.edu';
  const testPassword =
    process.env.DEMO_USER_PASSWORD ?? 'DemoPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('reports that the service is running', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Identity Service is running');
  });

  it('rejects an incorrect password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'incorrect-password',
      })
      .expect(401);
  });

  it('logs in the seeded demo user and returns a JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    const body = response.body as LoginResponse;
    expect(body.message).toBe('user login successfully');
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');

    jwtToken = body.token;
  });

  it('validates the JWT and returns identity headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/validate')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200);

    // NGINX uses this endpoint to capture headers
    expect(response.headers['x-user-id']).toBeDefined();
    expect(response.headers['x-tenant-id']).toBeDefined();
    expect(response.headers['x-user-role']).toBe('member');
    expect(response.headers['x-user-email']).toBe(testEmail);
  });

  it('rejects an invalid JWT', async () => {
    await request(app.getHttpServer())
      .get('/auth/validate')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
