# Project Inventory Report — Depth 5 Scan

## Summary
- **Root Project**: `king` (Electron + React desktop app for e-commerce)
- **Total Entries Scanned**: 6 folder levels within depth 5
- **GitHub Repository**: https://github.com/g-baskin/king.git (noted: also https://github.com/KenKaiii/king.git in git config)
- **Cloud Services Found**: None (Vercel, Supabase, Railway, Cloudflare not detected)

## Key Findings

### Project Markers
| Path | Has claude.md | Type | Notes |
|------|---------------|------|-------|
| . | ✓ | Root | TypeScript (Electron + React) |
| library/ | - | Documentation | Knowledge base, wiki, requirements |
| scripts/ | - | Utilities | Build/generation scripts |
| src/ | - | Source | Main/preload/renderer code |
| src/renderer/src/ | - | React Code | Components, pages, stores, hooks |
| tests/ | - | Tests | Vitest test suites |

### Directory Structure (Depth 5)
The scan discovered a well-organized monolithic Electron app with:
- **src/main/** — IPC handlers, services (Amazon, Facebook, Shopify clients, API key store)
- **src/preload/** — Electron preload script
- **src/renderer/** — React app (components, pages, hooks, stores)
- **library/** — Documentation (wiki with concepts, entities, decisions, Q&A)
- **scripts/** — Build helpers
- **tests/** — Unit tests organized by module
- **.cursor/skills/** — Cursor AI skill definitions (10+ skills)
- **.gg/** — GG Coder configuration (agents, skills, plans)
- **.legion/** — Legion queue/cache system

### Cloud Services & External Integrations
**Not Found:**
- Vercel (no vercel.json, no vercel deps in package.json)
- Supabase (no references in code/config)
- Railway (no references in code/config)
- Cloudflare (no references in code/config)

**Found:**
- GitHub: Primary repo https://github.com/g-baskin/king.git
- GitHub Actions: release.yml workflow in .github/workflows/
- Local dependencies: Shopify, Amazon, Facebook Ads, Google Ads, TikTok Shop APIs

## CSV Output
Generated: **project_inventory.csv** (7 rows including header)
Columns: path, has_claude_md, github_repo, vercel, supabase, railway, cloudflare, evidence_notes

## Notes
- No nested subprojects detected within depth 5
- Single monolithic Electron app structure
- Heavy use of Cursor AI skills (.cursor/skills/) and GG Coder configuration
- Desktop-native architecture (Electron) — explains absence of Vercel/serverless infra
