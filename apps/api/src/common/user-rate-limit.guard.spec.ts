import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserRateLimitGuard } from './user-rate-limit.guard';

function makeContext(overrides: {
  userId?: string;
  ip?: string;
  headers?: Record<string, string>;
}): ExecutionContext {
  const request = {
    user: overrides.userId ? { sub: overrides.userId } : undefined,
    ip: overrides.ip ?? '127.0.0.1',
    headers: overrides.headers ?? {},
  };
  const response = {
    setHeader: jest.fn(),
    header: jest.fn(),
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('UserRateLimitGuard', () => {
  let guard: UserRateLimitGuard;
  let cache: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRateLimitGuard,
        Reflector,
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    guard = module.get<UserRateLimitGuard>(UserRateLimitGuard);
  });

  it('allows first request (no prior record)', async () => {
    cache.get.mockResolvedValue(null);
    const result = await guard.canActivate(makeContext({ userId: 'user-1' }));
    expect(result).toBe(true);
    expect(cache.set).toHaveBeenCalled();
  });

  it('allows requests below the limit', async () => {
    // Simulate 5 recent timestamps (well below 200 default)
    const now = Date.now();
    const timestamps = Array.from({ length: 5 }, (_, i) => now - i * 100);
    cache.get.mockResolvedValue(timestamps);
    const result = await guard.canActivate(makeContext({ userId: 'user-2' }));
    expect(result).toBe(true);
  });

  it('throws 429 when limit exceeded', async () => {
    const now = Date.now();
    // Fill 200 timestamps in the current window
    const timestamps = Array.from({ length: 200 }, (_, i) => now - i * 100);
    cache.get.mockResolvedValue(timestamps);
    await expect(guard.canActivate(makeContext({ userId: 'user-3' }))).rejects.toThrow(HttpException);
  });

  it('falls back to IP when no user in request', async () => {
    cache.get.mockResolvedValue(null);
    const result = await guard.canActivate(makeContext({ ip: '10.0.0.1' }));
    expect(result).toBe(true);
    // Cache key should use IP
    expect(cache.get).toHaveBeenCalledWith(expect.stringContaining('10.0.0.1'));
  });

  it('allows all requests when cache is unavailable (null)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRateLimitGuard,
        Reflector,
        { provide: CACHE_MANAGER, useValue: null },
      ],
    }).compile();

    const guardNoCache = module.get<UserRateLimitGuard>(UserRateLimitGuard);
    const result = await guardNoCache.canActivate(makeContext({ userId: 'user-no-cache' }));
    expect(result).toBe(true);
  });
});
