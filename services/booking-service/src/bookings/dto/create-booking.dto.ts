import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class CreateBookingDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  resourceSlotId!: string;
}
