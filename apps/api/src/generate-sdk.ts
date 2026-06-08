/**
 * Generates the OpenAPI JSON spec file from the NestJS Swagger document.
 *
 * Usage (from apps/api):
 *   npx ts-node -r tsconfig-paths/register src/generate-sdk.ts
 *
 * The spec is written to ../../packages/shared/openapi/spec.json
 * which is then used by the web app to generate typed TS types via openapi-typescript.
 */
import './instrument';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Trackfluence API')
    .setDescription('Revenue Attribution and Intelligence Infrastructure for Creator-Led Growth')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outDir = resolve(__dirname, '../../../packages/shared/openapi');
  mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, 'spec.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));

  console.log(`✅  OpenAPI spec written to ${outPath}`);
  await app.close();
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
