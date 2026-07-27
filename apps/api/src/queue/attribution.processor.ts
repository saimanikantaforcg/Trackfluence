import { Logger } from "@nestjs/common";

export interface AttributionJobData {
  orderId: string;
  strategy: "LAST_TOUCH" | "FIRST_TOUCH" | "LINEAR";
}

// BullMQ processor disabled — requires Redis
export class AttributionProcessor {
  private readonly logger = new Logger(AttributionProcessor.name);

  constructor() {}

  async process(job: { data: AttributionJobData }): Promise<void> {
    const { orderId, strategy } = job.data;
    this.logger.log(
      `Processing attribution job: orderId=${orderId}, strategy=${strategy}`,
    );

    // Attribution is now handled synchronously in ShopifyService
    this.logger.log(`Attribution queued for order ${orderId}`);
  }
}
