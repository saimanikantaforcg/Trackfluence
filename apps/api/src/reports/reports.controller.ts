import { Controller, Post, Get, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('export/csv')
  @ApiOperation({ summary: 'Download CSV attribution report as a file' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  async exportCsv(@Query('days') days = '30', @Res() res: Response) {
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    const { csv } = await this.reports.generateCsv(since);
    const filename = `attribution-report-${since.toISOString().slice(0, 10)}.csv`;
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(csv);
  }

  @Post('send')
  @Roles('ADMIN', 'MEMBER')
  @ApiOperation({ summary: 'Send attribution report to current user by email' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  async sendReport(@Req() req: Request & { user: { sub: string } }, @Query('days') days = '30') {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.sub },
      select: { email: true, name: true },
    });
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
    await this.reports.generateAndSend(req.user.sub, user.email, user.name, since);
    return { sent: true, to: user.email };
  }
}
