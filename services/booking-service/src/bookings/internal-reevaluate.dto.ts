import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class InternalReevaluateDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  resourceId!: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  rootOrganizationId!: string;
}
