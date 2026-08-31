import { IsIn, IsString, Length } from "class-validator";

export class RegisterDeviceDto {
  @IsString()
  @Length(10, 512)
  token!: string;

  @IsIn(["ANDROID", "IOS"])
  platform!: "ANDROID" | "IOS";
}
