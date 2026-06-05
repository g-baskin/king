# Decision 0002: Auth and workspace tenancy

Status: Proposed

## Context

King Desktop is local-first and effectively single-user. King Web will hold generated assets, platform credentials, publish history, and performance data for multiple users and workspaces. The Electron trust model does not apply to a hosted web app.

## Recommendation

Add authenticated users and workspace-scoped access before moving any real image data, platform credentials, or publishing actions into the web backend.

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

## Candidate providers

- Better Auth: good control and framework fit.
- Auth.js: established Next.js integration.
- Supabase Auth: fastest if Supabase is selected for DB/storage.
- Clerk: fastest hosted UX, higher vendor coupling.

## Deferred decision

Pick the actual provider after database/storage selection so auth can align with the persistence layer.
