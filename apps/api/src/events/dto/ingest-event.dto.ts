import { IsString, IsEnum, IsOptional, IsNumber, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EventCategoryDto {
  PAGE_VIEW = 'PAGE_VIEW',
  LINK_CLICK = 'LINK_CLICK',
  ADD_TO_CART = 'ADD_TO_CART',
  INITIATE_CHECKOUT = 'INITIATE_CHECKOUT',
  PURCHASE = 'PURCHASE',
  SIGN_UP = 'SIGN_UP',
  LEAD = 'LEAD',
  CUSTOM = 'CUSTOM',
}

export class IngestEventDto {
  @ApiProperty()
  @IsString()
  eventName!: string;

  @ApiProperty({ enum: EventCategoryDto })
  @IsEnum(EventCategoryDto)
  category!: EventCategoryDto;

  @ApiProperty()
  @IsNumber()
  timestamp!: number;

  @ApiProperty()
  @IsString()
  sessionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingLinkId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
