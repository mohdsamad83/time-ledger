import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // If no password is set in env, skip auth (fail-open for local dev unless explicitly set)
  // Actually, for security, we should fail-closed. If they haven't set the password, they can't log in.
  // But wait, if they haven't set it yet, we don't want them locked out of their own local dev.
  // Let's require the cookie if the path isn't /login or /api/auth/login
  
  const path = request.nextUrl.pathname;
  
  if (path === '/login' || path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('time-ledger-auth');
  const appPassword = process.env.APP_PASSWORD;

  // If no password is set in the environment, we can either block completely or let it pass.
  // It's safer to block completely if in production, but allow if APP_PASSWORD is empty in dev?
  // Let's just strictly enforce it if APP_PASSWORD exists. If it doesn't exist, we will still require them to set it.
  // Actually, if it doesn't exist, we'll accept "admin" as default just so it doesn't break.
  
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
