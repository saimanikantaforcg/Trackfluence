import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { AttributionService } from './attribution.service';
import { CreateTrackingLinkDto } from './dto/create-tracking-link.dto';
import { ServerEventDto } from './dto/server-event.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('Attribution Infrastructure')
@Controller('api/v1/attribution')
export class AttributionController {
  constructor(private readonly attributionService: AttributionService) {}

  @Post('tracking-links')
  @ApiOperation({ summary: 'Create a tracking link' })
  async createTrackingLink(@Body() dto: CreateTrackingLinkDto) {
    return this.attributionService.createTrackingLink(dto);
  }

  @Get('tracking-links')
  @ApiOperation({ summary: 'List tracking links' })
  async listTrackingLinks(
    @Query('creatorId') creatorId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attributionService.listTrackingLinks({ creatorId, campaignId, from, to });
  }

  @Get('tracking-links/:id')
  @ApiOperation({ summary: 'Get tracking link by ID' })
  async getTrackingLink(@Param('id') id: string) {
    return this.attributionService.getTrackingLink(id);
  }

  @Public()
  @Get('r/:shortCode')
  @ApiOperation({ summary: 'Redirect via tracking link (records click)' })
  async redirect(@Param('shortCode') shortCode: string, @Res() res: Response) {
    const link = await this.attributionService.recordClickAndResolve(shortCode);
    if (!link) {
      res.status(HttpStatus.NOT_FOUND).json({ message: 'Link not found' });
      return;
    }
    res.redirect(HttpStatus.MOVED_PERMANENTLY, link.destinationUrl);
  }

  @Public()
  @Post('server-events')
  @ApiOperation({ summary: 'Receive server-side events (Meta CAPI, etc.)' })
  async ingestServerEvent(@Body() dto: ServerEventDto) {
    return this.attributionService.processServerEvent(dto);
  }
}
