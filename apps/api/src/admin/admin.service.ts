import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  TrackingLinkType,
  InteractionType,
  AttributionModel,
} from "@prisma/client";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly audit: AuditService,
  ) {}

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateUserRole(
    actorId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    void this.audit.log({ userId: actorId }, "user.role_updated", {
      entityType: "User",
      entityId: userId,
      details: { newRole: role },
    });

    return updated;
  }

  async getSystemStats() {
    const [
      users,
      creators,
      customers,
      orders,
      attributions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.creator.count(),
      this.prisma.customer.count(),
      this.prisma.order.count(),
      this.prisma.attribution.count(),
    ]);

    return { users, creators, customers, orders, attributions };
  }

  async flushCache(actorId: string): Promise<{ flushed: true }> {
    await this.cache.clear();
    void this.audit.log({ userId: actorId }, "cache.flushed");
    return { flushed: true };
  }

  async getAuditLogs(limit = 100) {
    return this.audit.getRecentLogs(limit);
  }

  // ─── Extended Admin User Management ──────────────────────────

  async suspendUser(
    actorId: string,
    userId: string,
  ): Promise<{ suspended: boolean }> {
    if (actorId === userId) {
      const { ForbiddenException } = await import("@nestjs/common");
      throw new ForbiddenException("Cannot suspend yourself");
    }
    // We store suspended state via role downgrade to VIEWER + audit
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: "VIEWER" },
    });
    void this.audit.log({ userId: actorId }, "user.suspended", {
      entityType: "User",
      entityId: userId,
    });
    return { suspended: true };
  }

  async deleteUser(
    actorId: string,
    userId: string,
  ): Promise<{ deleted: boolean }> {
    if (actorId === userId) {
      const { ForbiddenException } = await import("@nestjs/common");
      throw new ForbiddenException("Cannot delete yourself");
    }
    await this.prisma.user.delete({ where: { id: userId } });
    void this.audit.log({ userId: actorId }, "user.deleted", {
      entityType: "User",
      entityId: userId,
    });
    return { deleted: true };
  }

  async promoteUser(
    actorId: string,
    userId: string,
    role: "ADMIN" | "MEMBER" | "VIEWER",
  ): Promise<{ id: string; name: string; email: string; role: string }> {
    if (actorId === userId) {
      const { ForbiddenException } = await import("@nestjs/common");
      throw new ForbiddenException("Cannot change your own role");
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    void this.audit.log({ userId: actorId }, "user.promoted", {
      entityType: "User",
      entityId: userId,
      details: { newRole: role },
    });
    return updated;
  }

  // ─── Demo Seed ─────────────────────────────────────────────────

  async seedDemoData(
    actorId: string,
  ): Promise<{ seeded: boolean; message: string }> {
    // Check if demo data already exists
    const existingCreators = await this.prisma.creator.count();
    if (existingCreators > 0) {
      return {
        seeded: false,
        message: `Demo data already exists (${existingCreators} creators found). Clear the database first to re-seed.`,
      };
    }

    const creators = await Promise.all([
      this.prisma.creator.create({
        data: {
          name: "Emma Chen",
          email: "emma@example.com",
          platform: "instagram",
          handle: "@emmachen",
          metadata: { followers: 520000, niche: "beauty" },
        },
      }),
      this.prisma.creator.create({
        data: {
          name: "Marcus Rivera",
          email: "marcus@example.com",
          platform: "youtube",
          handle: "@marcusrivera",
          metadata: { followers: 1200000, niche: "fitness" },
        },
      }),
      this.prisma.creator.create({
        data: {
          name: "Aisha Patel",
          email: "aisha@example.com",
          platform: "tiktok",
          handle: "@aishapatel",
          metadata: { followers: 890000, niche: "lifestyle" },
        },
      }),
      this.prisma.creator.create({
        data: {
          name: "Jake Morrison",
          email: "jake@example.com",
          platform: "youtube",
          handle: "@jakemorrison",
          metadata: { followers: 340000, niche: "tech" },
        },
      }),
    ]);

    const campaigns = await Promise.all([
      this.prisma.campaign.create({
        data: {
          id: "campaign-summer-2026",
          name: "Summer Sale 2026",
          description: "Q3 creator-led summer sale push",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2026-08-31"),
          budget: 120000,
          status: "active",
        },
      }),
      this.prisma.campaign.create({
        data: {
          id: "campaign-launch-q2",
          name: "Product Launch Q2",
          description: "New skincare line launch with top creators",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2026-06-30"),
          budget: 85000,
          status: "active",
        },
      }),
    ]);

    const links = await Promise.all([
      this.prisma.trackingLink.create({
        data: {
          shortCode: "emma-s26",
          creatorId: creators[0].id,
          campaignId: "campaign-summer-2026",
          destinationUrl: "https://shop.example.com/summer",
          type: TrackingLinkType.STANDARD,
          utmSource: "instagram",
          utmMedium: "social",
          utmCampaign: "summer-2026",
          clickCount: 4821,
        },
      }),
      this.prisma.trackingLink.create({
        data: {
          shortCode: "marc-fit",
          creatorId: creators[1].id,
          campaignId: "campaign-summer-2026",
          destinationUrl: "https://shop.example.com/fitness",
          type: TrackingLinkType.STANDARD,
          utmSource: "youtube",
          utmMedium: "video",
          utmCampaign: "summer-2026",
          clickCount: 11203,
        },
      }),
      this.prisma.trackingLink.create({
        data: {
          shortCode: "aisha-q2",
          creatorId: creators[2].id,
          campaignId: "campaign-launch-q2",
          destinationUrl: "https://shop.example.com/skincare",
          type: TrackingLinkType.STANDARD,
          utmSource: "tiktok",
          utmMedium: "social",
          utmCampaign: "launch-q2",
          clickCount: 7634,
        },
      }),
      this.prisma.trackingLink.create({
        data: {
          shortCode: "jake-prm",
          creatorId: creators[3].id,
          campaignId: "campaign-launch-q2",
          destinationUrl: "https://shop.example.com/tech",
          type: TrackingLinkType.PROMO_CODE,
          utmSource: "youtube",
          utmMedium: "video",
          utmCampaign: "launch-q2",
          promoCode: "JAKE20",
          clickCount: 2988,
        },
      }),
    ]);

    const customerData = [
      {
        email: "sarah.k@demo.com",
        firstName: "Sarah",
        lastName: "Kim",
        creatorIdx: 0,
        revenue: 289.97,
        orders: 3,
      },
      {
        email: "tom.w@demo.com",
        firstName: "Tom",
        lastName: "Wilson",
        creatorIdx: 1,
        revenue: 142.5,
        orders: 2,
      },
      {
        email: "lily.c@demo.com",
        firstName: "Lily",
        lastName: "Chen",
        creatorIdx: 2,
        revenue: 548.0,
        orders: 4,
      },
      {
        email: "mike.r@demo.com",
        firstName: "Mike",
        lastName: "Ross",
        creatorIdx: 1,
        revenue: 94.99,
        orders: 1,
      },
      {
        email: "zoe.h@demo.com",
        firstName: "Zoe",
        lastName: "Hall",
        creatorIdx: 0,
        revenue: 379.95,
        orders: 3,
      },
      {
        email: "alex.m@demo.com",
        firstName: "Alex",
        lastName: "Martin",
        creatorIdx: 3,
        revenue: 210.0,
        orders: 2,
      },
      {
        email: "priya.s@demo.com",
        firstName: "Priya",
        lastName: "Singh",
        creatorIdx: 2,
        revenue: 689.9,
        orders: 5,
      },
      {
        email: "dan.b@demo.com",
        firstName: "Dan",
        lastName: "Brown",
        creatorIdx: 1,
        revenue: 159.99,
        orders: 1,
      },
      {
        email: "nina.o@demo.com",
        firstName: "Nina",
        lastName: "Ortiz",
        creatorIdx: 0,
        revenue: 425.5,
        orders: 4,
      },
      {
        email: "ryan.t@demo.com",
        firstName: "Ryan",
        lastName: "Turner",
        creatorIdx: 3,
        revenue: 299.0,
        orders: 2,
      },
    ];

    const customers = await Promise.all(
      customerData.map((d) =>
        this.prisma.customer.create({
          data: {
            email: d.email,
            firstName: d.firstName,
            lastName: d.lastName,
            creatorAcquired: true,
            acquisitionCreatorId: creators[d.creatorIdx].id,
            totalRevenue: d.revenue,
            orderCount: d.orders,
            ltv: d.revenue * 1.6,
            identities: {
              create: [{ identityType: "EMAIL", identityValue: d.email }],
            },
          },
        }),
      ),
    );

    const orderDates = [
      new Date("2026-04-10"),
      new Date("2026-04-22"),
      new Date("2026-05-03"),
      new Date("2026-05-15"),
      new Date("2026-05-28"),
      new Date("2026-06-05"),
    ];

    const orders = await Promise.all(
      customers.flatMap((customer, ci) =>
        Array.from({ length: Math.min(customerData[ci].orders, 2) }, (_, i) =>
          this.prisma.order.create({
            data: {
              externalId: `shopify-${customer.id}-${i}`,
              customerId: customer.id,
              totalAmount: customerData[ci].revenue / customerData[ci].orders,
              currency: "USD",
              status: "COMPLETED",
              source: "shopify",
              orderDate: orderDates[(ci + i) % orderDates.length],
            },
          }),
        ),
      ),
    );

    const touchpoints = await Promise.all(
      customers.map((customer, ci) =>
        this.prisma.touchPoint.create({
          data: {
            customerId: customer.id,
            creatorId: creators[customerData[ci].creatorIdx].id,
            trackingLinkId: links[customerData[ci].creatorIdx].id,
            channel: creators[customerData[ci].creatorIdx].platform ?? "social",
            interactionType: InteractionType.CLICK,
            timestamp: new Date(Date.now() - (ci + 1) * 86400000 * 3),
          },
        }),
      ),
    );

    await Promise.all(
      orders.map((order, oi) => {
        const ci = oi % customers.length;
        return this.prisma.attribution.create({
          data: {
            orderId: order.id,
            customerId: order.customerId,
            creatorId: creators[customerData[ci].creatorIdx].id,
            touchpointId: touchpoints[ci].id,
            model: AttributionModel.FIRST_TOUCH,
            attributedRevenue: Number(order.totalAmount),
            attributionWeight: 1.0,
          },
        });
      }),
    );

    await this.prisma.audience.create({
      data: {
        id: "audience-high-ltv",
        name: "High-LTV Creator Customers",
        description: "Creator-acquired customers with LTV > $300",
        rules: [
          { field: "creatorAcquired", operator: "eq", value: true },
          { field: "totalRevenue", operator: "gt", value: 300 },
        ],
        customerCount: 0,
      },
    });

    await this.prisma.audience.create({
      data: {
        id: "audience-retention",
        name: "Multi-Purchase Customers",
        description: "Customers with 3+ orders",
        rules: [{ field: "orderCount", operator: "gte", value: 3 }],
        customerCount: 0,
      },
    });

    await Promise.all([
      this.prisma.fTCComplianceCheck.create({
        data: {
          creatorId: creators[0].id,
          contentUrl: "https://instagram.com/p/abc123",
          contentType: "POST",
          hasDisclosure: true,
          disclosureType: "hashtag",
          isCompliant: true,
          issues: [],
        },
      }),
      this.prisma.fTCComplianceCheck.create({
        data: {
          creatorId: creators[1].id,
          contentUrl: "https://youtube.com/watch?v=xyz789",
          contentType: "VIDEO",
          hasDisclosure: false,
          isCompliant: false,
          issues: ["Missing FTC disclosure for sponsored content"],
        },
      }),
      this.prisma.fTCComplianceCheck.create({
        data: {
          creatorId: creators[2].id,
          contentUrl: "https://tiktok.com/@aisha/video/1234",
          contentType: "VIDEO",
          hasDisclosure: true,
          disclosureType: "hashtag",
          isCompliant: true,
          issues: [],
        },
      }),
    ]);

    void this.audit.log({ userId: actorId }, "demo.seeded", {
      details: {
        creators: creators.length,
        campaigns: campaigns.length,
        customers: customers.length,
        orders: orders.length,
      },
    });

    return {
      seeded: true,
      message: `Seeded ${creators.length} creators, ${campaigns.length} campaigns, ${customers.length} customers, ${orders.length} orders, and ${touchpoints.length} touchpoints.`,
    };
  }
}
