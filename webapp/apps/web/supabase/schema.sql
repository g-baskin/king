-- King Web initial Supabase schema draft.
-- Apply manually in Supabase SQL editor or convert to a managed migration later.

create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  storage_key text not null,
  public_url text,
  thumbnail_url text,
  prompt text not null,
  aspect_ratio text not null,
  width integer,
  height integer,
  mime_type text,
  filename text not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.images enable row level security;

create policy "authenticated users can create workspaces"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "creators can read their workspaces"
  on public.workspaces for select
  using (created_by = auth.uid());

create policy "members can read their workspaces"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id and wm.user_id = auth.uid()
    )
  );

create policy "users can read their own memberships"
  on public.workspace_members for select
  using (user_id = auth.uid());

create policy "workspace creators can add their owner membership"
  on public.workspace_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.created_by = auth.uid()
    )
  );

create policy "members can read workspace images"
  on public.images for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = images.workspace_id and wm.user_id = auth.uid()
    )
  );

create index if not exists images_workspace_created_idx
  on public.images (workspace_id, created_at desc);
