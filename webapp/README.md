# King Web App

This folder is the migration workspace for turning King's Electron app into a hosted web app.

Start with `MIGRATION_PLAN.md`. The first implementation milestone is to make the existing React renderer depend on a portable `KingApi` adapter instead of calling Electron's `window.api` directly. The Electron implementation lives in the current renderer at `src/renderer/src/lib/kingApi.ts`; a future web implementation should provide the same interface over HTTP.

## Current status

- Migration plan exists in `webapp/MIGRATION_PLAN.md`.
- Next.js was selected in `docs/decisions/0001-web-stack.md`.
- A minimal web app scaffold exists in `webapp/apps/web`.
- The scaffold includes a browser shell page, `/images`, `/api/health`, `/api/images`, an image repository seam, and a `WebKingApi` fetch client.

## Run locally

```bash
cd webapp
npm install
npm run dev:web
```

## Next implementation steps

1. Select auth, database, and object storage providers from the proposed decision docs.
2. Replace `PlaceholderImagesRepository` with authenticated database/object-storage backing.
3. Add auth/workspace ownership before any real user data or platform credentials move server-side.
4. Continue implementing `WebKingApi` methods over authenticated HTTP routes.
