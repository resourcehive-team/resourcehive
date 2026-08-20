import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsBoolean()
  makeSlotAvailable?: boolean;
}
