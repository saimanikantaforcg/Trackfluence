import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RateLimitGuard } from './common/rate-limit.guard';
import { LoggerModule } from 'nestjs-pino';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AttributionModule } from './attribution/attribution.module';
import { EventsModule } from './events/events.module';
import { IdentityModule } from './identity/identity.module';
import { RevenueAttributionModule } from './revenue-attribution/revenue-attribution.module';
import { RevenueIntelligenceModule } from './revenue-intelligence/revenue-intelligence.module';
import { AudienceModule } from './audience/audience.module';
import { ComplianceModule } from './compliance/compliance.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { CreatorsModule } from './creators/creators.module';
import { SearchModule } from './search/search.module';
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';
import { AppCacheModule } from './cache/cache.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BillingModule } from './billing/billing.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { ResponseTimeMiddleware } from './common/response-time.middleware';
import { UserRateLimitGuard } from './common/user-rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        redact: ['req.headers.authorization'],
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },    // 20 req / second
      { name: 'medium', ttl: 60_000, limit: 500 }, // 500 req / minute
    ]),
    PrismaModule,
    AuthModule,
    AttributionModule,
    EventsModule,
    IdentityModule,
    RevenueAttributionModule,
    RevenueIntelligenceModule,
    AudienceModule,
    ComplianceModule,
    ConnectorsModule,
    CreatorsModule,
    SearchModule,
    HealthModule,
    QueueModule,
    AppCacheModule,
    AdminModule,
    EmailModule,
    AuditModule,
    ApiKeysModule,
    CampaignsModule,
    PayoutsModule,
    NotificationsModule,
    WebhooksModule,
    BillingModule,
    RealtimeModule,
    ReportsModule,
    OrganizationsModule,
    AnalyticsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: UserRateLimitGuard },
  ],
})  
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ResponseTimeMiddleware).forRoutes('*');
  }
}
