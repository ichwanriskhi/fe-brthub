import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'brthub_session';

/**
 * Creates the httpOnly reporter session cookie used by `proxy.ts` to gate the
 * reporter pages (`/report/*`, `/laporan/*`). Called by the OTP page right
 * after the Auth Service verification succeeds.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const accessToken = body?.access_token;

  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json(
      { success: false, message: 'access_token wajib diisi' },
      { status: 422 },
    );
  }

  // Umur cookie = ceiling sesi IdP (24 jam), BUKAN umur access token.
  // Token diperpanjang diam-diam via refresh, tapi cookie tidak tersentuh —
  // bila cookie mati duluan (mis. 1 jam dari expires_in), proxy menendang
  // sesi yang sebenarnya masih valid. 24 jam = batas absolut sesi yang sama.
  const SESSION_COOKIE_MAX_AGE = 24 * 60 * 60;

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: accessToken,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  });

  return response;
}

/** Clears the reporter session cookie (logout). */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
