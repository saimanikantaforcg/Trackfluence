import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SlackNotificationService } from './slack-notification.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SlackNotificationService],
  exports: [NotificationsService, SlackNotificationService],
})
export class NotificationsModule {}
