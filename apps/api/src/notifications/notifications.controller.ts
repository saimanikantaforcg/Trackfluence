import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Request } from 'express';

interface AuthedRequest extends Request {
  user: { sub: string };
}

@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(
    @Req() req: AuthedRequest,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.svc.listForUser(req.user.sub, limit);
  }

  @Post(':id/read')
  markRead(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.svc.markRead(req.user.sub, id);
  }

  @Post('read-all')
  markAllRead(@Req() req: AuthedRequest) {
    return this.svc.markAllRead(req.user.sub);
  }
}
