# Decision 0003: Database and object storage

Status: Accepted

## Context

King Desktop stores metadata as local JSON files and images under Electron `userData`. King Web needs durable multi-user metadata, browser-accessible image URLs, and public URLs for social publishing adapters such as Instagram and Pinterest.

## Recommendation

Use Supabase Postgres for metadata and Supabase Storage for image/video bytes in the first web version.

Preferred first production shape:

```text
Supabase Postgres database
Supabase Storage buckets
Signed URLs for private previews
Public asset URLs only for publish-ready assets that require public fetch access
```

## Metadata tables

- `images`
- `entities`
- `credentials`
- `creative_batches`
- `creative_variants`
- `platform_publish_jobs`
- `platform_publish_results`
- `performance_metrics`

## Image object requirements

- Store original generated asset.
- Store derivative thumbnails when useful.
- Record MIME type, byte size, dimensions, aspect ratio, source prompt, and workspace ID.
- Prefer private objects by default.
- Generate short-lived signed URLs for private display.
- Generate public URLs only when platform publishing requires `https://` fetchable media.

## Selected stack

Supabase Postgres + Supabase Storage is selected for the first web version because it pairs naturally with Supabase Auth, reduces integration surface, and gives the fastest path to authenticated image metadata plus object storage.

## Alternatives considered

- Neon Postgres + Cloudflare R2: strong control and pricing, but requires more integration work.
- AWS RDS/S3: enterprise-friendly, but too much setup for the first vertical slice.

## Security requirements

- Never trust object keys from the browser without workspace ownership checks.
- Validate MIME type and size server-side.
- Do not fetch arbitrary private URLs server-side.
- Use signed URL expirations for private media.
- Store platform credentials encrypted at rest.
