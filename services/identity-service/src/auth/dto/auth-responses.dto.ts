import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ example: 'Request accepted.' })
  message!: string;
}

export class RegistrationOrganizationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ResourceHive Demo University' })
  name!: string;
}

export class RegistrationUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Alex' })
  firstName!: string;

  @ApiProperty({ example: 'Student' })
  lastName!: string;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: false })
  emailVerified!: boolean;

  @ApiPropertyOptional({ type: () => RegistrationOrganizationDto })
  organization?: RegistrationOrganizationDto;
}

export class RegistrationResponseDto {
  @ApiProperty({ example: 'Account created. Verify your email to continue.' })
  message!: string;

  @ApiProperty({ example: true })
  verificationRequired!: boolean;

  @ApiPropertyOptional({ format: 'uri', nullable: true })
  developmentVerificationUrl?: string;

  @ApiProperty({ type: RegistrationUserDto })
  user!: RegistrationUserDto;
}

export class ProviderAvailabilityDto {
  @ApiProperty({ example: true })
  enabled!: boolean;
}

export class AuthProvidersResponseDto {
  @ApiProperty({ type: ProviderAvailabilityDto })
  google!: ProviderAvailabilityDto;
}

export class AuthorizationUrlResponseDto {
  @ApiProperty({ format: 'uri' })
  authorizationUrl!: string;
}

export class GoogleAuthenticationMethodDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: false })
  connected!: boolean;

  @ApiPropertyOptional({ nullable: true, format: 'email' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  connectedAt!: string | null;
}

export class AuthenticationMethodsDto {
  @ApiProperty({ example: true })
  password!: boolean;

  @ApiProperty({ type: GoogleAuthenticationMethodDto })
  google!: GoogleAuthenticationMethodDto;
}

export class CurrentUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Alex' })
  firstName!: string;

  @ApiProperty({ example: 'Student' })
  lastName!: string;

  @ApiProperty({ example: 'Alex Student' })
  displayName!: string;

  @ApiProperty({ nullable: true, format: 'uri' })
  avatarUrl!: string | null;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  status!: string;

  @ApiProperty({ enum: ['USER', 'PLATFORM_ADMIN'] })
  platformRole!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: AuthenticationMethodsDto })
  authenticationMethods!: AuthenticationMethodsDto;
}

export class OrganizationContextDto {
  @ApiProperty({ nullable: true, format: 'uuid' })
  organizationId!: string | null;

  @ApiProperty({ nullable: true, enum: ['MEMBER', 'ADMIN'] })
  role!: string | null;
}

export class CurrentUserResponseDto {
  @ApiProperty({ type: CurrentUserDto })
  user!: CurrentUserDto;

  @ApiProperty({ type: OrganizationContextDto })
  organizationContext!: OrganizationContextDto;
}

export class AvatarResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Alex' })
  firstName!: string;

  @ApiProperty({ example: 'Student' })
  lastName!: string;

  @ApiProperty({ nullable: true, format: 'uri' })
  avatarUrl!: string | null;
}

export class PointsResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 100, minimum: 0 })
  availablePoints!: number;

  @ApiProperty({ nullable: true, format: 'date-time' })
  updatedAt!: string | null;
}

export class VerificationStatusResponseDto {
  @ApiProperty({ enum: ['PENDING', 'VERIFIED', 'EXPIRED'] })
  status!: string;

  @ApiProperty({ example: false })
  emailVerified!: boolean;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'identity-service' })
  service!: string;

  @ApiProperty({ example: 'ok' })
  status!: string;
}
