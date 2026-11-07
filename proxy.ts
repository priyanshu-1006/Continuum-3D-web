import { NextResponse, type NextRequest } from 'next/server';
import { getAuthSettings, hasAuthSessionCookie, makeAuthClient } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const settings = getAuthSettings();
  if (request.method !== 'GET' || !settings || !hasAuthSessionCookie(request.cookies.getAll())) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const client = makeAuthClient(settings, {
    getAll: () => request.cookies.getAll(),
    setAll(changes) {
      for (const { name, value } of changes) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of changes) response.cookies.set(name, value, options);
    },
  });
  await client.auth.getClaims();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: '/sign-in' };
