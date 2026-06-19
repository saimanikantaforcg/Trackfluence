import { Controller, Post, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { RevenueAttributionService } from "./revenue-attribution.service";

@ApiTags("Revenue Attribution")
@Controller("api/v1/revenue-attribution")
export class RevenueAttributionController {
  constructor(
    private readonly revenueAttributionService: RevenueAttributionService,
  ) {}

  @Post("calculate/:orderId")
  @ApiOperation({ summary: "Calculate attribution for an order (synchronous)" })
  async calculateAttribution(
    @Param("orderId") orderId: string,
    @Query("model") model: string = "FIRST_TOUCH",
  ) {
    return this.revenueAttributionService.calculateAttribution(orderId, model);
  }

  @Post("calculate/:orderId/async")
  @ApiOperation({
    summary: "Queue attribution calculation via BullMQ (non-blocking)",
  })
  async calculateAttributionAsync(
    @Param("orderId") orderId: string,
    @Query("model") model: string = "FIRST_TOUCH",
  ) {
    return this.revenueAttributionService.calculateAttributionAsync(
      orderId,
      model,
    );
  }

  @Get("order/:orderId")
  @ApiOperation({ summary: "Get attribution results for an order" })
  async getOrderAttribution(@Param("orderId") orderId: string) {
    return this.revenueAttributionService.getOrderAttribution(orderId);
  }

  @Get("creator/:creatorId")
  @ApiOperation({ summary: "Get attribution summary for a creator" })
  async getCreatorAttribution(
    @Param("creatorId") creatorId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("model") model?: string,
  ) {
    return this.revenueAttributionService.getCreatorAttribution(
      creatorId,
      {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      },
      model,
    );
  }
}
