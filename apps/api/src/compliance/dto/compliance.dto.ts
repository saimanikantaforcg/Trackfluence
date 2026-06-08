import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContentTypeDto {
  POST = 'POST',
  STORY = 'STORY',
  VIDEO = 'VIDEO',
  BLOG = 'BLOG',
}

export class FTCCheckDto {
  @ApiProperty()
  @IsString()
  creatorId!: string;

  @ApiProperty()
  @IsString()
  contentUrl!: string;

  @ApiProperty({ enum: ContentTypeDto })
  @IsEnum(ContentTypeDto)
  contentType!: ContentTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSponsorship?: boolean;
}
