import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ResolveIdentityDto, CreateCustomerDto } from "./dto/identity.dto";

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveIdentity(dto: ResolveIdentityDto, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to resolve identity",
      );
    }
    // Try to find existing customer by any provided identity
    for (const identity of dto.identities) {
      const existing = await this.prisma.customerIdentity.findUnique({
        where: {
          identityType_identityValue: {
            identityType: identity.identityType as any,
            identityValue: identity.identityValue,
          },
        },
        include: { customer: true },
      });

      if (existing) {
        // Update last seen
        await this.prisma.customerIdentity.update({
          where: { id: existing.id },
          data: { lastSeen: new Date() },
        });

        // Add any new identities
        for (const newIdentity of dto.identities) {
          await this.prisma.customerIdentity.upsert({
            where: {
              identityType_identityValue: {
                identityType: newIdentity.identityType as any,
                identityValue: newIdentity.identityValue,
              },
            },
            update: { lastSeen: new Date() },
            create: {
              customerId: existing.customerId,
              identityType: newIdentity.identityType as any,
              identityValue: newIdentity.identityValue,
            },
          });
        }

        return {
          resolved: true,
          customerId: existing.customerId,
          confidence: 1.0,
        };
      }
    }

    // No existing customer found — create new
    const emailIdentity = dto.identities.find(
      (i) => i.identityType === "EMAIL",
    );

    const customer = await this.prisma.customer.create({
      data: {
        email: emailIdentity?.identityValue,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationId: orgId,
        identities: {
          create: dto.identities.map((i) => ({
            identityType: i.identityType as any,
            identityValue: i.identityValue,
          })),
        },
      },
    });

    return {
      resolved: true,
      customerId: customer.id,
      confidence: 0.8,
      isNew: true,
    };
  }

  async createCustomer(dto: CreateCustomerDto, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped creation
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to create a customer",
      );
    }
    return this.prisma.customer.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        externalId: dto.externalId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        creatorAcquired: !!dto.acquisitionCreatorId,
        acquisitionCreatorId: dto.acquisitionCreatorId,
        organizationId: orgId,
        identities: {
          create: [
            ...(dto.email
              ? [{ identityType: "EMAIL" as const, identityValue: dto.email }]
              : []),
            ...(dto.phone
              ? [{ identityType: "PHONE" as const, identityValue: dto.phone }]
              : []),
          ],
        },
      },
      include: { identities: true },
    });
  }

  async getCustomerProfile(id: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      throw new NotFoundException("Customer not found");
    }
    const customer = await this.prisma.customer.findUnique({
      where: { id, organizationId: orgId },
      include: {
        identities: true,
        touchpoints: {
          include: { creator: { select: { id: true, name: true } } },
          orderBy: { timestamp: "desc" },
          take: 20,
        },
        orders: { orderBy: { orderDate: "desc" }, take: 10 },
      },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async searchCustomers(
    filters: {
      email?: string;
      creatorAcquired?: boolean;
      segment?: string;
      page?: number;
      limit?: number;
    },
    orgId?: string,
  ) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      return {
        customers: [],
        total: 0,
        page: filters.page ?? 1,
        limit: Math.min(filters.limit ?? 50, 200),
        totalPages: 0,
      };
    }
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(filters.email && {
        email: { contains: filters.email, mode: "insensitive" as const },
      }),
      ...(filters.creatorAcquired !== undefined && {
        creatorAcquired: filters.creatorAcquired,
      }),
    };

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: { identities: true },
        orderBy: { lastSeenAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIdentityGraph(customerId: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      throw new NotFoundException("Customer not found");
    }
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId, organizationId: orgId },
      include: {
        identities: true,
        touchpoints: true,
        orders: true,
      },
    });
    if (!customer) throw new NotFoundException("Customer not found");

    return {
      customerId: customer.id,
      identities: customer.identities,
      touchpoints: customer.touchpoints.length,
      purchases: customer.orders.length,
      totalRevenue: customer.totalRevenue,
    };
  }
}
