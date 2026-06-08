import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

function makePrismaMock() {
  return {
    creator: { findMany: jest.fn() },
    customer: { findMany: jest.fn() },
    trackingLink: { findMany: jest.fn() },
  };
}

describe('SearchService', () => {
  let service: SearchService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('returns empty results for blank query', async () => {
    const result = await service.search('');
    expect(result.creators).toHaveLength(0);
    expect(result.customers).toHaveLength(0);
    expect(result.links).toHaveLength(0);
    // Should NOT hit the database
    expect(prisma.creator.findMany).not.toHaveBeenCalled();
  });

  it('returns empty results for whitespace-only query', async () => {
    const result = await service.search('   ');
    expect(prisma.creator.findMany).not.toHaveBeenCalled();
    expect(result.creators).toHaveLength(0);
  });

  it('queries all three entities in parallel', async () => {
    prisma.creator.findMany.mockResolvedValue([
      { id: 'c1', name: 'Alice', handle: '@alice', platform: 'instagram' },
    ]);
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.trackingLink.findMany.mockResolvedValue([]);

    const result = await service.search('alice');

    expect(prisma.creator.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.customer.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.trackingLink.findMany).toHaveBeenCalledTimes(1);
    expect(result.creators).toHaveLength(1);
    expect(result.creators[0].title).toBe('Alice');
    expect(result.creators[0].type).toBe('creator');
    expect(result.creators[0].url).toBe('/creators/c1');
  });

  it('maps customer results correctly', async () => {
    prisma.creator.findMany.mockResolvedValue([]);
    prisma.trackingLink.findMany.mockResolvedValue([]);
    prisma.customer.findMany.mockResolvedValue([
      { id: 'cust1', email: 'bob@example.com', firstName: 'Bob', lastName: 'Smith' },
    ]);

    const result = await service.search('bob');

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].title).toBe('Bob Smith');
    expect(result.customers[0].subtitle).toBe('bob@example.com');
    expect(result.customers[0].url).toBe('/customers/cust1');
  });

  it('maps tracking link results correctly', async () => {
    prisma.creator.findMany.mockResolvedValue([]);
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.trackingLink.findMany.mockResolvedValue([
      {
        id: 'link1',
        shortCode: 'abc12345',
        utmCampaign: 'summer-launch',
        promoCode: 'SUMMER20',
        creator: { name: 'Alice' },
      },
    ]);

    const result = await service.search('summer');

    expect(result.links).toHaveLength(1);
    expect(result.links[0].title).toBe('summer-launch');
    expect(result.links[0].subtitle).toContain('Alice');
    expect(result.links[0].subtitle).toContain('SUMMER20');
    expect(result.links[0].type).toBe('tracking_link');
  });

  it('respects the limit parameter', async () => {
    prisma.creator.findMany.mockResolvedValue([]);
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.trackingLink.findMany.mockResolvedValue([]);

    await service.search('test', 3);

    expect(prisma.creator.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });
});
