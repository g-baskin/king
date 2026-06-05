# King Web App Migration Plan

## Goal

Move King from a local-first Electron desktop app to a browser-based web app without losing the existing React UI, creative workflows, platform integrations, or local-first desktop option.

The migration should treat the current Electron app as two separable pieces:

```text
Current Electron app
  React renderer UI
  → preload window.api
  → Electron IPC
  → main-process services
```

Target web app:

```text
Web app
  Browser React UI
  → HTTP API / server actions
  → backend services
  → database + object storage + queue workers
```

## Recommended Target Architecture

```text
webapp/
  MIGRATION_PLAN.md
  apps/
    web/                  # Browser app, likely Next.js or Vite React
    worker/               # Optional background jobs for generation/publishing
  packages/
    core/                 # Shared domain types, validators, platform specs, prompts
    api-client/           # Browser-safe API client replacing window.api
    platform-clients/     # Server-only Meta/Google/Shopify/etc clients
    ui/                   # Optional shared UI components
  docs/
    decisions/            # Architecture decisions and migration notes
```

For the fastest first web version, use a single Next.js app first, then split packages later if needed:

```text
webapp/apps/web/
  app/                    # Pages/routes
  app/api/                # Backend API routes
  lib/client/             # Browser API client
  lib/server/             # Server-only migrated services
  lib/shared/             # Shared schemas/types
```

## Migration Principles

1. Do not expose platform API tokens to the browser.
2. Replace `window.api` with a typed API adapter before rewriting UI flows.
3. Move Electron main-process service logic to server-only backend modules.
4. Replace local JSON/files with database + object storage.
5. Add auth and workspace ownership checks before any hosted deployment.
6. Keep Electron and web code sharing domain logic where possible.
7. Do not migrate every feature at once; ship vertical slices.

## Current Electron-to-Web Mapping

| Current Electron piece | Web replacement |
|---|---|
| React renderer | Browser React app |
| `window.api.*` preload bridge | typed `KingApi` HTTP client |
| `ipcMain.handle(...)` handlers | API routes / server actions |
| `src/main/services/*Client.ts` | server-only platform clients |
| `api-keys.json` + Electron `safeStorage` | encrypted credentials table / KMS-backed secret storage |
| `<userData>/data/*.json` stores | database tables |
| `<userData>/data/images/*` files | S3/R2/Supabase object storage |
| `local-file://...` | signed HTTPS asset URLs |
| Electron save dialog | browser download endpoint/link |
| Electron updater | web deployment pipeline |
| loopback OAuth callback | hosted `/api/oauth/:service/callback` route |
| Agent API on `127.0.0.1` | authenticated backend API / job API |

## Proposed Data Model

Initial tables/entities:

- `users`
- `workspaces`
- `workspace_members`
- `credentials`
  - `id`
  - `workspace_id`
  - `service`
  - `encrypted_payload`
  - `created_at`
  - `updated_at`
- `images`
  - `id`
  - `workspace_id`
  - `storage_key`
  - `public_url` / `signed_url` metadata
  - `prompt`
  - `aspect_ratio`
  - `width`
  - `height`
  - `mime_type`
  - `source`
  - `created_at`
- `entities`
  - product/character/reference records currently stored through `entityStore.ts`
- `creative_batches`
- `creative_variants`
- `platform_publish_jobs`
- `platform_publish_results`
- `performance_metrics`

## API Adapter Strategy

Create a shared interface that represents the app capabilities currently exposed by `window.api`.

Example:

```ts
export interface KingApi {
  listImages(input: ListImagesInput): Promise<ListImagesResult>;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  downloadImage(input: DownloadImageInput): Promise<DownloadImageResult>;
  listCredentials(): Promise<CredentialSummary[]>;
  setCredential(input: SetCredentialInput): Promise<void>;
  createFacebookAd(input: CreateFacebookAdInput): Promise<CreateFacebookAdResult>;
}
```

Then maintain two implementations during migration:

```text
ElectronKingApi → calls window.api.*
WebKingApi      → calls fetch('/api/...')
```

This lets the existing React UI migrate gradually.

## Feature Migration Order

### Phase 0 — Scaffold `webapp/`

- Keep this migration plan in `webapp/MIGRATION_PLAN.md`.
- Decide stack: Next.js is recommended if the web app needs API routes and frontend in one deployable unit.
- Add architecture decision records under `webapp/docs/decisions/` before major choices.

### Phase 1 — Extract shared core

Move or copy platform-independent code into shared modules:

- prompt constants from `src/renderer/src/lib/prompts.ts`
- platform specs / creative specs
- product/entity types
- creative batch types
- validation schemas
- safe naming helpers
- aspect-ratio helpers

Do not move Electron-specific code yet.

### Phase 2 — Create the API adapter

- Add `KingApi` interface.
- Wrap existing `window.api` calls behind `ElectronKingApi`.
- Update renderer pages/components to depend on the adapter instead of directly calling `window.api`.
- This is the bridge that makes the UI portable.

### Phase 3 — Web auth and workspace model

Before any server-side platform integrations:

- Add user auth.
- Add workspace membership.
- Add ownership checks to every API route.
- Define credential ownership by workspace.

Recommended options:

- Better Auth
- Auth.js
- Supabase Auth
- Clerk, if speed matters more than full control

### Phase 4 — Images and object storage

Replace local image storage:

```text
Current: local-file:// + <userData>/data/images
Web: object storage key + signed/public HTTPS URL
```

Implement:

- upload generated image bytes to object storage
- store metadata in database
- return signed or public URLs to frontend
- support public URLs for Instagram/Pinterest publishing when needed

Recommended storage:

- Cloudflare R2
- AWS S3
- Supabase Storage

### Phase 5 — Migrate image generation

Move generation logic from:

- `src/main/ipc/generate.ts`

Into server-side route/job flow:

```text
POST /api/generate/image
  → validate input
  → create generation job
  → worker calls fal.ai
  → upload result to object storage
  → write image metadata
  → return job/image result
```

Use a queue for large batches.

Recommended queues:

- Inngest
- Trigger.dev
- BullMQ + Redis
- Postgres job table for simple v1

### Phase 6 — Migrate credentials and OAuth

Move credential storage from:

- `src/main/services/apiKeyStore.ts`
- `src/main/services/credentialStore.ts`
- `src/main/services/*Credentials.ts`

To:

```text
credentials table
  workspace_id
  service
  encrypted_payload
```

Move OAuth callback handling from loopback server:

- `src/main/services/oauthBroker.ts`

To hosted routes:

```text
GET /api/oauth/:service/start
GET /api/oauth/:service/callback
```

Every callback must verify state and workspace ownership.

### Phase 7 — Migrate platform clients

Move server-safe platform clients from `src/main/services/*Client.ts` into web server modules:

- `facebookAdsClient.ts`
- `googleAdsClient.ts`
- `shopifyClient.ts`
- `amazonClient.ts`
- `shopeeClient.ts`
- `tiktokShopClient.ts`
- `telegramClient.ts`
- `storefrontBridgeClient.ts`

Keep these server-only. Never import them into browser bundles.

### Phase 8 — Social publishing pipeline

Build on the social publishing task:

```text
King Image
  → object storage public/signed URL
  → platform publish adapter
  → platform post/ad IDs stored in DB
```

Start with:

1. Meta/Facebook Ads, because King already has the flow.
2. Instagram organic publishing, because it needs public image URLs.
3. Telegram direct upload or URL mode.
4. Export/manual packages for platforms that need approval.

### Phase 9 — Creative batch and review workflows

Migrate/add:

- Creative Batch Factory
- Platform Spec Packs
- Marketer Brief Builder
- Creative Concept Library
- Bulk Export Packaging
- Creative QA Scoring
- Creative Review Board
- Performance Analytics Loop

These should use shared domain packages so Electron and web can share logic.

### Phase 10 — Deployment and release

Recommended deployment options:

#### Simple hosted stack

- Next.js on Vercel/Railway/Fly.io
- Postgres on Neon/Supabase
- Object storage on Cloudflare R2/S3
- Queue on Inngest/Trigger.dev

#### More controlled stack

- Dockerized Next.js/API service
- Postgres
- Redis/BullMQ
- S3/R2
- GitHub Actions deploy

## Security Requirements for Web

The web app cannot use the Electron trust model. Add these before production:

- Server-side auth on every route.
- Workspace ownership checks on every object ID.
- Encrypted credentials at rest.
- No platform tokens in browser responses.
- CSRF protection if using cookie sessions.
- Rate limits on generation, publishing, OAuth, and credential routes.
- Audit logs for publishing and credential changes.
- Signed URL expiry for private images.
- SSRF protections for any backend URL fetch.
- File MIME/size validation before upload/publish.
- Background job idempotency keys.

## First Vertical Slice

Recommended first working web slice:

1. Next.js web scaffold.
2. Auth + workspace.
3. Image list page backed by database.
4. Object storage upload/read for images.
5. Generate one image via server route/job.
6. Display generated image in browser.
7. Publish one image as a paused Meta ad.

This proves the entire web architecture:

```text
Browser → backend API → external AI/platform APIs → object storage → database → browser
```

## Open Decisions

Document these in `webapp/docs/decisions/` before implementation:

1. Next.js vs separate Vite frontend + API server.
2. Database provider.
3. Object storage provider.
4. Auth provider.
5. Queue/background job provider.
6. Secret encryption strategy.
7. Whether Electron and web remain in one monorepo long term.
8. Whether desktop becomes a thin shell over the web app or remains local-first.

## Non-goals for the first web version

- Full parity with every Electron integration.
- Migrating auto-updater logic.
- Supporting offline/local-only mode.
- Publishing to every social platform.
- Multi-region deployment.
- Enterprise team permissions beyond basic workspace membership.

## Success Criteria

The migration is on track when:

- The React UI can call an abstract `KingApi` instead of `window.api` directly.
- Generated images are stored in object storage and listed from DB.
- Credentials are encrypted server-side and scoped to workspaces.
- At least one platform publish flow works end-to-end from the browser.
- Electron can continue using shared core logic without being broken.
