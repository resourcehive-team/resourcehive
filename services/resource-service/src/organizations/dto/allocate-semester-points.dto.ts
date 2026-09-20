import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AllocateSemesterPointsDto {
  @ApiProperty({ description: 'The amount of points to allocate to each active member', example: 500 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'The name of the semester', example: 'Semester-1/2026' })
  @IsString()
  @IsNotEmpty()
  semesterName: string;
}
