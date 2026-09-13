import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'The name of the organization' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'The status of the organization (e.g. ACTIVE, SUSPENDED)',
  })
  @IsString()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Bonus points awarded upon joining' })
  @IsInt()
  @IsOptional()
  joinBonusPoints?: number;
}
