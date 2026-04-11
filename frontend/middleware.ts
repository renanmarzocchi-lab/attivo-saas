import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('attivo_token')?.value;
  const { pathname } = request.nextUrl;

  const isPublic = pathname === '/login' || pathname === '/login/master' || pathname === '/register' || pathname === '/' || pathname === '/forgot-password' || pathname === '/reset-password';
  if (isPublic) return NextResponse.next();

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/affiliate/:path*', '/broker/:path*'],
};
