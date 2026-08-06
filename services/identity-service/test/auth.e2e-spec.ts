import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface LoginResponse {
  message: string;
}

interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    emailVerified: boolean;
    status: string;
    platformRole: string;
    createdAt: string;
    passwordHash?: string;
  };
  organizationContext: {
    organizationId: string | null;
    role: string | null;
  };
}

interface RegistrationResponse {
  developmentVerificationUrl: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
  };
}

describe('Authentication Flow (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authenticationCookie: string;
  let refreshCookie: string;
  let verificationToken: string;
  const passwordResetToken = 'e2e-password-reset-token-value';
  const resetPassword = 'ResetPassword123!';
  const testEmail = process.env.DEMO_USER_EMAIL ?? 'demo@example.edu';
  const testPassword = process.env.DEMO_USER_PASSWORD ?? 'DemoPassword123!';
  const signupEmail = `signup-${Date.now()}@example.edu`;
  const originalEmailTransport = process.env.EMAIL_TRANSPORT;
  const originalBcryptRounds = process.env.BCRYPT_ROUNDS;

  beforeAll(async () => {
    process.env.EMAIL_TRANSPORT = 'console';
    process.env.BCRYPT_ROUNDS = '4';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
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

  it('logs in the seeded demo user and issues an HttpOnly cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      })
      .expect(200);

    const body = response.body as LoginResponse;
    expect(body.message).toBe('user login successfully');
    expect(response.body).not.toHaveProperty('token');

    const setCookie = response.headers['set-cookie'] as unknown;
    expect(Array.isArray(setCookie)).toBe(true);
    const accessTokenCookie = (setCookie as string[]).find((cookie) =>
      cookie.startsWith('resourcehive_access_token='),
    );
    const refreshTokenCookie = (setCookie as string[]).find((cookie) =>
      cookie.startsWith('resourcehive_refresh_token='),
    );
    expect(accessTokenCookie).toContain('HttpOnly');
    expect(accessTokenCookie).toContain('SameSite=Lax');
    expect(accessTokenCookie).toContain('Path=/');
    expect(refreshTokenCookie).toContain('HttpOnly');
    expect(refreshTokenCookie).toContain('SameSite=Lax');
    expect(refreshTokenCookie).toContain('Path=/auth');

    authenticationCookie = accessTokenCookie?.split(';')[0] ?? '';
    refreshCookie = refreshTokenCookie?.split(';')[0] ?? '';
    expect(authenticationCookie).not.toBe('');
    expect(refreshCookie).not.toBe('');
  });

  it('validates the cookie JWT and returns identity headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/validate')
      .set('Cookie', authenticationCookie)
      .expect(200);

    // NGINX uses this endpoint to capture headers
    expect(response.headers['x-user-id']).toBeDefined();
    expect(response.headers['x-tenant-id']).toBeDefined();
    expect(response.headers['x-user-role']).toBe('member');
    expect(response.headers['x-user-email']).toBe(testEmail);
  });

  it('returns the current user without exposing private account data', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', authenticationCookie)
      .expect(200);

    const body = response.body as CurrentUserResponse;
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(body).toMatchObject({
      user: {
        email: testEmail,
        firstName: 'Demo',
        lastName: 'User',
        displayName: 'Demo User',
        emailVerified: true,
        status: 'ACTIVE',
        platformRole: 'USER',
      },
      organizationContext: {
        role: 'member',
      },
    });
    expect(typeof body.user.id).toBe('string');
    expect(Number.isNaN(Date.parse(body.user.createdAt))).toBe(false);
    expect(typeof body.organizationContext.organizationId).toBe('string');
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('rejects current-user requests without an authentication cookie', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('rejects an invalid JWT', async () => {
    await request(app.getHttpServer())
      .get('/auth/validate')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('rotates the refresh cookie and issues a new access cookie', async () => {
    const previousRefreshCookie = refreshCookie;
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(response.body).toEqual({
      message: 'Session refreshed successfully',
    });
    expect(response.headers['cache-control']).toBe('no-store');

    const setCookie = response.headers['set-cookie'] as unknown as string[];
    const accessTokenCookie = setCookie.find((cookie) =>
      cookie.startsWith('resourcehive_access_token='),
    );
    const refreshTokenCookie = setCookie.find((cookie) =>
      cookie.startsWith('resourcehive_refresh_token='),
    );
    authenticationCookie = accessTokenCookie?.split(';')[0] ?? '';
    refreshCookie = refreshTokenCookie?.split(';')[0] ?? '';

    expect(authenticationCookie).not.toBe('');
    expect(refreshCookie).not.toBe('');
    expect(refreshCookie).not.toBe(previousRefreshCookie);

    await request(app.getHttpServer())
      .get('/auth/validate')
      .set('Cookie', authenticationCookie)
      .expect(200);
  });

  it('revokes the refresh session and clears both cookies during logout', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `${authenticationCookie}; ${refreshCookie}`)
      .expect(204);

    const setCookie = response.headers['set-cookie'] as unknown as string[];
    expect(Array.isArray(setCookie)).toBe(true);
    expect(
      setCookie.some((cookie) =>
        cookie.includes('resourcehive_access_token=;'),
      ),
    ).toBe(true);
    expect(
      setCookie.some((cookie) =>
        cookie.includes('resourcehive_refresh_token=;'),
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
  });

  it('registers an unverified user from an approved email domain', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        firstName: 'Signup',
        lastName: 'Test',
        email: signupEmail,
        password: 'SignupPassword123!',
      })
      .expect(201);

    const body = response.body as RegistrationResponse;
    expect(body.user.email).toBe(signupEmail);
    expect(body.user.emailVerified).toBe(false);

    const verificationUrl = new URL(body.developmentVerificationUrl);
    verificationToken = verificationUrl.searchParams.get('token') ?? '';
    expect(verificationToken).not.toBe('');
  });

  it('reports the signup verification as pending', async () => {
    await request(app.getHttpServer())
      .post('/auth/verification-status')
      .send({ token: verificationToken })
      .expect(200)
      .expect({
        status: 'PENDING',
        emailVerified: false,
      });
  });

  it('verifies the signup and creates the approved root membership', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);

    expect(response.body).toMatchObject({
      user: {
        email: signupEmail,
        emailVerified: true,
        organizations: [
          expect.objectContaining({
            name: 'Demo Organization',
            role: 'MEMBER',
            status: 'APPROVED',
          }),
        ],
      },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: signupEmail },
      include: {
        memberships: true,
      },
    });
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(user.memberships).toEqual([
      expect.objectContaining({
        role: 'MEMBER',
        status: 'APPROVED',
      }),
    ]);
  });

  it('reports success when the verified signup link is opened again', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);

    expect(response.body).toMatchObject({
      message: 'Email is already verified. You can log in.',
      user: {
        email: signupEmail,
        emailVerified: true,
        organizations: [
          expect.objectContaining({
            name: 'Demo Organization',
            role: 'MEMBER',
            status: 'APPROVED',
          }),
        ],
      },
    });
  });

  it('reports the signup verification as verified from the database', async () => {
    await request(app.getHttpServer())
      .post('/auth/verification-status')
      .send({ token: verificationToken })
      .expect(200)
      .expect({
        status: 'VERIFIED',
        emailVerified: true,
      });
  });

  it('returns the same password reset response for existing and unknown accounts', async () => {
    const existingResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: signupEmail })
      .expect(200);
    const unknownResponse = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'unknown@example.edu' })
      .expect(200);

    expect(existingResponse.body).toEqual(unknownResponse.body);

    const signupUser = await prisma.user.findUniqueOrThrow({
      where: { email: signupEmail },
      select: { id: true },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { userId: signupUser.id },
    });
    await prisma.passwordResetToken.create({
      data: {
        userId: signupUser.id,
        tokenHash: createHash('sha256')
          .update(passwordResetToken)
          .digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
  });

  it('resets the password, clears the cookie, and consumes the token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: passwordResetToken,
        password: resetPassword,
      })
      .expect(200);

    expect(response.body).toEqual({
      message: 'Password reset successfully. Log in with your new password.',
    });
    const setCookie = response.headers['set-cookie'] as unknown;
    expect(Array.isArray(setCookie)).toBe(true);
    expect((setCookie as string[])[0]).toContain('resourcehive_access_token=;');
  });

  it('rejects the old password and accepts the new password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: signupEmail, password: 'SignupPassword123!' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: signupEmail, password: resetPassword })
      .expect(200);
  });

  it('rejects reuse of a consumed password reset token', async () => {
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: passwordResetToken,
        password: 'AnotherPassword123!',
      })
      .expect(400);
  });

  afterAll(async () => {
    const signupUser = await prisma.user.findUnique({
      where: { email: signupEmail },
      select: { id: true },
    });
    if (signupUser) {
      await prisma.$transaction([
        prisma.organizationMembership.deleteMany({
          where: { userId: signupUser.id },
        }),
        prisma.refreshToken.deleteMany({
          where: { userId: signupUser.id },
        }),
        prisma.passwordResetToken.deleteMany({
          where: { userId: signupUser.id },
        }),
        prisma.emailVerificationToken.deleteMany({
          where: { userId: signupUser.id },
        }),
        prisma.user.delete({
          where: { id: signupUser.id },
        }),
      ]);
    }
    await prisma.refreshToken.deleteMany({
      where: {
        user: { email: testEmail },
      },
    });

    await app.close();
    if (originalEmailTransport === undefined) {
      delete process.env.EMAIL_TRANSPORT;
    } else {
      process.env.EMAIL_TRANSPORT = originalEmailTransport;
    }
    if (originalBcryptRounds === undefined) {
      delete process.env.BCRYPT_ROUNDS;
    } else {
      process.env.BCRYPT_ROUNDS = originalBcryptRounds;
    }
  });
});
