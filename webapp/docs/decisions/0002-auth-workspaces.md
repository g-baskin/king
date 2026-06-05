# Decision 0002: Auth and workspace tenancy

Status: Accepted

## Context

King Desktop is local-first and effectively single-user. King Web will hold generated assets, platform credentials, publish history, and performance data for multiple users and workspaces. The Electron trust model does not apply to a hosted web app.

## Recommendation

Use Supabase Auth for the first web version, paired with Supabase Postgres and Storage from Decision 0003. Add authenticated users and workspace-scoped access before moving any real image data, platform credentials, or publishing actions into the web backend.

Initial model:

```text
users
workspaces
workspace_members
credentials
images
creative_batches
platform_publish_jobs
```

Every route that reads or writes user data must resolve:

```text
session -> user -> workspace membership -> resource ownership
```

## Requirements

- No anonymous access to workspace data.
- Every resource row includes `workspaceId`.
- Every API route checks membership before accessing resource IDs.
- Platform credentials are scoped to workspace, not global user state.
- Credential mutation and platform publish actions should be audit logged.
- Browser responses must never include raw platform access tokens.

## Selected provider

Supabase Auth is selected for the first web version because it aligns with the selected Postgres and Storage provider, keeps setup fast, and supports row-level security policies tied to authenticated users.

## Alternatives considered

- Better Auth: more control, but more setup before the first vertical slice.
- Auth.js: established Next.js integration, but separate database/storage wiring still needed.
- Clerk: fast hosted UX, but higher vendor coupling and separate data/storage stack.
