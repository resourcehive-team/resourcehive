import { ApiProperty } from "@nestjs/swagger";

export class NotificationResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "MEMBERSHIP_APPROVED" })
  type!: string;

  @ApiProperty({ example: "Membership approved" })
  title!: string;

  @ApiProperty({ example: "Your membership request was approved." })
  message!: string;

  @ApiProperty({ nullable: true, format: "date-time" })
  readAt!: Date | null;

  @ApiProperty({ format: "date-time" })
  createdAt!: Date;
}

export class UpdatedCountResponseDto {
  @ApiProperty({ minimum: 0, example: 3 })
  updatedCount!: number;
}

export class WebPushSubscriptionResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ format: "date-time" })
  updatedAt!: Date;
}

export class RemovedResponseDto {
  @ApiProperty({ example: true })
  removed!: boolean;
}

export class QueuedPushResponseDto {
  @ApiProperty({ format: "uuid", required: false })
  notificationId?: string;

  @ApiProperty({ minimum: 0, example: 1 })
  pushDeliveriesQueued!: number;
}

export class HealthResponseDto {
  @ApiProperty({ example: "notification-service" })
  service!: string;

  @ApiProperty({ example: "ok" })
  status!: string;

  @ApiProperty({ example: "connected" })
  database!: string;
}
