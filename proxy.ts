import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const userCookie = request.cookies.get('user')?.value;
  const pathname = request.nextUrl.pathname;
  
  const isLoginPage = pathname === '/login';
  const isPublic = pathname.startsWith('/_next') 
    || pathname.startsWith('/favicon')
    || pathname.startsWith('/api');

  if (isPublic) return NextResponse.next();

  if (!userCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (userCookie && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};