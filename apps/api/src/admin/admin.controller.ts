import { Controller, Get, Patch, Delete, Post, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

class PromoteUserDto {
  @IsIn(['ADMIN', 'MEMBER', 'VIEWER'])
  role!: 'ADMIN' | 'MEMBER' | 'VIEWER';
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (ADMIN only)' })
  listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role (ADMIN only)' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto, @Request() req: { user: { sub: string } }) {
    return this.admin.updateUserRole(req.user.sub, id, dto.role!);
  }

  @Post('users/:id/promote')
  @ApiOperation({ summary: 'Promote/demote user to a specific role (ADMIN only)' })
  promoteUser(@Param('id') id: string, @Body() dto: PromoteUserDto, @Request() req: { user: { sub: string } }) {
    return this.admin.promoteUser(req.user.sub, id, dto.role);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user (sets role to VIEWER) (ADMIN only)' })
  suspendUser(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.admin.suspendUser(req.user.sub, id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user account (ADMIN only) — irreversible' })
  deleteUser(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.admin.deleteUser(req.user.sub, id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'System-wide record counts (ADMIN only)' })
  getStats() {
    return this.admin.getSystemStats();
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Flush Redis metrics cache (ADMIN only)' })
  flushCache(@Request() req: { user: { sub: string } }) {
    return this.admin.flushCache(req.user.sub);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Recent audit log entries (ADMIN only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAuditLog(@Query('limit') limit?: string) {
    return this.admin.getAuditLogs(limit ? parseInt(limit, 10) : 100);
  }
}
