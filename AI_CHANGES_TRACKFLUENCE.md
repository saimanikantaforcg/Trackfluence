# Trackfluence Security Audit Report

## Phase 0 - Audit Validation

### Files Inspected

| Category   | Files                                                                                                                                                                                                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**   | `apps/api/src/auth/jwt.strategy.ts`, `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/admin-jwt.middleware.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/roles.guard.ts`, `apps/api/src/auth/jwt-auth.guard.ts`, `apps/api/src/auth/current-user.decorator.ts` |
| **Common** | `apps/api/src/common/crypto.util.ts`                                                                                                                                                                                                                                                                                        |

(Showing lines 1-10 of 890 total. Use start_line=11 to continue reading.)

## Phase 1D - API 401 Session Cleanup

### Phase Status

- [x] Phase 1D goal defined
- [x] Frontend auth flow inspected and classified
- [x] Shared auth-utils.ts helper created
- [x] Global 401 handling added in API client
- [x] auth-context.tsx session restore fixed
- [x] Logout clears all auth state
- [x] middleware.ts reviewed (no JWT_SECRET)
- [x] Redirect loop / SSR safety confirmed
- [x] Search validation completed
- [x] Validation commands run
- [x] Documentation updated

### Phase Goal

When the backend API returns 401, the frontend must clear the stale session and redirect the user to `/login` safely.

### Confirmed Risk

The frontend API client (`apps/web/src/lib/api.ts`) did not globally handle 401 responses. Stale, expired, invalid, or tampered sessions could remain in the browser. The Next.js middleware performed lightweight token presence checks only, which is acceptable, but backend API validation must be the source of truth.

### Files Inspected

| File                                | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `apps/web/src/lib/api.ts`           | Central API client (fetcher function)                 |
| `apps/web/src/lib/auth-context.tsx` | Auth context provider, session restore, login, logout |
| `apps/web/src/middleware.ts`        | Next.js Edge middleware for route gating              |
| `apps/web/src/lib/auth-utils.ts`    | Created: shared auth session clear helper             |

### Files Changed

| File                                | Change                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/auth-utils.ts`    | **Created** - shared `clearAuthSession()`, `redirectToLogin()`, `handleUnauthorized()` helpers  |
| `apps/web/src/lib/api.ts`           | Added global 401 detection in `fetcher()` - clears session and redirects                        |
| `apps/web/src/lib/auth-context.tsx` | Updated session restore to clear stale state on 401, updated logout to use `clearAuthSession()` |

### Old 401 Behavior

- `fetcher()` in `api.ts` threw a generic `API error 401` without clearing session or redirecting
- `auth-context.tsx` session restore did not handle 401 from `/auth/me` - stale token remained in localStorage
- `auth-context.tsx` logout only removed localStorage token, did not clear cookie or sessionStorage
- No shared helper existed for clearing auth state consistently

### New 401 Behavior

**API client (`api.ts`):**

- On HTTP 401 response, checks `typeof window !== "undefined"` (SSR-safe)
- Dynamically imports `clearAuthSession()` and `redirectToLogin()` from `auth-utils`
- Clears all client-side auth state
- Redirects to `/login?redirect=/current-path`
- Throws `Error("Session expired. Redirecting to login.")` so callers can catch

**auth-context.tsx session restore:**

- On `/auth/me` success: sets user normally
- On `/auth/me` 401: calls `clearAuthSession()`, clears user/token state
- On `/auth/me` network error: calls `clearAuthSession()`, clears user/token state
- Loading state resolves correctly in all paths

### Token/Cookie Clearing Behavior

`clearAuthSession()` in `auth-utils.ts`:

- Removes `tf_token` from `localStorage`
- Removes `tf_token` from `sessionStorage`
- Deletes `tf_token` cookie by setting `expires=Thu, 01 Jan 1970 00:00:00 GMT`
- All operations wrapped in try/catch for private browsing safety
- All operations guarded by `typeof window !== "undefined"` / `typeof document !== "undefined"`

### Session Restoration Behavior

**On app mount:**

1. Read token from localStorage
2. If no token: set loading=false, user=null
3. If token exists: set token state, call `/auth/me`
4. On 200: set user from response
5. On 401: clearAuthSession(), set token=null, user=null
6. On network error: clearAuthSession(), set token=null, user=null
7. Finally: set loading=false

### Logout Behavior

`logout()` in auth-context.tsx:

1. Calls `clearAuthSession()` (clears localStorage, sessionStorage, cookie)
2. Sets token=null
3. Sets user=null
4. Safe to call multiple times (idempotent)

### middleware.ts Review

**Confirmed: middleware does NOT use `JWT_SECRET`.**

Current behavior:

- Checks for `tf_token` cookie or `Authorization` header
- If no token present on protected route: redirects to `/login?from=/path`
- If token present: allows through
- Clear comment: "We do NOT verify JWT signature here - that is the backend's responsibility"
- Clear comment: "This middleware only does lightweight route gating based on cookie presence"
- Clear comment: "Final authentication truth is determined by backend /auth/me endpoint"

No changes needed to middleware.ts.

### Redirect Loop / SSR Safety

- `redirectToLogin()` checks `typeof window === "undefined"` first - does nothing during SSR
- `redirectToLogin()` checks `currentPath === "/login"` - avoids redirect loop
- API client 401 handler checks `typeof window !== "undefined"` before importing browser-only code
- `clearAuthSession()` checks `typeof window === "undefined"` before any browser API access
- `clearAuthSession()` checks `typeof document !== "undefined"` before cookie manipulation

### Search Validation Summary

| Pattern           | Result                                                              | Classification                         |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------- |
| `JWT_SECRET`      | Not found in frontend                                               | ✅ Safe - no frontend JWT secret usage |
| `tf_token`        | Used in auth-utils.ts, auth-context.tsx, middleware.ts              | ✅ Safe token read/write/clear         |
| `localStorage`    | Used in auth-utils.ts (clear), auth-context.tsx (read/write)        | ✅ Safe token storage                  |
| `sessionStorage`  | Used in auth-utils.ts (clear)                                       | ✅ Safe token clear                    |
| `Authorization`   | Used in api.ts fetcher, auth-context.tsx                            | ✅ Safe API Authorization header       |
| `Bearer`          | Used in api.ts fetcher, auth-context.tsx                            | ✅ Safe API Authorization header       |
| `401`             | Used in api.ts (global handler), auth-context.tsx (session restore) | ✅ Safe 401 cleanup                    |
| `auth/me`         | Used in auth-context.tsx session restore                            | ✅ Safe session restore                |
| `logout`          | Used in auth-context.tsx                                            | ✅ Safe logout                         |
| `document.cookie` | Used in auth-utils.ts clearAuthSession                              | ✅ Safe cookie clear                   |
| `window.location` | Used in auth-utils.ts redirectToLogin                               | ✅ Safe redirect                       |
| `router.push`     | Not used (uses window.location for hard redirect)                   | ✅ Safe                                |
| `console.log`     | Not found with token values                                         | ✅ Safe                                |
| `logger`          | Not found with token values                                         | ✅ Safe                                |

**Result: ZERO unsafe findings.**

### Tests/Commands Run

- `npx tsc --noEmit` in apps/web - No new errors from Phase 1D changes
- Pre-existing errors: 718 decorator errors (unrelated backend), web React type errors (unrelated)

### Remaining Risks or TODOs

1. **Hard redirect vs soft redirect**: Current implementation uses `window.location.href` for hard redirect. A future improvement could use Next.js `router.push()` for SPA-style navigation, but hard redirect ensures complete state reset.
2. **Parallel 401 calls**: If multiple API calls return 401 simultaneously, each will trigger `clearAuthSession()` and `redirectToLogin()`. This is safe (idempotent) but could be optimized with a module-level flag in Phase 3.
3. **SSR 401 handling**: Server-side fetcher calls that get 401 will throw without redirecting (correct behavior - no browser context). The error propagates to the caller.
4. **Deeper Phase 3 improvements**: Consider adding a centralized auth error boundary, refresh token rotation, or silent token refresh.

---

## Phase 1C - OAuth Token Encryption

### Phase Status

- [x] Phase 1C goal defined
- [x] All OAuth token usage inspected and classified
- [x] Encryption env variable confirmed
- [x] Crypto utility assessed
- [x] Runtime encryption enforced
- [x] Migration strategy documented
- [x] Documentation updated
- [x] Validation commands run

### Files Changed

| File                                                       | Change                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/api/src/connectors/salesforce/salesforce.service.ts` | Removed plaintext fallback, always encrypt tokens, fail closed on plaintext read |
| `apps/api/src/scripts/encrypt-oauth-tokens.ts`             | Created idempotent migration script for existing plaintext tokens                |

### Token Write Paths (Fixed)

| Location                              | Old Behavior                                  | New Behavior                                                                       |
| ------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `handleOAuthCallback` (lines 136-141) | `encryptionSecret ? encrypt(...) : plaintext` | Always `encryptToken(data.access_token, encryptionSecret)` - throws if key missing |
| `refreshAccessToken` (lines 259-263)  | `encryptionSecret ? encrypt(...) : plaintext` | Always `encryptToken(data.access_token, encryptionSecret)` - throws if key missing |

### Token Read/Decrypt Paths (Fixed)

| Location                         | Old Behavior                                          | New Behavior                                                    |
| -------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| `getAccessToken` (lines 200-205) | `encryptionSecret ? decrypt(...) : token.accessToken` | **FAIL CLOSED**: Throws error if token is not encrypted         |
| `refreshAccessToken` (line 238)  | Used `token.refreshToken` directly (BUG)              | **FAIL CLOSED**: Throws error if refresh token is not encrypted |

### Encrypted Token Format

**Runtime accepts both encrypted formats, but rejects plaintext:**

- **New format**: `enc:v1:<iv>:<authTag>:<ciphertext>`
- **Legacy format**: `<iv>:<authTag>:<ciphertext>` (for backward compatibility during transition)

**New writes always use the `enc:v1:` format.**

### Migration Strategy

Created `apps/api/src/scripts/encrypt-oauth-tokens.ts`:

- Detects encrypted values by format (prefix `enc:v1:` or legacy `:` separator)
- Encrypts plaintext values into the new `enc:v1:` format
- Skips both new-format and legacy encrypted values (idempotent)
- Logs only record IDs and status, not token values
- Exits with error if `TOKEN_ENCRYPTION_KEY` not set

### Search Validation Summary

| Pattern                   | Result                          | Classification                       |
| ------------------------- | ------------------------------- | ------------------------------------ |
| `accessToken`             | All writes use `encryptToken()` | ✅ Safe encrypted write              |
| `refreshToken`            | All writes use `encryptToken()` | ✅ Safe encrypted write              |
| `encrypt(`                | Used in salesforce.service.ts   | ✅ Safe encryption                   |
| `decrypt(`                | Used in salesforce.service.ts   | ✅ Safe decrypt-before-provider-call |
| `TOKEN_ENCRYPTION_KEY`    | Used in salesforce.service.ts   | ✅ Safe env variable                 |
| `console.log` with tokens | Not found                       | ✅ Safe                              |
| `logger` with tokens      | Not found                       | ✅ Safe                              |

**Result: ZERO unsafe findings.**

### Tests/Commands Run

- `npx tsc --noEmit` - No new errors in modified files
- Pre-existing errors: 718 decorator errors (unrelated), web React type errors (unrelated)

### Remaining Risks/TODOs

1. **Migration script**: Must be run to encrypt existing plaintext tokens
2. **Shopify service**: No OAuth token storage (uses HMAC verification only) - no changes needed
