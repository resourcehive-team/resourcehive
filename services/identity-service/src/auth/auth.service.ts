import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { EmailService } from '../email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const DEFAULT_BCRYPT_ROUNDS = 12;
const DEFAULT_VERIFICATION_TOKEN_LIFETIME = '24h';
const DEFAULT_PASSWORD_RESET_TOKEN_LIFETIME = '1h';
const DEFAULT_ACCESS_TOKEN_LIFETIME = '15m';
const DEFAULT_REFRESH_TOKEN_LIFETIME = '30d';
const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const PASSWORD_RESET_REQUEST_MESSAGE =
  'If an account exists for that email, a password reset link has been sent.';
const INVALID_PASSWORD_RESET_MESSAGE =
  'Password reset link is invalid or has expired.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'change_me') {
      throw new InternalServerErrorException('JWT_SECRET must be configured');
    }
    return secret;
  }

  async register(registration: RegisterDto) {
    const email = registration.email.trim().toLowerCase();
    const emailDomain = this.getEmailDomain(email);

    const domainConfiguration =
      await this.prisma.organizationEmailDomain.findUnique({
        where: { domain: emailDomain },
        select: {
          organizationId: true,
          organization: {
            select: {
              name: true,
              status: true,
            },
          },
        },
      });

    if (
      !domainConfiguration ||
      domainConfiguration.organization.status !== 'ACTIVE'
    ) {
      throw new BadRequestException(
        'Use an email address from an approved organization',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(
      registration.password,
      this.getBcryptRounds(),
    );
    const verificationToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(verificationToken);
    const expiresAt = new Date(
      Date.now() + this.getVerificationTokenLifetimeMs(),
    );

    const user = await this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          passwordHash,
          firstName: registration.firstName.trim(),
          lastName: registration.lastName.trim(),
          status: 'ACTIVE',
          platformRole: 'USER',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
        },
      });

      await transaction.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash,
          expiresAt,
        },
      });

      return createdUser;
    });
    const emailResult = await this.emailService.sendVerificationEmail(
      email,
      verificationToken,
    );

    return {
      message: 'Account created. Verify your email to continue.',
      verificationRequired: true,
      ...emailResult,
      user: {
        ...user,
        emailVerified: false,
        organization: {
          id: domainConfiguration.organizationId,
          name: domainConfiguration.organization.name,
        },
      },
    };
  }

  async login(loginData: LoginDto) {
    const email = loginData.email?.trim().toLowerCase();
    const password = loginData.password;

    if (!email || !password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !user.emailVerifiedAt ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.issueAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      message: 'user login successfully',
      accessToken,
      ...refreshToken,
    };
  }

  async refreshSession(token: string | null) {
    if (!token) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const now = new Date();
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: {
        id: true,
        familyId: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (storedToken.usedAt) {
      await this.revokeRefreshTokenFamily(storedToken.familyId, now);
      throw new UnauthorizedException('Invalid or expired session');
    }

    if (
      storedToken.revokedAt ||
      storedToken.expiresAt <= now ||
      storedToken.user.status !== 'ACTIVE' ||
      !storedToken.user.emailVerifiedAt
    ) {
      await this.revokeRefreshTokenFamily(storedToken.familyId, now);
      throw new UnauthorizedException('Invalid or expired session');
    }

    const accessToken = await this.issueAccessToken(storedToken.user);
    const nextToken = randomBytes(32).toString('base64url');

    await this.prisma.$transaction(async (transaction) => {
      const claimedToken = await transaction.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimedToken.count !== 1) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      await transaction.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          familyId: storedToken.familyId,
          tokenHash: this.hashToken(nextToken),
          expiresAt: storedToken.expiresAt,
        },
      });
    });

    return {
      message: 'Session refreshed successfully',
      accessToken,
      refreshToken: nextToken,
      refreshTokenExpiresAt: storedToken.expiresAt,
    };
  }

  async revokeSession(token: string | null): Promise<void> {
    if (!token) return;

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: { familyId: true },
    });
    if (!storedToken) return;

    await this.revokeRefreshTokenFamily(storedToken.familyId, new Date());
  }

  async requestPasswordReset(request: ForgotPasswordDto) {
    const email = request.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const mostRecentToken = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (
      mostRecentToken &&
      mostRecentToken.createdAt.getTime() + PASSWORD_RESET_REQUEST_COOLDOWN_MS >
        Date.now()
    ) {
      return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.getPasswordResetTokenLifetimeMs(),
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      await transaction.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(token),
          expiresAt,
        },
      });
    });

    try {
      await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      this.logger.error(
        `Unable to send password reset email for user ${user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return { message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  async resetPassword(reset: ResetPasswordDto) {
    const now = new Date();
    const passwordResetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(reset.token) },
      select: {
        id: true,
        usedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            status: true,
            emailVerifiedAt: true,
          },
        },
      },
    });

    if (
      !passwordResetToken ||
      passwordResetToken.usedAt ||
      passwordResetToken.expiresAt <= now ||
      passwordResetToken.user.status !== 'ACTIVE' ||
      !passwordResetToken.user.emailVerifiedAt
    ) {
      throw new BadRequestException(INVALID_PASSWORD_RESET_MESSAGE);
    }

    if (
      await bcrypt.compare(reset.password, passwordResetToken.user.passwordHash)
    ) {
      throw new BadRequestException(
        'New password must be different from your current password.',
      );
    }

    const passwordHash = await bcrypt.hash(
      reset.password,
      this.getBcryptRounds(),
    );

    await this.prisma.$transaction(async (transaction) => {
      const claimedToken = await transaction.passwordResetToken.updateMany({
        where: {
          id: passwordResetToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimedToken.count !== 1) {
        throw new BadRequestException(INVALID_PASSWORD_RESET_MESSAGE);
      }

      await transaction.user.update({
        where: { id: passwordResetToken.user.id },
        data: { passwordHash },
      });
      await transaction.passwordResetToken.updateMany({
        where: {
          userId: passwordResetToken.user.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });
      await transaction.refreshToken.updateMany({
        where: {
          userId: passwordResetToken.user.id,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
    });

    try {
      await this.emailService.sendPasswordChangedEmail(
        passwordResetToken.user.email,
      );
    } catch (error) {
      this.logger.error(
        `Unable to send password change confirmation for user ${passwordResetToken.user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return {
      message: 'Password reset successfully. Log in with your new password.',
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const verificationToken =
        await transaction.emailVerificationToken.findUnique({
          where: { tokenHash },
          select: {
            id: true,
            usedAt: true,
            expiresAt: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true,
                emailVerifiedAt: true,
              },
            },
          },
        });

      if (!verificationToken) {
        throw new BadRequestException(
          'Verification link is invalid or has expired',
        );
      }

      if (verificationToken.user.emailVerifiedAt) {
        const memberships = await transaction.organizationMembership.findMany({
          where: {
            userId: verificationToken.user.id,
            status: 'APPROVED',
          },
          select: {
            role: true,
            status: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        });

        return {
          message: 'Email is already verified. You can log in.',
          user: {
            ...verificationToken.user,
            emailVerified: true,
            organizations: memberships.map((membership) => ({
              ...membership.organization,
              role: membership.role,
              status: membership.status,
            })),
          },
        };
      }

      if (verificationToken.usedAt || verificationToken.expiresAt <= now) {
        throw new BadRequestException(
          'Verification link is invalid or has expired',
        );
      }

      const emailDomain = this.getEmailDomain(verificationToken.user.email);
      const domainConfiguration =
        await transaction.organizationEmailDomain.findUnique({
          where: { domain: emailDomain },
          select: {
            organizationId: true,
            autoJoin: true,
            organization: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        });

      if (
        !domainConfiguration ||
        domainConfiguration.organization.status !== 'ACTIVE'
      ) {
        throw new BadRequestException(
          'Verification link is invalid or has expired',
        );
      }

      const claimedToken = await transaction.emailVerificationToken.updateMany({
        where: {
          id: verificationToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimedToken.count !== 1) {
        throw new BadRequestException(
          'Verification link is invalid or has expired',
        );
      }

      const allowlistEntries =
        await transaction.organizationEmailAllowlist.findMany({
          where: {
            email: verificationToken.user.email,
            usedAt: null,
            organization: {
              rootOrganizationId: domainConfiguration.organizationId,
              status: 'ACTIVE',
            },
          },
          select: {
            id: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      const organizationsToJoin = new Map<
        string,
        { id: string; name: string }
      >();
      if (domainConfiguration.autoJoin) {
        organizationsToJoin.set(domainConfiguration.organization.id, {
          id: domainConfiguration.organization.id,
          name: domainConfiguration.organization.name,
        });
      }
      for (const entry of allowlistEntries) {
        organizationsToJoin.set(entry.organization.id, entry.organization);
      }

      for (const organization of organizationsToJoin.values()) {
        await transaction.organizationMembership.upsert({
          where: {
            userId_organizationId: {
              userId: verificationToken.user.id,
              organizationId: organization.id,
            },
          },
          create: {
            userId: verificationToken.user.id,
            organizationId: organization.id,
            role: 'MEMBER',
            status: 'APPROVED',
          },
          update: {
            role: 'MEMBER',
            status: 'APPROVED',
            approvedBy: null,
          },
        });
      }

      if (allowlistEntries.length > 0) {
        await transaction.organizationEmailAllowlist.updateMany({
          where: {
            id: { in: allowlistEntries.map((entry) => entry.id) },
            usedAt: null,
          },
          data: { usedAt: now },
        });
      }

      const user = await transaction.user.update({
        where: { id: verificationToken.user.id },
        data: { emailVerifiedAt: now },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          emailVerifiedAt: true,
        },
      });

      return {
        message: 'Email verified. You can now sign in.',
        user: {
          ...user,
          emailVerified: true,
          organizations: [...organizationsToJoin.values()].map(
            (organization) => ({
              ...organization,
              role: 'MEMBER',
              status: 'APPROVED',
            }),
          ),
        },
      };
    });
  }

  async getEmailVerificationStatus(token: string) {
    const verificationToken =
      await this.prisma.emailVerificationToken.findUnique({
        where: { tokenHash: this.hashToken(token) },
        select: {
          usedAt: true,
          expiresAt: true,
          user: {
            select: {
              emailVerifiedAt: true,
            },
          },
        },
      });

    if (!verificationToken) {
      throw new BadRequestException('Verification link is invalid');
    }

    if (verificationToken.user.emailVerifiedAt) {
      return {
        status: 'VERIFIED' as const,
        emailVerified: true,
      };
    }

    if (verificationToken.usedAt || verificationToken.expiresAt <= new Date()) {
      return {
        status: 'EXPIRED' as const,
        emailVerified: false,
      };
    }

    return {
      status: 'PENDING' as const,
      emailVerified: false,
    };
  }

  private getEmailDomain(email: string): string {
    const separatorIndex = email.lastIndexOf('@');
    if (separatorIndex <= 0 || separatorIndex === email.length - 1) {
      throw new BadRequestException('Enter a valid email address');
    }
    return email.slice(separatorIndex + 1);
  }

  private getBcryptRounds(): number {
    const configuredRounds = Number(
      process.env.BCRYPT_ROUNDS ?? DEFAULT_BCRYPT_ROUNDS,
    );
    if (
      !Number.isInteger(configuredRounds) ||
      configuredRounds < 4 ||
      configuredRounds > 15
    ) {
      throw new InternalServerErrorException(
        'BCRYPT_ROUNDS must be an integer between 4 and 15',
      );
    }
    return configuredRounds;
  }

  private getVerificationTokenLifetimeMs(): number {
    return this.parseTokenLifetime(
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN ??
        DEFAULT_VERIFICATION_TOKEN_LIFETIME,
      'EMAIL_VERIFICATION_TOKEN_EXPIRES_IN',
    );
  }

  private getPasswordResetTokenLifetimeMs(): number {
    return this.parseTokenLifetime(
      process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN ??
        DEFAULT_PASSWORD_RESET_TOKEN_LIFETIME,
      'PASSWORD_RESET_TOKEN_EXPIRES_IN',
    );
  }

  private getRefreshTokenLifetimeMs(): number {
    return this.parseTokenLifetime(
      process.env.REFRESH_TOKEN_EXPIRES_IN ?? DEFAULT_REFRESH_TOKEN_LIFETIME,
      'REFRESH_TOKEN_EXPIRES_IN',
    );
  }

  private getAccessTokenLifetime(): `${number}${'m' | 'h' | 'd'}` {
    const value = process.env.JWT_EXPIRES_IN ?? DEFAULT_ACCESS_TOKEN_LIFETIME;
    this.parseTokenLifetime(value, 'JWT_EXPIRES_IN');
    return value as `${number}${'m' | 'h' | 'd'}`;
  }

  private parseTokenLifetime(value: string, environmentName: string): number {
    const match = value.match(/^(\d+)(m|h|d)$/);
    if (!match) {
      throw new InternalServerErrorException(
        `${environmentName} must use m, h, or d`,
      );
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const unitMilliseconds = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    }[unit];

    return amount * unitMilliseconds;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueAccessToken(user: { id: string; email: string }) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        userId: user.id,
        status: 'APPROVED',
      },
      orderBy: { joinedAt: 'asc' },
    });

    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        organizationId: membership?.organizationId ?? null,
        role: membership?.role.toLowerCase() ?? null,
      },
      {
        secret: this.getJwtSecret(),
        expiresIn: this.getAccessTokenLifetime(),
      },
    );
  }

  private async issueRefreshToken(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.getRefreshTokenLifetimeMs());

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId: randomUUID(),
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });

    return {
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  private async revokeRefreshTokenFamily(
    familyId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: { revokedAt },
    });
  }
}
