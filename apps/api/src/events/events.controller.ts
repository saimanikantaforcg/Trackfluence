import { Controller, Post, Get, Body, Query, Res, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable, interval, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Response } from 'express';
import { EventsService } from './events.service';
import { IngestEventDto } from './dto/ingest-event.dto';
import { Public } from '../auth/public.decorator';

@Public()
@ApiTags('Event Intelligence')
@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Ingest a single event' })
  async ingest(@Body() dto: IngestEventDto) {
    return this.eventsService.ingest(dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Ingest a batch of events' })
  async ingestBatch(@Body() dtos: IngestEventDto[]) {
    return this.eventsService.ingestBatch(dtos);
  }

  @Get()
  @ApiOperation({ summary: 'Query events' })
  async query(
    @Query('sessionId') sessionId?: string,
    @Query('customerId') customerId?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.query({
      sessionId,
      customerId,
      category,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream of recent events (polls every 10s)' })
  stream(
    @Query('category') category?: string,
  ): Observable<MessageEvent> {
    // Poll the DB every 10 seconds and push the latest 10 events as SSE
    return interval(10_000).pipe(
      switchMap(() => from(this.eventsService.query({ category, limit: 10 }))),
      map((events) => ({ data: JSON.stringify(events) } as MessageEvent)),
    );
  }
}
