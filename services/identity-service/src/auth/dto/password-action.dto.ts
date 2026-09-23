import { IsString, MaxLength, MinLength } from 'class-validator';

export class PasswordActionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
