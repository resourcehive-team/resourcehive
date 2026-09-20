import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import {
  DISPUTE_REASONS,
  DISPUTE_STATUSES,
  RESOURCE_ACTIONS,
} from "./dispute.types";

export class CreateDisputeDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ enum: DISPUTE_REASONS })
  @IsEnum(DISPUTE_REASONS)
  reason!: (typeof DISPUTE_REASONS)[number];

  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  evidence?: string[];
}

export class UpdateDisputeDto {
  @IsOptional()
  @IsEnum(DISPUTE_STATUSES)
  status?: (typeof DISPUTE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNotes?: string;

  @IsOptional()
  @IsEnum(RESOURCE_ACTIONS)
  resourceAction?: (typeof RESOURCE_ACTIONS)[number];
}
