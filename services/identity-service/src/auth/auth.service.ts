import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
  ) {}

  async register(registrationData: RegisterDto) {
    //fetch tenant and get their allowed email domain
    const tenant = await this.tenantsService
      .getAllTenants()
      .then((tenants) =>
        tenants.find((t) => t.tenant_id === registrationData.tenantId),
      );

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // validate institutional email
    const requiredDomain = tenant.institutional_email_domain
      .toLowerCase()
      .trim();
    const emailLower = registrationData.email.toLowerCase().trim();
    if (!emailLower.endsWith(`@${requiredDomain}`)) {
      throw new BadRequestException(
        `Email must belong to the institutional domain: ${tenant.institutional_email_domain}`,
      );
    }

    //check if user is already exists
    const existingUser = await this.usersService.findByEmail(
      registrationData.email,
    );
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    //hash password and save user
    const passwordHash = await bcrypt.hash(registrationData.password, 10);

    const newUser = await this.usersService.createUser(
      registrationData.tenantId,
      registrationData.fullName,
      registrationData.email,
      passwordHash,
    );

    return {
      message: 'user registration successfully',
      user: {
        id: newUser.user_id,
        tenantId: newUser.tenant_id,
        fullName: newUser.full_name,
        email: newUser.email,
      },
    };
  }

  async login(loginData: LoginDto) {
    const user = await this.usersService.findByEmail(loginData.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    //check password is correct
    const isPasswordValid = await bcrypt.compare(
      loginData.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid password');
    }

    //generate jwt token
    const payload = {
      userId: user.user_id,
      tenantId: user.tenant_id,
      role: user.user_role,
      email: user.email,
    };

    const token = this.jwtService.sign(payload);

    return {
      message: 'user login successfully',
      token: token,
    };
  }
}
