import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CreatorsController } from "./creators.controller";
import { CreatorOnboardingProcessor } from "../queue/creator-onboarding.processor";
import { CREATOR_ONBOARDING_QUEUE } from "../queue/queue.module";

@Module({
  imports: [BullModule.registerQueue({ name: CREATOR_ONBOARDING_QUEUE })],
  controllers: [CreatorsController],
  providers: [CreatorOnboardingProcessor],
})
export class CreatorsModule {}
