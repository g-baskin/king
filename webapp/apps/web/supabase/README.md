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
- row-level security enabled for all three tables
- read policies scoped by workspace membership

The schema includes bootstrap insert policies so an authenticated user can create their first workspace and owner membership from `/api/workspaces/bootstrap`.

Storage buckets, signed URL generation, and credential tables are intentionally deferred until image upload flows are wired.
