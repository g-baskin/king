# King Web

Minimal Next.js scaffold for the hosted King migration.

## Run locally

From the repository root:

```bash
cd webapp
npm install
npm run dev:web
```

Then open `http://localhost:3000`.

## Current scope

- Browser shell page at `/`.
- Placeholder image gallery at `/images`.
- Health route at `/api/health`.
- Placeholder image-list route at `/api/images`.
- Image repository seam in `src/lib/server/imagesRepository.ts`.
- Supabase client/env skeleton with placeholder fallback only when env vars are absent.
- Workspace-scoped image reads when Supabase is configured.
- Web API fetch client scaffold in `src/lib/api/webKingApi.ts`.
- No production auth UI, object storage uploads, or platform publishing yet.

## Supabase

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY` to activate `SupabaseImagesRepository`. Without those env vars, the app keeps using placeholder images.

## Current auth behavior

When Supabase env vars are absent, `/images` and `/api/images` use placeholder images. When Supabase env vars are present, image reads require a signed-in Supabase user with a `workspace_members` row.

`/login` is currently a setup placeholder; the actual sign-in form/OAuth flow is the next slice.

## Next slice

Add the real Supabase sign-in flow and workspace bootstrap action.
