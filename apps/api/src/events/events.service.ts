import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ingest(dto: IngestEventDto) {
    const deduplicationKey = `${dto.sessionId}:${dto.eventName}:${dto.timestamp}`;

    const existing = await this.prisma.event.findUnique({
      where: { deduplicationKey },
    });

    if (existing) {
      this.logger.debug(`Duplicate event skipped: ${deduplicationKey}`);
      return { eventId: existing.id, status: 'deduplicated' };
    }

    const event = await this.prisma.event.create({
      data: {
        eventName: dto.eventName,
        category: dto.category,
        timestamp: new Date(dto.timestamp),
        sessionId: dto.sessionId,
        customerId: dto.customerId,
        creatorId: dto.creatorId,
        trackingLinkId: dto.trackingLinkId,
        properties: (dto.properties ?? {}) as object,
        context: (dto.context ?? {}) as object,
        deduplicationKey,
      },
    });

    return { eventId: event.id, status: 'accepted' };
  }

  async ingestBatch(dtos: IngestEventDto[]) {
    const results = await Promise.allSettled(dtos.map((dto) => this.ingest(dto)));

    return {
      total: dtos.length,
      accepted: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }

  async query(filters: {
    sessionId?: string;
    customerId?: string;
    category?: string;
    limit: number;
  }) {
    return this.prisma.event.findMany({
      where: {
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.category && { category: filters.category as any }),
      },
      orderBy: { timestamp: 'desc' },
      take: Math.min(filters.limit, 200),
    });
  }
}
