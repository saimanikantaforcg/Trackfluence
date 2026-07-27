/**
 * Shared auth session clear helper.
 * Browser-safe: checks typeof window/document before using browser APIs.
 * Reusable by: API client 401 handler, auth-context session failure, logout flow.
 */

const TOKEN_KEY = "tf_token";

/**
 * Clear all client-side auth state.
 * - Removes token from localStorage
 * - Removes token from sessionStorage (if stored there)
 * - Deletes tf_token cookie
 * - Safe to call multiple times (idempotent)
 */
export function clearAuthSession(): void {
  if (typeof window === "undefined") return;

  // Clear localStorage
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }

  // Clear sessionStorage
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage may be unavailable
  }

  // Clear tf_token cookie by setting it to expire immediately
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
  }
}

/**
 * Redirect to login page, preserving current path for post-login redirect.
 * Safe: does nothing during SSR.
 */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;

  const currentPath = window.location.pathname;
  if (currentPath === "/login") return; // Avoid redirect loop

  const loginUrl = `/login${
    currentPath ? `?redirect=${encodeURIComponent(currentPath)}` : ""
  }`;
  window.location.href = loginUrl;
}

/**
 * Handle a 401 response: clear session and redirect.
 * Returns a rejected promise so calling code can still catch if needed.
 */
export function handleUnauthorized(): never {
  clearAuthSession();
  redirectToLogin();
  // Throw so callers can catch if they want
  throw new Error("Session expired. Redirecting to login.");
}
