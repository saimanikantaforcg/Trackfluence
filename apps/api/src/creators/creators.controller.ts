import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { WebhooksService } from "../webhooks/webhooks.service";
import { CurrentOrg } from "../organizations/current-org.decorator";
import { randomBytes } from "crypto";
import { Request } from "express";
import { Public } from "../auth/public.decorator";

interface AuthedRequest extends Request {
  user: { sub: string; role: string };
}

class CreateCreatorDto {
  @IsString()
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  platform?: string;

  @IsString()
  @IsOptional()
  handle?: string;
}

class UpdateCommissionDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate!: number;
}

@ApiTags("Creators")
@Controller("api/v1/creators")
export class CreatorsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly notif: NotificationsService,
    private readonly webhooks: WebhooksService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all creators" })
  async findAll(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @CurrentOrg() orgId?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
    const limitNum = Math.min(
      200,
      Math.max(1, parseInt(limit ?? "50", 10) || 50),
    );
    const skip = (pageNum - 1) * limitNum;

    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      return {
        items: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      };
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { handle: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.creator.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          email: true,
          platform: true,
          handle: true,
          avatarUrl: true,
          createdAt: true,
          _count: { select: { trackingLinks: true, attributions: true } },
        },
      }),
      this.prisma.creator.count({ where }),
    ]);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Post()
  @ApiOperation({ summary: "Create a creator" })
  async create(@Body() dto: CreateCreatorDto, @CurrentOrg() orgId?: string) {
    // Fail closed: require orgId for tenant-scoped creation
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to create a creator",
      );
    }
    const creator = await this.prisma.creator.create({
      data: { ...dto, organizationId: orgId },
    });
    // fire-and-forget audit
    void this.notif.notify({
      userId: "system",
      type: "creator.created",
      title: "New Creator Added",
      body: `Creator "${creator.name}" was added to Trackfluence.`,
      link: `/creators/${creator.id}`,
    });
    void this.webhooks.dispatch(
      "creator.created",
      {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        platform: creator.platform,
        handle: creator.handle,
      },
      orgId,
    );
    return creator;
  }

  @Get("portal/timeseries")
  @Public()
  @ApiOperation({
    summary: "Monthly attributed revenue series for portal chart",
  })
  async portalTimeSeries(@Query("token") token: string) {
    if (!token) throw new BadRequestException("token is required");
    const invite = await this.prisma.creatorInvite.findUnique({
      where: { token },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException("Invite link is invalid or has expired");
    }
    // Group attributions by month for last 12 months
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const attributions = await this.prisma.attribution.findMany({
      where: { creatorId: invite.creatorId, calculatedAt: { gte: since } },
      select: { calculatedAt: true, attributedRevenue: true },
      orderBy: { calculatedAt: "asc" },
    });

    // Aggregate by month (YYYY-MM)
    const monthMap = new Map<string, number>();
    for (const a of attributions) {
      const key = a.calculatedAt.toISOString().slice(0, 7);
      monthMap.set(
        key,
        (monthMap.get(key) ?? 0) + Number(a.attributedRevenue ?? 0),
      );
    }

    // Fill all 12 months even if 0
    const result: Array<{ month: string; revenue: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      result.push({ month: key, revenue: monthMap.get(key) ?? 0 });
    }
    return result;
  }

  @Get("portal")
  @Public()
  @ApiOperation({
    summary: "Creator self-service portal (token-gated, no auth required)",
  })
  async portal(@Query("token") token: string) {
    if (!token) throw new BadRequestException("token is required");
    const invite = await this.prisma.creatorInvite.findUnique({
      where: { token },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException("Invite link is invalid or has expired");
    }
    const [creator, payouts, attributionStats] = await Promise.all([
      this.prisma.creator.findUniqueOrThrow({
        where: { id: invite.creatorId },
        include: {
          trackingLinks: { orderBy: { createdAt: "desc" }, take: 20 },
          _count: { select: { attributions: true, touchpoints: true } },
        },
      }),
      this.prisma.payout.findMany({
        where: { creatorId: invite.creatorId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          periodStart: true,
          periodEnd: true,
        },
      }),
      this.prisma.attribution.aggregate({
        where: { creatorId: invite.creatorId },
        _sum: { attributedRevenue: true },
        _count: { _all: true },
      }),
    ]);
    return {
      creator,
      payouts,
      attributedRevenue: Number(attributionStats._sum?.attributedRevenue ?? 0),
      attributionCount: attributionStats._count._all,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get creator by ID" })
  async findOne(@Param("id") id: string, @CurrentOrg() orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to view creator details",
      );
    }
    return this.prisma.creator.findUniqueOrThrow({
      where: { id, organizationId: orgId },
      include: {
        trackingLinks: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { attributions: true, touchpoints: true } },
      },
    });
  }

  @Patch(":id/commission")
  @ApiOperation({ summary: "Update creator commission rate" })
  async updateCommission(
    @Param("id") id: string,
    @Body() dto: UpdateCommissionDto,
    @CurrentOrg() orgId?: string,
  ) {
    // Fail closed: require orgId for tenant-scoped updates
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to update creator",
      );
    }
    return this.prisma.creator.update({
      where: { id, organizationId: orgId },
      data: { commissionRate: dto.commissionRate },
      select: { id: true, name: true, commissionRate: true },
    });
  }

  @Post(":id/invite")
  @ApiOperation({ summary: "Send invite email to creator" })
  async invite(
    @Param("id") id: string,
    @Req() req: AuthedRequest,
    @CurrentOrg() orgId?: string,
  ) {
    const creator = await this.prisma.creator.findUnique({ where: { id } });
    if (!creator) throw new BadRequestException("Creator not found");
    if (!creator.email)
      throw new BadRequestException("Creator has no email address");

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.creatorInvite.upsert({
      where: { creatorId: id },
      update: { token, expiresAt, invitedBy: req.user.sub, acceptedAt: null },
      create: {
        creatorId: id,
        invitedBy: req.user.sub,
        token,
        email: creator.email,
        expiresAt,
      },
    });

    const inviteUrl = `${process.env.APP_URL ??
      "http://localhost:3000"}/portal?token=${token}`;
    const sender = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { name: true },
    });
    void this.email.sendCreatorInvite(
      creator.email,
      sender?.name ?? "Trackfluence",
      inviteUrl,
    );

    void this.notif.notify({
      userId: req.user.sub,
      type: "creator.invited",
      title: "Creator Invited",
      body: `Invite sent to ${creator.name} (${creator.email}).`,
      link: `/creators/${id}`,
    });
    void this.webhooks.dispatch(
      "creator.invited",
      {
        creatorId: id,
        email: creator.email,
        invitedBy: req.user.sub,
      },
      orgId,
    );

    return { invited: true, email: creator.email };
  }

  @Post("import")
  @ApiOperation({
    summary: "Bulk import creators from CSV text (name,email,handle,platform)",
  })
  async bulkImport(
    @Body() body: { csv: string },
    @CurrentOrg() orgId?: string,
  ) {
    if (!body.csv?.trim())
      throw new BadRequestException("csv field is required");

    const lines = body.csv
      .trim()
      .split("\n")
      .filter(Boolean);
    const header =
      lines[0]
        ?.toLowerCase()
        .replace(/\r/g, "")
        .split(",")
        .map((h) => h.trim()) ?? [];
    const nameIdx = header.indexOf("name");
    const emailIdx = header.indexOf("email");
    const handleIdx = header.indexOf("handle");
    const platformIdx = header.indexOf("platform");

    if (nameIdx === -1)
      throw new BadRequestException('CSV must have a "name" column');

    const results = {
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const line of lines.slice(1)) {
      const cols = line
        .replace(/\r/g, "")
        .split(",")
        .map((c) => c.trim().replace(/^"|"$/g, ""));
      const name = cols[nameIdx]?.trim();
      if (!name) {
        results.failed++;
        continue;
      }

      const email =
        emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : undefined;
      const handle =
        handleIdx >= 0 && cols[handleIdx] ? cols[handleIdx] : undefined;
      const platform =
        platformIdx >= 0 && cols[platformIdx] ? cols[platformIdx] : undefined;

      try {
        await this.prisma.creator.upsert({
          where: { email: email ?? "" },
          update: { name, handle, platform },
          create: {
            name,
            email,
            handle,
            platform,
            organizationId: orgId ?? null,
          },
        });
        results.created++;
      } catch {
        // email conflict or other error — skip
        results.skipped++;
      }
    }

    return results;
  }
}
