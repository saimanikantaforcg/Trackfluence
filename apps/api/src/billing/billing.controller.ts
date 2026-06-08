import {
  Controller, Get, Post, Body, Headers, Req,
  RawBodyRequest, BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService, PLANS } from './billing.service';
import { CreateCheckoutSessionDto, CreatePortalSessionDto } from './dto/billing.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

interface JwtUser { sub: string; email: string }

@ApiTags('billing')
@ApiBearerAuth()
@Controller('api/v1/billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List available plans' })
  getPlans() {
    return PLANS;
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Get current subscription' })
  getSubscription(@CurrentUser() user: JwtUser) {
    return this.billing.getSubscription(user.sub);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  createCheckout(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.billing.createCheckoutSession(user.sub, user.email, dto.priceId);
  }

  @Post('portal')
  @ApiOperation({ summary: 'Create a Stripe customer portal session' })
  createPortal(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreatePortalSessionDto,
  ) {
    return this.billing.createPortalSession(user.sub, dto.returnUrl);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook endpoint (raw body)' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw body');
    await this.billing.handleWebhook(req.rawBody, sig);
    return { received: true };
  }
}
