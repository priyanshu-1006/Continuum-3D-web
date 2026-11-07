import { NextResponse } from 'next/server';
import { getAuthClient, getAuthSettings, safeAuthDestination } from '@/lib/auth';

export async function GET(request: Request) {
  const settings = getAuthSettings();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  let destination = '/sign-in?error=google';

  if (settings && code) {
    const client = await getAuthClient(settings, true);
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.session) destination = safeAuthDestination(url.searchParams.get('next'));
  }

  const response = NextResponse.redirect(new URL(destination, settings?.siteOrigin ?? url.origin));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
