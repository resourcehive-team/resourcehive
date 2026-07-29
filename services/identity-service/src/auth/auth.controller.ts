import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { clearAccessTokenCookie, setAccessTokenCookie } from './auth-cookie';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registration: RegisterDto) {
    return this.authService.register(registration);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verification: VerifyEmailDto) {
    return this.authService.verifyEmail(verification.token);
  }

  @Post('verification-status')
  @HttpCode(HttpStatus.OK)
  async getVerificationStatus(@Body() verification: VerifyEmailDto) {
    return this.authService.getEmailVerificationStatus(verification.token);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginData: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const login = await this.authService.login(loginData);
    setAccessTokenCookie(response, login.token);

    return {
      message: login.message,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response) {
    clearAccessTokenCookie(response);
  }

  @Get('validate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  validate(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).send();
    }

    res.setHeader('X-User-Id', user.userId);
    res.setHeader('X-Tenant-Id', user.tenantId);
    res.setHeader('X-User-Role', user.role);
    res.setHeader('X-User-Email', user.email);
    return res.send();
  }
}
