import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTrackingLinkDto } from "./dto/create-tracking-link.dto";
import { ServerEventDto } from "./dto/server-event.dto";
import { nanoid } from "nanoid";

const SHORT_CODE_LENGTH = 8;

@Injectable()
export class AttributionService {
  constructor(private readonly prisma: PrismaService) {}

  async createTrackingLink(dto: CreateTrackingLinkDto, orgId?: string) {
    const shortCode = nanoid(SHORT_CODE_LENGTH);
    return this.prisma.trackingLink.create({
      data: {
        shortCode,
        creatorId: dto.creatorId,
        campaignId: dto.campaignId,
        destinationUrl: dto.destinationUrl,
        type: dto.type,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        utmContent: dto.utmContent,
        promoCode: dto.promoCode,
      },
    });
  }

  async listTrackingLinks(
    filters: {
      creatorId?: string;
      campaignId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
    orgId?: string,
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const where = {
      creator: { is: { organizationId: orgId } },
      ...(filters.creatorId && { creatorId: filters.creatorId }),
      ...(filters.campaignId && { campaignId: filters.campaignId }),
      ...((filters.from || filters.to) && {
        createdAt: {
          ...(filters.from && { gte: new Date(filters.from) }),
          ...(filters.to && { lte: new Date(filters.to) }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.trackingLink.findMany({
        where,
        include: { creator: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.trackingLink.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTrackingLink(id: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      throw new NotFoundException("Tracking link not found");
    }
    const link = await this.prisma.trackingLink.findUnique({
      where: { id, creator: { is: { organizationId: orgId } } },
    });
    if (!link) throw new NotFoundException("Tracking link not found");
    return link;
  }

  async recordClickAndResolve(shortCode: string) {
    const link = await this.prisma.trackingLink.findUnique({
      where: { shortCode },
    });
    if (!link) return null;

    await this.prisma.trackingLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });

    return link;
  }

  async processServerEvent(dto: ServerEventDto) {
    const event = await this.prisma.event.create({
      data: {
        eventName: dto.eventName,
        category: "CUSTOM",
        timestamp: new Date(dto.eventTime * 1000),
        sessionId: dto.eventId,
        deduplicationKey: dto.eventId,
        properties: {
          actionSource: dto.actionSource,
          sourceUrl: dto.sourceUrl,
        } as object,
        context: dto.userData as object,
      },
    });

    return { eventId: event.id, status: "accepted" };
  }
}
