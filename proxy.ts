import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'brthub_session';

// Reporter-only sections: they require a verified OTP session. Staff areas
// (`/reviewer`, `/handler`, …) are out of scope here.
const PROTECTED_PREFIXES = ['/report', '/laporan'];

/**
 * Next 16 proxy (replacement for `middleware.ts`). Pages cannot be opened by
 * typing the URL directly anymore: without the httpOnly session cookie (set
 * only after a successful OTP verification) the visitor is sent to the
 * reporter login flow with a `next` redirect target.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/verifikasi';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/report/:path*', '/laporan/:path*'],
};
