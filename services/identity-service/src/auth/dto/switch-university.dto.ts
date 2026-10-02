import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchUniversityDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  rootOrganizationId!: string;
}
