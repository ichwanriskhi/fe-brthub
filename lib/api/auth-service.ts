const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8001';

export interface AuthServiceOtpRequest {
  identifier: string;
  action: 'email_login' | 'phone_login' | 'email_otp' | 'phone_otp';
}

export interface AuthServiceOtpVerify {
  identifier: string;
  otp_code: string;
  action: 'email_login' | 'phone_login' | 'email_otp' | 'phone_otp';
}

export interface AuthServiceResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  error?: string;
}

export const authServiceClient = {
  /**
   * Password-based login (email or phone number + password).
   *
   * Identifier bisa email atau nomor handphone; backend membedakan keduanya
   * secara otomatis. Membuat session & token seperti halnya login OTP.
   */
  async loginWithPassword(
    identifier: string,
    password: string,
    appId?: string
  ): Promise<AuthServiceResponse<{ access_token: string; refresh_token: string; token_type: string; expires_in: number; user?: any }>> {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password, app_id: appId ?? null }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Login gagal');
    }

    return response.json();
  },

  /**
   * Request OTP to email or phone
   * Routes to email-otp or phone-otp endpoint based on input
   */
  async requestOtp(
    identifier: string,
    action: AuthServiceOtpRequest['action']
  ): Promise<AuthServiceResponse<{ message: string; email?: string; phone_number?: string }>> {
    const isEmail = action === 'email_login' || action === 'email_otp';
    const url = isEmail
      ? `${AUTH_SERVICE_URL}/api/auth/email-otp/request`
      : `${AUTH_SERVICE_URL}/api/auth/otp/request`;

    const body = isEmail
      ? { email: identifier, action }
      : { phone_number: identifier, action };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Failed to send OTP');
    }

    return response.json();
  },

  /**
   * Verify OTP and get access token
   */
  async verifyOtp(
    identifier: string,
    otpCode: string,
    action: AuthServiceOtpVerify['action']
  ): Promise<AuthServiceResponse<{ access_token: string; refresh_token: string; token_type: string; expires_in: number; user?: any }>> {
    const isEmail = action === 'email_login' || action === 'email_otp';
    const url = isEmail
      ? `${AUTH_SERVICE_URL}/api/auth/email-otp/verify`
      : `${AUTH_SERVICE_URL}/api/auth/otp/verify`;

    const body = isEmail
      ? { email: identifier, otp: otpCode, action }
      : { phone_number: identifier, otp: otpCode, action };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Invalid OTP');
    }

    return response.json();
  },

  /**
   * Get authenticated user profile
   */
  async getUser(token: string): Promise<AuthServiceResponse<any>> {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Authentication failed');
    }

    return response.json();
  },

  /**
   * Revoke token (logout)
   */
  async logout(token: string): Promise<AuthServiceResponse<void>> {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Logout failed');
    }

    return response.json();
  },
};
