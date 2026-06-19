import { Controller, Post, Get, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AiRecommendationsService } from "./ai-recommendations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("AI Recommendations")
@Controller("api/v1/ai/recommendations")
@UseGuards(JwtAuthGuard)
export class AiRecommendationsController {
  constructor(private readonly ai: AiRecommendationsService) {}

  @Post("commission-rate")
  @ApiOperation({ summary: "Get AI-suggested commission rate for a creator" })
  async commissionRate(
    @CurrentUser() user: { sub: string },
    @Body("creatorId") creatorId: string,
  ) {
    return this.ai.getRecommendation(user.sub, "commission_rate", {
      creatorId,
    });
  }

  @Post("creator-match")
  @ApiOperation({ summary: "Get AI-recommended creators for a campaign" })
  async creatorMatch(
    @CurrentUser() user: { sub: string },
    @Body() body: { campaignId: string; budget: number },
  ) {
    return this.ai.getRecommendation(user.sub, "creator_match", {
      campaignId: body.campaignId,
      budget: body.budget,
    });
  }

  @Post("content-suggestion")
  @ApiOperation({ summary: "Get AI content suggestions for a creator" })
  async contentSuggestion(
    @CurrentUser() user: { sub: string },
    @Body("creatorId") creatorId: string,
  ) {
    return this.ai.getRecommendation(user.sub, "content_suggestion", {
      creatorId,
    });
  }

  @Get("cached/:type")
  @ApiOperation({ summary: "Get cached AI recommendation" })
  async cached(
    @CurrentUser() user: { sub: string },
    @Path("type") type: string,
  ) {
    return this.ai.getCachedRecommendation(user.sub, type);
  }
}
