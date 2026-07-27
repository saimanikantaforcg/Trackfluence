import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { Roles } from "../auth/roles.decorator";
import { RequireOrg } from "../organizations/require-org.decorator";

class CreateVariantDto {
  @IsString()
  parentLinkId!: string;

  @IsString()
  variantLabel!: string;

  @IsString()
  @IsOptional()
  destinationUrl?: string;
}

@ApiTags("Campaigns")
@Controller("api/v1/campaigns")
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

  @Post()
  @Roles("ADMIN")
  create(@Body() dto: CreateCampaignDto, @RequireOrg() orgId: string) {
    return this.svc.create(dto, orgId);
  }

  @Get()
  findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @RequireOrg() orgId: string,
  ) {
    return this.svc.findAll(page, Math.min(limit, 100), orgId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @RequireOrg() orgId: string) {
    return this.svc.findOne(id, orgId);
  }

  @Get(":id/stats")
  getStats(@Param("id") id: string, @RequireOrg() orgId: string) {
    return this.svc.getStats(id, orgId);
  }

  @Post(":id/variants")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create A/B variant link for a campaign" })
  createVariant(
    @Param("id") campaignId: string,
    @Body() dto: CreateVariantDto,
    @RequireOrg() orgId: string,
  ) {
    return this.svc.createVariant(
      campaignId,
      dto.parentLinkId,
      dto.variantLabel,
      dto.destinationUrl,
      orgId,
    );
  }

  @Get(":id/variants/:groupId")
  @ApiOperation({ summary: "Get all links in an A/B test group" })
  @ApiQuery({ name: "groupId", required: true })
  getVariants(@Param("groupId") groupId: string, @RequireOrg() orgId: string) {
    return this.svc.getVariants(groupId, orgId);
  }

  @Patch(":id")
  @Roles("ADMIN")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateCampaignDto,
    @RequireOrg() orgId: string,
  ) {
    return this.svc.update(id, dto, orgId);
  }

  @Delete(":id")
  @Roles("ADMIN")
  remove(@Param("id") id: string, @RequireOrg() orgId: string) {
    return this.svc.remove(id, orgId);
  }
}
