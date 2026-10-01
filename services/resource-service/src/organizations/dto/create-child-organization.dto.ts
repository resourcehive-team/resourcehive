import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChildOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsIn(['FACULTY', 'DEPARTMENT', 'CLUB'])
  type!: string;

  @IsEmail()
  adminEmail!: string;
}
