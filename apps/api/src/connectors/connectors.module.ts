import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ShopifyService } from './shopify/shopify.service';
import { SalesforceService } from './salesforce/salesforce.service';
import { ConnectorsController } from './connectors.controller';
import { ShopifyWebhookProcessor } from '../queue/shopify-webhook.processor';
import { SHOPIFY_WEBHOOK_QUEUE } from '../queue/queue.module';

@Module({
  imports: [BullModule.registerQueue({ name: SHOPIFY_WEBHOOK_QUEUE })],
  controllers: [ConnectorsController],
  providers: [ShopifyService, SalesforceService, ShopifyWebhookProcessor],
  exports: [ShopifyService, SalesforceService],
})
export class ConnectorsModule {}
