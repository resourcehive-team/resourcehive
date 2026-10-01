import { IsBoolean } from 'class-validator';

export class UpdateEmailDomainDto {
  @IsBoolean()
  autoJoin!: boolean;
}
