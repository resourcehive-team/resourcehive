import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@resourcehive/database';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'change_me') {
      throw new InternalServerErrorException(
        'JWT_SECRET must be configured',
      );
    }
    return secret;
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
}
