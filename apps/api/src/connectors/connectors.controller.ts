import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Body,
  Param,
  Headers,
  RawBodyRequest,
  Req,
  Res,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ShopifyService } from './shopify/shopify.service';
import { SalesforceService } from './salesforce/salesforce.service';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { SHOPIFY_WEBHOOK_QUEUE } from '../queue/queue.module';

@ApiTags('Connectors')
@Controller('api/v1/connectors')
export class ConnectorsController {
  private readonly logger = new Logger(ConnectorsController.name);

  constructor(
    private readonly shopify: ShopifyService,
    private readonly salesforce: SalesforceService,
    @InjectQueue(SHOPIFY_WEBHOOK_QUEUE) private readonly shopifyQueue: Queue,
  ) {}

  // ─── Shopify ──────────────────────────────────────────────

  @Public()
  @Post('shopify/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Shopify webhook (orders/paid, orders/cancelled)' })
  async shopifyWebhook(
    @Headers('x-shopify-topic') topic: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-hmac-sha256') hmac: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Verify HMAC signature when secret is configured
    if (hmac && req.rawBody) {
      const valid = this.shopify.verifyWebhookHmac(req.rawBody, hmac);
      if (!valid) {
        this.logger.warn(`Invalid Shopify HMAC for ${shopDomain}`);
        throw new BadRequestException('Invalid HMAC signature');
      }
    }

    const payload = req.body;
    this.logger.log(`Shopify webhook: ${topic} from ${shopDomain} — queuing`);

    await this.shopifyQueue.add(
      topic,
      { topic, shopDomain, payload },
      { jobId: `${shopDomain}-${topic}-${Date.now()}` },
    );

    return { queued: true };
  }

  @Post('shopify/sync')
  @ApiOperation({ summary: 'Trigger manual Shopify order sync' })
  async shopifySync(@Body('shopDomain') shopDomain: string) {
    return this.shopify.syncOrders(shopDomain);
  }

  @Post('shopify/register-webhook')
  @ApiOperation({ summary: 'Register Shopify webhook topics' })
  async registerShopifyWebhook(
    @Body('shopDomain') shopDomain: string,
    @Body('topic') topic: string,
  ) {
    return this.shopify.registerWebhook(shopDomain, topic);
  }

  // ─── Salesforce ───────────────────────────────────────────

  @Post('salesforce/sync')
  @ApiOperation({ summary: 'Sync contacts to Salesforce' })
  async salesforceSync(@Body('audienceId') audienceId: string) {
    return this.salesforce.syncContacts();
  }

  @Post('salesforce/data-cloud/push')
  @ApiOperation({ summary: 'Push audience to Salesforce Data Cloud' })
  async pushToDataCloud(@Body('audienceId') audienceId: string) {
    return this.salesforce.pushToDataCloud(audienceId);
  }

  @Post('salesforce/sfmc/push')
  @ApiOperation({ summary: 'Push audience to SFMC' })
  async pushToSFMC(@Body('audienceId') audienceId: string) {
    return this.salesforce.pushToSFMC(audienceId);
  }

  // ─── Salesforce OAuth ─────────────────────────────────────

  @Get('salesforce/auth')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get Salesforce OAuth authorization URL' })
  salesforceAuthUrl() {
    const url = this.salesforce.buildAuthorizationUrl();
    return { url };
  }

  @Public()
  @Get('salesforce/callback')
  @ApiOperation({ summary: 'Salesforce OAuth callback — exchanges code for tokens' })
  async salesforceCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      res.redirect(`${process.env['APP_BASE_URL'] ?? 'http://localhost:3000'}/connectors?sf_error=${error ?? 'no_code'}`);
      return;
    }
    try {
      await this.salesforce.handleOAuthCallback(code);
      res.redirect(`${process.env['APP_BASE_URL'] ?? 'http://localhost:3000'}/connectors?sf_connected=1`);
    } catch {
      res.redirect(`${process.env['APP_BASE_URL'] ?? 'http://localhost:3000'}/connectors?sf_error=callback_failed`);
    }
  }

  @Get('salesforce/status')
  @ApiOperation({ summary: 'Get Salesforce connection status' })
  salesforceStatus() {
    return this.salesforce.getConnectionStatus();
  }

  @Delete('salesforce/disconnect')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Disconnect Salesforce integration' })
  async salesforceDisconnect() {
    await this.salesforce.disconnect();
  }
}
