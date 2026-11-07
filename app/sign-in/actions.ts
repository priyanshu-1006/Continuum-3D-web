'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthClient, getAuthSettings, safeAuthDestination } from '@/lib/auth';

export type EmailSignInState = {
  stage: 'email' | 'code';
  email: string;
  error?: string;
  notice?: string;
};

const unavailable = 'Sign-in is currently unavailable. You can still explore the castle and events.';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function startGoogle(form: FormData) {
  const settings = getAuthSettings();
  if (!settings) redirect('/sign-in?error=unavailable');
  const origin = (await headers()).get('origin');
  if (origin && origin !== settings.siteOrigin) redirect('/sign-in?error=origin');

  const callback = new URL('/auth/callback', settings.siteOrigin);
  callback.searchParams.set('next', safeAuthDestination(form.get('next')));
  const client = await getAuthClient(settings, true);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.href, skipBrowserRedirect: true },
  });
  if (error || !data.url) redirect('/sign-in?error=google');
  redirect(data.url);
}

export async function emailSignIn(previous: EmailSignInState, form: FormData): Promise<EmailSignInState> {
  const stage = previous?.stage === 'code' ? 'code' : 'email';
  const intent = form.get('intent');
  if (intent === 'change') return { stage: 'email', email: '' };

  const input = form.get('email');
  const email = typeof input === 'string' ? input.trim() : '';
  if (email.length > 254 || !emailPattern.test(email)) {
    return { stage: 'email', email: email.slice(0, 254), error: 'Enter a valid email address.' };
  }
  const settings = getAuthSettings();
  if (!settings) return { stage, email, error: unavailable };

  const client = await getAuthClient(settings, true);
  if (intent === 'verify') {
    const inputCode = form.get('code');
    const token = typeof inputCode === 'string' ? inputCode.trim() : '';
    if (!/^\d{6}$/.test(token)) {
      return { stage: 'code', email, error: 'Enter the six-digit code from your email.' };
    }
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
    if (error || !data.session) {
      return {
        stage: 'code',
        email,
        error: error?.status === 429
          ? 'Too many attempts. Wait a moment and try again.'
          : 'We couldn’t verify that code. Check it or request a new one.',
      };
    }
    redirect(safeAuthDestination(form.get('next')));
  }

  const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) {
    return {
      stage,
      email,
      error: error.status === 429
        ? 'Please wait a minute before requesting another code.'
        : 'We couldn’t send a code right now. Try again shortly or continue with Google.',
    };
  }
  return {
    stage: 'code',
    email,
    notice: stage === 'code' ? 'A new code was requested. Use the most recent email.' : 'Check your inbox for a one-time code.',
  };
}

export async function signOut() {
  const settings = getAuthSettings();
  if (settings) {
    const client = await getAuthClient(settings, true);
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) redirect('/sign-in?error=sign-out');
  }
  redirect('/sign-in');
}
