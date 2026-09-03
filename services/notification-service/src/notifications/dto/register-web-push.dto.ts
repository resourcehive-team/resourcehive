import { IsString, Length } from "class-validator";

export class RegisterWebPushDto {
  @IsString()
  @Length(10, 512)
  token!: string;
}
