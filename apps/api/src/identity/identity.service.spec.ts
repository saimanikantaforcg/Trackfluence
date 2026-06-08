import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { PrismaService } from '../prisma/prisma.service';

function makePrismaMock() {
  return {
    customerIdentity: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    customer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

const mockCustomer = {
  id: 'cust_1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  creatorAcquired: false,
  totalRevenue: 0,
  orderCount: 0,
  ltv: 0,
  firstSeenAt: new Date(),
  lastSeenAt: new Date(),
  acquisitionCreatorId: null,
};

describe('IdentityService', () => {
  let service: IdentityService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<IdentityService>(IdentityService);
  });

  // ── resolveIdentity ────────────────────────────────────────
  describe('resolveIdentity', () => {
    it('resolves to existing customer when identity matches', async () => {
      prisma.customerIdentity.findUnique.mockResolvedValue({
        id: 'ident_1',
        customerId: 'cust_1',
        customer: mockCustomer,
      });
      prisma.customerIdentity.update.mockResolvedValue({});
      prisma.customerIdentity.upsert.mockResolvedValue({});

      const result = await service.resolveIdentity({
        identities: [{ identityType: 'EMAIL', identityValue: 'alice@example.com' }],
      });

      expect(result.resolved).toBe(true);
      expect(result.customerId).toBe('cust_1');
      expect(result.confidence).toBe(1.0);
    });

    it('creates new customer when no identity matches', async () => {
      prisma.customerIdentity.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: 'cust_new' });

      const result = await service.resolveIdentity({
        identities: [{ identityType: 'EMAIL', identityValue: 'new@example.com' }],
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.isNew).toBe(true);
      expect(result.customerId).toBe('cust_new');
      expect(result.confidence).toBe(0.8);
      expect(prisma.customer.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── searchCustomers ────────────────────────────────────────
  describe('searchCustomers', () => {
    it('returns paginated results', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      prisma.customer.count.mockResolvedValue(1);

      const result = await service.searchCustomers({ page: 1, limit: 50 });

      expect(result.customers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('caps limit at 200', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(0);

      await service.searchCustomers({ limit: 999 });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 200 }),
      );
    });

    it('calculates correct skip for page 2', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(100);

      await service.searchCustomers({ page: 2, limit: 25 });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 }),
      );
    });
  });

  // ── getCustomerProfile ─────────────────────────────────────
  describe('getCustomerProfile', () => {
    it('throws NotFoundException for unknown id', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerProfile('bad_id')).rejects.toThrow(NotFoundException);
    });

    it('returns customer with relations', async () => {
      const full = { ...mockCustomer, identities: [], touchpoints: [], orders: [] };
      prisma.customer.findUnique.mockResolvedValue(full);

      const result = await service.getCustomerProfile('cust_1');

      expect(result.id).toBe('cust_1');
      expect(result.identities).toEqual([]);
    });
  });
});
