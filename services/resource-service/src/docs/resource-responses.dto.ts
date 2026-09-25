import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'ResourceHive Demo University' })
  name!: string;

  @ApiProperty({ enum: ['ROOT', 'FACULTY', 'DEPARTMENT'] })
  type!: string;

  @ApiProperty({ nullable: true, format: 'uuid' })
  parentId!: string | null;

  @ApiProperty({ format: 'uuid' })
  rootOrganizationId!: string;

  @ApiProperty({ minimum: 0, example: 25 })
  joinBonusPoints!: number;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status!: string;

  @ApiProperty({ format: 'uuid' })
  createdBy!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: () => [OrganizationResponseDto] })
  children?: OrganizationResponseDto[];
}

export class OrganizationEmailDomainResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ example: 'cse.mrt.ac.lk' })
  domain!: string;

  @ApiProperty({ example: false })
  autoJoin!: boolean;
}

export class OrganizationAllowlistResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ format: 'uuid' })
  addedBy!: string;

  @ApiProperty({ nullable: true, format: 'date-time' })
  usedAt!: Date | null;
}

export class MembershipAuditResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  membershipId!: string;

  @ApiProperty({ format: 'uuid' })
  actorUserId!: string;

  @ApiProperty({
    enum: ['APPROVED', 'REJECTED', 'ADMIN_GRANTED', 'ADMIN_REVOKED'],
  })
  action!: string;

  @ApiProperty({ nullable: true, maxLength: 500 })
  note!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class MembershipUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Alex' })
  firstName!: string;

  @ApiProperty({ example: 'Student' })
  lastName!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ nullable: true, format: 'uri' })
  avatarUrl!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  status!: string;
}

export class MembershipResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ enum: ['MEMBER', 'ADMIN'] })
  role!: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  joinedAt!: Date;

  @ApiProperty({ nullable: true, format: 'uuid' })
  reviewedBy!: string | null;

  @ApiProperty({ nullable: true, format: 'date-time' })
  reviewedAt!: Date | null;

  @ApiProperty({ nullable: true, maxLength: 500 })
  reviewNote!: string | null;

  @ApiPropertyOptional({ type: OrganizationResponseDto })
  organization?: OrganizationResponseDto;

  @ApiPropertyOptional({ type: MembershipUserResponseDto })
  user?: MembershipUserResponseDto;

  @ApiPropertyOptional({ nullable: true, type: MembershipAuditResponseDto })
  latestAudit?: MembershipAuditResponseDto | null;
}

export class ChildAdministratorResponseDto {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ type: MembershipUserResponseDto })
  user!: MembershipUserResponseDto;
}

export class ChildOrganizationAdministratorsResponseDto extends OrganizationResponseDto {
  @ApiProperty({ type: [ChildAdministratorResponseDto] })
  administrators!: ChildAdministratorResponseDto[];
}

export class ResourceAllowedOrganizationResponseDto {
  @ApiProperty({ format: 'uuid' })
  resourceId!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  rootOrganizationId!: string;
}

export class ResourceRatingUserResponseDto {
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

export class ResourceRatingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  resourceId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, maxLength: 1000 })
  comment!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: ResourceRatingUserResponseDto })
  user!: ResourceRatingUserResponseDto;
}

export class ResourceRatingSummaryResponseDto {
  @ApiProperty({ example: 4.5 })
  average!: number;

  @ApiProperty({ minimum: 0, example: 12 })
  total!: number;

  @ApiProperty({ type: [ResourceRatingResponseDto] })
  ratings!: ResourceRatingResponseDto[];
}

export class ResourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Conference Room A' })
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ format: 'uuid' })
  ownerOrganizationId!: string;

  @ApiProperty({ format: 'uuid' })
  rootOrganizationId!: string;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] })
  status!: string;

  @ApiProperty({ minimum: 0, example: 10 })
  pointCost!: number;

  @ApiProperty({ nullable: true, format: 'uri' })
  imageUrl!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({ type: [ResourceAllowedOrganizationResponseDto] })
  allowedOrganizations?: ResourceAllowedOrganizationResponseDto[];

  @ApiPropertyOptional({ type: ResourceRatingSummaryResponseDto })
  ratingSummary?: ResourceRatingSummaryResponseDto;

  @ApiPropertyOptional({ type: OrganizationResponseDto })
  ownerOrganization?: OrganizationResponseDto;
}

export class PaginatedResourcesResponseDto {
  @ApiProperty({ type: [ResourceResponseDto] })
  data!: ResourceResponseDto[];

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export class ResourceAccessResponseDto {
  @ApiProperty({ example: true })
  bookable!: boolean;

  @ApiProperty({ format: 'uuid' })
  resourceId!: string;

  @ApiProperty({ example: 'Conference Room A' })
  name!: string;

  @ApiProperty({ minimum: 0 })
  pointCost!: number;

  @ApiProperty({ format: 'uuid' })
  ownerOrganizationId!: string;
}

export class CountResponseDto {
  @ApiProperty({ minimum: 0 })
  count!: number;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}

export class ResourceRatingSubmissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  resourceId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, maxLength: 1000 })
  comment!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
