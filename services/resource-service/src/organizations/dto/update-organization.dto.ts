import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsIn, Min } from 'class-validator';

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
  @Min(0)
  @IsOptional()
  joinBonusPoints?: number;
}
