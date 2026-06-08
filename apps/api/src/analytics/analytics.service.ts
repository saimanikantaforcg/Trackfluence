import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

/**
 * Thin wrapper around the PostHog server-side SDK.
 * All calls are fire-and-forget (non-blocking).
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly client: PostHog | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('POSTHOG_API_KEY');
    if (apiKey) {
      this.client = new PostHog(apiKey, {
        host: this.config.get<string>('POSTHOG_HOST', 'https://app.posthog.com'),
        flushAt: 20,
        flushInterval: 10_000,
      });
    }
  }

  /** Track a named event for a specific user (by userId). */
  track(userId: string, event: string, properties?: Record<string, unknown>): void {
    this.client?.capture({ distinctId: userId, event, properties });
  }

  /** Identify a user with traits. */
  identify(userId: string, traits?: Record<string, unknown>): void {
    this.client?.identify({ distinctId: userId, properties: traits });
  }

  /** Flush and shut down on app teardown. */
  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown();
  }
}
