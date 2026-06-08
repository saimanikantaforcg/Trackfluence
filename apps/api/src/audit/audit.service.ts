import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditContext {
  userId: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    ctx: AuditContext,
    action: string,
    opts?: { entityType?: string; entityId?: string; details?: Record<string, unknown> },
  ): Promise<void> {
    // fire-and-forget — never block the request path
    this.prisma.auditLog
      .create({
        data: {
          userId: ctx.userId,
          action,
          entityType: opts?.entityType,
          entityId: opts?.entityId,
          details: opts?.details as object | undefined,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
      })
      .catch(() => {
        // swallow silently — audit failure must never crash the app
      });
  }

  async getRecentLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
  }

  async getUserLogs(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }
}
