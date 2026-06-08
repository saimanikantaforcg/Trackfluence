import { IsString, IsOptional, IsEmail, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IdentityInputDto {
  @ApiProperty()
  @IsString()
  identityType!: string;

  @ApiProperty()
  @IsString()
  identityValue!: string;
}

export class ResolveIdentityDto {
  @ApiProperty({ type: [IdentityInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IdentityInputDto)
  identities!: IdentityInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class CreateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acquisitionCreatorId?: string;
}
