import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterWebPushDto {
  @ApiProperty({ minLength: 10, maxLength: 512, example: "browser-push-token" })
  @IsString()
  @Length(10, 512)
  token!: string;
}
