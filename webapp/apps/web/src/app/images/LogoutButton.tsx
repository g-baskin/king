'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/client/supabaseBrowser';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout(): Promise<void> {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      disabled={pending}
      onClick={() => {
        void handleLogout();
      }}
      type="button"
      style={{
        alignSelf: 'start',
        border: '1px solid rgba(89, 55, 38, 0.22)',
        borderRadius: 999,
        background: 'rgba(255, 252, 244, 0.86)',
        color: '#3c2a20',
        cursor: 'pointer',
        font: 'inherit',
        fontWeight: 800,
        padding: '10px 14px',
      }}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
