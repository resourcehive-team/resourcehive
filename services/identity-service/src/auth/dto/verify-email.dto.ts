import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(20, 512)
  token: string;
}
