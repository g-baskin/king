import { createSupabaseServerClient } from '@/lib/server/supabaseServer';

interface WorkspaceMembershipRow {
  workspace_id: string;
  role: 'owner' | 'admin' | 'member';
}

function workspaceNameFromEmail(email?: string): string {
  if (!email) return 'My Workspace';
  const [name] = email.split('@');
  return `${name || 'My'} Workspace`;
}

export async function POST(): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: 'Sign in required' }, { status: 401 });
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (membershipError) {
    return Response.json({ error: membershipError.message }, { status: 500 });
  }

  const existing = (memberships as WorkspaceMembershipRow[] | null)?.[0];
  if (existing) {
    return Response.json({ workspaceId: existing.workspace_id, role: existing.role, created: false });
  }

  const workspaceId = crypto.randomUUID();
  const { error: workspaceError } = await supabase.from('workspaces').insert({
    id: workspaceId,
    name: workspaceNameFromEmail(user.email),
    created_by: user.id,
  });

  if (workspaceError) {
    return Response.json({ error: workspaceError.message }, { status: 500 });
  }

  const { error: ownerError } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: 'owner',
  });

  if (ownerError) {
    return Response.json({ error: ownerError.message }, { status: 500 });
  }

  return Response.json({ workspaceId, role: 'owner', created: true });
}
