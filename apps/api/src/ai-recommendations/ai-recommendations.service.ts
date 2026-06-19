import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AiRecommendationsService {
  private readonly logger = new Logger(AiRecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getRecommendation(userId: string, type: string, context: any) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      return this.getMockRecommendation(type, context);
    }

    try {
      const prompt = this.buildPrompt(type, context);

      // In production, call OpenAI API
      // For now, return mock recommendation
      const recommendation = await this.generateMockRecommendation(
        type,
        context,
      );

      await this.prisma.aiRecommendation.create({
        data: {
          userId,
          type,
          context,
          recommendation,
          confidence: 0.85,
          model: "gpt-4",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      return recommendation;
    } catch (error) {
      this.logger.error(`AI recommendation failed: ${error}`);
      return this.getMockRecommendation(type, context);
    }
  }

  private buildPrompt(type: string, context: any): string {
    switch (type) {
      case "commission_rate":
        return `Suggest a commission rate for creator with ${context
          .creatorStats?.totalAttributedRevenue || 0} revenue and ${context
          .creatorStats?.attributionCount || 0} attributions.`;
      case "creator_match":
        return `Match creators to campaign: ${context.campaignName}. Budget: ${context.budget}.`;
      case "content_suggestion":
        return `Suggest content ideas for creator ${context.creatorName} in ${context.platform}.`;
      default:
        return "Generate a recommendation.";
    }
  }

  private async generateMockRecommendation(
    type: string,
    context: any,
  ): Promise<any> {
    switch (type) {
      case "commission_rate":
        return {
          suggestedRate: 0.12,
          reasoning: "Based on creator performance and industry benchmarks",
          confidence: 0.85,
        };
      case "creator_match":
        return {
          recommendedCreators: context.creatorIds || [],
          reasoning: "Top performers in similar campaigns",
          confidence: 0.78,
        };
      case "content_suggestion":
        return {
          suggestions: [
            "Product review video",
            "Tutorial showing product usage",
            "Before/after comparison",
          ],
          reasoning: "High-engagement formats for this platform",
          confidence: 0.82,
        };
      default:
        return { message: "No recommendation available" };
    }
  }

  private getMockRecommendation(type: string, context: any): any {
    return this.generateMockRecommendation(type, context);
  }

  async getCachedRecommendation(userId: string, type: string) {
    const cached = await this.prisma.aiRecommendation.findFirst({
      where: {
        userId,
        type,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return cached?.recommendation || null;
  }
}
