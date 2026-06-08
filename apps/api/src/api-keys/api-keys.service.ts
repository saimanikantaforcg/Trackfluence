import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string, name: string, scopes: string[] = ['read']): Promise<{
    key: string; // shown ONCE
    id: string;
    prefix: string;
    name: string;
    scopes: string[];
    createdAt: Date;
  }> {
    // Generate 32-byte random key, encode as hex → 64 chars
    const rawKey = `tf_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 10); // "tf_" + 7 chars

    const record = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, keyPrefix, scopes },
    });

    return {
      key: rawKey, // returned only once — never stored in plaintext
      id: record.id,
      prefix: record.keyPrefix,
      name: record.name,
      scopes: record.scopes,
      createdAt: record.createdAt,
    };
  }

  async listForUser(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, keyId: string): Promise<void> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId, revokedAt: null },
    });
    if (!key) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }

  /** Called by an API-key auth guard to validate an inbound key */
  async validateKey(rawKey: string): Promise<{ userId: string; scopes: string[] } | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const record = await this.prisma.apiKey.findUnique({ where: { keyHash } });

    if (!record || record.revokedAt) return null;
    if (record.expiresAt && record.expiresAt < new Date()) return null;

    // Update last-used timestamp (fire-and-forget)
    void this.prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return { userId: record.userId, scopes: record.scopes };
  }
}
