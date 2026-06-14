import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const auth = request.cookies.get('auth')?.value;
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';
  const isPublic = pathname.startsWith('/_next') 
    || pathname.startsWith('/favicon')
    || pathname.startsWith('/api'); // ← add this

  if (isPublic) return NextResponse.next();

if (!auth && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (auth && isLoginPage) {
    return NextResponse.redirect(new URL('/pos', request.url));
  }

  return await updateSession(request);
}