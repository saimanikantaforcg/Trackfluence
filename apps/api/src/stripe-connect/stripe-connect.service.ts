import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createAccountLink(userId: string): Promise<{ url: string }> {
    const secretKey = this.config.get<string>("STRIPE_SECRET_KEY");
    if (!secretKey) {
      throw new BadRequestException("Stripe not configured");
    }

    const account = await this.prisma.stripeConnectAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new BadRequestException("Stripe Connect account not found");
    }

    // In production, use Stripe SDK to create account link
    // For now, return placeholder
    const onboardingUrl = `${this.config.get(
      "APP_URL",
      "http://localhost:3000",
    )}/onboarding/stripe?account=${account.stripeAccountId}`;

    this.logger.log(`Stripe Connect account link created for user ${userId}`);
    return { url: onboardingUrl };
  }

  async getAccountStatus(userId: string) {
    const account = await this.prisma.stripeConnectAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      return { connected: false };
    }

    return {
      connected: true,
      onboardingComplete: account.onboardingComplete,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      detailsSubmitted: account.detailsSubmitted,
    };
  }

  async handleWebhook(event: any): Promise<void> {
    const { type, data } = event;

    switch (type) {
      case "account.updated":
        await this.updateAccountStatus(data.object);
        break;
      case "payout.paid":
        await this.markPayoutAsPaid(data.object);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${type}`);
    }
  }

  private async updateAccountStatus(account: any): Promise<void> {
    await this.prisma.stripeConnectAccount.updateMany({
      where: { stripeAccountId: account.id },
      data: {
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: account.requirements?.currently_due?.length === 0,
        metadata: account,
      },
    });
  }

  private async markPayoutAsPaid(payout: any): Promise<void> {
    // Match payout to creator and update status
    const metadata = payout.metadata as any;
    if (metadata?.payoutId) {
      await this.prisma.payout.update({
        where: { id: metadata.payoutId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }
  }
}
