'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { emailSignIn, startGoogle, type EmailSignInState } from '@/app/sign-in/actions';
import styles from '@/app/sign-in/sign-in.module.css';

const initialState: EmailSignInState = { stage: 'email', email: '' };

function GoogleButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={styles.googleButton} type="submit" disabled={disabled || pending}>
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.23 5.48-4.71 7.18l7.74 6C44.49 38.05 46.98 31.91 46.98 24.55Z" />
        <path fill="#FBBC05" d="M10.53 28.59A14.37 14.37 0 0 1 9.75 24c0-1.59.28-3.13.77-4.59l-7.98-6.19A23.88 23.88 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19Z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.79l-7.74-6c-2.15 1.46-4.93 2.29-8.17 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.5 42.62 14.62 48 24 48Z" />
      </svg>
      {pending ? 'Opening Google…' : 'Continue with Google'}
    </button>
  );
}

export default function SignInMethods({ enabled, next }: { enabled: boolean; next: string }) {
  const [state, action, pending] = useActionState(emailSignIn, initialState);
  const codeInput = useRef<HTMLInputElement>(null);
  const awaitingCode = state.stage === 'code';

  useEffect(() => {
    if (awaitingCode) codeInput.current?.focus();
  }, [awaitingCode]);

  return (
    <div className={styles.methods}>
      <form action={startGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton disabled={!enabled} />
      </form>

      <p className={styles.divider}>or use email</p>

      <form action={action} aria-busy={pending}>
        <input type="hidden" name="next" value={next} />
        <fieldset className={styles.fieldset} disabled={!enabled || pending}>
          {awaitingCode ? (
            <>
              <input type="hidden" name="email" value={state.email} />
              <p className={styles.sentTo}>Enter the code for <strong>{state.email}</strong>.</p>
              <label htmlFor="sign-in-code">Verification code</label>
              <input
                id="sign-in-code"
                className={styles.codeInput}
                name="code"
                ref={codeInput}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                aria-invalid={Boolean(state.error)}
                aria-describedby="email-sign-in-status"
              />
              <button className={styles.primary} type="submit" name="intent" value="verify">Verify code</button>
              <div className={styles.codeOptions}>
                <button type="submit" name="intent" value="send" formNoValidate>Send a new code</button>
                <button type="submit" name="intent" value="change" formNoValidate>Change email</button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="sign-in-email">Email address</label>
              <input
                id="sign-in-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                defaultValue={state.email}
                maxLength={254}
                required
                aria-invalid={Boolean(state.error)}
                aria-describedby="email-sign-in-status"
              />
              <button className={styles.primary} type="submit" name="intent" value="send">Send one-time code</button>
            </>
          )}
        </fieldset>
        <p
          className={styles.status}
          id="email-sign-in-status"
          data-error={Boolean(state.error) && !pending}
          aria-live="polite"
        >
          {pending ? 'Working on your request…' : state.error ?? state.notice ?? ''}
        </p>
      </form>
    </div>
  );
}
