import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Safely parse the incoming JSON
    const body = await request.json();
    const { password } = body;

    // 2. Debug logs: Check your server terminal to see these values!
    console.log('--- Auth Debug ---');
    console.log('Received Password:', password);
    console.log('Expected Password (ENV):', process.env.APP_PASSWORD);
    console.log('------------------');

    // 3. Fail early if the server environment is misconfigured
    if (!process.env.APP_PASSWORD) {
      console.error("CRITICAL: APP_PASSWORD is not defined in your environment variables.");
      return NextResponse.json(
        { success: false, error: "Server configuration error" }, 
        { status: 500 }
      );
    }

    // 4. Validate credentials
    if (password === process.env.APP_PASSWORD) {
      const response = NextResponse.json({ success: true });
      
      response.cookies.set('auth', 'true', {
        path: '/',
        maxAge: 30 * 60, // 30 minutes
        sameSite: 'lax',
        httpOnly: true,
        // Ensures cookies are only sent over HTTPS in production
        secure: process.env.NODE_ENV === 'production', 
      });
      
      return response;
    }

    // Invalid password
    return NextResponse.json(
      { success: false, error: "Invalid credentials" }, 
      { status: 401 }
    );
    
  } catch (error) {
    // Prevents crashing if the body is empty or not JSON
    return NextResponse.json(
      { success: false, error: "Malformed or missing JSON payload" }, 
      { status: 400 }
    );
  }
}