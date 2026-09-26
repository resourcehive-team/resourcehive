import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordActionDto {
  @ApiProperty({ format: 'password', writeOnly: true, example: 'Password123!' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
