import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the organization ID from the `X-Organization-Id` request header.
 * Returns undefined if the header is absent (org context is optional).
 *
 * Usage:
 *   findAll(@CurrentOrg() orgId?: string) { ... }
 */
export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    return req.headers['x-organization-id'];
  },
);
