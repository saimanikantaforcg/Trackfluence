import { Controller, Post, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { RevenueAttributionService } from "./revenue-attribution.service";
import { RequireOrg } from "../organizations/require-org.decorator";

@ApiTags("Revenue Attribution")
@Controller("api/v1/revenue-attribution")
export class RevenueAttributionController {
  constructor(
    private readonly revenueAttributionService: RevenueAttributionService,
  ) {}

  @Post("calculate/:orderId")
  @ApiOperation({ summary: "Calculate attribution for an order" })
  async calculateAttribution(
    @Param("orderId") orderId: string,
    @Query("model") model: string = "FIRST_TOUCH",
    @RequireOrg() orgId: string,
  ) {
    return this.revenueAttributionService.calculateAttribution(
      orderId,
      model,
      orgId,
    );
  }

  @Get("order/:orderId")
  @ApiOperation({ summary: "Get attribution results for an order" })
  async getOrderAttribution(
    @Param("orderId") orderId: string,
    @RequireOrg() orgId: string,
  ) {
    return this.revenueAttributionService.getOrderAttribution(orderId, orgId);
  }

  @Get("creator/:creatorId")
  @ApiOperation({ summary: "Get attribution summary for a creator" })
  async getCreatorAttribution(
    @Param("creatorId") creatorId: string,
    @RequireOrg() orgId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("model") model?: string,
  ) {
    return this.revenueAttributionService.getCreatorAttribution(
      creatorId,
      orgId,
      {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      },
      model,
    );
  }
}
