/**
 * Fetch wrapper with automatic token refresh and session expiry handling.
 *
 * This module provides an authenticated fetch function that:
 * 1. Automatically includes the access token from localStorage — the staff
 *    session (`brthub_token`) or, failing that, the reporter session
 *    (`auth_token`), so shared API modules work for both flows
 * 2. Accepts an explicit `token` (needed on the login bootstrap, where the
 *    token is not persisted yet) and a `skipAuthRefresh` escape hatch
 * 3. Intercepts 401 Unauthorized responses
 * 4. Attempts to refresh the token using the refresh token
 * 5. Retries the original request after successful refresh
 * 6. Redirects to the matching login page with a toast message if refresh fails
 *    (`/login` for staff, `/verifikasi` for reporters)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Storage keys (must match auth-context.tsx)
const TOKEN_KEY = 'brthub_token';
const REFRESH_KEY = 'brthub_refresh_token';
const USER_KEY = 'brthub_user';
const ACTIVE_ROLE_KEY = 'brthub_active_role';

// Reporter session keys. Owned by ReporterGuard / the report pages; the wrapper
// only *reads* them so the shared API modules (tickets, ticket-interactions)
// work for reporters too. `brthub_user` is deliberately never written here —
// AuthContext requires it to treat someone as staff.
const REPORTER_TOKEN_KEY = 'auth_token';
const REPORTER_PROFILE_KEY = 'user_profile';

/**
 * Extra fetch options understood by {@link authenticatedFetch}.
 *
 * - `token`           → use this token instead of the one in localStorage.
 *                       Required during the login bootstrap (`/login`, `/otp`)
 *                       because the token is only persisted after `me` succeeds.
 * - `skipAuthRefresh` → never refresh/redirect on 401; the caller (login page)
 *                       handles the failure itself, so a stale session cannot
 *                       bounce the user away from the page they are on.
 */
export interface AuthenticatedFetchOptions extends RequestInit {
  token?: string;
  skipAuthRefresh?: boolean;
}

/** A pending request waiting for the in-flight token refresh to finish. */
interface RefreshSubscriber {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
// Queue of pending requests to retry after refresh
let refreshSubscribers: RefreshSubscriber[] = [];

/**
 * Get stored access token from localStorage.
 *
 * Staff session (`brthub_token`) first, then the reporter session
 * (`auth_token`) — reporter pages share the same API modules, so the wrapper
 * must be able to read their token as well.
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(REPORTER_TOKEN_KEY);
}

/**
 * Get stored refresh token from localStorage.
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

/**
 * Update stored access token.
 *
 * When the session being refreshed happens to also live under the reporter key
 * (`auth_token` — still read directly by report/new & report/sukses), the new
 * token is mirrored there so both readers stay on the same, non-expired token.
 */
function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  if (localStorage.getItem(REPORTER_TOKEN_KEY) !== null) {
    localStorage.setItem(REPORTER_TOKEN_KEY, token);
  }
}

/**
 * Clear all *staff* auth data from localStorage.
 *
 * The reporter keys are intentionally left alone: `ReporterGuard` owns their
 * cleanup and {@link redirectToLogin} needs them to know that the expired
 * session belongs to a reporter (so it can send them to `/verifikasi`).
 */
function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACTIVE_ROLE_KEY);
}

/**
 * Redirect to the login page matching the *kind* of session that expired:
 * reporters go back to `/verifikasi` (OTP), staff go to `/login` (password).
 *
 * `next` carries the current path so the user returns to where they were.
 */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return;

  const { pathname, search } = window.location;
  // A reporter session is one without a staff user profile.
  const isReporterSession =
    !localStorage.getItem(USER_KEY) &&
    (localStorage.getItem(REPORTER_TOKEN_KEY) !== null ||
      localStorage.getItem(REPORTER_PROFILE_KEY) !== null);

  const loginPath = isReporterSession ? '/verifikasi' : '/login';
  const currentPath = `${pathname ?? ''}${search ?? ''}`;
  const alreadyThere = pathname === '/login' || pathname === '/verifikasi';

  window.location.href =
    !alreadyThere && currentPath
      ? `${loginPath}?next=${encodeURIComponent(currentPath)}`
      : loginPath;
}

/**
 * Notify all pending subscribers with the new token.
 */
function onRefreshed(token: string): void {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach(({ resolve }) => resolve(token));
}

/**
 * Reject all pending subscribers — called when the refresh attempt failed so
 * queued requests do not hang forever after the session was cleared.
 */
function onRefreshFailed(error: unknown): void {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach(({ reject }) => reject(error));
}

/**
 * Add a subscriber to wait for token refresh.
 */
function addRefreshSubscriber(
  resolve: (token: string) => void,
  reject: (error: unknown) => void,
): void {
  refreshSubscribers.push({ resolve, reject });
}

/**
 * Attempt to refresh the access token.
 *
 * @returns Promise that resolves with the new access token or rejects on failure
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // be-brthub exposes POST /api/auth/token/refresh (see routes/api.php).
  const response = await fetch(`${API_URL}/api/auth/token/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();

  if (!data.success || !data.data?.access_token) {
    throw new Error('Invalid refresh response');
  }

  // Update stored access token
  setAccessToken(data.data.access_token);

  // Update refresh token if provided
  if (data.data.refresh_token) {
    localStorage.setItem(REFRESH_KEY, data.data.refresh_token);
  }

  return data.data.access_token;
}

/**
 * Handle token refresh with queue management.
 */
async function handleTokenRefresh(): Promise<string> {
  if (isRefreshing) {
    // If already refreshing, wait for it to complete
    return new Promise((resolve, reject) => {
      addRefreshSubscriber(resolve, reject);
    });
  }

  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    onRefreshed(newToken);
    return newToken;
  } catch (error) {
    isRefreshing = false;
    // Unblock queued requests first so they do not await forever
    onRefreshFailed(error);
    // Clear auth data and redirect to login
    clearAuthData();
    // Dispatch event for toast notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    // Redirect to login
    redirectToLogin();
    throw error;
  }
}

/**
 * Authenticated fetch wrapper with automatic token refresh.
 *
 * @param url - The API endpoint path (relative to API_URL)
 * @param options - Fetch options, plus `token` and `skipAuthRefresh`
 * @returns Promise with the fetch response
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { token: explicitToken, skipAuthRefresh = false, ...requestInit } = options;

  // Explicit token (login bootstrap) wins over the token in localStorage
  const token = explicitToken ?? getAccessToken();

  const targetUrl = resolveUrl(url);

  // Add Authorization header if token exists
  const headers: Record<string, string> = {
    ...(requestInit.headers as Record<string, string> || {}),
  };

  // Only set Content-Type to application/json if not multipart (FormData)
  if (!(requestInit.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make the initial request
  let response = await fetch(targetUrl, {
    ...requestInit,
    headers,
  });

  // If 401 Unauthorized, try to refresh token
  if (response.status === 401 && token && !skipAuthRefresh) {
    try {
      // Attempt to refresh the token
      const newToken = await handleTokenRefresh();

      // Retry the original request with the new token
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(targetUrl, {
        ...requestInit,
        headers,
      });
    } catch {
      // Refresh failed - auth data cleared and redirect already handled
      // Return the original 401 response for error handling
      return response;
    }
  }

  return response;
}

/**
 * Build the absolute request URL.
 *
 * Call sites are inconsistent by history: modules migrated from raw
 * `fetch(\`${API_URL}${path}\`)` still pass paths that already contain the
 * `/api` prefix (`/api/auth/tickets`) or even a full URL, while newer ones pass
 * the bare form (`/auth/me`). Normalising here keeps every caller working and
 * makes a `/api/api/...` (or `/apihttp://...`) URL impossible.
 */
function resolveUrl(url: string): string {
  // Already absolute (e.g. an explicit `${API_URL}/api/...` from a legacy caller).
  if (/^https?:\/\//i.test(url)) return url;

  const path = url.startsWith('/api/') ? url.slice('/api'.length) : url;
  return `${API_URL}/api${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Convenience method for GET requests.
 */
export async function get<T>(path: string, options: AuthenticatedFetchOptions = {}): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: 'GET',
    ...options,
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(json.message || `Request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Convenience method for POST requests.
 */
export async function post<T>(
  path: string,
  body: unknown,
  options: AuthenticatedFetchOptions = {},
): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: 'POST',
    ...options,
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({ success: false, message: 'Network error' }));

  if (!response.ok && response.status !== 422) {
    throw new Error(json.message || `Request failed (${response.status})`);
  }

  return json as T;
}

/**
 * Convenience method for PUT requests.
 */
export async function put<T>(
  path: string,
  body: unknown,
  options: AuthenticatedFetchOptions = {},
): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: 'PUT',
    ...options,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(json.message || `Request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Convenience method for DELETE requests.
 */
export async function del<T>(path: string, options: AuthenticatedFetchOptions = {}): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: 'DELETE',
    ...options,
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(json.message || `Request failed (${response.status})`);
  }

  return response.json();
}
