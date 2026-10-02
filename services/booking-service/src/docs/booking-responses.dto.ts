import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SlotResourceResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Conference Room A" })
  name!: string;

  @ApiProperty({ enum: ["ACTIVE", "INACTIVE"] })
  status!: string;

  @ApiProperty({ format: "uuid" })
  rootOrganizationId!: string;

  @ApiProperty({ format: "uuid" })
  ownerOrganizationId!: string;

  @ApiProperty({ minimum: 0, example: 10 })
  pointCost!: number;
}

export class SlotResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  resourceId!: string;

  @ApiProperty({ format: "date-time" })
  startsAt!: Date;

  @ApiProperty({ format: "date-time" })
  endsAt!: Date;

  @ApiProperty({ enum: ["PUBLISHED", "WITHDRAWN"] })
  status!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ example: true })
  available!: boolean;

  @ApiPropertyOptional({ type: SlotResourceResponseDto })
  resource?: SlotResourceResponseDto;
}

export class BookingResourceResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Conference Room A" })
  name!: string;

  @ApiProperty({ minimum: 0, example: 10 })
  pointCost!: number;

  @ApiProperty({ format: "uuid" })
  ownerOrganizationId!: string;
}

export class BookingSlotResponseDto {
  @ApiProperty({ format: "date-time" })
  startsAt!: Date;

  @ApiProperty({ format: "date-time" })
  endsAt!: Date;

  @ApiProperty({ type: BookingResourceResponseDto })
  resource!: BookingResourceResponseDto;
}

export class BookingMemberResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Alex" })
  firstName!: string;

  @ApiProperty({ example: "Student" })
  lastName!: string;

  @ApiProperty({ format: "email" })
  email!: string;

  @ApiProperty({ nullable: true, format: "uri" })
  avatarUrl!: string | null;

  @ApiProperty({ enum: ["ACTIVE", "SUSPENDED"] })
  status!: string;

  @ApiProperty({ nullable: true, format: "date-time" })
  emailVerifiedAt!: Date | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

export class BookingResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  resourceSlotId!: string;

  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ enum: ["CONFIRMED", "CANCELLED", "COMPLETED"] })
  status!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: BookingSlotResponseDto })
  resourceSlot!: BookingSlotResponseDto;
}

export class OrganizationBookingResponseDto extends BookingResponseDto {
  @ApiProperty({ type: BookingMemberResponseDto })
  user!: BookingMemberResponseDto;
}

export class CreatedBookingResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  resourceSlotId!: string;

  @ApiProperty({ format: "uuid" })
  resourceId!: string;

  @ApiProperty({ example: "Conference Room A" })
  resourceName!: string;

  @ApiProperty({ format: "uuid" })
  ownerOrganizationId!: string;

  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ enum: ["CONFIRMED"] })
  status!: string;

  @ApiProperty({ format: "date-time" })
  startsAt!: Date;

  @ApiProperty({ format: "date-time" })
  endsAt!: Date;

  @ApiProperty({ minimum: 0 })
  pointsDeducted!: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

export class CancelledBookingResponseDto extends OrganizationBookingResponseDto {
  @ApiProperty({ minimum: 0 })
  refundPoints!: number;

  @ApiProperty({ enum: ["PUBLISHED", "WITHDRAWN"] })
  slotStatus!: string;

  @ApiProperty({ example: true })
  cancelledByUser!: boolean;

  @ApiProperty({ nullable: true, maxLength: 500 })
  cancellationReason!: string | null;
}

export class HealthResponseDto {
  @ApiProperty({ example: "booking-service" })
  service!: string;

  @ApiProperty({ example: "ok" })
  status!: string;

  @ApiProperty({ example: "connected" })
  database!: string;
}

export class LivenessResponseDto {
  @ApiProperty({ example: "booking-service" })
  service!: string;

  @ApiProperty({ example: "ok" })
  status!: string;
}
