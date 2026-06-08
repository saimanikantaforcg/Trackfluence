import { IsString, IsOptional, IsISO8601, IsNumberString } from 'class-validator';

export class CreatePayoutDto {
  @IsString()
  creatorId!: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
