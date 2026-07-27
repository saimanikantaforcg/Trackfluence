import { Logger } from "@nestjs/common";
import { EmailService } from "../email/email.service";

export interface CreatorOnboardingJobData {
  creatorEmail: string;
  creatorName: string;
  portalUrl: string;
  step: "day1" | "day3" | "day14";
}

// BullMQ processor disabled — requires Redis
export class CreatorOnboardingProcessor {
  private readonly logger = new Logger(CreatorOnboardingProcessor.name);

  constructor(private readonly email: EmailService) {}

  async process(job: { data: CreatorOnboardingJobData }): Promise<void> {
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
