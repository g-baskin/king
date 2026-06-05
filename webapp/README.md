# King Web App

This folder is the migration workspace for turning King's Electron app into a hosted web app.

Start with `MIGRATION_PLAN.md`. The first implementation milestone is to make the existing React renderer depend on a portable `KingApi` adapter instead of calling Electron's `window.api` directly. The Electron implementation lives in the current renderer at `src/renderer/src/lib/kingApi.ts`; a future web implementation should provide the same interface over HTTP.

## Current status

- Migration plan exists in `webapp/MIGRATION_PLAN.md`.
- Next.js was selected in `docs/decisions/0001-web-stack.md`.
- A minimal web app scaffold exists in `webapp/apps/web`.
- The scaffold includes a browser shell page, `/images`, `/api/health`, `/api/images`, an image repository seam, Supabase skeleton, and a `WebKingApi` fetch client.

## Run locally

```bash
cd webapp
npm install
npm run dev:web
```

## Next implementation steps

1. Add protected-route polish and better auth error handling.
2. Replace placeholder fallback with authenticated Supabase image reads once auth is configured.
3. Add Supabase Storage upload/signed URL support for generated assets.
4. Continue implementing `WebKingApi` methods over authenticated HTTP routes.
