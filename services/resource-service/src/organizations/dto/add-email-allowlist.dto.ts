import { IsEmail } from 'class-validator';

export class AddEmailAllowlistDto {
  @IsEmail()
  email!: string;
}
