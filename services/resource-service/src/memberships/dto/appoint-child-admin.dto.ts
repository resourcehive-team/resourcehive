import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AppointChildAdminDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string;
}
