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
- Web API fetch client scaffold in `src/lib/api/webKingApi.ts`.
- No production auth, database, object storage, or platform publishing yet.

## Next slice

Select providers and replace placeholder image data with authenticated database/object-storage backing.
