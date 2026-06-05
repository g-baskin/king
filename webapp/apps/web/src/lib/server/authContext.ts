import { createSupabaseServerClient } from './supabaseServer';

export class WebAuthError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = 'WebAuthError';
    this.status = status;
  }
}

export interface WorkspaceContext {
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
}

interface WorkspaceMembershipRow {
  workspace_id: string;
  role: 'owner' | 'admin' | 'member';
}

export async function requireWorkspaceContext(
  requestedWorkspaceId?: string,
): Promise<WorkspaceContext> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new WebAuthError(401, 'Supabase is not configured');
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new WebAuthError(401, 'Sign in required');
  }

  let query = supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (requestedWorkspaceId) query = query.eq('workspace_id', requestedWorkspaceId);

  const { data, error } = await query;
  if (error) {
    throw new WebAuthError(403, `Workspace lookup failed: ${error.message}`);
  }

  const membership = (data as WorkspaceMembershipRow[] | null)?.[0];
  if (!membership) {
    throw new WebAuthError(403, 'Workspace access required');
  }

  return {
    userId: user.id,
    workspaceId: membership.workspace_id,
    role: membership.role,
  };
}
