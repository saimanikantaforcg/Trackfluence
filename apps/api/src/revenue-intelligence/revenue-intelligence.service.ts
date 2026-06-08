import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { resolveModel, type AttributionModelType } from '../revenue-attribution/revenue-attribution.service';

const METRICS_TTL = 5 * 60 * 1000; // 5 minutes

interface DateRange {
  from?: Date;
  to?: Date;
  model?: AttributionModelType;
}

@Injectable()
export class RevenueIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getDashboardMetrics(dateRange: DateRange): Promise<{
    totalRevenue: number;
    attributedRevenue: number;
    attributionRate: number;
    orderCount: number;
    avgOrderValue: number;
    creatorAcquiredCustomers: number;
    attributionCount: number;
  }> {
    const cacheKey = `dashboard:metrics:${dateRange.from?.toISOString() ?? 'all'}:${dateRange.to?.toISOString() ?? 'all'}:${dateRange.model ?? 'all'}`;
    const cached = await this.cache.get<{
      totalRevenue: number;
      attributedRevenue: number;
      attributionRate: number;
      orderCount: number;
      avgOrderValue: number;
      creatorAcquiredCustomers: number;
      attributionCount: number;
      model: string;
    }>(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(dateRange, 'orderDate');
    const attrDateFilter = this.buildDateFilter(dateRange, 'calculatedAt');
    const modelFilter = dateRange.model ? { model: dateRange.model } : {};

    const [orders, attributions, customers, totalClicks] = await Promise.all([
      this.prisma.order.aggregate({
        where: dateFilter,
        _sum: { totalAmount: true },
        _count: true,
        _avg: { totalAmount: true },
      }),
      this.prisma.attribution.aggregate({
        where: { ...attrDateFilter, ...modelFilter },
        _sum: { attributedRevenue: true },
        _count: true,
      }),
      this.prisma.customer.count({
        where: { creatorAcquired: true },
      }),
      this.prisma.trackingLink.aggregate({ _sum: { clickCount: true } }),
    ]);

    const totalRevenue = Number(orders._sum.totalAmount ?? 0);
    const attributedRevenue = Number(attributions._sum.attributedRevenue ?? 0);
    const clicks = Number(totalClicks._sum.clickCount ?? 0);

    const result = {
      totalRevenue,
      attributedRevenue,
      attributionRate: totalRevenue > 0 ? attributedRevenue / totalRevenue : 0,
      orderCount: orders._count,
      avgOrderValue: Number(orders._avg.totalAmount ?? 0),
      creatorAcquiredCustomers: customers,
      attributionCount: attributions._count,
      totalClicks: clicks,
      clickToAttributionRate: clicks > 0 ? attributions._count / clicks : 0,
      model: dateRange.model ?? 'ALL',
    };

    await this.cache.set(cacheKey, result, METRICS_TTL);
    return result;
  }

  async getRoas(dateRange: DateRange) {
    const modelFilter = dateRange.model ? { model: dateRange.model } : {};
    const attributions = await this.prisma.attribution.findMany({
      where: { ...this.buildDateFilter(dateRange, 'calculatedAt'), ...modelFilter },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    const creatorMap = new Map<string, { name: string; revenue: number }>();

    for (const attr of attributions) {
      const existing = creatorMap.get(attr.creatorId) ?? {
        name: attr.creator.name,
        revenue: 0,
      };
      existing.revenue += Number(attr.attributedRevenue);
      creatorMap.set(attr.creatorId, existing);
    }

    const totalAttributedRevenue = attributions.reduce(
      (sum: number, a) => sum + Number(a.attributedRevenue),
      0,
    );

    return {
      totalAttributedRevenue,
      creatorBreakdown: Array.from(creatorMap.entries()).map(([id, data]) => ({
        creatorId: id,
        creatorName: data.name,
        attributedRevenue: data.revenue,
      })),
    };
  }

  async getCreatorPerformance(params: DateRange & { limit: number }) {
    const attributions = await this.prisma.attribution.groupBy({
      by: ['creatorId'],
      _sum: { attributedRevenue: true },
      _count: true,
      orderBy: { _sum: { attributedRevenue: 'desc' } },
      take: params.limit,
    });

    const creatorIds = attributions.map((a) => a.creatorId);
    const creators = await this.prisma.creator.findMany({
      where: { id: { in: creatorIds } },
    });

    const creatorNameMap = new Map(creators.map((c) => [c.id, c.name]));

    return attributions.map((a: { creatorId: string; _sum: { attributedRevenue: unknown }; _count: number }) => ({
      creatorId: a.creatorId,
      creatorName: creatorNameMap.get(a.creatorId) ?? 'Unknown',
      attributedRevenue: Number(a._sum.attributedRevenue ?? 0),
      conversions: a._count,
    }));
  }

  async getTimeSeries(dateRange: DateRange) {
    const from = dateRange.from ?? new Date(Date.now() - 180 * 86400000); // default 6 months
    const to = dateRange.to ?? new Date();

    const orders = await this.prisma.order.findMany({
      where: { orderDate: { gte: from, lte: to } },
      select: { orderDate: true, totalAmount: true },
      orderBy: { orderDate: 'asc' },
    });

    const attributions = await this.prisma.attribution.findMany({
      where: { calculatedAt: { gte: from, lte: to } },
      select: { calculatedAt: true, attributedRevenue: true },
      orderBy: { calculatedAt: 'asc' },
    });

    const monthMap = new Map<string, { month: string; revenue: number; attributed: number }>();

    for (const order of orders) {
      const key = order.orderDate.toISOString().slice(0, 7);
      const label = new Date(key + '-01').toLocaleString('default', { month: 'short', year: '2-digit' });
      const existing = monthMap.get(key) ?? { month: label, revenue: 0, attributed: 0 };
      existing.revenue += Number(order.totalAmount);
      monthMap.set(key, existing);
    }

    for (const attr of attributions) {
      const key = attr.calculatedAt.toISOString().slice(0, 7);
      const label = new Date(key + '-01').toLocaleString('default', { month: 'short', year: '2-digit' });
      const existing = monthMap.get(key) ?? { month: label, revenue: 0, attributed: 0 };
      existing.attributed += Number(attr.attributedRevenue);
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }

  async getCampaignBreakdown(dateRange: DateRange) {
    // Get attributions with their source tracking link utmCampaign
    const attributions = await this.prisma.attribution.findMany({
      where: this.buildDateFilter(dateRange, 'calculatedAt'),
      include: {
        touchpoint: {
          include: {
            trackingLink: { select: { utmCampaign: true, utmSource: true, utmMedium: true } },
          },
        },
        creator: { select: { name: true } },
      },
    });

    const campaignMap = new Map<
      string,
      { campaign: string; source: string; medium: string; revenue: number; conversions: number; creators: Set<string> }
    >();

    for (const attr of attributions) {
      const campaign = attr.touchpoint?.trackingLink?.utmCampaign ?? '(direct)';
      const source = attr.touchpoint?.trackingLink?.utmSource ?? 'direct';
      const medium = attr.touchpoint?.trackingLink?.utmMedium ?? 'none';
      const existing = campaignMap.get(campaign) ?? {
        campaign,
        source,
        medium,
        revenue: 0,
        conversions: 0,
        creators: new Set<string>(),
      };
      existing.revenue += Number(attr.attributedRevenue);
      existing.conversions++;
      existing.creators.add(attr.creatorId);
      campaignMap.set(campaign, existing);
    }

    const total = Array.from(campaignMap.values()).reduce((s, c) => s + c.revenue, 0);

    return Array.from(campaignMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({
        campaign: c.campaign,
        source: c.source,
        medium: c.medium,
        attributedRevenue: c.revenue,
        conversions: c.conversions,
        creatorCount: c.creators.size,
        revenueShare: total > 0 ? c.revenue / total : 0,
      }));
  }

  async getConnectorStatus() {
    const syncs = await this.prisma.connectorSync.findMany({
      orderBy: { startedAt: 'desc' },
      distinct: ['connectorType'],
      take: 10,
    });

    const byType = new Map(syncs.map((s) => [s.connectorType, s]));

    return ['shopify', 'salesforce', 'salesforce_data_cloud', 'sfmc'].map((type) => {
      const sync = byType.get(type);
      return {
        type,
        lastSync: sync?.startedAt ?? null,
        status: sync?.status ?? 'never',
        recordsProcessed: sync?.recordsCount ?? 0,
      };
    });
  }

  async getCohortAnalysis(type: string) {
    if (type === 'creator') {
      const customers = await this.prisma.customer.findMany({
        where: { creatorAcquired: true },
        select: {
          id: true,
          totalRevenue: true,
          orderCount: true,
          firstSeenAt: true,
          acquisitionCreatorId: true,
        },
      });

      // Group by month of acquisition
      const cohorts = new Map<string, { count: number; revenue: number }>();
      for (const customer of customers) {
        const month = customer.firstSeenAt.toISOString().slice(0, 7);
        const existing = cohorts.get(month) ?? { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += Number(customer.totalRevenue);
        cohorts.set(month, existing);
      }

      return Array.from(cohorts.entries())
        .map(([period, data]) => ({
          period,
          customerCount: data.count,
          totalRevenue: data.revenue,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    }

    return [];
  }

  async getCreatorScores() {
    // Fetch all creators with their attribution totals and click counts
    const creators = await this.prisma.creator.findMany({
      select: {
        id: true,
        name: true,
        handle: true,
        platform: true,
        attributions: {
          select: { attributedRevenue: true },
        },
        trackingLinks: {
          select: { clickCount: true },
        },
        _count: { select: { attributions: true } },
      },
    });

    type Raw = {
      id: string;
      name: string;
      handle: string | null;
      platform: string | null;
      attributedRevenue: number;
      conversions: number;
      totalClicks: number;
    };

    const raw: Raw[] = creators.map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      platform: c.platform,
      attributedRevenue: c.attributions.reduce((s, a) => s + Number(a.attributedRevenue), 0),
      conversions: c._count.attributions,
      totalClicks: c.trackingLinks.reduce((s, l) => s + l.clickCount, 0),
    }));

    // Normalize each dimension 0–100 across all creators
    const maxRevenue = Math.max(...raw.map((r) => r.attributedRevenue), 1);
    const maxConversions = Math.max(...raw.map((r) => r.conversions), 1);
    const maxClicks = Math.max(...raw.map((r) => r.totalClicks), 1);

    const scored = raw.map((r) => {
      const revenueScore = (r.attributedRevenue / maxRevenue) * 100;
      const conversionScore = (r.conversions / maxConversions) * 100;
      const clickScore = (r.totalClicks / maxClicks) * 100;
      const score = Math.round(revenueScore * 0.5 + conversionScore * 0.3 + clickScore * 0.2);
      return {
        creatorId: r.id,
        name: r.name,
        handle: r.handle,
        platform: r.platform,
        attributedRevenue: r.attributedRevenue,
        conversions: r.conversions,
        totalClicks: r.totalClicks,
        score,
        tier: score >= 80 ? 'platinum' : score >= 55 ? 'gold' : score >= 30 ? 'silver' : 'bronze',
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  // ─── Revenue forecast (linear regression) ──────────────────

  async getForecast(futureMonths = 3): Promise<Array<{ month: string; projected: number; isProjected: boolean }>> {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { orderDate: { gte: since } },
      select: { orderDate: true, totalAmount: true },
      orderBy: { orderDate: 'asc' },
    });

    const monthMap = new Map<string, number>();
    for (const o of orders) {
      const key = o.orderDate.toISOString().slice(0, 7);
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(o.totalAmount));
    }

    const points: [number, number][] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      points.push([12 - i - 1, monthMap.get(key) ?? 0]);
    }

    const n = points.length;
    const sumX = points.reduce((s, [x]) => s + x, 0);
    const sumY = points.reduce((s, [, y]) => s + y, 0);
    const sumXY = points.reduce((s, [x, y]) => s + x * y, 0);
    const sumXX = points.reduce((s, [x]) => s + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    const result: Array<{ month: string; projected: number; isProjected: boolean }> = [];
    for (const [idx, rev] of points) {
      const d = new Date();
      d.setMonth(d.getMonth() - (n - 1 - idx));
      result.push({ month: d.toISOString().slice(0, 7), projected: Math.max(0, Math.round(rev)), isProjected: false });
    }
    for (let i = 1; i <= futureMonths; i++) {
      const projected = Math.max(0, Math.round(slope * (n - 1 + i) + intercept));
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      result.push({ month: d.toISOString().slice(0, 7), projected, isProjected: true });
    }
    return result;
  }

  // ─── Multi-currency breakdown ───────────────────────────────

  async getCurrencyBreakdown(): Promise<Array<{ currency: string; totalRevenue: number; orderCount: number }>> {
    const rows = await this.prisma.order.groupBy({
      by: ['currency'],
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
    });
    return rows.map((r) => ({
      currency: r.currency,
      totalRevenue: Number(r._sum.totalAmount ?? 0),
      orderCount: r._count._all,
    }));
  }

  private buildDateFilter(dateRange: DateRange, field: string) {
    if (!dateRange.from && !dateRange.to) return {};
    const filter: Record<string, Record<string, Date>> = {};
    filter[field] = {};
    if (dateRange.from) (filter[field] as Record<string, Date>).gte = dateRange.from;
    if (dateRange.to) (filter[field] as Record<string, Date>).lte = dateRange.to;
    return filter;
  }
}
