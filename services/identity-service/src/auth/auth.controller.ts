import {
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Delete,
  Req,
  Res,
  UnauthorizedException,
  ServiceUnavailableException,
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
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';
import { PasswordActionDto } from './dto/password-action.dto';
import {
  clearGoogleOAuthFlowCookie,
  extractGoogleOAuthFlow,
  setGoogleOAuthFlowCookie,
} from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('providers')
  getProviders() {
    return this.authService.getAuthProviders();
  }

  @Get('google/login')
  async googleLogin(@Req() request: Request, @Res() response: Response) {
    try {
      const next =
        typeof request.query.next === 'string'
          ? request.query.next
          : '/dashboard';
      const flow = await this.authService.beginGoogleLogin(next);
      setGoogleOAuthFlowCookie(response, flow.flowToken);
      return response.redirect(flow.authorizationUrl);
    } catch {
      return response.redirect(this.googleErrorRedirect('GOOGLE_UNAVAILABLE'));
    }
  }

  @Post('google/connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async googleConnect(
    @Req() request: AuthenticatedRequest,
    @Body() body: PasswordActionDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.user)
      throw new UnauthorizedException('Authentication is required');
    const flow = await this.authService.beginGoogleConnection(
      request.user.userId,
      body.password,
    );
    setGoogleOAuthFlowCookie(response, flow.flowToken);
    return { authorizationUrl: flow.authorizationUrl };
  }

  @Get('google/callback')
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    const flowToken = extractGoogleOAuthFlow(request);
    const code =
      typeof request.query.code === 'string' ? request.query.code : '';
    const state =
      typeof request.query.state === 'string' ? request.query.state : '';
    const providerError =
      typeof request.query.error === 'string' ? request.query.error : '';
    clearGoogleOAuthFlowCookie(response);
    if (providerError === 'access_denied') {
      return response.redirect(this.googleErrorRedirect('GOOGLE_CANCELLED'));
    }
    try {
      const result = await this.authService.completeGoogleCallback(
        code,
        state,
        flowToken ?? '',
      );
      if ('accessToken' in result) {
        setAccessTokenCookie(response, result.accessToken);
        setRefreshTokenCookie(
          response,
          result.refreshToken,
          result.refreshTokenExpiresAt,
        );
      }
      return response.redirect(this.frontendRedirect(result.redirectPath));
    } catch (error) {
      const code =
        error instanceof ServiceUnavailableException
          ? 'GOOGLE_UNAVAILABLE'
          : error instanceof ConflictException
            ? 'ACCOUNT_EMAIL_EXISTS'
            : error instanceof UnauthorizedException
              ? String(error.message).includes('unavailable')
                ? 'ACCOUNT_SUSPENDED'
                : 'OAUTH_FAILED'
              : 'OAUTH_FAILED';
      return response.redirect(this.googleErrorRedirect(code));
    }
  }

  @Delete('google/connection')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async googleDisconnect(
    @Req() request: AuthenticatedRequest,
    @Body() body: PasswordActionDto,
  ) {
    if (!request.user)
      throw new UnauthorizedException('Authentication is required');
    return this.authService.disconnectGoogle(
      request.user.userId,
      body.password,
    );
  }

  @Post('password/setup-request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async passwordSetupRequest(@Req() request: AuthenticatedRequest) {
    if (!request.user)
      throw new UnauthorizedException('Authentication is required');
    return this.authService.requestPasswordSetup(request.user.userId);
  }

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

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() request: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(request);
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
    try {
      await this.authService.revokeSession(extractRefreshToken(request));
    } finally {
      clearAuthenticationCookies(response);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  async me(@Req() request: AuthenticatedRequest) {
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
        authenticationMethods: await this.authService.getAuthenticationMethods(
          user.userId,
        ),
      },
      organizationContext: {
        organizationId: user.tenantId || null,
        role: user.role || null,
      },
    };
  }

  @Get('me/points')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  getCurrentUserPoints(@Req() request: AuthenticatedRequest) {
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    return this.authService.getCurrentUserPoints(user.userId);
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

  private frontendRedirect(path: string): string {
    return new URL(
      path,
      process.env.APP_URL ?? 'http://localhost:3000',
    ).toString();
  }

  private googleErrorRedirect(code: string): string {
    const url = new URL(
      '/login',
      process.env.APP_URL ?? 'http://localhost:3000',
    );
    url.searchParams.set('oauthError', code);
    return url.toString();
  }
}
