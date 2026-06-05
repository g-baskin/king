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

Write policies, storage buckets, signed URL generation, and credential tables are intentionally deferred until auth/workspace flows are wired.
