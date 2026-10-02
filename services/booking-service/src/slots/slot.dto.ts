import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class CreateSlotDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  resourceId!: string;

  @ApiProperty({ format: "date-time" })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ format: "date-time" })
  @Type(() => Date)
  @IsDate()
  endsAt!: Date;
}

export class ListSlotsDto {
  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAtOrAfter?: Date;

  @ApiPropertyOptional({ format: "date-time" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsBefore?: Date;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  skip = 0;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  take = 50;
}
