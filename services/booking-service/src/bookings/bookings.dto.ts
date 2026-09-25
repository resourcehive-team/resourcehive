import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { BookingStatus } from "./bookingStatus";

export class CreateBookingDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  resourceSlotId!: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ maxLength: 500, example: "No longer needed" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  makeSlotAvailable?: boolean;
}

class BookingQueryDto {
  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ minimum: 1, default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class GetUserBookingsDto extends BookingQueryDto {}

export class GetOrgBookingsDto extends BookingQueryDto {}
