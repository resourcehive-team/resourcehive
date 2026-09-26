import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  ParseFilePipeBuilder,
  Post,
  Req,
  Res,
  UnauthorizedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiGatewayTimeoutResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiQuery,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  AVATAR_MAX_FILE_SIZE_BYTES,
  CloudinaryService,
} from '../cloudinary/cloudinary.service';
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
  AuthProvidersResponseDto,
  AuthorizationUrlResponseDto,
  AvatarResponseDto,
  CurrentUserResponseDto,
  MessageResponseDto,
  PointsResponseDto,
  RegistrationResponseDto,
  VerificationStatusResponseDto,
} from './dto/auth-responses.dto';
import {
  clearGoogleOAuthFlowCookie,
  extractGoogleOAuthFlow,
  setGoogleOAuthFlowCookie,
} from './auth-cookie';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get enabled authentication providers' })
  @ApiOkResponse({ type: AuthProvidersResponseDto })
  getProviders() {
    return this.authService.getAuthProviders();
  }

  @Get('google/login')
  @ApiOperation({
    summary: 'Start Google sign-in or first-time Google signup',
    description:
      'Redirects the browser to Google when Google OAuth is enabled.',
  })
  @ApiQuery({ name: 'next', required: false, example: '/dashboard' })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to Google.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Google OAuth is unavailable.',
  })
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
  @ApiOperation({ summary: 'Begin linking a Google account' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiOkResponse({ type: AuthorizationUrlResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Authentication or password confirmation is invalid.',
  })
  @ApiServiceUnavailableResponse({
    description: 'Google OAuth is unavailable.',
  })
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
  @ApiOperation({
    summary: 'Complete a Google OAuth callback',
    description:
      'Sets ResourceHive session cookies and redirects to the web application.',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Authorization code returned by Google.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'OAuth state returned by Google.',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Provider error returned by Google.',
  })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to the web application.',
  })
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
  @ApiOperation({ summary: 'Disconnect the linked Google account' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Authentication or password confirmation is invalid.',
  })
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
  @ApiOperation({ summary: 'Request a first-password setup email' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @HttpCode(HttpStatus.OK)
  async passwordSetupRequest(@Req() request: AuthenticatedRequest) {
    if (!request.user)
      throw new UnauthorizedException('Authentication is required');
    return this.authService.requestPasswordSetup(request.user.userId);
  }

  @Post('register')
  @ApiOperation({ summary: 'Create an email-and-password account' })
  @ApiCreatedResponse({ type: RegistrationResponseDto })
  @ApiBadRequestResponse({
    description: 'The registration data failed validation.',
  })
  @ApiConflictResponse({
    description: 'An account with this email already exists.',
  })
  async register(@Body() registration: RegisterDto) {
    return this.authService.register(registration);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify an email address' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({
    description: 'The verification token is invalid or expired.',
  })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verification: VerifyEmailDto) {
    return this.authService.verifyEmail(verification.token);
  }

  @Post('verification-status')
  @ApiOperation({ summary: 'Check email verification token status' })
  @ApiOkResponse({ type: VerificationStatusResponseDto })
  @ApiBadRequestResponse({ description: 'The verification token is invalid.' })
  @HttpCode(HttpStatus.OK)
  async getVerificationStatus(@Body() verification: VerifyEmailDto) {
    return this.authService.getEmailVerificationStatus(verification.token);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Request another verification email' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({
    description: 'The email address failed validation.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Verification email cooldown is active.',
  })
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() request: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(request);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Sign in with email and password',
    description: 'Sets HttpOnly access and refresh cookies on success.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Credentials are invalid or the account is unavailable.',
  })
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
  @ApiOperation({ summary: 'Rotate the current refresh-token session' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({
    description: 'The refresh session is invalid or expired.',
  })
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
  @ApiOperation({ summary: 'Request a password-reset email' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({
    description: 'The email address failed validation.',
  })
  @ApiTooManyRequestsResponse({
    description: 'Password-reset cooldown is active.',
  })
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() request: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(request);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({
    description: 'The reset token or password is invalid.',
  })
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
  @ApiOperation({ summary: 'Revoke the current session and clear cookies' })
  @ApiNoContentResponse()
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
  @ApiOperation({
    summary: 'Get the authenticated user profile and session context',
  })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
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
        avatarUrl: user.avatarUrl,
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

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload or replace the authenticated user avatar' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: AvatarResponseDto })
  @ApiBadRequestResponse({ description: 'The multipart file is missing.' })
  @ApiPayloadTooLargeResponse({
    description: 'The image exceeds the 5 MiB limit.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'The file is not a valid JPEG, PNG, or WebP image.',
  })
  @ApiBadGatewayResponse({ description: 'Cloudinary rejected the upload.' })
  @ApiGatewayTimeoutResponse({
    description: 'Cloudinary did not respond in time.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: AVATAR_MAX_FILE_SIZE_BYTES,
        files: 1,
      },
      fileFilter: (_request, file, callback) => {
        if (
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp'
        ) {
          callback(null, true);
          return;
        }

        callback(
          new UnprocessableEntityException(
            'Only JPEG, PNG, and WebP images are supported.',
          ),
          false,
        );
      },
    }),
  )
  async uploadAvatar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: AVATAR_MAX_FILE_SIZE_BYTES })
        .addFileTypeValidator({
          fileType: /^(image\/jpeg|image\/png|image\/webp)$/,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    file: Express.Multer.File | undefined,
  ) {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (!file) {
      throw new BadRequestException('A profile picture file is required.');
    }

    const uploadResult = await this.cloudinaryService.uploadAvatar(
      file,
      user.userId,
    );

    return this.authService.uploadAvatar(user.userId, uploadResult.secure_url);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove the authenticated user avatar' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiOkResponse({ type: AvatarResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
  @HttpCode(HttpStatus.OK)
  async removeAvatar(@Req() request: AuthenticatedRequest) {
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    const result = await this.authService.uploadAvatar(user.userId, null);
    await this.cloudinaryService.deleteAvatar(user.userId);
    return result;
  }

  @Get('me/points')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user points balance' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiOkResponse({ type: PointsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication is required.' })
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
  @ApiOperation({ summary: 'Validate a gateway authentication token' })
  @ApiBearerAuth('bearer')
  @ApiCookieAuth('resourcehive_access_token')
  @ApiOkResponse({
    description: 'Authentication headers are returned for trusted gateway use.',
  })
  @ApiUnauthorizedResponse({ description: 'Authentication is invalid.' })
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
