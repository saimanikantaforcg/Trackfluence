import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@Roles('ADMIN')
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'List recent audit logs (admin only)' })
  getLogs(@Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number) {
    return this.audit.getRecentLogs(limit);
  }

  @Get('logs/user')
  @ApiOperation({ summary: 'Get audit logs for a specific user' })
  getUserLogs(
    @Query('userId') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.audit.getUserLogs(userId, limit);
  }
}
