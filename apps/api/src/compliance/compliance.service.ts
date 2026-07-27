import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { FTCCheckDto } from "./dto/compliance.dto";

const DISCLOSURE_PATTERNS = [
  /#ad\b/i,
  /#sponsored/i,
  /#partner/i,
  /#paidpartnership/i,
  /paid partnership/i,
  /sponsored by/i,
  /in partnership with/i,
  /advertisement/i,
];

function detectDisclosure(
  text: string,
): { found: boolean; type: string | null } {
  for (const pattern of DISCLOSURE_PATTERNS) {
    if (pattern.test(text)) return { found: true, type: "hashtag" };
  }
  return { found: false, type: null };
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async runFTCCheck(dto: FTCCheckDto, orgId?: string) {
    const issues: string[] = [];

    const { found: hasDisclosure, type: disclosureType } = dto.contentText
      ? detectDisclosure(dto.contentText)
      : { found: false, type: null };

    if (dto.hasSponsorship && !hasDisclosure) {
      issues.push("Missing FTC disclosure for sponsored content");
    }

    if (hasDisclosure && dto.contentText) {
      const firstLine = dto.contentText.split("\n")[0] ?? "";
      const hasEarlyDisclosure = detectDisclosure(firstLine).found;
      if (!hasEarlyDisclosure) {
        issues.push(
          "Disclosure not prominently placed (should appear early in content)",
        );
      }
    }

    const isCompliant = issues.length === 0;

    const check = await this.prisma.fTCComplianceCheck.create({
      data: {
        creatorId: dto.creatorId,
        contentUrl: dto.contentUrl,
        contentType: dto.contentType,
        hasDisclosure,
        disclosureType,
        isCompliant,
        issues,
        organizationId: orgId,
      },
    });

    // Auto-remediation: email creator when non-compliant
    if (!isCompliant) {
      const creator = await this.prisma.creator.findUnique({
        where: { id: dto.creatorId },
        select: { name: true, email: true },
      });
      if (creator?.email) {
        void this.email.sendComplianceViolation(
          creator.email,
          creator.name,
          dto.contentUrl,
          issues,
        );
      }
    }

    return check;
  }

  async getAllCreatorCompliance(orgId?: string, page = 1, limit = 50) {
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
    const skip = (page - 1) * limit;
    const where = { organizationId: orgId };

    const [creators, total] = await Promise.all([
      this.prisma.creator.findMany({
        where,
        select: { id: true, name: true, platform: true, handle: true },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.creator.count({ where }),
    ]);

    const results = await Promise.all(
      creators.map(async (creator) => {
        const [total, compliant] = await Promise.all([
          this.prisma.fTCComplianceCheck.count({
            where: { creatorId: creator.id },
          }),
          this.prisma.fTCComplianceCheck.count({
            where: { creatorId: creator.id, isCompliant: true },
          }),
        ]);
        const lastCheck = await this.prisma.fTCComplianceCheck.findFirst({
          where: { creatorId: creator.id },
          orderBy: { checkedAt: "desc" },
          select: { checkedAt: true, isCompliant: true },
        });
        return {
          creatorId: creator.id,
          name: creator.name,
          platform: creator.platform,
          handle: creator.handle,
          totalChecks: total,
          compliantCount: compliant,
          nonCompliantCount: total - compliant,
          complianceRate: total > 0 ? compliant / total : null,
          lastCheckedAt: lastCheck?.checkedAt ?? null,
          lastCheckPassed: lastCheck?.isCompliant ?? null,
        };
      }),
    );

    return {
      items: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCreatorCompliance(creatorId: string, orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      throw new Error("Organization context required");
    }
    const checks = await this.prisma.fTCComplianceCheck.findMany({
      where: { creatorId, organizationId: orgId },
      orderBy: { checkedAt: "desc" },
    });

    const compliant = checks.filter((c) => c.isCompliant).length;

    return {
      creatorId,
      totalChecks: checks.length,
      compliantCount: compliant,
      nonCompliantCount: checks.length - compliant,
      complianceRate: checks.length > 0 ? compliant / checks.length : 0,
      checks,
    };
  }

  async getComplianceSummary(orgId?: string) {
    // Fail closed: require orgId for tenant-scoped queries
    if (!orgId) {
      return {
        totalChecks: 0,
        compliantCount: 0,
        nonCompliantCount: 0,
        complianceRate: 0,
        topIssues: [],
      };
    }
    const where = { organizationId: orgId };
    const [total, compliant] = await Promise.all([
      this.prisma.fTCComplianceCheck.count({ where }),
      this.prisma.fTCComplianceCheck.count({
        where: { ...where, isCompliant: true },
      }),
    ]);

    const nonCompliantChecks = await this.prisma.fTCComplianceCheck.findMany({
      where: { ...where, isCompliant: false },
      select: { issues: true },
    });

    // Count issue frequency
    const issueFrequency = new Map<string, number>();
    for (const check of nonCompliantChecks) {
      const issues = check.issues as string[];
      for (const issue of issues) {
        issueFrequency.set(issue, (issueFrequency.get(issue) ?? 0) + 1);
      }
    }

    return {
      totalChecks: total,
      compliantCount: compliant,
      nonCompliantCount: total - compliant,
      complianceRate: total > 0 ? compliant / total : 0,
      topIssues: Array.from(issueFrequency.entries())
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}
