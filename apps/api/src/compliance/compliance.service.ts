import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { FTCCheckDto } from './dto/compliance.dto';

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

function detectDisclosure(text: string): { found: boolean; type: string | null } {
  for (const pattern of DISCLOSURE_PATTERNS) {
    if (pattern.test(text)) return { found: true, type: 'hashtag' };
  }
  return { found: false, type: null };
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async runFTCCheck(dto: FTCCheckDto) {
    const issues: string[] = [];

    const { found: hasDisclosure, type: disclosureType } = dto.contentText
      ? detectDisclosure(dto.contentText)
      : { found: false, type: null };

    if (dto.hasSponsorship && !hasDisclosure) {
      issues.push('Missing FTC disclosure for sponsored content');
    }

    if (hasDisclosure && dto.contentText) {
      const firstLine = dto.contentText.split('\n')[0] ?? '';
      const hasEarlyDisclosure = detectDisclosure(firstLine).found;
      if (!hasEarlyDisclosure) {
        issues.push('Disclosure not prominently placed (should appear early in content)');
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

  async getAllCreatorCompliance() {
    const creators = await this.prisma.creator.findMany({
      select: { id: true, name: true, platform: true, handle: true },
      orderBy: { name: 'asc' },
    });

    const results = await Promise.all(
      creators.map(async (creator) => {
        const [total, compliant] = await Promise.all([
          this.prisma.fTCComplianceCheck.count({ where: { creatorId: creator.id } }),
          this.prisma.fTCComplianceCheck.count({ where: { creatorId: creator.id, isCompliant: true } }),
        ]);
        const lastCheck = await this.prisma.fTCComplianceCheck.findFirst({
          where: { creatorId: creator.id },
          orderBy: { checkedAt: 'desc' },
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

    return results;
  }

  async getCreatorCompliance(creatorId: string) {
    const checks = await this.prisma.fTCComplianceCheck.findMany({
      where: { creatorId },
      orderBy: { checkedAt: 'desc' },
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

  async getComplianceSummary() {
    const [total, compliant] = await Promise.all([
      this.prisma.fTCComplianceCheck.count(),
      this.prisma.fTCComplianceCheck.count({ where: { isCompliant: true } }),
    ]);

    const nonCompliantChecks = await this.prisma.fTCComplianceCheck.findMany({
      where: { isCompliant: false },
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
