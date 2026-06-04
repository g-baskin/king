# Bullet-Proof Report — King

Date: 4 June 2026

Threat model: King is a local-first Electron desktop app used to manage image generation and commerce/ad integrations. Realistic attackers are: a compromised renderer dependency or renderer-context script trying to abuse privileged main-process IPC; a local automation/coding-agent process with access to King’s intended loopback Agent API token; malicious or compromised third-party package/release infrastructure; and local malware/same-user processes targeting stored API/OAuth tokens. The most valuable assets are ad/ecommerce OAuth tokens, model/API keys, generated product imagery/prompts, and release/signing credentials.

## Exposure Surface Summary

King’s main exposure is not a public internet server; it is a privileged Electron main process reachable from a broad preload API, plus a bearer-token loopback HTTP Agent API on `127.0.0.1`. Untrusted or semi-trusted data enters through renderer IPC arguments, local automation HTTP JSON/query inputs, OAuth callback query params, custom `local-file://` URLs, local JSON stores, and third-party API responses. The riskiest sinks are unrestricted main-process `fetch()` calls, local file reads/writes, credential decrypt/read paths, `shell.openExternal`, OAuth flows, and CI/electron-builder release publishing.

## Sources / Sinks / Assets

### Stack / Deploy

| Area | Details |
|---|---|
| Primary stack | TypeScript, Electron, React 19, Tailwind CSS v4, electron-vite |
| Runtime | Node 22; Electron main/preload/renderer |
| Deploy target | Native macOS/Windows desktop app |
| Shipping | `electron-builder` artifacts published to GitHub Releases |
| Network topology | Single-user local desktop; main process calls third-party APIs; loopback Agent API on `127.0.0.1` ephemeral port |
| Key files | `package.json`, `.github/workflows/verify.yml`, `.github/workflows/release.yml`, `src/main/index.ts`, `src/preload/index.ts` |

### Sources

| Source | Location | Input shape | Controller |
|---|---:|---|---|
| Preload bridge | `src/preload/index.ts:229` | `window.api.*` methods wrapping IPC | Renderer / app web content |
| IPC sender validation | `src/main/ipc/validateSender.ts:48-88` | `event.senderFrame.url`, IPC args | Renderer |
| File download IPC | `src/main/ipc/files.ts:8-43` | `url`, `filename` | Renderer |
| Image/video generation IPC | `src/main/ipc/generate.ts:223-349` | prompts, settings, image URLs | Renderer |
| API key IPC | `src/main/ipc/apiKeys.ts:5-16` | service/key strings | Renderer / local user |
| Entity/ad upload IPC | `src/main/ipc/entities.ts`, `src/main/ipc/adReferences.ts` | metadata + `ArrayBuffer` files | Renderer / local user |
| Marketplace/ad IPC | `src/main/ipc/*Ads.ts`, `shopify.ts`, `amazon.ts`, `shopee.ts`, `tiktokShop.ts` | credentials, IDs, campaign/product data | Renderer / local user |
| Custom protocol | `src/main/index.ts:104-131` | `local-file://...` URL | Renderer / stored data |
| Agent API | `src/main/services/agentApiServer.ts:169-300` | HTTP route/query/body JSON + bearer token | Local process / automation |
| OAuth callback | `src/main/services/oauthBroker.ts:95-162` | `code`, `state`, `error` query params | Browser/OAuth provider |
| Local JSON stores | `src/main/services/atomicJson.ts:51-58` | persisted JSON under `userData` | App / local user |
| Third-party API JSON | `src/main/services/*Client.ts` | API response text parsed as JSON | External services |

### Sinks

| Sink type | Location | Operation |
|---|---:|---|
| Main-process network fetch | `src/main/ipc/files.ts:33` | Fetch renderer-supplied download URL |
| Main-process network fetch | `src/main/services/agentApiServer.ts:132` | Fetch Agent API `imageUrl` |
| Network egress | `src/main/services/*Client.ts` | Calls Facebook, Google, Shopify, Amazon, Shopee, TikTok, Telegram, Storefront Bridge |
| Local file protocol read | `src/main/index.ts:104-131` | Serve resolved local image files |
| File read | `src/main/ipc/files.ts:26-31`, `src/main/ipc/generate.ts:59` | Read resolved `local-file://` paths |
| File write | `src/main/ipc/files.ts:40` | Write downloaded/read bytes to user-selected path |
| File write/delete | `src/main/services/entityStore.ts`, `adReferenceStore.ts`, `fileManager.ts` | Store/delete local images |
| Auth decision | `src/main/ipc/validateSender.ts:48-88` | IPC trust gate |
| Auth decision | `src/main/services/agentApiServer.ts:95-108`, `185-188` | Loopback + bearer token gate |
| Secret decrypt/read | `src/main/services/apiKeyStore.ts:55-66`, `106-114` | Electron `safeStorage` decrypt |
| Secret env mirror | `src/main/services/apiKeyStore.ts:138-163` | Copies selected API keys into `process.env` |
| JSON deserialization | `src/main/services/atomicJson.ts:54`, `credentialStore.ts:30`, API clients | `JSON.parse(...)` |
| External browser open | `src/main/index.ts:85-88`, `src/main/ipc/index.ts:127-132`, `oauthBroker.ts:191` | `shell.openExternal(...)` |
| Dynamic import | `src/main/ipc/generate.ts:233`, `324` | `import('@fal-ai/client')` |

### Assets

| Asset | Location |
|---|---:|
| API key store | `src/main/services/apiKeyStore.ts:33-35` → `<userData>/data/api-keys.json` |
| API key encrypted payloads | `src/main/services/apiKeyStore.ts:7-17`, `130-135` |
| OAuth credential blobs | `src/main/services/credentialStore.ts:41-60` |
| Facebook credentials | `src/main/services/facebookCredentials.ts:10-22` |
| Google Ads credentials | `src/main/services/googleAdsCredentials.ts:3-17` |
| Amazon credentials | `src/main/services/amazonCredentials.ts:5-17` |
| Shopify credentials | `src/main/services/shopifyCredentials.ts:4-13` |
| Shopee/TikTok/Telegram/Storefront credentials | respective `*Credentials.ts` files |
| Agent API token file | `src/main/services/agentApiServer.ts:39-50`, `330-340` → `<userData>/agent-api.json` |
| Generated image metadata | `src/main/services/imageStore.ts`, `<userData>/data/images.json` |
| Generated image files | `src/main/services/paths.ts:20-25` → `<userData>/data/images/` |
| Entity/product metadata and images | `src/main/services/entityStore.ts`, `paths.ts:42-50` |
| Ad reference metadata/images | `src/main/services/adReferenceStore.ts`, `paths.ts:32-40` |
| CI release/signing secrets | `.github/workflows/release.yml:40-58` |
| GitHub Release publish config | `package.json:184-187` |

## Risk Matrix

| Severity | Count | Definition |
|---|---:|---|
| Critical | 0 | RCE, full auth bypass, credential theft, fund loss |
| High | 1 | privilege escalation, data exposure with auth, supply-chain compromise |
| Medium | 1 | limited-scope info disclosure, weakened crypto, partial bypass |

## Findings

### [BP-001] Agent API allows authenticated arbitrary URL fetch from the user’s machine — High

- Location: `src/main/services/agentApiServer.ts:120-137`, route at `src/main/services/agentApiServer.ts:230-285`
- Category: SSRF / confused deputy   CWE: CWE-918   Confidence: 0.90
- Exposure surface: Authenticated local loopback Agent API, `POST /v1/facebook-ads/ads`
- Source → Sink: HTTP JSON body `imageUrl` → `readJsonBody<CreateAdBody>()` → `fetchImageBytes()` → `fetch(input.imageUrl)` → Facebook image upload path
- Vulnerability scenario:
  1. King starts a loopback Agent API and writes `{ port, token, baseUrl }` to `<userData>/agent-api.json` for local automation.
  2. A local automation process, compromised agent/plugin, or same-user process reads that intended token and sends an authenticated `POST /v1/facebook-ads/ads` with `imageUrl` set to `http://127.0.0.1:<local-service>/...`, a private LAN URL, or a metadata/link-local URL.
  3. The Electron main process performs `fetch(input.imageUrl)` with no scheme, host, IP-range, redirect, size, or content-type restrictions.
  4. If the response succeeds, the bytes are buffered and passed into the Facebook Ads upload flow; errors also expose status-code differences for probing.
- Impact: A bearer-token-authenticated local caller can make King fetch arbitrary URLs from the user’s host/network context and potentially forward response bytes to Facebook as uploaded ad media. This can expose loopback services, private LAN resources, or metadata endpoints reachable from the machine. This is not remote unauthenticated SSRF; the blast radius is local automation/same-user contexts with the Agent API token.
- Fix: Prefer removing remote URL fetching from this Agent API and requiring `imageBase64`. If URL fetch is required, allow only `https:`, block loopback/link-local/RFC1918/private/multicast/metadata ranges after DNS resolution, disallow or re-validate redirects, enforce `image/*` content type and size limits, and return generic download errors without status probing detail.

### [BP-002] File download IPC lets trusted renderer trigger unrestricted main-process URL fetch — Medium

- Location: `src/main/ipc/files.ts:8-43`
- Category: SSRF / local network request primitive   CWE: CWE-918   Confidence: 0.85
- Exposure surface: Renderer/preload IPC `window.api.files.download(url, filename)`
- Source → Sink: Renderer-controlled `url` → `secureHandle('files:download', ...)` → `fetch(url)` → `writeFileSync(userSelectedPath, buffer)`
- Vulnerability scenario:
  1. An attacker gains JavaScript execution in King’s trusted renderer context, for example through a compromised renderer dependency or future renderer injection bug.
  2. The attacker calls `window.api.files.download('http://127.0.0.1:3000/internal/export', 'export.png')`.
  3. The main process accepts the IPC because the sender is the legitimate app renderer, shows a save dialog, and if the user accepts, fetches the attacker-chosen URL from the user’s machine.
  4. The response body is written to the user-selected file.
- Impact: This gives a renderer-context attacker a main-process network fetch primitive against loopback/LAN/internal resources. The save dialog and need for renderer execution reduce severity and prevent fully silent exfiltration, but the privileged fetch is still performed with no scheme/host/IP restrictions.
- Fix: Restrict downloads to `local-file://` URLs resolved by `resolveLocalFileUrl` and exact known generated-media CDN hosts. If arbitrary downloads are a product requirement, validate URL protocol, block private/link-local/loopback ranges after DNS resolution, disallow or re-validate redirects, require expected media content types, and cap response size.

## What was not flagged

Injection, AuthN/AuthZ, Secrets exposure, Supply Chain, CI/CD, Crypto/OAuth, Agent-specific prompt/tool injection, and general dangerous-sink taint audits returned no additional high-confidence findings. One candidate path traversal/arbitrary deletion issue in entity `referenceImages` was dropped by the false-positive filter because the actual deletion code takes only the last slash-delimited segment and does not decode `%2f`, so the claimed traversal does not survive to the filesystem sink. CI hardening gaps such as SHA-pinning GitHub Actions and using `npm ci` for release were noted but not reported because no repo-reachable exploit path met the confidence bar.
