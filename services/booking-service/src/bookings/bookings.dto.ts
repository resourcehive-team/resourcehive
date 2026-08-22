import { ApiProperty } from "@nestjs/swagger";
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
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  makeSlotAvailable?: boolean;
}

class BookingQueryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}

export class GetUserBookingsDto extends BookingQueryDto {}

export class GetOrgBookingsDto extends BookingQueryDto {}
