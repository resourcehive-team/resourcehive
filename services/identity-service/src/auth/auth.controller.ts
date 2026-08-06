import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  clearAuthenticationCookies,
  extractRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from './auth-cookie';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
    setAccessTokenCookie(response, login.accessToken);
    setRefreshTokenCookie(
      response,
      login.refreshToken,
      login.refreshTokenExpiresAt,
    );

    return {
      message: login.message,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const session = await this.authService.refreshSession(
        extractRefreshToken(request),
      );
      setAccessTokenCookie(response, session.accessToken);
      setRefreshTokenCookie(
        response,
        session.refreshToken,
        session.refreshTokenExpiresAt,
      );
      return { message: session.message };
    } catch (error) {
      clearAuthenticationCookies(response);
      throw error;
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() request: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(request);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() reset: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.resetPassword(reset);
    clearAuthenticationCookies(response);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.revokeSession(extractRefreshToken(request));
    clearAuthenticationCookies(response);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  me(@Req() request: AuthenticatedRequest) {
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    return {
      user: {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: `${user.firstName} ${user.lastName}`.trim(),
        emailVerified: user.emailVerifiedAt !== null,
        status: user.status,
        platformRole: user.platformRole,
        createdAt: user.createdAt.toISOString(),
      },
      organizationContext: {
        organizationId: user.tenantId || null,
        role: user.role || null,
      },
    };
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
    res.setHeader('X-Tenant-Id', user.tenantId ?? '');
    res.setHeader('X-User-Role', user.role ?? '');
    res.setHeader('X-User-Email', user.email);
    return res.send();
  }
}
