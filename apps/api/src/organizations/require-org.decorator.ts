import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";

/**
 * Extracts the organization ID from the authenticated JWT and enforces that it exists.
 * This is a "fail-closed" version of CurrentOrg - throws an error if the user
 * has no current organization set, preventing cross-tenant data access.
 *
 * Use this decorator for endpoints that require a valid organization context.
 *
 * Usage:
 *   findAll(@RequireOrg() orgId: string) { ... }
 */
export const RequireOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: { organizationId?: string | null } }>();
    const orgId = req.user?.organizationId;
    if (!orgId) {
      throw new BadRequestException(
        "Organization context required. Please select an organization first.",
      );
    }
    return orgId;
  },
);
