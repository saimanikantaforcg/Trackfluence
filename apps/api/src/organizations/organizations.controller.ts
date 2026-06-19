import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { OrganizationsService } from "./organizations.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Organizations")
@Controller("api/v1/organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get("my")
  @ApiOperation({ summary: "Get all organizations for current user" })
  async myOrganizations(@CurrentUser() user: { sub: string }) {
    return this.orgs.getUserOrganizations(user.sub);
  }

  @Post("switch/:id")
  @ApiOperation({ summary: "Switch to a different organization" })
  async switch(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.orgs.switchOrganization(user.sub, id);
  }

  @Get("current")
  @ApiOperation({ summary: "Get current active organization" })
  async current(@CurrentUser() user: { sub: string }) {
    return this.orgs.getCurrentOrganization(user.sub);
  }
}
