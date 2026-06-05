# Supabase setup

This folder contains the initial King Web schema draft.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The current app deliberately falls back to placeholder images when these values are absent.

## Schema

Apply `schema.sql` in the Supabase SQL editor or convert it into a managed migration once the project has a Supabase CLI workflow.

The first schema includes:

- `workspaces`
- `workspace_members`
- `images`
- private Supabase Storage bucket `images`
- row-level security enabled for workspace metadata tables
- read/create policies scoped by workspace membership

The schema includes bootstrap insert policies so an authenticated user can create their first workspace and owner membership from `/api/workspaces/bootstrap`.

Uploaded objects are stored under `<workspaceId>/<uuid>-<filename>` so storage policies can authorize access from workspace membership.

Credential tables are intentionally deferred until platform publishing flows are wired.
