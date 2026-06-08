import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { WEBHOOK_EVENT_CATALOG } from './webhook-events.catalog';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
@Roles('ADMIN')
export class WebhooksController {
  constructor(private readonly svc: WebhooksService) {}

  /** Publicly accessible — lists every supported outbound event so UI can render checkboxes. */
  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'Get the full catalog of supported webhook event types' })
  catalog() {
    return WEBHOOK_EVENT_CATALOG;
  }

  @Post()
  @ApiOperation({ summary: 'Register a new webhook endpoint' })
  create(@Body() dto: CreateWebhookDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered webhooks' })
  list() {
    return this.svc.list();
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle a webhook active/disabled' })
  toggle(@Param('id') id: string) {
    return this.svc.toggle(id);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List delivery history for a webhook' })
  deliveries(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.svc.listDeliveries(id, limit);
  }

  @Post('deliveries/:deliveryId/retry')
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  retryDelivery(@Param('deliveryId') deliveryId: string) {
    return this.svc.retryDelivery(deliveryId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
