import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class AddEmailDomainDto {
  @IsString()
  @MaxLength(253)
  @Matches(
    /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/,
  )
  domain!: string;

  @IsOptional()
  @IsBoolean()
  autoJoin?: boolean;
}
