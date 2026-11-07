import 'server-only';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { cookies } from 'next/headers';

const authCookie = 'continuum-auth';
const fallbackOrigin = 'http://127.0.0.1:3000';
const returnBase = 'https://continuum.invalid';
const sitePage = /^\/(?:about|team|sponsors|contact|events\/[a-z0-9-]+)?$/;

type AuthSettings = {
  supabaseUrl: string;
  publishableKey: string;
  siteOrigin: string;
};

function parseOrigin(value: string) {
  try {
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return null;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getAuthSettings(): AuthSettings | null {
  const supabaseUrl = parseOrigin(process.env.SUPABASE_URL?.trim() ?? '');
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const siteOrigin = parseOrigin(process.env.CONTINUUM_AUTH_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin);
  if (!supabaseUrl || !publishableKey?.startsWith('sb_publishable_') || !siteOrigin) return null;
  return { supabaseUrl, publishableKey, siteOrigin };
}

export function safeAuthDestination(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/sign-in';
  try {
    const url = new URL(value, returnBase);
    if (url.origin === returnBase && sitePage.test(url.pathname)) return url.pathname + url.search + url.hash;
  } catch {
    // Malformed destinations use the account screen.
  }
  return '/sign-in';
}

export function hasAuthSessionCookie(cookieList: { name: string }[]) {
  return cookieList.some(({ name }) => name === authCookie || name.startsWith(authCookie + '.'));
}

export function makeAuthClient(settings: AuthSettings, cookieMethods: CookieMethodsServer) {
  return createServerClient(settings.supabaseUrl, settings.publishableKey, {
    cookieOptions: {
      name: authCookie,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: settings.siteOrigin.startsWith('https:'),
    },
    cookies: cookieMethods,
  });
}

export async function getAuthClient(settings: AuthSettings, writable: boolean) {
  const cookieStore = await cookies();
  return makeAuthClient(settings, {
    getAll: () => cookieStore.getAll(),
    setAll(changes) {
      // The sign-in page reads cookies. Its scoped proxy handles token refresh.
      if (!writable) return;
      for (const { name, value, options } of changes) cookieStore.set(name, value, options);
    },
  });
}
