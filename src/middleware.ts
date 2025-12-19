import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes
  const isAgentRoute = pathname.startsWith('/customerservice');

  // Get session from cookie
  const sessionCookie = request.cookies.get('sb_session');
  let session = null;

  if (sessionCookie) {
    try {
      session = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch (e) {
      console.error('Failed to parse session cookie');
    }
  }

  // 1. Redirect unauthenticated users or non-agents away from /customerservice
  if (isAgentRoute) {
    if (!session || session.role !== 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. If already logged in as agent, redirect away from login page
  if (pathname === '/login' && session?.role === 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/customerservice', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
