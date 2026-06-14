import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password === process.env.APP_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('auth', 'true', {
      path: '/',
      maxAge: 30 * 60,
      sameSite: 'lax',
      httpOnly: true,
    });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}