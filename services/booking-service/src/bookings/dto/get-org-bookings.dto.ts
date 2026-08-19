import { IsOptional, IsInt, Min, IsString } from 'class-validator';

export class GetOrgBookingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
