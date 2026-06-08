import { IsString, IsOptional, IsISO8601, IsNumberString, IsIn, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign display name', example: 'Summer Launch 2026' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Campaign start date (ISO 8601)', example: '2026-06-01' })
  @IsISO8601()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Campaign end date (ISO 8601)', example: '2026-08-31' })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Total campaign budget', example: '50000' })
  @IsOptional()
  @IsNumberString()
  budget?: string;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Campaign status', enum: ['active', 'paused', 'completed'] })
  @IsOptional()
  @IsIn(['active', 'paused', 'completed'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  creatorIds?: string[];
}
