import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { RevenueAttributionService } from "../revenue-attribution/revenue-attribution.service";
import { ATTRIBUTION_QUEUE } from "./queue.module";

export interface AttributionJobData {
  orderId: string;
  rawModel?: string;
}

@Processor(ATTRIBUTION_QUEUE)
export class AttributionProcessor extends WorkerHost {
  private readonly logger = new Logger(AttributionProcessor.name);

  constructor(private readonly attributionService: RevenueAttributionService) {
    super();
  }

  async process(job: Job<AttributionJobData>): Promise<void> {
    const { orderId, rawModel } = job.data;
    this.logger.log(
      `Processing attribution job ${
        job.id
      }: orderId=${orderId}, model=${rawModel ?? "FIRST_TOUCH"}`,
    );

    try {
      const result = await this.attributionService.calculateAttribution(
        orderId,
        rawModel,
      );
      this.logger.log(
        `Job ${job.id} complete: orderId=${orderId}, model=${result.model}, attributions=${result.attributions.length}`,
      );
    } catch (err) {
      this.logger.error(`Job ${job.id} failed for orderId=${orderId}: ${err}`);
      throw err;
    }
  }
}
