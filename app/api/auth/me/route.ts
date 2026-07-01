import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const userCookie = request.cookies.get('user')?.value;
  if (!userCookie) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  try {
    return NextResponse.json({ user: JSON.parse(userCookie) });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}