import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Human-readable label for this key' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Permission scopes', example: ['read', 'write'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsOptional()
  scopes?: string[];
}
