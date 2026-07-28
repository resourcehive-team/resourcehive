import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsUUID } from "class-validator";
import { Type } from "class-transformer";

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
