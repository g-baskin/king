export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

function readNonEmptyEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = readNonEmptyEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = readNonEmptyEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anonKey) return null;
  return { url, anonKey };
}
