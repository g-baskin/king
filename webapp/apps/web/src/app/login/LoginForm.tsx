'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';

type AuthMode = 'sign-in' | 'sign-up';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function bootstrapWorkspace(): Promise<void> {
    const response = await fetch('/api/workspaces/bootstrap', { method: 'POST' });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Workspace bootstrap failed (${response.status})`);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const result =
        mode === 'sign-in'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) throw result.error;
      if (!result.data.session) {
        setMessage('Check your email to confirm the account before signing in.');
        return;
      }

      await bootstrapWorkspace();
      router.push('/images');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14, marginTop: 24 }}>
      <label style={{ display: 'grid', gap: 8, color: '#3c2a20', fontWeight: 700 }}>
        Email
        <input
          autoComplete="email"
          inputMode="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
          style={inputStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 8, color: '#3c2a20', fontWeight: 700 }}>
        Password
        <input
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          minLength={6}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
          style={inputStyle}
        />
      </label>
      <button disabled={pending} type="submit" style={buttonStyle}>
        {pending ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          setMessage(null);
        }}
        type="button"
        style={secondaryButtonStyle}
      >
        {mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
      </button>
      {message ? <p style={{ color: '#8c4d20', lineHeight: 1.5, margin: 0 }}>{message}</p> : null}
    </form>
  );
}

const inputStyle = {
  border: '1px solid rgba(89, 55, 38, 0.22)',
  borderRadius: 14,
  font: 'inherit',
  padding: '12px 14px',
} satisfies CSSProperties;

const buttonStyle = {
  border: '0',
  borderRadius: 999,
  background: '#241711',
  color: '#fff8e8',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  padding: '13px 18px',
} satisfies CSSProperties;

const secondaryButtonStyle = {
  ...buttonStyle,
  border: '1px solid rgba(89, 55, 38, 0.22)',
  background: 'transparent',
  color: '#3c2a20',
} satisfies CSSProperties;
