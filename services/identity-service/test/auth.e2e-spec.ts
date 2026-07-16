import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Authentication Flow (e2e)', () => {
  let app: INestApplication<App>;
  let tenantId: string;
  let jwtToken: string;
  const uniqueId = Date.now().toString();
  const testEmail = `testuser_${uniqueId}@cs.university.edu`;
  const testPassword = 'MySecretPassword123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('1. Should create a test tenant', async () => {
    const response = await request(app.getHttpServer())
      .post('/tenants')
      .send({
        name: `Test Department ${uniqueId}`,
        type: 'department',
        domain: 'cs.university.edu',
      })
      .expect(201);
    
    tenantId = response.body.tenant_id;
    expect(tenantId).toBeDefined();
  });

  it('2. Should register a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        tenantId: tenantId,
        fullName: 'Test User',
        email: testEmail,
        password: testPassword,
      })
      .expect(201);
    
    expect(response.body.message).toBe('user registration successfully');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(testEmail);
  });

  it('3. Should login and return a JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    expect(response.body.message).toBe('user login successfully');
    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe('string');
    
    jwtToken = response.body.token; 
  });

  it('4. Should block access to /users without a token', async () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(401);
  });

  it('5. Should block access to /users for a user without the admin role', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
