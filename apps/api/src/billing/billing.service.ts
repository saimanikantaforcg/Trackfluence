import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

// ─── Stripe v22 type workaround: namespace types not re-exported ─
type StripeInstance = InstanceType<typeof Stripe>;
type StripeEvent = ReturnType<StripeInstance['webhooks']['constructEvent']>;
type StripeSubscription = Awaited<ReturnType<StripeInstance['subscriptions']['retrieve']>>;
type StripeInvoice = Awaited<ReturnType<StripeInstance['invoices']['retrieve']>>;
type StripeSubscriptionStatus = StripeSubscription['status'];

// ─── Plan definitions ─────────────────────────────────────────
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: { creators: 3, trackingLinks: 10, attributionRuns: 50 },
  },
  STARTER: {
    name: 'Starter',
    price: 49,
    limits: { creators: 15, trackingLinks: 100, attributionRuns: 1_000 },
  },
  GROWTH: {
    name: 'Growth',
    price: 149,
    limits: { creators: 100, trackingLinks: 1_000, attributionRuns: 20_000 },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    limits: { creators: Infinity, trackingLinks: Infinity, attributionRuns: Infinity },
  },
} as const;

@Injectable()
export class BillingService {
  private readonly stripe: InstanceType<typeof Stripe>;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2026-05-27.dahlia',
    });
  }

  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;
    const customer = await this.stripe.customers.create({ email, metadata: { userId } });
    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customer.id },
      update: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createCheckoutSession(userId: string, email: string, priceId: string): Promise<{ url: string }> {
    const customerId = await this.getOrCreateCustomer(userId, email);
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=canceled`,
      subscription_data: { metadata: { userId } },
    });
    return { url: session.url! };
  }

  async createPortalSession(userId: string, returnUrl?: string): Promise<{ url: string }> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No subscription found for this user');
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl ?? `${appUrl}/settings`,
    });
    return { url: session.url };
  }

  async getSubscription(userId: string) {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: StripeEvent;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Stripe webhook signature verification failed: ${msg}`);
      throw err;
    }
    this.logger.log(`Stripe event received: ${event.type}`);
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(event.data.object as StripeSubscription);
        break;
      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeSubscription;
        const userId = (sub.metadata as Record<string, string>)?.userId;
        if (userId) {
          await this.prisma.subscription.updateMany({
            where: { userId },
            data: { status: 'CANCELED', stripeSubscriptionId: sub.id },
          });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeInvoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await this.prisma.subscription.updateMany({
            where: { stripeCustomerId: customerId },
            data: { status: 'PAST_DUE' },
          });
        }
        break;
      }
      default:
        break;
    }
  }

  async recordUsage(userId: string, metric: string, quantity = 1): Promise<void> {
    await this.prisma.usageRecord.create({ data: { userId, metric, quantity } });
  }

  async getUsageSummary(userId: string, metric: string, since: Date): Promise<number> {
    const result = await this.prisma.usageRecord.aggregate({
      where: { userId, metric, recordedAt: { gte: since } },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  private async syncSubscription(sub: StripeSubscription): Promise<void> {
    const userId = (sub.metadata as Record<string, string>)?.userId;
    if (!userId) return;
    const priceId = sub.items.data[0]?.price?.id ?? null;
    const plan = this.resolvePlan(priceId);
    this.analytics.track(userId, 'subscription.updated', { plan, status: sub.status });
    await this.prisma.subscription.updateMany({
      where: { userId },
      data: {
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan,
        status: this.mapStatus(sub.status),
        currentPeriodStart: new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000),
        currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }

  private resolvePlan(priceId: string | null): 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE' {
    const map: Record<string, 'STARTER' | 'GROWTH' | 'ENTERPRISE'> = {
      [this.config.get('STRIPE_PRICE_STARTER', '')]: 'STARTER',
      [this.config.get('STRIPE_PRICE_GROWTH', '')]: 'GROWTH',
      [this.config.get('STRIPE_PRICE_ENTERPRISE', '')]: 'ENTERPRISE',
    };
    return priceId ? (map[priceId] ?? 'FREE') : 'FREE';
  }

  private mapStatus(status: StripeSubscriptionStatus): 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' {
    const statusMap: Record<string, 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'> = {
      active: 'ACTIVE', trialing: 'TRIALING', past_due: 'PAST_DUE', canceled: 'CANCELED', unpaid: 'UNPAID',
    };
    return statusMap[status] ?? 'ACTIVE';
  }
}
