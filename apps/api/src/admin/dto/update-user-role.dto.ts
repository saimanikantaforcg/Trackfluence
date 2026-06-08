import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiPropertyOptional({ enum: ['ADMIN', 'MEMBER'] })
  @IsEnum(['ADMIN', 'MEMBER'])
  @IsOptional()
  role?: 'ADMIN' | 'MEMBER';
}
