import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'price_starter_monthly' })
  @IsString()
  priceId!: string;
}

export class CreatePortalSessionDto {
  @ApiPropertyOptional({ example: 'https://app.trackfluence.com/settings' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
