// ⚠️  instrument.ts MUST be the very first import so Sentry patches all modules
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppModule } from './app.module';
import { SHOPIFY_WEBHOOK_QUEUE } from './queue/queue.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Register Sentry global exception filter so all unhandled errors are captured
  app.useGlobalFilters(new SentryGlobalFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // ── Bull Board (queue monitor) ─────────────────────────────
  const configService = app.get(ConfigService);
  const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
  const redisPort = configService.get<number>('REDIS_PORT', 6379);

  const shopifyQueue = new Queue(SHOPIFY_WEBHOOK_QUEUE, {
    connection: { host: redisHost, port: redisPort, maxRetriesPerRequest: null },
  });

  const boardAdapter = new ExpressAdapter();
  boardAdapter.setBasePath('/api/admin/queues');
  createBullBoard({ queues: [new BullMQAdapter(shopifyQueue)], serverAdapter: boardAdapter });
  app.use('/api/admin/queues', boardAdapter.getRouter());

  // ── Swagger ───────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trackfluence API')
    .setDescription(
      `## Revenue Attribution & Intelligence Platform\n\n` +
      `Creator-led growth tracking: attributions, audiences, campaigns, payouts, compliance and more.\n\n` +
      `### Authentication\nAll endpoints except \`/api/v1/auth/*\`, \`/api/v1/creators/portal\`, and \`/api/v1/health\` require a Bearer JWT.\n\n` +
      `### Rate Limiting\nDefault: **200 req / 60 s** per user. Headers returned: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`.`
    )
    .setVersion('1.0.0')
    .setContact('Trackfluence Engineering', 'https://trackfluence.io', 'engineering@trackfluence.io')
    .setLicense('UNLICENSED', '')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT obtained from POST /api/v1/auth/login' })
    .addTag('Auth', 'Registration, login, password reset')
    .addTag('Creators', 'Creator management and portal')
    .addTag('Campaigns', 'Campaign CRUD and A/B variant management')
    .addTag('Attribution', 'Multi-touch attribution runs and results')
    .addTag('Revenue Intelligence', 'Dashboard metrics, forecasts, and creator scores')
    .addTag('Audiences', 'Audience segmentation and CSV export')
    .addTag('Payouts', 'Creator payout management and bulk approve')
    .addTag('Compliance', 'FTC compliance checks with auto-remediation')
    .addTag('Organizations', 'Multi-tenant org management, invites, domain settings')
    .addTag('Webhooks', 'Outbound webhook management and delivery history')
    .addTag('Admin', 'Admin-only user management, audit logs, and cache control')
    .addTag('Reports', 'Attribution report export')
    .addTag('Billing', 'Stripe subscription management')
    .addTag('Search', 'Cross-entity global search')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
    },
  });

  const port = configService.get<number>('API_PORT', 4000);
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Trackfluence API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  logger.log(`Bull Board at http://localhost:${port}/api/admin/queues`);
}

bootstrap();
