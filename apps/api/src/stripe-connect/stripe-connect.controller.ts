import { Controller, Post, Get, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { StripeConnectService } from "./stripe-connect.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@ApiTags("Stripe Connect")
@Controller("api/v1/stripe-connect")
@UseGuards(JwtAuthGuard)
export class StripeConnectController {
  constructor(private readonly stripe: StripeConnectService) {}

  @Post("onboard")
  @ApiOperation({ summary: "Create Stripe Connect onboarding link" })
  async onboard(@CurrentUser() user: { sub: string }) {
    return this.stripe.createAccountLink(user.sub);
  }

  @Get("status")
  @ApiOperation({ summary: "Get Stripe Connect account status" })
  async status(@CurrentUser() user: { sub: string }) {
    return this.stripe.getAccountStatus(user.sub);
  }
}
