import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@resourcehive/database';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
  error?: string;
  error_description?: string;
  msg?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
  ) {}

  private getSupabaseConfig() {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    const key =
      process.env.SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new InternalServerErrorException(
        'SUPABASE_URL and SUPABASE_ANON_KEY are required',
      );
    }
    return { url, key };
  }

  private async authRequest(path: string, body: object) {
    const { url, key } = this.getSupabaseConfig();
    const response = await fetch(`${url}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as SupabaseAuthResponse;
    if (!response.ok) {
      throw new BadRequestException(
        payload.msg ??
          payload.error_description ??
          payload.error ??
          'Supabase authentication failed',
      );
    }
    return payload;
  }

  async register(registrationData: RegisterDto) {
    //fetch tenant and get their allowed email domain
    const tenant = await this.tenantsService.findById(
      registrationData.tenantId,
    );

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // validate institutional email
    const verifiedDomains =
      tenant.tenant_tenant_organization_tenant_idTotenant.organization_domain
        .filter((item) => item.is_verified)
        .map((item) => item.domain.toLowerCase().trim());
    const emailLower = registrationData.email.toLowerCase().trim();
    const emailDomain = emailLower.split('@')[1];
    if (!emailDomain || !verifiedDomains.includes(emailDomain)) {
      throw new BadRequestException(
        'Email must belong to a verified domain for this organization',
      );
    }

    //check if user is already exists
    const existingUser = await this.usersService.findByEmail(
      registrationData.email,
    );
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const result = await this.authRequest('signup', {
      email: emailLower,
      password: registrationData.password,
      data: { full_name: registrationData.fullName },
    });
    if (!result.user) {
      throw new InternalServerErrorException(
        'Supabase did not return the registered user',
      );
    }

    await this.prisma.tenant_membership.create({
      data: {
        person_id: result.user.id,
        tenant_id: registrationData.tenantId,
      },
    });

    return {
      message: 'User registered successfully',
      user: {
        id: result.user.id,
        tenantId: registrationData.tenantId,
        fullName: registrationData.fullName,
        email: result.user.email ?? emailLower,
      },
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
    };
  }

  async login(loginData: LoginDto) {
    const result = await this.authRequest('token?grant_type=password', {
      email: loginData.email.trim().toLowerCase(),
      password: loginData.password,
    });
    if (!result.access_token) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      message: 'User logged in successfully',
      token: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
    };
  }
}
