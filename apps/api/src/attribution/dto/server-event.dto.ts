import { IsString, IsNumber, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ActionSource {
  WEBSITE = 'website',
  APP = 'app',
  EMAIL = 'email',
  PHONE_CALL = 'phone_call',
  OTHER = 'other',
}

export class UserDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
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
  fbp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fbc?: string;
}

export class ServerEventDto {
  @ApiProperty()
  @IsString()
  eventName!: string;

  @ApiProperty()
  @IsNumber()
  eventTime!: number;

  @ApiProperty()
  @IsString()
  eventId!: string;

  @ApiProperty()
  @IsString()
  sourceUrl!: string;

  @ApiProperty({ enum: ActionSource })
  @IsEnum(ActionSource)
  actionSource!: ActionSource;

  @ApiProperty()
  @ValidateNested()
  @Type(() => UserDataDto)
  userData!: UserDataDto;
}
