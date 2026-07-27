import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { WebhooksService } from "../webhooks/webhooks.service";

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: WebhooksService,
  ) {}

  async create(dto: CreateCampaignDto, orgId: string) {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budget: dto.budget ?? undefined,
        currency: dto.currency ?? "USD",
        status: dto.status ?? "active",
        creatorIds: dto.creatorIds ?? [],
        organizationId: orgId,
      },
    });
    void this.webhooks.dispatch(
      "campaign.created",
      {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      },
      orgId,
    );
    return campaign;
  }

  async findAll(page = 1, limit = 20, orgId: string) {
    if (!orgId) {
      throw new NotFoundException("Campaigns not found");
    }
    const skip = (page - 1) * limit;
    const where = { organizationId: orgId };
    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, orgId: string) {
    if (!orgId) {
      throw new NotFoundException("Campaign not found");
    }
    const campaign = await this.prisma.campaign.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto, orgId: string) {
    if (!orgId) {
      throw new NotFoundException("Campaign not found");
    }
    // Enforce ownership via findOne which checks orgId
    await this.findOne(id, orgId);
    const updated = await this.prisma.campaign.update({
      where: { id, organizationId: orgId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startDate !== undefined && {
          startDate: new Date(dto.startDate),
        }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.creatorIds !== undefined && { creatorIds: dto.creatorIds }),
      },
    });
    void this.webhooks.dispatch(
      "campaign.updated",
      {
        id: updated.id,
        name: updated.name,
        status: updated.status,
      },
      orgId,
    );
    return updated;
  }

  async remove(id: string, orgId: string) {
    if (!orgId) {
      throw new NotFoundException("Campaign not found");
    }
    // Verify ownership before delete - fail closed
    const campaign = await this.prisma.campaign.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    await this.prisma.campaign.delete({ where: { id } });
    return { deleted: true };
  }

  /** Compute spend as total PAID payouts against this campaign */
  async getStats(id: string, orgId: string) {
    if (!orgId) {
      throw new NotFoundException("Campaign not found");
    }
    const campaign = await this.findOne(id, orgId);
    const payouts = await this.prisma.payout.aggregate({
      where: {
        campaignId: id,
        status: "PAID",
        organizationId: orgId,
      },
      _sum: { amount: true },
    });
    const spend = Number(payouts._sum.amount ?? 0);
    const budget = Number(campaign.budget ?? 0);
    return {
      ...campaign,
      spend,
      remaining: budget > 0 ? budget - spend : null,
      roi: spend > 0 && budget > 0 ? ((budget - spend) / spend) * 100 : null,
    };
  }

  // ─── A/B Variant Management ───────────────────────────────────────────────

  /**
   * Create an A/B variant link for a campaign by duplicating an existing link.
   * The group ID is stored in metadata.abGroupId; variantLabel marks this as 'B','C',…
   */
  async createVariant(
    campaignId: string,
    parentLinkId: string,
    label: string,
    destinationUrl?: string,
    orgId?: string,
  ) {
    if (!orgId) {
      throw new NotFoundException("Campaign not found");
    }
    // Verify campaign ownership
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: orgId },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    const parent = await this.prisma.trackingLink.findUnique({
      where: { id: parentLinkId },
    });
    if (!parent) throw new NotFoundException("Tracking link not found");

    const parentMeta = (parent.metadata ?? {}) as Record<string, unknown>;
    // Determine group ID: inherit from parent or parent becomes group root
    const abGroupId =
      (parentMeta["abGroupId"] as string | undefined) ?? parent.id;

    // Ensure parent is tagged as group root if not yet
    if (!parentMeta["abGroupId"]) {
      await this.prisma.trackingLink.update({
        where: { id: parent.id },
        data: {
          metadata: {
            ...parentMeta,
            abGroupId,
            variantLabel: "A",
            isAbParent: true,
          },
        },
      });
    }

    const { nanoid } = await import("nanoid");
    const shortCode = nanoid(8);

    const variant = await this.prisma.trackingLink.create({
      data: {
        shortCode,
        creatorId: parent.creatorId,
        campaignId,
        destinationUrl: destinationUrl ?? parent.destinationUrl,
        type: parent.type,
        utmSource: parent.utmSource,
        utmMedium: parent.utmMedium,
        utmCampaign: parent.utmCampaign,
        metadata: { abGroupId, variantLabel: label, isAbVariant: true },
      },
    });
    return variant;
  }

  /** Get all links in an A/B test group, with click counts and conversion stats */
  async getVariants(groupId: string, orgId?: string) {
    if (!orgId) {
      throw new NotFoundException("Campaign not found");
    }
    // Build where clause with mandatory org scoping
    const where: Record<string, unknown> = {
      OR: [
        { id: groupId },
        { metadata: { path: ["abGroupId"], equals: groupId } },
      ],
      campaign: { is: { organizationId: orgId } },
    };

    const links = await this.prisma.trackingLink.findMany({
      where,
      include: {
        _count: { select: { touchpoints: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return links.map((l) => {
      const meta = (l.metadata ?? {}) as Record<string, unknown>;
      return {
        id: l.id,
        shortCode: l.shortCode,
        destinationUrl: l.destinationUrl,
        variantLabel: (meta["variantLabel"] as string | undefined) ?? "A",
        clickCount: l.clickCount,
        conversionCount: l._count.touchpoints,
        conversionRate:
          l.clickCount > 0 ? (l._count.touchpoints / l.clickCount) * 100 : 0,
        createdAt: l.createdAt,
      };
    });
  }
}
