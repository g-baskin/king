# Decision 0001: Web stack

Status: Proposed

## Context

King is currently an Electron + React app. The renderer can become the browser UI, while Electron main-process services need to become server-only API routes, background workers, database access, object storage, and encrypted credential handling.

## Recommendation

Use a single Next.js app for the first web version:

```text
webapp/apps/web
  app/       # browser pages and layouts
  app/api/   # backend API routes
  lib/client # browser-safe KingApi implementation
  lib/server # server-only platform clients and credential handling
  lib/shared # shared schemas/types
```

## Why

- Fastest path to browser UI + backend routes in one deployable unit.
- Keeps platform API tokens server-side.
- Supports OAuth callback routes cleanly.
- Can be split into separate packages/services later if scale demands it.

## Alternatives

- Vite SPA + separate API server: cleaner separation, but more setup and deployment surface.
- Keep Electron only: preserves local-first behavior, but does not solve hosted collaboration, public asset URLs, or web publishing workflows.

## Follow-up decisions

- Database provider
- Object storage provider
- Auth provider
- Queue/background job provider
- Secret encryption strategy
