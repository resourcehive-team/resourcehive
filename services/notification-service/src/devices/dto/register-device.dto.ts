import { IsIn, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class RegisterDeviceDto {
  @IsString()
  @Length(10, 512)
  installationId!: string;

  @IsIn(["FID", "TOKEN"])
  identifierType: "FID" | "TOKEN" = "FID";

  @IsIn(["ANDROID", "IOS"])
  platform!: "ANDROID" | "IOS";

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}
