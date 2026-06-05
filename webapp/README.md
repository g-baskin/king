# King Web App

This folder is the migration workspace for turning King's Electron app into a hosted web app.

Start with `MIGRATION_PLAN.md`. The first implementation milestone is to make the existing React renderer depend on a portable `KingApi` adapter instead of calling Electron's `window.api` directly. The Electron implementation lives in the current renderer at `src/renderer/src/lib/kingApi.ts`; a future web implementation should provide the same interface over HTTP.

## Current status

- Migration plan exists in `webapp/MIGRATION_PLAN.md`.
- Renderer calls are being moved behind a `KingApi` adapter.
- No separate web package has been initialized yet; this avoids introducing unchosen framework/dependency decisions before the architecture decisions are made.

## Next implementation steps

1. Choose web stack in `docs/decisions/0001-web-stack.md`.
2. Scaffold `webapp/apps/web` after the stack decision.
3. Move shared domain types/schemas into a package or shared folder.
4. Implement `WebKingApi` over authenticated HTTP routes.
