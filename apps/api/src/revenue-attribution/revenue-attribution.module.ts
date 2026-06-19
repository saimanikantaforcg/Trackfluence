import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RevenueAttributionController } from "./revenue-attribution.controller";
import { RevenueAttributionService } from "./revenue-attribution.service";
import { AttributionProcessor } from "../queue/attribution.processor";
import { ATTRIBUTION_QUEUE } from "../queue/queue.module";

@Module({
  imports: [BullModule.registerQueue({ name: ATTRIBUTION_QUEUE })],
  controllers: [RevenueAttributionController],
  providers: [RevenueAttributionService, AttributionProcessor],
  exports: [RevenueAttributionService],
})
export class RevenueAttributionModule {}
