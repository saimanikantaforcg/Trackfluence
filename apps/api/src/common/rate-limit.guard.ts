import { Injectable, ExecutionContext, Optional } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { AuditService } from '../audit/audit.service';

/** Extends the default ThrottlerGuard to log throttling events via AuditService */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  constructor(@Optional() private readonly audit?: AuditService) {
    super(...([] as unknown as ConstructorParameters<typeof ThrottlerGuard>));
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<{ ip?: string; url?: string; user?: { sub?: string } }>();
    if (this.audit) {
      void this.audit.log(
        { userId: req.user?.sub ?? 'anonymous', ip: req.ip },
        'rate_limit.exceeded',
        { details: { url: req.url } },
      );
    }
    return super.throwThrottlingException(context, detail);
  }
}
