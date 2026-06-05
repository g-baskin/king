import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './env';
import type { Database } from '../shared/supabase';

export type KingSupabaseClient = SupabaseClient<Database>;

export function createSupabaseServerClient(): KingSupabaseClient | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;

  return createClient<Database>(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
