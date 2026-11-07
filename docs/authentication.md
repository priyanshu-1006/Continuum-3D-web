# Festival sign-in setup

The Gatehouse at `/sign-in` supports Google and a six-digit email code using Supabase Auth. The castle, event pages, and other festival pages are public. Sign-in has an unavailable state until the provider is configured.

## Configure Supabase

1. Open your Supabase project. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` to the project URL and `SUPABASE_PUBLISHABLE_KEY` to its `sb_publishable_` key. Set the same environment variables in your production host. The app uses the publishable key for attendee authentication. Keep the service role key and Google OAuth client secret out of the repository and the app environment.
2. Set `CONTINUUM_AUTH_ORIGIN` to your exact browser origin. The fallback is `NEXT_PUBLIC_SITE_URL` or `http://127.0.0.1:3000`. Use HTTPS on the public site. In **Authentication → URL Configuration**, set the Site URL and allow the corresponding app callback, for example `https://continuum.example/auth/callback`. For local testing allow `http://127.0.0.1:3000/auth/callback` and open the app at that origin so the PKCE cookie follows the redirect.
3. Create a Google OAuth web application and enter the Supabase callback shown in the Google provider settings, usually `https://<project-ref>.supabase.co/auth/v1/callback`, as a Google **Authorized redirect URI**. Add the festival origin under **Authorized JavaScript origins**. Paste the Google client ID and secret into Supabase **Authentication → Sign In / Providers → Google** and enable it. When Google is in testing mode, sign in with an approved test account. [Supabase Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
4. Enable the Email provider and keep the email OTP length at six digits. In **Authentication → Email Templates**, use the code variable `{{ .Token }}` in the Magic Link / OTP template. If your project sends a Confirm Sign Up email for first-time users, include the same code variable there. For example:

   ```html
   <h2>Your CONTINUUM sign-in code</h2>
   <p>Enter this code in the Gatehouse: <strong>{{ .Token }}</strong></p>
   ```

   Set up custom SMTP with a verified sender for delivery to attendees. Supabase’s built-in service is limited to project-team addresses. [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless) · [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
5. Restart the app after changing environment variables. From `/sign-in`, try Google, verify the account screen, and sign out. Then use an email inbox you control to request a code, verify it, refresh the page, and sign out. For public use, set the provider’s rate limits to match expected attendance.

OAuth uses a PKCE exchange at `/auth/callback`. Supabase sessions are kept in HTTP-only cookies and checked on the server. The session refresh proxy runs only for the sign-in page. Both methods accept an optional local destination such as `/sign-in?next=%2Fteam`. Unsupported destinations return to the account screen.
