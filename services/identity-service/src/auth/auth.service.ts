import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const DEFAULT_BCRYPT_ROUNDS = 12;
const DEFAULT_VERIFICATION_TOKEN_LIFETIME = '24h';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
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

    return {
      message: 'Account created. Verify your email to continue.',
      verificationRequired: true,
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

    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        userId: user.id,
        status: 'APPROVED',
      },
      orderBy: { joinedAt: 'asc' },
    });

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        organizationId: membership?.organizationId ?? null,
        role: membership?.role.toLowerCase() ?? 'member',
      },
      {
        secret: this.getJwtSecret(),
        expiresIn: '1d',
      },
    );

    return {
      message: 'user login successfully',
      token,
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
    const value =
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN ??
      DEFAULT_VERIFICATION_TOKEN_LIFETIME;
    const match = value.match(/^(\d+)(m|h|d)$/);
    if (!match) {
      throw new InternalServerErrorException(
        'EMAIL_VERIFICATION_TOKEN_EXPIRES_IN must use m, h, or d',
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
}
