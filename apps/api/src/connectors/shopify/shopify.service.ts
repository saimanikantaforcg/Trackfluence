import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// Shopify order payload (simplified)
interface ShopifyOrder {
  id: number;
  order_number: number;
  email?: string;
  total_price: string;
  currency: string;
  financial_status: string;
  created_at: string;
  customer?: {
    id: number;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  note_attributes?: { name: string; value: string }[];
  utm_parameters?: { source?: string; medium?: string; campaign?: string };
  landing_site?: string;
}

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── HMAC Verification ────────────────────────────────────

  verifyWebhookHmac(rawBody: Buffer, hmacHeader: string): boolean {
    const secret = this.config.get<string>('SHOPIFY_API_SECRET');
    if (!secret) return false;
    const computed = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    // Constant-time comparison to prevent timing attacks
    if (computed.length !== hmacHeader.length) return false;
    let mismatch = 0;
    for (let i = 0; i < computed.length; i++) {
      mismatch |= computed.charCodeAt(i) ^ hmacHeader.charCodeAt(i);
    }
    return mismatch === 0;
  }

  // ─── Webhook: orders/paid ─────────────────────────────────

  async handleOrderPaid(shopDomain: string, order: ShopifyOrder) {
    this.logger.log(`Shopify order/paid: #${order.order_number} from ${shopDomain}`);

    const externalId = `shopify-${shopDomain}-${order.id}`;

    // Upsert customer via identity resolution
    let customerId: string | null = null;
    if (order.customer) {
      const customer = await this.prisma.customer.upsert({
        where: { email: order.customer.email ?? `shopify-${order.customer.id}@placeholder.local` },
        update: {
          orderCount: { increment: 1 },
          totalRevenue: { increment: parseFloat(order.total_price) },
        },
        create: {
          email: order.customer.email,
          firstName: order.customer.first_name,
          lastName: order.customer.last_name,
          orderCount: 1,
          totalRevenue: parseFloat(order.total_price),
          identities: {
            create: [
              ...(order.customer.email
                ? [{ identityType: 'EMAIL' as const, identityValue: order.customer.email }]
                : []),
              ...(order.customer.phone
                ? [{ identityType: 'PHONE' as const, identityValue: order.customer.phone }]
                : []),
              { identityType: 'SHOPIFY_ID' as const, identityValue: String(order.customer.id) },
            ],
          },
        },
      });
      customerId = customer.id;
    }

    // Upsert order
    const dbOrder = await this.prisma.order.upsert({
      where: { externalId },
      update: { status: this.mapStatus(order.financial_status) },
      create: {
        externalId,
        customerId: customerId!,
        totalAmount: parseFloat(order.total_price),
        currency: order.currency,
        status: this.mapStatus(order.financial_status),
        source: 'shopify',
        orderDate: new Date(order.created_at),
        metadata: { shopDomain, orderNumber: order.order_number },
      },
    });

    // Attempt to find a tracking-link touchpoint for attribution
    if (customerId) {
      const lastTouchpoint = await this.prisma.touchPoint.findFirst({
        where: { customerId },
        orderBy: { timestamp: 'desc' },
      });

      if (lastTouchpoint) {
        const existing = await this.prisma.attribution.findFirst({
          where: { orderId: dbOrder.id },
        });

        if (!existing) {
          await this.prisma.attribution.create({
            data: {
              orderId: dbOrder.id,
              customerId,
              creatorId: lastTouchpoint.creatorId,
              touchpointId: lastTouchpoint.id,
              model: 'LAST_TOUCH',
              attributedRevenue: parseFloat(order.total_price),
              attributionWeight: 1.0,
            },
          });

          // Mark customer as creator-acquired
          await this.prisma.customer.update({
            where: { id: customerId },
            data: {
              creatorAcquired: true,
              acquisitionCreatorId: lastTouchpoint.creatorId,
            },
          });

          this.logger.log(`Attribution created for order ${dbOrder.id} → creator ${lastTouchpoint.creatorId}`);
        }
      }
    }

    return { orderId: dbOrder.id, customerId, attributed: !!customerId };
  }

  // ─── Webhook: orders/cancelled ────────────────────────────

  async handleOrderCancelled(shopDomain: string, order: ShopifyOrder) {
    const externalId = `shopify-${shopDomain}-${order.id}`;
    await this.prisma.order.updateMany({
      where: { externalId },
      data: { status: 'CANCELLED' },
    });
    this.logger.log(`Order cancelled: ${externalId}`);
    return { status: 'cancelled' };
  }

  // ─── Manual sync ──────────────────────────────────────────

  async syncOrders(shopDomain: string) {
    this.logger.log(`Starting Shopify order sync for ${shopDomain}`);

    const syncRecord = await this.prisma.connectorSync.create({
      data: {
        connectorType: 'shopify',
        direction: 'inbound',
        status: 'PROCESSING',
        metadata: { shopDomain },
      },
    });

    this.logger.log(`Shopify sync ${syncRecord.id} initiated — connect Shopify API credentials to enable`);

    return {
      syncId: syncRecord.id,
      status: 'PROCESSING',
      message: 'Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_STORE_DOMAIN in .env to enable full sync',
    };
  }

  async registerWebhook(shopDomain: string, topic: string) {
    this.logger.log(`Webhook registration: ${topic} for ${shopDomain}`);
    return { topic, endpoint: `/api/v1/connectors/shopify/webhook`, status: 'ready' };
  }

  private mapStatus(financialStatus: string): 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'CANCELLED' {
    const map: Record<string, 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'CANCELLED'> = {
      paid: 'COMPLETED',
      pending: 'PENDING',
      refunded: 'REFUNDED',
      voided: 'CANCELLED',
      partially_refunded: 'REFUNDED',
    };
    return map[financialStatus] ?? 'PENDING';
  }
}
