import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheWarmingService } from './cache-warming.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisHost = config.get<string>('REDIS_HOST', 'localhost');
        const redisPort = config.get<number>('REDIS_PORT', 6379);
        const redisPassword = config.get<string>('REDIS_PASSWORD');

        // Use Redis store when available, fall back to in-memory for tests
        if (config.get('NODE_ENV') === 'test') {
          return { ttl: 0 };
        }

        const { createKeyv } = await import('@keyv/redis');
        const Keyv = (await import('keyv')).default;

        const redisUrl = redisPassword
          ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
          : `redis://${redisHost}:${redisPort}`;

        return {
          stores: [new Keyv({ store: createKeyv(redisUrl) })],
          ttl: 5 * 60 * 1000, // 5-minute default TTL
        };
      },
    }),
  ],
  providers: [CacheWarmingService],
  exports: [CacheWarmingService],
})
export class AppCacheModule {}
