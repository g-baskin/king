export interface SupabasePublicEnv {
  url: string;
  publishableKey: string;
}

function readNonEmptyEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = readNonEmptyEnv('NEXT_PUBLIC_SUPABASE_URL');
  const publishableKey =
    readNonEmptyEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ??
    readNonEmptyEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
