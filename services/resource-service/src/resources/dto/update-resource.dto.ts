import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateResourceDto } from './create-resource.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {
  @ApiPropertyOptional({ example: 'ARCHIVED', description: 'Status of the resource (ACTIVE, ARCHIVED, etc.)' })
  @IsString()
  @IsOptional()
  status?: string;
}
