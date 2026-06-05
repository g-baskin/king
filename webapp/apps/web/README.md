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
- Supabase client/env skeleton with placeholder fallback when env vars are absent.
- Web API fetch client scaffold in `src/lib/api/webKingApi.ts`.
- No production auth UI, object storage uploads, or platform publishing yet.

## Supabase

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY` to activate `SupabaseImagesRepository`. Without those env vars, the app keeps using placeholder images.

## Next slice

Add auth session handling and workspace-scoped image reads before storing real user data.
