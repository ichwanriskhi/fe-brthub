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
 * Refresh token reporter — key TERPISAH dari staff (`REFRESH_KEY`).
 *
 * Sengaja tidak berbagi key: satu browser bisa dipakai staff dan reporter
 * bergantian (PC kasir/admin); key bersama membuat login satu peran menimpa
 * refresh peran lain dan `clearAuthData` menendang sesi yang tidak bersalah.
 */
const REPORTER_REFRESH_KEY = 'reporter_refresh_token';

/** Batas umur token (ms) per peran — ditulis saat login/refresh, dibaca scheduler proaktif. */
const STAFF_EXPIRES_AT_KEY = 'brthub_expires_at';
const REPORTER_EXPIRES_AT_KEY = 'reporter_expires_at';
/** TTL detik saat diterbitkan — untuk menghitung threshold 80% tanpa menebak angka IdP. */
const STAFF_TOKEN_TTL_KEY = 'brthub_token_ttl';
const REPORTER_TOKEN_TTL_KEY = 'reporter_token_ttl';
/** Timeout refresh agar request gantung tidak mengunci antrean selamanya. */
const REFRESH_TIMEOUT_MS = 10000;
/** Fraksi umur token saat refresh proaktif starting (sisa 20%). */
const PROACTIVE_THRESHOLD_FRACTION = 0.2;

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
 * Jenis sesi pemilik storage — satu-satunya dasar deteksi peran di wrapper.
 * Staff = ada profil user; reporter = ada token/profil reporter tanpa itu.
 */
type SessionKind = 'staff' | 'reporter' | 'none';

function sessionKind(): SessionKind {
  if (typeof window === 'undefined') return 'none';
  if (localStorage.getItem(USER_KEY)) return 'staff';
  if (
    localStorage.getItem(REPORTER_TOKEN_KEY) !== null ||
    localStorage.getItem(REPORTER_PROFILE_KEY) !== null
  ) {
    return 'reporter';
  }
  return 'none';
}

/**
 * Simpan sesi reporter (satu-satunya penulis key reporter selain refresh).
 * Key terpusat di sini agar tidak ada string duplikat yang bisa meleset.
 */
export function saveReporterSession(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REPORTER_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REPORTER_REFRESH_KEY, refreshToken);
  }
}
export function setTokenExpiry(kind: 'staff' | 'reporter', expiresInSec: number): void {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(expiresInSec) || expiresInSec <= 0) return;
  localStorage.setItem(
    kind === 'staff' ? STAFF_EXPIRES_AT_KEY : REPORTER_EXPIRES_AT_KEY,
    String(Date.now() + expiresInSec * 1000),
  );
  localStorage.setItem(
    kind === 'staff' ? STAFF_TOKEN_TTL_KEY : REPORTER_TOKEN_TTL_KEY,
    String(expiresInSec),
  );
}

function clearTokenExpiry(kind: 'staff' | 'reporter'): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(kind === 'staff' ? STAFF_EXPIRES_AT_KEY : REPORTER_EXPIRES_AT_KEY);
  localStorage.removeItem(kind === 'staff' ? STAFF_TOKEN_TTL_KEY : REPORTER_TOKEN_TTL_KEY);
}

/**
 * Clear auth data MILIK PERAN YANG GAGAL saja.
 *
 * Jangan hapus peran lain: browser bersama (staff + reporter bergantian)
 * membuat clear membabi-buta menendang sesi yang masih sah. `kind`
 * dihitung SEBELUM clear oleh pemanggil — setelah clear, deteksi peran
 * tidak lagi mungkin.
 */
function clearAuthData(kind: SessionKind): void {
  if (typeof window === 'undefined') return;
  if (kind === 'none') return; // tidak ada sesi — tidak ada yang dibersihkan
  if (kind === 'staff') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    clearTokenExpiry('staff');
  } else if (kind === 'reporter') {
    localStorage.removeItem(REPORTER_TOKEN_KEY);
    localStorage.removeItem(REPORTER_REFRESH_KEY);
    localStorage.removeItem(REPORTER_PROFILE_KEY);
    clearTokenExpiry('reporter');
  }
}

/**
 * Redirect to the login page matching the *kind* of session that expired:
 * reporters go back to `/verifikasi` (OTP), staff go to `/login` (password).
 *
 * `next` carries the current path so the user returns to where they were.
 *
 * Toast "sesi habis" tidak bisa ditampilkan di sini: redirect memakai
 * `window.location.href` (reload penuh) sehingga toast di halaman lama ikut
 * hilang. Sebagai gantinya pasang flag `SESSION_EXPIRED_FLAG` — halaman login
 * membacanya saat mount dan menampilkan toastnya di sana.
 */
export const SESSION_EXPIRED_FLAG = 'brthub_session_expired';

function redirectToLogin(kind: SessionKind = sessionKind()): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(SESSION_EXPIRED_FLAG, '1');
  } catch {
    // Storage tidak tersedia — redirect tetap jalan, hanya toast yang hilang.
  }

  const { pathname, search } = window.location;
  // `kind` sudah dihitung pemanggil sebelum clear — jangan deteksi ulang
  // di sini (storage sudah kosong saat fungsi ini jalan).
  const loginPath = kind === 'reporter' ? '/verifikasi' : '/login';
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
 * Timeout eksplisit: request gantung tidak boleh mengunci `isRefreshing`
 * selamanya (antrean subscriber gantung = seluruh app macet).
 *
 * @returns Promise that resolves with the new access token or rejects on failure
 */
async function refreshAccessToken(): Promise<string> {
  const kind = sessionKind();
  // Key dibaca eksplisit per peran — JANGAN fallback silang: refresh staff
  // tidak boleh memakai token reporter dan sebaliknya.
  const refreshKey = kind === 'staff' ? REFRESH_KEY : kind === 'reporter' ? REPORTER_REFRESH_KEY : null;
  const refreshToken = refreshKey ? localStorage.getItem(refreshKey) : null;

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  // be-brthub exposes POST /api/auth/token/refresh (see routes/api.php).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await response.json();

  if (!data.success || !data.data?.access_token) {
    throw new Error('Invalid refresh response');
  }

  // Update stored access token
  setAccessToken(data.data.access_token);

  // Update refresh token (rotasi IdP) di key ASAL token ini dibaca — bukan
  // berdasarkan kind sesaat (bisa berubah bersamaan antar-tab).
  if (data.data.refresh_token && refreshKey) {
    localStorage.setItem(refreshKey, data.data.refresh_token);
  }

  // Perbarui umur untuk scheduler proaktif (butuh angka IdP, bukan tebakan).
  // kind 'none' (storage terhapus bersamaan) → lewati, tidak bisa atributkan.
  if (
    (kind === 'staff' || kind === 'reporter') &&
    Number.isFinite(Number(data.data?.expires_in)) &&
    Number(data.data.expires_in) > 0
  ) {
    setTokenExpiry(kind, Number(data.data.expires_in));
  }

  return data.data.access_token;
}

/**
 * Handle token refresh with queue management.
 *
 * `failedToken` = token yang kena 401. Bila storage sudah berisi token lain
 * (tab lain menang refresh duluan — rotasi IdP sekali-pakai), JANGAN refresh
 * lagi dengan token basi: pakai yang baru. Ini obat race antar-tab.
 *
 * Timeout (`AbortError`) diperlakukan sebagai transient: antrean dibuka tanpa
 * clear/redirect — jalur reaktif 401 akan menangani bila sesi memang mati.
 */
async function handleTokenRefresh(failedToken?: string | null): Promise<string> {
  if (typeof window !== 'undefined' && failedToken) {
    const current = getAccessToken();
    if (current && current !== failedToken) {
      return current;
    }
  }

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
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Transient (IdP lambat/mati sesaat) — bukan vonis sesi. Tanpa
      // clear/redirect; pemanggil menerima network error.
      throw error;
    }
    // Clear auth data milik peran yang gagal dan redirect ke login.
    // `kind` dihitung SEBELUM clear — sesudahnya deteksi mustahil.
    const kind = sessionKind();
    clearAuthData(kind);
    // Dispatch event for toast notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    // Redirect to login
    redirectToLogin(kind);
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
      // Attempt to refresh the token (anti race antar-tab: bila token di
      // storage sudah berganti, pakai yang baru tanpa refresh ulang)
      const newToken = await handleTokenRefresh(token);

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

// ─── Refresh proaktif ────────────────────────────────────────────────

let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Refresh proaktif: perpanjang sesi SEBELUM 401 pertama, bukan sesudahnya.
 *
 * Dijadwalkan saat sisa umur < 20% TTL (angka dari IdP via `setTokenExpiry`,
 * bukan tebakan). Non-destruktif: gagal = diam (jalur reaktif 401 yang
 * menangani bila sesi memang mati) — proaktif tidak boleh me-logout siapa
 * pun. Multi-tab aman: yang kalah rotasi ditangani re-read di
 * `handleTokenRefresh`, dan timer tiap tab membaca storage terbaru.
 */
function scheduleNextProactive(): void {
  if (typeof window === 'undefined') return;
  if (proactiveTimer) clearTimeout(proactiveTimer);

  const now = Date.now();
  const candidates: number[] = [];

  ([
    ['staff', STAFF_EXPIRES_AT_KEY, STAFF_TOKEN_TTL_KEY],
    ['reporter', REPORTER_EXPIRES_AT_KEY, REPORTER_TOKEN_TTL_KEY],
  ] as const).forEach(([, expiryKey, ttlKey]) => {
    const expiry = Number(localStorage.getItem(expiryKey));
    const ttl = Number(localStorage.getItem(ttlKey));
    if (!Number.isFinite(expiry) || !Number.isFinite(ttl) || ttl <= 0) return;
    const remaining = expiry - now;
    if (remaining <= 0) return; // sudah mati — milik jalur reaktif
    candidates.push(Math.max(0, remaining - ttl * 1000 * PROACTIVE_THRESHOLD_FRACTION));
  });

  // Tanpa data umur (belum login) → cek lagi semenit. Tanpa timer ganda.
  const delay = candidates.length > 0 ? Math.min(...candidates) : 60_000;
  proactiveTimer = setTimeout(proactiveTick, delay);
}

async function proactiveTick(): Promise<void> {
  proactiveTimer = null;
  if (typeof document !== 'undefined' && document.hidden) {
    // Tab tidak terlihat — tunda, jangan bakar rotasi sia-sia.
    scheduleNextProactive();
    return;
  }
  if (isRefreshing) {
    scheduleNextProactive();
    return;
  }
  try {
    await refreshAccessToken();
  } catch {
    // Diam: gagal proaktif bukan vonis. Bila sesi memang mati, request
    // berikutnya kena 401 dan jalur reaktif yang bertindak.
  } finally {
    scheduleNextProactive();
  }
}

/**
 * Mulai scheduler proaktif (dipanggil sekali dari komponen global).
 * Mengembalikan stopper untuk cleanup unmount.
 */
export function startProactiveRefresh(): () => void {
  scheduleNextProactive();
  return () => {
    if (proactiveTimer) {
      clearTimeout(proactiveTimer);
      proactiveTimer = null;
    }
  };
}
