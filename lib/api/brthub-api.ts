const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  error?: string;
}

export interface MeUser {
  uuid: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  is_active: boolean;
}

export interface BrthubData {
  roles: string[];
  employee_profile: {
    id: number;
    department_id: number | null;
    position_id: number | null;
    /** Dari AuthController::me() — approver ditentukan oleh posisi, bukan role */
    position_name?: string | null;
    hierarchy_level?: number | null;
  } | null;
}

export interface MeResponse {
  success: boolean;
  user: MeUser;
  brthub: BrthubData;
}

export interface OtpRequestResponse {
  success: boolean;
  data?: {
    message: string;
    phone_number?: string;
    email?: string;
  };
  message?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  data?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user?: MeUser;
  };
  message?: string;
}

// ─── Role constants ───────────────────────────────────────────────────────────

export const ROLE_REVIEWER = 'reviewer';
export const ROLE_HANDLER = 'handler';
export const ROLE_UNIT = 'unit';
export const ROLE_ADMIN = 'admin';

export type AppRole = 'reviewer' | 'handler' | 'unit' | 'approver' | 'admin';

/** Priority order when a user has multiple roles */
export const ROLE_REDIRECT: Record<AppRole, string> = {
  reviewer: '/reviewer',
  handler: '/handler',
  unit: '/unit',
  approver: '/approver',
  admin: '/admin',
};

const ROLE_PRIORITY: AppRole[] = ['admin', 'reviewer', 'approver', 'unit', 'handler'];

/**
 * Pegawai dengan posisi setingkat Manager ke atas (hierarchy_level 1–4)
 * berhak melakukan approval, sehingga role `approver` diturunkan dari posisi.
 * Mapping approval_type ↔ position ada di backend (ApprovalService).
 */
export function isApproverPosition(employeeProfile: BrthubData['employee_profile']): boolean {
  const level = employeeProfile?.hierarchy_level;
  return typeof level === 'number' && level >= 1 && level <= 4;
}

/**
 * Daftar role lengkap user, termasuk `approver` bila posisinya memenuhi syarat.
 * Dipakai oleh AuthContext sebagai `availableRoles`.
 */
export function deriveRoles(
  roles: string[],
  employeeProfile: BrthubData['employee_profile'],
): string[] {
  if (roles.includes('approver')) return roles;
  return isApproverPosition(employeeProfile) ? [...roles, 'approver'] : roles;
}

/**
 * Role yang harus dibuka saat login / ganti role.
 *
 * Memprioritaskan role yang terakhir dipakai user (disimpan di AuthContext)
 * agar user multi-role tidak selalu dipaksa ke satu role; bila belum pernah
 * memilih, pakai urutan prioritas tetap.
 */
export function resolveRoleRedirect(
  roles: string[],
  preferredRole?: string | null,
): string {
  if (preferredRole && roles.includes(preferredRole)) {
    const redirect = ROLE_REDIRECT[preferredRole as AppRole];
    if (redirect) return redirect;
  }
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return ROLE_REDIRECT[r];
  }
  return '/unauthorized';
}

// ─── API client ───────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ success: false, message: 'Network error' }));
  if (!res.ok && res.status !== 422) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json as T;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({ success: false, message: 'Network error' }));
  if (!res.ok) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json as T;
}

export const brthubApi = {
  /**
   * Step 1 — Request OTP for an employee phone number.
   */
  async requestOtp(identifier: string): Promise<OtpRequestResponse> {
    return post<OtpRequestResponse>('/auth/otp/request', {
      identifier,
      action: 'phone_login',
    });
  },

  /**
   * Request OTP via email (for email-based login).
   */
  async requestEmailOtp(identifier: string): Promise<OtpRequestResponse> {
    return post<OtpRequestResponse>('/auth/otp/request', {
      identifier,
      action: 'email_login',
    });
  },

  /**
   * Step 2 — Verify OTP and receive access + refresh tokens.
   */
  async verifyOtp(identifier: string, otpCode: string): Promise<OtpVerifyResponse> {
    return post<OtpVerifyResponse>('/auth/otp/verify', {
      identifier,
      otp_code: otpCode,
      action: 'phone_login',
    });
  },

  /**
   * Verify email OTP.
   */
  async verifyEmailOtp(identifier: string, otpCode: string): Promise<OtpVerifyResponse> {
    return post<OtpVerifyResponse>('/auth/otp/verify', {
      identifier,
      otp_code: otpCode,
      action: 'email_login',
    });
  },

  /**
   * Fetch current authenticated user including BRTHub roles.
   */
  async getMe(token: string): Promise<MeResponse> {
    return get<MeResponse>('/auth/me', token);
  },

  /**
   * Logout — revoke token on the server.
   */
  async logout(token: string): Promise<void> {
    await post('/auth/logout', {}, token);
  },
};
