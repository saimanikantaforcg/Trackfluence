import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  type: 'creator' | 'customer' | 'tracking_link';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = 5): Promise<{ creators: SearchResult[]; customers: SearchResult[]; links: SearchResult[] }> {
    const term = q.trim();
    if (!term) return { creators: [], customers: [], links: [] };

    const [creators, customers, links] = await Promise.all([
      this.prisma.creator.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { handle: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, handle: true, platform: true },
        take: limit,
      }),

      this.prisma.customer.findMany({
        where: {
          OR: [
            { email: { contains: term, mode: 'insensitive' } },
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, email: true, firstName: true, lastName: true },
        take: limit,
      }),

      this.prisma.trackingLink.findMany({
        where: {
          OR: [
            { utmCampaign: { contains: term, mode: 'insensitive' } },
            { shortCode: { contains: term, mode: 'insensitive' } },
            { promoCode: { contains: term, mode: 'insensitive' } },
          ],
        },
        select: { id: true, shortCode: true, utmCampaign: true, promoCode: true, creator: { select: { name: true } } },
        take: limit,
      }),
    ]);

    return {
      creators: creators.map((c) => ({
        type: 'creator' as const,
        id: c.id,
        title: c.name,
        subtitle: [c.platform, c.handle ? `@${c.handle}` : null].filter(Boolean).join(' · '),
        url: `/creators/${c.id}`,
      })),
      customers: customers.map((c) => ({
        type: 'customer' as const,
        id: c.id,
        title: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unknown',
        subtitle: c.email ?? '',
        url: `/customers/${c.id}`,
      })),
      links: links.map((l) => ({
        type: 'tracking_link' as const,
        id: l.id,
        title: l.utmCampaign ?? l.shortCode,
        subtitle: `${l.creator.name}${l.promoCode ? ` · ${l.promoCode}` : ''}`,
        url: `/attribution`,
      })),
    };
  }
}
