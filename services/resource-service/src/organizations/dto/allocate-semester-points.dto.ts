import {
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AllocateSemesterPointsDto {
  @ApiProperty({
    description: 'The amount of points to allocate to each active member',
    example: 500,
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'The name of the semester',
    example: 'Semester-1/2026',
  })
  @IsString()
  @IsNotEmpty()
  semesterName: string;

  @ApiProperty({
    description: 'The target child organization IDs to receive points',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  targetOrganizationIds: string[];
}
