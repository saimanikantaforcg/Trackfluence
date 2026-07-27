import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ShopifyService } from "../connectors/shopify/shopify.service";
import { SHOPIFY_WEBHOOK_QUEUE } from "./queue.module";

export interface ShopifyWebhookJobData {
  topic: string;
  shopDomain: string;
  payload: Record<string, unknown>;
  orgId?: string;
}

@Processor(SHOPIFY_WEBHOOK_QUEUE)
export class ShopifyWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(ShopifyWebhookProcessor.name);

  constructor(private readonly shopify: ShopifyService) {
    super();
  }

  async process(job: Job<ShopifyWebhookJobData>): Promise<void> {
    const { topic, shopDomain, payload, orgId } = job.data;
    this.logger.log(`Processing job ${job.id}: ${topic} from ${shopDomain}`);

    if (topic === "orders/paid") {
      await this.shopify.handleOrderPaid(
        shopDomain,
        (payload as unknown) as Parameters<
          ShopifyService["handleOrderPaid"]
        >[1],
        orgId,
      );
      this.logger.log(`Job ${job.id} complete: order processed`);
      return;
    }

    if (topic === "orders/cancelled") {
      await this.shopify.handleOrderCancelled(
        shopDomain,
        (payload as unknown) as Parameters<
          ShopifyService["handleOrderCancelled"]
        >[1],
      );
      this.logger.log(`Job ${job.id} complete: cancellation processed`);
      return;
    }

    this.logger.warn(`Job ${job.id}: unhandled topic "${topic}" — skipped`);
  }
}
