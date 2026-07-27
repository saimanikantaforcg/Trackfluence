import { Controller, Get, Post, Param, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ComplianceService } from "./compliance.service";
import { FTCCheckDto } from "./dto/compliance.dto";
import { CurrentOrg } from "../organizations/current-org.decorator";

@ApiTags("Compliance & Trust")
@Controller("api/v1/compliance")
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post("ftc/check")
  @ApiOperation({ summary: "Run FTC compliance check on content" })
  async checkFTC(@Body() dto: FTCCheckDto, @CurrentOrg() orgId?: string) {
    return this.complianceService.runFTCCheck(dto, orgId);
  }

  @Get("ftc/creators")
  @ApiOperation({ summary: "Get compliance overview for all creators" })
  async getAllCreatorCompliance(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @CurrentOrg() orgId?: string,
  ) {
    return this.complianceService.getAllCreatorCompliance(
      orgId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get("ftc/creator/:creatorId")
  @ApiOperation({ summary: "Get compliance history for a creator" })
  async getCreatorCompliance(
    @Param("creatorId") creatorId: string,
    @CurrentOrg() orgId?: string,
  ) {
    return this.complianceService.getCreatorCompliance(creatorId, orgId);
  }

  @Get("ftc/summary")
  @ApiOperation({ summary: "Get overall compliance summary" })
  async getSummary(@CurrentOrg() orgId?: string) {
    return this.complianceService.getComplianceSummary(orgId);
  }
}
