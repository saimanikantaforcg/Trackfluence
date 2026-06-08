import {
  Injectable,
  ExecutionContext,
  CanActivate,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { Response } from 'express';

/**
 * Per-user sliding-window rate limiter backed by Redis (via cache-manager).
 *
 * Defaults: 200 requests per 60 seconds per user.
 * Unauthenticated requests use IP as the key.
 *
 * To skip for a route:  @SkipUserRateLimit()
 * To override limits:   @UserRateLimit({ limit: 10, windowMs: 5000 })
 */
export const SKIP_USER_RATE_LIMIT = 'skipUserRateLimit';
export const USER_RATE_LIMIT_META = 'userRateLimit';

export const SkipUserRateLimit = () =>
  (target: object, key?: string | symbol, descriptor?: TypedPropertyDescriptor<unknown>) => {
    Reflect.defineMetadata(SKIP_USER_RATE_LIMIT, true, descriptor?.value ?? target);
    return descriptor ?? target;
  };

export const UserRateLimit = (opts: { limit: number; windowMs: number }) =>
  (target: object, key?: string | symbol, descriptor?: TypedPropertyDescriptor<unknown>) => {
    Reflect.defineMetadata(USER_RATE_LIMIT_META, opts, descriptor?.value ?? target);
    return descriptor ?? target;
  };

const DEFAULT_LIMIT = 200;
const DEFAULT_WINDOW_MS = 60_000;

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache: Cache | null,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check skip decorator
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_USER_RATE_LIMIT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    // Resolve per-route overrides
    const meta = this.reflector.getAllAndOverride<{ limit: number; windowMs: number }>(
      USER_RATE_LIMIT_META,
      [context.getHandler(), context.getClass()],
    );
    const limit = meta?.limit ?? DEFAULT_LIMIT;
    const windowMs = meta?.windowMs ?? DEFAULT_WINDOW_MS;

    const req = context.switchToHttp().getRequest<{
      user?: { sub?: string };
      ip?: string;
    }>();
    const res = context.switchToHttp().getResponse<Response>();

    const identifier = req.user?.sub ?? req.ip ?? 'anonymous';
    const cacheKey = `rl:user:${identifier}`;

    // If no cache (e.g. test environment), allow all
    if (!this.cache) return true;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Retrieve stored timestamps array
    const raw = await this.cache.get<number[]>(cacheKey);
    const timestamps: number[] = (raw ?? []).filter((t) => t > windowStart);

    const remaining = Math.max(0, limit - timestamps.length);
    const resetAt = timestamps.length > 0 ? Math.ceil((timestamps[0] + windowMs) / 1000) : Math.ceil((now + windowMs) / 1000);

    // Set standard rate limit headers on every response
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining > 0 ? remaining - 1 : 0);
    res.setHeader('X-RateLimit-Reset', resetAt);

    if (timestamps.length >= limit) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      throw new HttpException(
        { message: 'Too many requests — per-user limit exceeded', retryAfter: Math.ceil(windowMs / 1000) },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    // Store with TTL equal to window size (in seconds for cache-manager)
    await this.cache.set(cacheKey, timestamps, windowMs / 1000);

    return true;
  }
}
