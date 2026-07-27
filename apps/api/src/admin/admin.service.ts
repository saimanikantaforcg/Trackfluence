import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

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
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(actorId: string, userId: string, role: 'ADMIN' | 'MEMBER') {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    void this.audit.log(
      { userId: actorId },
      'user.role_updated',
      { entityType: 'User', entityId: userId, details: { newRole: role } },
    );

    return updated;
  }

  async getSystemStats() {
    const [users, creators, customers, orders, attributions] = await Promise.all([
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
    void this.audit.log({ userId: actorId }, 'cache.flushed');
    return { flushed: true };
  }

  async getAuditLogs(limit = 100) {
    return this.audit.getRecentLogs(limit);
  }

  // ─── Extended Admin User Management ──────────────────────────

  async suspendUser(actorId: string, userId: string): Promise<{ suspended: boolean }> {
    if (actorId === userId) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('Cannot suspend yourself');
    }
    // We store suspended state via role downgrade to VIEWER + audit
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'VIEWER' },
    });
    void this.audit.log(
      { userId: actorId },
      'user.suspended',
      { entityType: 'User', entityId: userId },
    );
    return { suspended: true };
  }

  async deleteUser(actorId: string, userId: string): Promise<{ deleted: boolean }> {
    if (actorId === userId) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('Cannot delete yourself');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    void this.audit.log(
      { userId: actorId },
      'user.deleted',
      { entityType: 'User', entityId: userId },
    );
    return { deleted: true };
  }

  async promoteUser(actorId: string, userId: string, role: 'ADMIN' | 'MEMBER' | 'VIEWER'): Promise<{ id: string; name: string; email: string; role: string }> {
    if (actorId === userId) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException('Cannot change your own role');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    void this.audit.log(
      { userId: actorId },
      'user.promoted',
      { entityType: 'User', entityId: userId, details: { newRole: role } },
    );
    return updated;
  }
}
