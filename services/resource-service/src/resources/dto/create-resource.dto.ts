import { IsString, IsOptional, IsInt, Min, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ example: 'Conference Room A' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Large room with a projector' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 0, description: 'Points required to book this resource' })
  @IsInt()
  @Min(0)
  @IsOptional()
  pointCost?: number;

  @ApiPropertyOptional({ type: [String], description: 'List of other Organization IDs allowed to use this resource' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  allowedOrganizationIds?: string[];
}
