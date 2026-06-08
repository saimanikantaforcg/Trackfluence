import { IsString, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AudienceRuleDto {
  @ApiProperty()
  @IsString()
  field!: string;

  @ApiProperty()
  @IsString()
  operator!: string;

  @ApiProperty()
  value: any;
}

export class CreateAudienceDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [AudienceRuleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AudienceRuleDto)
  rules!: AudienceRuleDto[];
}

export enum ExportDestination {
  SALESFORCE = 'salesforce',
  SALESFORCE_DATA_CLOUD = 'salesforce_data_cloud',
  SFMC = 'sfmc',
  SHOPIFY = 'shopify',
}

export class ExportAudienceDto {
  @ApiProperty({ enum: ExportDestination })
  @IsEnum(ExportDestination)
  destination!: ExportDestination;
}
