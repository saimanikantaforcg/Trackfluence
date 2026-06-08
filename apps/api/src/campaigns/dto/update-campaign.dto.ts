import { IsString, IsOptional, IsISO8601, IsNumberString, IsIn, IsArray } from 'class-validator';

export class UpdateCampaignDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsISO8601() startDate?: string;
  @IsOptional() @IsISO8601() endDate?: string;
  @IsOptional() @IsNumberString() budget?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsIn(['active', 'paused', 'completed']) status?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) creatorIds?: string[];
}
