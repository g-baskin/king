'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../shared/supabase';

export type KingSupabaseBrowserClient = SupabaseClient<Database>;

let browserClient: KingSupabaseBrowserClient | null = null;

export function getSupabaseBrowserClient(): KingSupabaseBrowserClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error('Supabase browser env is not configured');
  }

  browserClient ??= createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}
