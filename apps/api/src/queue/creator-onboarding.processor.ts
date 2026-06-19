import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { EmailService } from "../email/email.service";
import { CREATOR_ONBOARDING_QUEUE } from "./queue.module";

export interface CreatorOnboardingJobData {
  creatorEmail: string;
  creatorName: string;
  portalUrl: string;
  step: "day1" | "day3" | "day14";
}

@Processor(CREATOR_ONBOARDING_QUEUE)
export class CreatorOnboardingProcessor extends WorkerHost {
  private readonly logger = new Logger(CreatorOnboardingProcessor.name);

  constructor(private readonly email: EmailService) {
    super();
  }

  async process(job: Job<CreatorOnboardingJobData>): Promise<void> {
    const { creatorEmail, creatorName, portalUrl, step } = job.data;
    this.logger.log(`Processing onboarding email: ${step} → ${creatorEmail}`);

    try {
      switch (step) {
        case "day1":
          await this.email.sendCreatorOnboardingDay1(
            creatorEmail,
            creatorName,
            portalUrl,
          );
          break;
        case "day3":
          await this.email.sendCreatorOnboardingDay3(
            creatorEmail,
            creatorName,
            portalUrl,
          );
          break;
        case "day14":
          await this.email.sendCreatorOnboardingDay14(
            creatorEmail,
            creatorName,
            portalUrl,
          );
          break;
      }
      this.logger.log(`Onboarding email sent: ${step} → ${creatorEmail}`);
    } catch (err) {
      this.logger.error(
        `Onboarding email failed: ${step} → ${creatorEmail}: ${err}`,
      );
      throw err;
    }
  }
}
