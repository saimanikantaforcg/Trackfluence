import { IsString, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TrackingLinkTypeDto {
  STANDARD = 'STANDARD',
  PROMO_CODE = 'PROMO_CODE',
  QR_CODE = 'QR_CODE',
  REFERRAL = 'REFERRAL',
}

export class CreateTrackingLinkDto {
  @ApiProperty()
  @IsString()
  creatorId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty()
  @IsUrl()
  destinationUrl!: string;

  @ApiProperty({ enum: TrackingLinkTypeDto })
  @IsEnum(TrackingLinkTypeDto)
  type!: TrackingLinkTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promoCode?: string;
}
