import { Transform } from 'class-transformer';
import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(20, 512)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Za-z]/, {
    message: 'password must contain at least one letter',
  })
  @Matches(/[0-9]/, {
    message: 'password must contain at least one number',
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'password must contain at least one special character',
  })
  password!: string;
}
