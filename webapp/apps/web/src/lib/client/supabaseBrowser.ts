'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../shared/supabase';

export type KingSupabaseBrowserClient = SupabaseClient<Database>;

let browserClient: KingSupabaseBrowserClient | null = null;

export function getSupabaseBrowserClient(): KingSupabaseBrowserClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase browser env is not configured');
  }

  browserClient ??= createClient<Database>(url, anonKey);
  return browserClient;
}
