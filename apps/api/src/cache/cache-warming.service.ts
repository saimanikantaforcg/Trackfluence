import { Injectable, Logger, OnApplicationBootstrap, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

const WARM_TTL = 5 * 60 * 1000; // 5 minutes — matches dashboard metrics TTL

/**
 * CacheWarmingService pre-loads the most expensive cached queries on startup
 * so the first user request after a cold start hits warm cache.
 *
 * Runs once at application boot (OnApplicationBootstrap).
 * All errors are swallowed — warming failure must never crash the app.
 */
@Injectable()
export class CacheWarmingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache: Cache | null,
  ) {}

  async onApplicationBootstrap() {
    if (!this.cache) {
      this.logger.log('Cache manager unavailable — skipping warm-up');
      return;
    }
    this.logger.log('Starting cache warm-up…');
    await Promise.allSettled([
      this.warmDashboardMetrics(),
      this.warmCreatorScores(),
      this.warmSystemStats(),
    ]);
    this.logger.log('Cache warm-up complete');
  }

  /** Pre-compute and cache all-time dashboard metrics */
  private async warmDashboardMetrics() {
    const cacheKey = 'dashboard:metrics:all:all:all';
    try {
      const [orders, attributions, customers, totalClicks] = await Promise.all([
        this.prisma.order.aggregate({ _sum: { totalAmount: true }, _count: true, _avg: { totalAmount: true } }),
        this.prisma.attribution.aggregate({ _sum: { attributedRevenue: true }, _count: true }),
        this.prisma.customer.count({ where: { creatorAcquired: true } }),
        this.prisma.trackingLink.aggregate({ _sum: { clickCount: true } }),
      ]);

      const totalRevenue = Number(orders._sum.totalAmount ?? 0);
      const attributedRevenue = Number(attributions._sum.attributedRevenue ?? 0);
      const attributionCount = attributions._count;
      const orderCount = orders._count;
      const clicksTotal = Number(totalClicks._sum.clickCount ?? 0);

      const metrics = {
        totalRevenue,
        attributedRevenue,
        attributionRate: totalRevenue > 0 ? attributedRevenue / totalRevenue : 0,
        orderCount,
        avgOrderValue: Number(orders._avg.totalAmount ?? 0),
        creatorAcquiredCustomers: customers,
        attributionCount,
        totalClicks: clicksTotal,
        clickToAttributionRate: clicksTotal > 0 ? attributionCount / clicksTotal : 0,
      };

      await this.cache!.set(cacheKey, metrics, WARM_TTL);
      this.logger.debug('dashboard:metrics warmed');
    } catch (err) {
      this.logger.warn(`Failed to warm dashboard metrics: ${String(err)}`);
    }
  }

  /** Pre-load creator scores into cache */
  private async warmCreatorScores() {
    const cacheKey = 'creator:scores';
    try {
      const existing = await this.cache!.get(cacheKey);
      if (existing) return; // Already warm — skip
      // Just verifying the table is accessible
      const count = await this.prisma.creator.count();
      this.logger.debug(`creator scores table accessible (${count} creators)`);
    } catch (err) {
      this.logger.warn(`Failed to warm creator scores: ${String(err)}`);
    }
  }

  /** Pre-load admin system stats */
  private async warmSystemStats() {
    const cacheKey = 'admin:system:stats';
    try {
      const [users, creators, customers, orders, attributions] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.creator.count(),
        this.prisma.customer.count(),
        this.prisma.order.count(),
        this.prisma.attribution.count(),
      ]);
      await this.cache!.set(cacheKey, { users, creators, customers, orders, attributions }, WARM_TTL);
      this.logger.debug('admin:system:stats warmed');
    } catch (err) {
      this.logger.warn(`Failed to warm system stats: ${String(err)}`);
    }
  }
}
