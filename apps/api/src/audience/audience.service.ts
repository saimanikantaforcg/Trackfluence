import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAudienceDto, ExportAudienceDto } from "./dto/audience.dto";

type AudienceRule = {
  field:
    | "creatorAcquired"
    | "totalRevenue"
    | "orderCount"
    | "creatorId"
    | "channel";
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte";
  value: unknown;
};

@Injectable()
export class AudienceService {
  private readonly logger = new Logger(AudienceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAudience(dto: CreateAudienceDto, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped creation
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required to create an audience",
      );
    }
    return this.prisma.audience.create({
      data: {
        name: dto.name,
        description: dto.description,
        rules: dto.rules as any,
        organizationId: orgId,
      },
    });
  }

  async listAudiences(orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      return [];
    }
    return this.prisma.audience.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    });
  }

  async getAudience(id: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      throw new NotFoundException("Audience not found");
    }
    const audience = await this.prisma.audience.findUnique({
      where: { id, organizationId: orgId },
      include: {
        members: {
          include: {
            customer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 100,
        },
        _count: { select: { members: true } },
      },
    });
    if (!audience) throw new NotFoundException("Audience not found");
    return audience;
  }

  async computeAudience(id: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped operations
    if (!orgId) {
      throw new NotFoundException("Audience not found");
    }
    const audience = await this.prisma.audience.findUnique({
      where: { id, organizationId: orgId },
    });
    if (!audience) throw new NotFoundException("Audience not found");

    const rules = ((audience.rules as unknown) as AudienceRule[]) ?? [];
    const where: Record<string, unknown> = {
      organizationId: orgId,
    };

    for (const rule of rules) {
      if (rule.field === "creatorAcquired") {
        where["creatorAcquired"] = rule.value === true || rule.value === "true";
      } else if (rule.field === "totalRevenue") {
        where["totalRevenue"] = {
          [this.operatorToPrisma(rule.operator)]: Number(rule.value),
        };
      } else if (rule.field === "orderCount") {
        where["orderCount"] = {
          [this.operatorToPrisma(rule.operator)]: Number(rule.value),
        };
      } else if (rule.field === "creatorId") {
        // Customers acquired via a specific creator
        const prismaOp = rule.operator === "neq" ? "not" : "equals";
        where["acquiredByCreatorId"] = { [prismaOp]: String(rule.value) };
      } else if (rule.field === "channel") {
        // Customers whose first touchpoint had a matching UTM source
        const prismaOp = rule.operator === "neq" ? "not" : "equals";
        where["touchpoints"] = {
          some: {
            utmSource: { [prismaOp]: String(rule.value) },
          },
        };
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customers = await this.prisma.customer.findMany({
      where: where as any,
      select: { id: true },
    });

    // Clear and rebuild membership
    await this.prisma.audienceMember.deleteMany({ where: { audienceId: id } });

    if (customers.length > 0) {
      await this.prisma.audienceMember.createMany({
        data: customers.map((c) => ({
          audienceId: id,
          customerId: c.id,
        })),
      });
    }

    await this.prisma.audience.update({
      where: { id },
      data: { customerCount: customers.length },
    });

    return { audienceId: id, customerCount: customers.length };
  }

  async deleteAudience(id: string) {
    const audience = await this.prisma.audience.findUnique({ where: { id } });
    if (!audience) throw new NotFoundException("Audience not found");
    await this.prisma.audience.delete({ where: { id } });
  }

  async exportAudience(id: string, dto: ExportAudienceDto) {
    const audience = await this.prisma.audience.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!audience) throw new NotFoundException("Audience not found");

    const exportRecord = await this.prisma.audienceExport.create({
      data: {
        audienceId: id,
        destination: dto.destination,
        status: "PENDING",
      },
    });

    // In production, this would queue an async job
    this.logger.log(`Export queued: ${exportRecord.id} → ${dto.destination}`);

    return {
      exportId: exportRecord.id,
      audienceId: id,
      destination: dto.destination,
      status: "PENDING",
      estimatedRecords: audience._count.members,
    };
  }

  async exportAudienceCsv(id: string): Promise<string> {
    const audience = await this.prisma.audience.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            customer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                totalRevenue: true,
                orderCount: true,
                creatorAcquired: true,
              },
            },
          },
        },
      },
    });
    if (!audience) throw new NotFoundException("Audience not found");

    const header =
      "customerId,email,firstName,lastName,totalRevenue,orderCount,creatorAcquired\n";
    const rows = audience.members
      .map(({ customer: c }) =>
        [
          c.id,
          c.email,
          c.firstName ?? "",
          c.lastName ?? "",
          c.totalRevenue,
          c.orderCount,
          c.creatorAcquired,
        ].join(","),
      )
      .join("\n");
    return header + rows;
  }

  private operatorToPrisma(operator: string): string {
    const map: Record<string, string> = {
      eq: "equals",
      neq: "not",
      gt: "gt",
      lt: "lt",
      gte: "gte",
      lte: "lte",
    };
    return map[operator] ?? "equals";
  }
}
