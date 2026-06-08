import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RevenueIntelligenceService } from './revenue-intelligence.service';
import { PrismaService } from '../prisma/prisma.service';

function makePrismaMock() {
  return {
    order: { aggregate: jest.fn() },
    attribution: { aggregate: jest.fn(), findMany: jest.fn() },
    customer: { count: jest.fn(), findMany: jest.fn() },
    trackingLink: { findMany: jest.fn(), aggregate: jest.fn() },
    connectorSync: { findMany: jest.fn() },
    creator: { findMany: jest.fn() },
  };
}

const cacheMock = {
  get: jest.fn().mockResolvedValue(null), // always miss in tests
  set: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
};

describe('RevenueIntelligenceService', () => {
  let service: RevenueIntelligenceService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueIntelligenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cacheMock },
      ],
    }).compile();
    service = module.get<RevenueIntelligenceService>(RevenueIntelligenceService);
  });

  // ── getDashboardMetrics ────────────────────────────────────
  describe('getDashboardMetrics', () => {
    it('returns zeroed metrics when no data', async () => {
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: null }, _count: 0, _avg: { totalAmount: null } });
      prisma.attribution.aggregate.mockResolvedValue({ _sum: { attributedRevenue: null }, _count: 0 });
      prisma.customer.count.mockResolvedValue(0);
      prisma.trackingLink.aggregate.mockResolvedValue({ _sum: { clickCount: null } });

      const result = await service.getDashboardMetrics({});

      expect(result.totalRevenue).toBe(0);
      expect(result.attributedRevenue).toBe(0);
      expect(result.attributionRate).toBe(0);
      expect(result.orderCount).toBe(0);
      expect(result.creatorAcquiredCustomers).toBe(0);
    });

    it('calculates attributionRate correctly', async () => {
      prisma.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 10000 },
        _count: 50,
        _avg: { totalAmount: 200 },
      });
      prisma.attribution.aggregate.mockResolvedValue({
        _sum: { attributedRevenue: 4000 },
        _count: 20,
      });
      prisma.customer.count.mockResolvedValue(30);
      prisma.trackingLink.aggregate.mockResolvedValue({ _sum: { clickCount: 500 } });

      const result = await service.getDashboardMetrics({});

      expect(result.totalRevenue).toBe(10000);
      expect(result.attributedRevenue).toBe(4000);
      expect(result.attributionRate).toBeCloseTo(0.4);
      expect(result.avgOrderValue).toBe(200);
      expect(result.creatorAcquiredCustomers).toBe(30);
    });
  });

  // ── getCreatorScores ───────────────────────────────────────
  describe('getCreatorScores', () => {
    it('returns empty array when no creators', async () => {
      prisma.creator.findMany.mockResolvedValue([]);
      const result = await service.getCreatorScores();
      expect(result).toHaveLength(0);
    });

    it('assigns scores and sorts descending', async () => {
      prisma.creator.findMany.mockResolvedValue([
        {
          id: 'low',
          name: 'Low Performer',
          handle: null,
          platform: 'instagram',
          attributions: [],
          trackingLinks: [{ clickCount: 1 }],
          _count: { attributions: 0 },
        },
        {
          id: 'high',
          name: 'Top Creator',
          handle: '@top',
          platform: 'youtube',
          attributions: [{ attributedRevenue: 5000 }, { attributedRevenue: 3000 }],
          trackingLinks: [{ clickCount: 200 }, { clickCount: 50 }],
          _count: { attributions: 2 },
        },
      ]);

      const result = await service.getCreatorScores();

      // Highest scorer first
      expect(result[0].creatorId).toBe('high');
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[0].score).toBe(100); // top performer gets max
      expect(['platinum', 'gold', 'silver', 'bronze']).toContain(result[0].tier);
    });

    it('assigns bronze tier for zero-activity creator', async () => {
      prisma.creator.findMany.mockResolvedValue([
        {
          id: 'new',
          name: 'New Creator',
          handle: null,
          platform: null,
          attributions: [],
          trackingLinks: [],
          _count: { attributions: 0 },
        },
      ]);

      const result = await service.getCreatorScores();
      expect(result[0].score).toBe(0);
      expect(result[0].tier).toBe('bronze');
    });
  });

  // ── getCohortAnalysis ──────────────────────────────────────
  describe('getCohortAnalysis', () => {
    it('returns empty array for unknown type', async () => {
      const result = await service.getCohortAnalysis('unknown');
      expect(result).toEqual([]);
    });

    it('groups creator-acquired customers by month', async () => {
      prisma.customer.findMany.mockResolvedValue([
        { id: '1', totalRevenue: 100, orderCount: 1, firstSeenAt: new Date('2026-01-15'), acquisitionCreatorId: 'c1' },
        { id: '2', totalRevenue: 200, orderCount: 2, firstSeenAt: new Date('2026-01-20'), acquisitionCreatorId: 'c1' },
        { id: '3', totalRevenue: 150, orderCount: 1, firstSeenAt: new Date('2026-02-05'), acquisitionCreatorId: 'c2' },
      ]);

      const result = await service.getCohortAnalysis('creator');

      expect(result).toHaveLength(2);
      const jan = result.find((r) => r.period === '2026-01');
      const feb = result.find((r) => r.period === '2026-02');
      expect(jan?.customerCount).toBe(2);
      expect(jan?.totalRevenue).toBe(300);
      expect(feb?.customerCount).toBe(1);
      expect(feb?.totalRevenue).toBe(150);
    });
  });
});
