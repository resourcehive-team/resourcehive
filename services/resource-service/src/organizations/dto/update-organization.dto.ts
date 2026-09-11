import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateOrganizationDto{
    @ApiPropertyOptional({description:'The name of the organization'})
    @IsString()
    @IsOptional()
    name?:string;

    @ApiPropertyOptional({ description: 'The status of the organization (e.g. ACTIVE, SUSPENDED)' })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ description: 'Bonus points awarded upon joining' })
    @IsNumber()
    @IsOptional()
    joinBonusPoints?: number;
}