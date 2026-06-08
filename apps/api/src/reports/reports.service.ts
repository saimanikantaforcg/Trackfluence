import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

interface CreatorStat {
  id: string;
  name: string;
  email: string | null;
  attributedRevenue: number;
  attributionCount: number;
  totalClicks: number;
  payoutsPending: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Scheduled: weekly creator performance report ─────────
  // Runs every Monday at 08:00 UTC
  @Cron('0 8 * * 1')
  async sendWeeklyReports() {
    this.logger.log('Sending weekly creator performance reports...');

    // All platform users with ADMIN or MEMBER role
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MEMBER'] } },
      select: { id: true, email: true, name: true },
    });

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stats = await this.buildCreatorStats(since);
    const csv = this.buildCsv(stats);

    for (const user of users) {
      if (!user.email) continue;
      await this.email.sendReport(user.email, user.name, since, stats, csv);
    }

    this.logger.log(`Weekly reports sent to ${users.length} users`);
  }

  // ─── On-demand report generation ─────────────────────────

  async generateAndSend(userId: string, email: string, name: string, since: Date): Promise<void> {
    const stats = await this.buildCreatorStats(since);
    const csv = this.buildCsv(stats);
    await this.email.sendReport(email, name, since, stats, csv);
  }

  async generateCsv(since: Date): Promise<{ csv: string; stats: CreatorStat[] }> {
    const stats = await this.buildCreatorStats(since);
    return { csv: this.buildCsv(stats), stats };
  }

  // ─── Private helpers ──────────────────────────────────────

  private async buildCreatorStats(since: Date): Promise<CreatorStat[]> {
    const creators = await this.prisma.creator.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        trackingLinks: { select: { clickCount: true } },
        _count: { select: { attributions: true } },
      },
    });

    const results: CreatorStat[] = [];

    for (const c of creators) {
      const revenue = await this.prisma.attribution.aggregate({
        where: { creatorId: c.id, calculatedAt: { gte: since } },
        _sum: { attributedRevenue: true },
        _count: { _all: true },
      });

      const pendingPayouts = await this.prisma.payout.aggregate({
        where: { creatorId: c.id, status: { in: ['PENDING', 'APPROVED'] } },
        _sum: { amount: true },
      });

      results.push({
        id: c.id,
        name: c.name,
        email: c.email,
        attributedRevenue: Number(revenue._sum.attributedRevenue ?? 0),
        attributionCount: revenue._count._all,
        totalClicks: c.trackingLinks.reduce((s, l) => s + l.clickCount, 0),
        payoutsPending: Number(pendingPayouts._sum.amount ?? 0),
      });
    }

    return results.sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }

  private buildCsv(stats: CreatorStat[]): string {
    const header = 'Creator,Email,Attributed Revenue ($),Attribution Count,Total Clicks,Payouts Pending ($)';
    const rows = stats.map(
      (s) =>
        `"${s.name}","${s.email ?? ''}",${s.attributedRevenue.toFixed(2)},${s.attributionCount},${s.totalClicks},${s.payoutsPending.toFixed(2)}`,
    );
    return [header, ...rows].join('\n');
  }
}
