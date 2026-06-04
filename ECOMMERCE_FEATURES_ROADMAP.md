# Proposed Implementation Roadmap: E-Commerce Value-Add Features

**Status**: Proposed roadmap for features **not yet present** in the King codebase.

This document outlines a phased approach to adding six new value-add features to King's Electron + IPC + store architecture:

1. **Sales Velocity** — Real-time sales tracking & trend analysis
2. **Inventory Sync + Pricing Rules** — Automated inventory & price management across stores
3. **Email Swipe Library** — Campaign copy templates & suggestions
4. **Funnel/OTO Mapping** — One-Time-Offer & funnel flow visualization
5. **Benchmarking** — Performance metrics against industry cohorts
6. **Launch Optimizer** — Multi-channel launch coordination

---

## Architecture Overview

### Current King Stack
- **Frontend**: React 19 + Zustand stores (renderer process)
- **Backend**: Electron main process + IPC layer
- **Local Storage**: JSON files + localStorage (workspace, products, images, entities)
- **External APIs**: fal.ai (image generation), Shopify, Amazon, Shopee, Facebook Ads, Google Ads, TikTok Shop, Telegram
- **Credential Management**: OS keychain + credentialStore pattern
- **Patterns**: Secure IPC handlers, factory functions for API clients, per-platform credential stores

### Integration Points
- **IPC channels** register in `src/main/ipc/index.ts` and expose in `src/preload/index.ts`
- **Main-process services** handle auth, API calls, local file I/O (`src/main/services/`)
- **Zustand stores** manage renderer state and localStorage persistence
- **Workspace-scoped data** flows through workspaceId parameter in entity lists/operations

---

## Phase 1: Sales Velocity (Foundation)

**Goal**: Track sales from connected stores in real-time, show trends.

### Engineering Tasks

#### Main Process
- [ ] Create `src/main/services/salesVelocityStore.ts`
  - Poll sales metrics from Shopify/TikTok/Amazon APIs
  - Store sales snapshots on disk (time-bucketed JSON files: `sales-{yyyy-mm-dd}.json`)
  - Aggregate 24h / 7d / 30d totals and CAGR calculation
  - Implement exponential backoff for API polling (start 5min, cap 30min)

- [ ] Create `src/main/services/salesDataCache.ts`
  - In-memory cache of last poll timestamp + results per store
  - 5-minute staleness threshold before re-polling
  - Clear cache on app background → foreground (visibility change)

#### IPC Layer
- [ ] Add `src/main/ipc/salesVelocity.ts`
  - `registerSalesVelocityHandlers()`
  - Handler: `sales:status()` → `{ connected: boolean; lastUpdate: Date; storeCount: number }`
  - Handler: `sales:getTrends(period: '24h' | '7d' | '30d')` → `{ revenue: number; unitsSold: number; trend: 'up' | 'down' | 'flat'; growth: number }`
  - Handler: `sales:startPolling(intervalMs?: number)` → enables background polling (once at app launch)
  - Handler: `sales:stopPolling()` → cleanup
  - Register handlers in `src/main/ipc/index.ts`

#### Renderer
- [ ] Create `src/renderer/src/stores/salesVelocityStore.ts`
  - Zustand store: `{ trends: TrendData; lastUpdate: Date; isPolling: boolean; setTrends(data) }`
  - Hook to call `api.salesVelocity.getTrends()` on mount
  - Store trends + sync poll status

- [ ] Create `src/renderer/src/components/dashboard/SalesVelocityCard.tsx`
  - Display current revenue / units + trend arrow
  - Period selector (24h / 7d / 30d)
  - Last update timestamp

#### Preload Bridge
- [ ] Extend `src/preload/index.ts` with:
  ```typescript
  salesVelocity: {
    status: () => ipcRenderer.invoke('sales:status'),
    getTrends: (period: '24h' | '7d' | '30d') =>
      ipcRenderer.invoke('sales:getTrends', period),
    startPolling: (intervalMs?: number) =>
      ipcRenderer.invoke('sales:startPolling', intervalMs),
    stopPolling: () => ipcRenderer.invoke('sales:stopPolling'),
  }
  ```

### Files to Create/Extend

| File | Type | Purpose |
|------|------|---------|
| `src/main/services/salesVelocityStore.ts` | Create | Poll + store sales snapshots |
| `src/main/services/salesDataCache.ts` | Create | In-memory cache layer |
| `src/main/ipc/salesVelocity.ts` | Create | IPC handlers |
| `src/main/ipc/index.ts` | Extend | Register salesVelocity handlers |
| `src/renderer/src/stores/salesVelocityStore.ts` | Create | Zustand state |
| `src/renderer/src/components/dashboard/SalesVelocityCard.tsx` | Create | UI card |
| `src/preload/index.ts` | Extend | Expose salesVelocity API |

### Main Process vs Renderer Responsibility

| Responsibility | Main | Renderer |
|---|---|---|
| Poll store APIs | ✓ | |
| Persist snapshots | ✓ | |
| Cache + staleness | ✓ | |
| Display trends | | ✓ |
| Fetch on demand | | ✓ |
| Handle period selection | | ✓ |

### IPC/Store Work

- **IPC Channels**: `sales:status`, `sales:getTrends`, `sales:startPolling`, `sales:stopPolling`
- **Store Persistence**: Time-bucketed JSON files in app userData dir
- **Renderer State**: Zustand store synced from main process

### Verification (Phase 1)

- [ ] **Mock API responses** for Shopify/TikTok/Amazon in test
- [ ] **24h trend calculation** matches expected CAGR formula
- [ ] **Polling starts/stops** cleanly, no memory leaks
- [ ] **Renderer displays** trends after 1 API call
- [ ] **Test**: `npm test -- src/main/services/salesVelocityStore.test.ts`

---

## Phase 2: Inventory Sync + Pricing Rules (2 weeks)

**Goal**: Auto-sync inventory from stores; apply dynamic pricing rules.

### Engineering Tasks

#### Main Process
- [ ] Create `src/main/services/inventorySync.ts`
  - Implement rule engine: `{ ruleId, store, sku, rule: 'lower_price_on_low_stock' | 'pause_if_oos' | 'increase_margin_on_high_velocity' }`
  - Query inventory from Shopify/TikTok/Amazon APIs
  - Check rule conditions (stock level, velocity, margin threshold)
  - Queue updates (batch to 1x per hour or manual trigger)
  - Persist rule config: `inventory-rules-{workspaceId}.json`

- [ ] Create `src/main/services/inventoryRuleEvaluator.ts`
  - Evaluate each rule against live inventory + sales data
  - Return: `{ sku, action: 'update_price' | 'pause_listing' | 'unpause' | 'none'; newValue?: number }`
  - No auto-apply; queue for review

- [ ] Create `src/main/services/inventoryStore.ts`
  - Fetch + cache inventory from all connected stores
  - Merge by SKU (map Shopify ID ↔ Amazon ASIN ↔ TikTok product_id)
  - Return unified view: `{ sku, qty, store, lastSyncTime }`

#### IPC Layer
- [ ] Add `src/main/ipc/inventory.ts`
  - Handler: `inventory:sync(workspaceId)` → triggers fetch, returns summary
  - Handler: `inventory:getSnapshot(workspaceId)` → current merged inventory
  - Handler: `inventory:createRule(workspaceId, rule: InventoryRule)` → save + evaluate
  - Handler: `inventory:listRules(workspaceId)` → all rules
  - Handler: `inventory:deleteRule(workspaceId, ruleId)` → remove
  - Handler: `inventory:getQueuedUpdates(workspaceId)` → pending changes (review before apply)
  - Handler: `inventory:applyUpdates(workspaceId, updateIds: string[])` → execute queued changes
  - Register in `src/main/ipc/index.ts`

#### Renderer
- [ ] Create `src/renderer/src/stores/inventoryStore.ts`
  - `{ inventory: Map<sku, InventoryItem>; rules: InventoryRule[]; queuedUpdates: Update[]; isSyncing: boolean }`
  - Methods: `syncInventory()`, `addRule()`, `deleteRule()`, `applyUpdates()`

- [ ] Create `src/renderer/src/pages/InventoryPage.tsx`
  - Two-panel layout: Inventory grid + Rules panel
  - Inventory grid: SKU, qty per store, last sync, trend arrow
  - Rules panel: List rules, create rule (dropdown builder), enable/disable
  - Queue panel: Show pending updates, approve/reject, batch actions

- [ ] Create `src/renderer/src/components/inventory/RuleBuilder.tsx`
  - Dropdown-based UI to build rules without code
  - Condition: `sku | store` selector
  - Action type: `lower_price | pause | unpause | increase_margin`
  - Threshold fields (e.g., "if stock < 5", "if velocity > 10/day")
  - Preview queued update before save

#### Preload Bridge
- [ ] Extend `src/preload/index.ts`:
  ```typescript
  inventory: {
    sync: (workspaceId: string) =>
      ipcRenderer.invoke('inventory:sync', workspaceId),
    getSnapshot: (workspaceId: string) =>
      ipcRenderer.invoke('inventory:getSnapshot', workspaceId),
    createRule: (workspaceId: string, rule: InventoryRule) =>
      ipcRenderer.invoke('inventory:createRule', workspaceId, rule),
    listRules: (workspaceId: string) =>
      ipcRenderer.invoke('inventory:listRules', workspaceId),
    deleteRule: (workspaceId: string, ruleId: string) =>
      ipcRenderer.invoke('inventory:deleteRule', workspaceId, ruleId),
    getQueuedUpdates: (workspaceId: string) =>
      ipcRenderer.invoke('inventory:getQueuedUpdates', workspaceId),
    applyUpdates: (workspaceId: string, updateIds: string[]) =>
      ipcRenderer.invoke('inventory:applyUpdates', workspaceId, updateIds),
  }
  ```

### Files to Create/Extend

| File | Type | Purpose |
|------|------|---------|
| `src/main/services/inventorySync.ts` | Create | Multi-store inventory fetch + merge |
| `src/main/services/inventoryRuleEvaluator.ts` | Create | Rule condition + action engine |
| `src/main/services/inventoryStore.ts` | Create | In-memory inventory + file persistence |
| `src/main/ipc/inventory.ts` | Create | IPC handlers |
| `src/main/ipc/index.ts` | Extend | Register inventory handlers |
| `src/renderer/src/stores/inventoryStore.ts` | Create | Zustand state |
| `src/renderer/src/pages/InventoryPage.tsx` | Create | Main page |
| `src/renderer/src/components/inventory/RuleBuilder.tsx` | Create | Rule UI |
| `src/preload/index.ts` | Extend | Expose inventory API |

### Main Process vs Renderer Responsibility

| Responsibility | Main | Renderer |
|---|---|---|
| Fetch store APIs (Shopify, Amazon, TikTok) | ✓ | |
| Merge SKU data across stores | ✓ | |
| Evaluate rule conditions | ✓ | |
| Apply price/pause updates to stores | ✓ | |
| Persist rules config | ✓ | |
| Display inventory grid | | ✓ |
| Build/edit rules | | ✓ |
| Review + approve queued changes | | ✓ |

### IPC/Store Work

- **IPC Channels**: `inventory:sync`, `inventory:getSnapshot`, `inventory:createRule`, `inventory:listRules`, `inventory:deleteRule`, `inventory:getQueuedUpdates`, `inventory:applyUpdates`
- **File Persistence**: `inventory-rules-{workspaceId}.json`, `inventory-snapshot-{timestamp}.json` (rolling 30-day window)
- **Renderer State**: Zustand store, localStorage cache of last snapshot

### Verification (Phase 2)

- [ ] **Rule builder** creates valid rule objects
- [ ] **Inventory fetch** merges Shopify + Amazon test data by SKU
- [ ] **Rule evaluation** correctly queues price updates for low-stock items
- [ ] **Apply updates** calls store APIs with correct payload format
- [ ] **Queue review** shows pending changes before execution
- [ ] **Test**: `npm test -- src/main/services/inventory*.test.ts`

---

## Phase 3: Email Swipe Library (1.5 weeks)

**Goal**: Curated email copy templates; AI suggestions for subject lines, preview text, CTA.

### Engineering Tasks

#### Main Process
- [ ] Create `src/main/services/emailLibrary.ts`
  - Load bundled email templates (YAML/JSON): subject, preview, body, tags (cart-abandon, flash-sale, launch, upsell)
  - Metadata: conversion_rate, avg_engagement, category
  - File-based: `library/email-templates.json`

- [ ] Create `src/main/services/emailSuggestions.ts`
  - Prompt templates for AI copy generation (via OpenRouter / fal.ai)
  - Given: product name, category, offer type (flash / launch / upsell)
  - Generate: subject line (5 variants), preview text, CTA copy
  - Cache suggestions (in-memory, 1hr TTL)

#### IPC Layer
- [ ] Add `src/main/ipc/email.ts`
  - Handler: `email:listTemplates(filter?: { tag?: string; category?: string })` → array of templates with metadata
  - Handler: `email:getTemplate(templateId: string)` → full template (subject, body, variables list)
  - Handler: `email:suggestCopy(input: { productName: string; offerType: 'flash' | 'launch' | 'upsell' | 'abandon' })` → `{ subjects: string[]; previewText: string; cta: string }`
  - Handler: `email:renderTemplate(templateId: string, variables: Record<string, string>)` → rendered HTML
  - Register in `src/main/ipc/index.ts`

#### Renderer
- [ ] Create `src/renderer/src/stores/emailStore.ts`
  - `{ templates: Template[]; selectedTemplate: Template | null; suggestions: Suggestion | null; isSuggestingCopy: boolean }`
  - Methods: `selectTemplate()`, `requestSuggestions()`, `renderPreview()`

- [ ] Create `src/renderer/src/pages/EmailLibraryPage.tsx`
  - Three-column layout: Templates list | Selected template | AI suggestions
  - Filter by tag / category
  - Preview with variable substitution
  - Copy button for subject / body / CTA

- [ ] Create `src/renderer/src/components/email/EmailTemplateBrowser.tsx`
  - Grid/list view of templates
  - Tag badges, engagement metric (avg open rate / CTR)
  - Click to select

- [ ] Create `src/renderer/src/components/email/CopyAISuggestions.tsx`
  - Input: product name, offer type dropdown
  - Output: 5 subject variants, preview text, CTA
  - Copy-to-clipboard buttons
  - Loading state

#### Preload Bridge
- [ ] Extend `src/preload/index.ts`:
  ```typescript
  email: {
    listTemplates: (filter?: { tag?: string; category?: string }) =>
      ipcRenderer.invoke('email:listTemplates', filter),
    getTemplate: (templateId: string) =>
      ipcRenderer.invoke('email:getTemplate', templateId),
    suggestCopy: (input: {
      productName: string;
      offerType: 'flash' | 'launch' | 'upsell' | 'abandon';
    }) => ipcRenderer.invoke('email:suggestCopy', input),
    renderTemplate: (templateId: string, variables: Record<string, string>) =>
      ipcRenderer.invoke('email:renderTemplate', templateId, variables),
  }
  ```

### Files to Create/Extend

| File | Type | Purpose |
|------|------|---------|
| `library/email-templates.json` | Create | Bundled template library |
| `src/main/services/emailLibrary.ts` | Create | Load + filter templates |
| `src/main/services/emailSuggestions.ts` | Create | AI copy generation |
| `src/main/ipc/email.ts` | Create | IPC handlers |
| `src/main/ipc/index.ts` | Extend | Register email handlers |
| `src/renderer/src/stores/emailStore.ts` | Create | Zustand state |
| `src/renderer/src/pages/EmailLibraryPage.tsx` | Create | Main page |
| `src/renderer/src/components/email/EmailTemplateBrowser.tsx` | Create | Template browser UI |
| `src/renderer/src/components/email/CopyAISuggestions.tsx` | Create | AI suggestions UI |
| `src/preload/index.ts` | Extend | Expose email API |

### Main Process vs Renderer Responsibility

| Responsibility | Main | Renderer |
|---|---|---|
| Load email templates from disk | ✓ | |
| Call AI API for copy suggestions | ✓ | |
| Cache suggestions | ✓ | |
| Render template with variables | ✓ | |
| Display template library | | ✓ |
| Filter / search templates | | ✓ |
| Preview with variable substitution | | ✓ |
| Copy text to clipboard | | ✓ |

### IPC/Store Work

- **IPC Channels**: `email:listTemplates`, `email:getTemplate`, `email:suggestCopy`, `email:renderTemplate`
- **File Persistence**: `library/email-templates.json` (read-only bundled asset)
- **Renderer State**: Zustand store, in-memory suggestions cache

### Verification (Phase 3)

- [ ] **Template loading** parses JSON, filters by tag
- [ ] **AI suggestions** call OpenRouter API, return 5+ subject variants
- [ ] **Template rendering** substitutes variables correctly
- [ ] **UI preview** displays populated template
- [ ] **Copy buttons** write to clipboard
- [ ] **Test**: `npm test -- src/main/services/emailLibrary*.test.ts`

---

## Phase 4: Funnel/OTO Mapping (1.5 weeks)

**Goal**: Visualize multi-step sales funnels; map front-end offer → OTO → email sequence.

### Engineering Tasks

#### Main Process
- [ ] Create `src/main/services/funnelStore.ts`
  - Persist funnel config: `funnel-{workspaceId}-{funnelId}.json`
  - Schema: `{ id, name, steps: [{ step, type: 'product' | 'upsell' | 'email'; linkedItemId; price; orderPosition }] }`
  - Validate: each step references existing product / email template
  - Track: step conversion % from store order data (infer via product SKU linkage)

- [ ] Create `src/main/services/conversionAnalyzer.ts`
  - Given funnel ID + sales snapshots, compute step-by-step conversion %
  - Match order → product SKU → funnel step
  - Return: `{ step, conversionRate, revenue, units }`

#### IPC Layer
- [ ] Add `src/main/ipc/funnel.ts`
  - Handler: `funnel:listFunnels(workspaceId)` → array of funnels (name, step count, overall conversion)
  - Handler: `funnel:getFunnel(workspaceId, funnelId)` → full funnel config + conversion metrics
  - Handler: `funnel:createFunnel(workspaceId, funnel: FunnelConfig)` → save, return id
  - Handler: `funnel:updateFunnel(workspaceId, funnelId, updates: Partial<FunnelConfig>)` → update
  - Handler: `funnel:deleteFunnel(workspaceId, funnelId)` → remove
  - Handler: `funnel:getConversions(workspaceId, funnelId, period: '24h' | '7d' | '30d')` → step-by-step conversion data
  - Register in `src/main/ipc/index.ts`

#### Renderer
- [ ] Create `src/renderer/src/stores/funnelStore.ts`
  - `{ funnels: Funnel[]; selectedFunnel: Funnel | null; conversions: ConversionMetrics | null; isLoading: boolean }`
  - Methods: `listFunnels()`, `selectFunnel()`, `createFunnel()`, `updateFunnel()`, `deleteFunnel()`

- [ ] Create `src/renderer/src/pages/FunnelPage.tsx`
  - Two-pane layout: Funnel list | Funnel editor + metrics
  - Funnel list: name, step count, overall conversion % (with color coding: red < 1%, yellow < 5%, green > 5%)
  - Selected funnel: flow diagram (boxes + arrows) + step metrics sidebar

- [ ] Create `src/renderer/src/components/funnel/FunnelFlowDiagram.tsx`
  - SVG-based flow visualization: step boxes connected by arrows
  - Click-to-edit step (modal to link product / email / price)
  - Hover to show conversion % + revenue for that step
  - Drag-to-reorder steps

- [ ] Create `src/renderer/src/components/funnel/StepEditor.tsx`
  - Modal: select step type (product / upsell / email)
  - Dropdown: pick product / email template from available items
  - Input: step price (optional override)
  - Show: linked item preview

#### Preload Bridge
- [ ] Extend `src/preload/index.ts`:
  ```typescript
  funnel: {
    listFunnels: (workspaceId: string) =>
      ipcRenderer.invoke('funnel:listFunnels', workspaceId),
    getFunnel: (workspaceId: string, funnelId: string) =>
      ipcRenderer.invoke('funnel:getFunnel', workspaceId, funnelId),
    createFunnel: (workspaceId: string, funnel: FunnelConfig) =>
      ipcRenderer.invoke('funnel:createFunnel', workspaceId, funnel),
    updateFunnel: (workspaceId: string, funnelId: string, updates: Partial<FunnelConfig>) =>
      ipcRenderer.invoke('funnel:updateFunnel', workspaceId, funnelId, updates),
    deleteFunnel: (workspaceId: string, funnelId: string) =>
      ipcRenderer.invoke('funnel:deleteFunnel', workspaceId, funnelId),
    getConversions: (workspaceId: string, funnelId: string, period: '24h' | '7d' | '30d') =>
      ipcRenderer.invoke('funnel:getConversions', workspaceId, funnelId, period),
  }
  ```

### Files to Create/Extend

| File | Type | Purpose |
|------|------|---------|
| `src/main/services/funnelStore.ts` | Create | Persist + validate funnel config |
| `src/main/services/conversionAnalyzer.ts` | Create | Compute step conversion % |
| `src/main/ipc/funnel.ts` | Create | IPC handlers |
| `src/main/ipc/index.ts` | Extend | Register funnel handlers |
| `src/renderer/src/stores/funnelStore.ts` | Create | Zustand state |
| `src/renderer/src/pages/FunnelPage.tsx` | Create | Main page |
| `src/renderer/src/components/funnel/FunnelFlowDiagram.tsx` | Create | Flow visualization |
| `src/renderer/src/components/funnel/StepEditor.tsx` | Create | Step config modal |
| `src/preload/index.ts` | Extend | Expose funnel API |

### Main Process vs Renderer Responsibility

| Responsibility | Main | Renderer |
|---|---|---|
| Persist funnel config | ✓ | |
| Validate step references (product / email exist) | ✓ | |
| Compute step conversion % from order data | ✓ | |
| Display funnel diagram | | ✓ |
| Edit funnel steps (UI-based) | | ✓ |
| Reorder steps | | ✓ |
| Show conversion metrics | | ✓ |

### IPC/Store Work

- **IPC Channels**: `funnel:listFunnels`, `funnel:getFunnel`, `funnel:createFunnel`, `funnel:updateFunnel`, `funnel:deleteFunnel`, `funnel:getConversions`
- **File Persistence**: `funnel-{workspaceId}-{funnelId}.json`
- **Renderer State**: Zustand store, in-memory selected funnel + conversion data

### Verification (Phase 4)

- [ ] **Funnel creation** saves to disk, validates product/email links
- [ ] **Funnel diagram** renders 3+ steps with arrows
- [ ] **Drag-to-reorder** updates step positions
- [ ] **Conversion analysis** correctly matches orders to funnel steps by SKU
- [ ] **Step editor** modal links product + saves
- [ ] **Test**: `npm test -- src/main/services/funnelStore*.test.ts`

---

## Phase 5: Benchmarking (2 weeks)

**Goal**: Compare seller's metrics against industry averages (cohort-based).

### Engineering Tasks

#### Main Process
- [ ] Create `src/main/services/benchmarkData.ts`
  - Load pre-computed benchmark file: `benchmark-data-{industry}-{quarter}.json`
  - Schema: `{ metric: 'conversion_rate' | 'aov' | 'roas' | 'inventory_turnover'; p10: number; p25: number; p50: number; p75: number; p90: number; sample_size: number }`
  - Support industry categories: beauty, fashion, health, home, tech, food (from existing product types)

- [ ] Create `src/main/services/benchmarkAnalyzer.ts`
  - Compute seller's metrics from sales + inventory data: conversion rate, AOV, ROAS (vs ad spend), inventory turnover
  - Compare against benchmark percentiles
  - Return: `{ metric, userValue, percentile, comparison: 'above' | 'at' | 'below' }`

#### IPC Layer
- [ ] Add `src/main/ipc/benchmark.ts`
  - Handler: `benchmark:getProfile(workspaceId)` → `{ industry: string; productCount: number; reportedMetrics: { ... } }`
  - Handler: `benchmark:updateProfile(workspaceId, industry: string, profile: ProfileConfig)` → save user's declared industry
  - Handler: `benchmark:getReport(workspaceId, period: '30d' | '90d' | 'all')` → comparison table vs benchmarks
  - Handler: `benchmark:suggestImprovement(workspaceId, metric: string)` → text recommendation based on low percentile
  - Register in `src/main/ipc/index.ts`

#### Renderer
- [ ] Create `src/renderer/src/stores/benchmarkStore.ts`
  - `{ profile: BenchmarkProfile | null; report: BenchmarkReport | null; isLoading: boolean }`
  - Methods: `fetchReport()`, `updateProfile()`

- [ ] Create `src/renderer/src/pages/BenchmarkPage.tsx`
  - Profile card: industry selector, product type summary
  - Benchmark table: metric, user value, percentile (color: red < 25, yellow 25–75, green > 75), benchmark range
  - Improvement tips: text suggestions for low-percentile metrics

- [ ] Create `src/renderer/src/components/benchmark/BenchmarkChart.tsx`
  - Horizontal bar chart: p10 ← p25 ← p50 → p75 → p90, user value as marker
  - One chart per metric

#### Preload Bridge
- [ ] Extend `src/preload/index.ts`:
  ```typescript
  benchmark: {
    getProfile: (workspaceId: string) =>
      ipcRenderer.invoke('benchmark:getProfile', workspaceId),
    updateProfile: (workspaceId: string, industry: string, profile: ProfileConfig) =>
      ipcRenderer.invoke('benchmark:updateProfile', workspaceId, industry, profile),
    getReport: (workspaceId: string, period: '30d' | '90d' | 'all') =>
      ipcRenderer.invoke('benchmark:getReport', workspaceId, period),
    suggestImprovement: (workspaceId: string, metric: string) =>
      ipcRenderer.invoke('benchmark:suggestImprovement', workspaceId, metric),
  }
  ```

### Files to Create/Extend

| File | Type | Purpose |
|------|------|---------|
| `benchmark-data-{industry}-{quarter}.json` | Create | Bundled benchmark data |
| `src/main/services/benchmarkData.ts` | Create | Load benchmark reference |
| `src/main/services/benchmarkAnalyzer.ts` | Create | Compare user metrics to benchmarks |
| `src/main/ipc/benchmark.ts` | Create | IPC handlers |
| `src/main/ipc/index.ts` | Extend | Register benchmark handlers |
| `src/renderer/src/stores/benchmarkStore.ts` | Create | Zustand state |
| `src/renderer/src/pages/BenchmarkPage.tsx` | Create | Main page |
| `src/renderer/src/components/benchmark/BenchmarkChart.tsx` | Create | Bar chart visualization |
| `src/preload/index.ts` | Extend | Expose benchmark API |

### Main Process vs Renderer Responsibility

| Responsibility | Main | Renderer |
|---|---|---|
| Load benchmark reference data | ✓ | |
| Compute user metrics from sales/inventory | ✓ | |
| Compare to percentiles | ✓ | |
| Generate improvement suggestions | ✓ | |
| Display profile card | | ✓ |
| Show benchmark comparison table | | ✓ |
| Render bar charts | | ✓ |

### IPC/Store Work

- **IPC Channels**: `benchmark:getProfile`, `benchmark:updateProfile`, `benchmark:getReport`, `benchmark:suggestImprovement`
- **File Persistence**: `benchmark-{workspaceId}-profile.json` (user's declared industry), `benchmark-data-{industry}-{quarter}.json` (bundled reference)
- **Renderer State**: Zustand store, in-memory report cache

### Verification (Phase 5)

- [ ] **Benchmark data** loads and parses correctly
- [ ] **Metric calculation** (conversion rate, AOV, ROAS) matches expected formulas
- [ ] **Percentile comparison** places user value correctly in benchmark range
- [ ] **Bar chart** renders with percentile markers + user value
- [ ] **Improvement suggestions** surface for low-percentile metrics
- [ ] **Test**: `npm test -- src/main/services/benchmarkAnalyzer*.test.ts`

---

## Phase 6: Launch Optimizer (2 weeks)

**Goal**: Coordinate multi-channel product launch; recommend timing, channel mix, sequencing.

### Engineering Tasks

#### Main Process
- [ ] Create `src/main/services/launchPlanner.ts`
  - Accept: product name, target channels (Facebook, Google, TikTok, Shopify, Amazon), budget allocation
  - Model: historical data per channel (best day of week, time of day, seasonal patterns)
  - Return: recommended launch schedule: `{ channel, day, time, estimatedReach, estimatedCost }`

- [ ] Create `src/main/services/launchExecutor.ts`
  - Track launch campaign lifecycle: draft → scheduled → live → paused → ended
  - Coordinate across platforms: sequenced API calls (e.g., upload creative to Facebook → create adset → enable → send email)
  - Persist launch state: `launch-{workspaceId}-{launchId}.json`

- [ ] Create `src/main/services/launchMonitor.ts`
  - Poll channel metrics during active launch (daily): impressions, clicks, conversions, spend
  - Aggregate into unified dashboard: total metrics + per-channel breakdown
  - Auto-pause channel if ROAS drops below threshold (configurable)

#### IPC Layer
- [ ] Add `src/main/ipc/launch.ts`
  - Handler: `launch:getRecommendation(input: { productName: string; channels: string[]; budgetUSD: number })` → schedule recommendation
  - Handler: `launch:createLaunch(workspaceId, launch: LaunchConfig)` → save draft, return id
  - Handler: `launch:listLaunches(workspaceId, filter?: 'active' | 'completed' | 'all')` → launches with current status
  - Handler: `launch:getLaunch(workspaceId, launchId)` → full launch config + live metrics
  - Handler: `launch:scheduleLaunch(workspaceId, launchId)` → move from draft to scheduled (validate all channels linked)
  - Handler: `launch:startLaunch(workspaceId, launchId)` → execute sequenced API calls across channels
  - Handler: `launch:pauseLaunch(workspaceId, launchId)` → pause all channel campaigns
  - Handler: `launch:getMetrics(workspaceId, launchId)` → current aggregated metrics + per-channel breakdown
  - Register in `src/main/ipc/index.ts`

#### Renderer
- [ ] Create `src/renderer/src/stores/launchStore.ts`
  - `{ launches: Launch[]; selectedLaunch: Launch | null; metrics: LaunchMetrics | null; isExecuting: boolean }`
  - Methods: `listLaunches()`, `selectLaunch()`, `createLaunch()`, `getRecommendation()`, `startLaunch()`, `pauseLaunch()`

- [ ] Create `src/renderer/src/pages/LaunchOptimizerPage.tsx`
  - Three-column layout: Launch list | Launch editor | Live metrics dashboard
  - Launch list: name, status (draft / scheduled / live / paused / ended), channels, budget, start date
  - Editor: product selector, channel selector (checkboxes), budget allocation sliders, recommended schedule preview
  - Metrics: pie chart (budget allocation), line chart (impressions + conversions over time), table (per-channel metrics)

- [ ] Create `src/renderer/src/components/launch/ChannelSequencer.tsx`
  - Drag-to-order channel activation sequence
  - Show: recommended timing for each channel (day + hour)
  - Input: override timing per channel (date picker + time picker)
  - Validation: warn if channels too spread out (suggest compression)

- [ ] Create `src/renderer/src/components/launch/BudgetAllocator.tsx`
  - Sliders for budget allocation per channel (with total lock)
  - Show: estimated reach + cost per channel (read-only, from recommendation)
  - Preset buttons: "Even split", "Video-first", "ROI-optimized"

#### Preload Bridge
- [ ] Extend `src/preload/index.ts`:
  ```typescript
  launch: {
    getRecommendation: (input: {
      productName: string;
      channels: string[];
      budgetUSD: number;
    }) => ipcRenderer.invoke('launch:getRecommendation', input),
    createLaunch: (workspaceId: string, launch: LaunchConfig) =>
      ipcRenderer.invoke('launch:createLaunch', workspaceId, launch),
    listLaunches: (workspaceId: string, filter?: 'active' | 'completed' | 'all') =>
      ipcRenderer.invoke('launch:listLaunches', workspaceId, filter),
    getLaunch: (workspaceId: string, launchId: string) =>
      ipcRenderer.invoke('launch:getLaunch', workspaceId, launchId),
    scheduleLaunch: (workspaceId: string, launchId: string) =>
      ipcRenderer.invoke('launch:scheduleLaunch', workspaceId, launchId),
    startLaunch: (workspaceId: string, launchId: string) =>
      ipcRenderer.invoke('launch:startLaunch', workspaceId, launchId),
    pauseLaunch: (workspaceId: string, launchId: string) =>
      ipcRenderer.invoke('launch:pauseLaunch', workspaceId, launchId),
    getMetrics: (workspaceId: string, launchId: string) =>
      ipcRenderer.invoke('launch:getMetrics', workspaceId, launchId),
  }
  ```

### Files to Create/Extend

| File | Type | Purpose |
|------|------|---------|
| `src/main/services/launchPlanner.ts` | Create | Generate launch schedule recommendation |
| `src/main/services/launchExecutor.ts` | Create | Coordinate multi-channel campaign launch |
| `src/main/services/launchMonitor.ts` | Create | Poll + aggregate launch metrics |
| `src/main/ipc/launch.ts` | Create | IPC handlers |
| `src/main/ipc/index.ts` | Extend | Register launch handlers |
| `src/renderer/src/stores/launchStore.ts` | Create | Zustand state |
| `src/renderer/src/pages/LaunchOptimizerPage.tsx` | Create | Main page |
| `src/renderer/src/components/launch/ChannelSequencer.tsx` | Create | Channel ordering UI |
| `src/renderer/src/components/launch/BudgetAllocator.tsx` | Create | Budget allocation UI |
| `src/preload/index.ts` | Extend | Expose launch API |

### Main Process vs Renderer Responsibility

| Responsibility | Main | Renderer |
|---|---|---|
| Compute launch timing recommendation | ✓ | |
| Coordinate cross-channel campaign creation | ✓ | |
| Poll & aggregate metrics during launch | ✓ | |
| Apply auto-pause logic | ✓ | |
| Persist launch state | ✓ | |
| Display launch list | | ✓ |
| Build launch config (UI-based) | | ✓ |
| Show live metrics dashboard | | ✓ |
| Drag-to-reorder channel sequence | | ✓ |
| Allocate budget via sliders | | ✓ |

### IPC/Store Work

- **IPC Channels**: `launch:getRecommendation`, `launch:createLaunch`, `launch:listLaunches`, `launch:getLaunch`, `launch:scheduleLaunch`, `launch:startLaunch`, `launch:pauseLaunch`, `launch:getMetrics`
- **File Persistence**: `launch-{workspaceId}-{launchId}.json`, `launch-metrics-{launchId}-{timestamp}.json` (rolling 30-day window)
- **Renderer State**: Zustand store, in-memory selected launch + live metrics

### Verification (Phase 6)

- [ ] **Recommendation engine** returns plausible schedule (same-day channels, staggered video channels)
- [ ] **Launch creation** saves to disk, validates channel references
- [ ] **Start launch** calls Facebook / Google / TikTok APIs in correct sequence
- [ ] **Metrics polling** fetches from all channels, aggregates correctly
- [ ] **Auto-pause** triggers when ROAS < threshold
- [ ] **Dashboard** displays unified metrics + per-channel breakdown
- [ ] **Test**: `npm test -- src/main/services/launchPlanner*.test.ts`

---

## Implementation Order & Dependencies

### Strict Ordering
1. **Phase 1 (Sales Velocity)** — Foundation for all other features (Phase 2–6 depend on sales data)
2. **Phase 2 (Inventory Sync)** — Independent; can follow Phase 1
3. **Phase 3 (Email Swipe Library)** — Independent; can run in parallel with Phase 2
4. **Phase 4 (Funnel/OTO)** — Depends on Phase 1 (sales metrics for conversion calculation)
5. **Phase 5 (Benchmarking)** — Depends on Phase 1 + Phase 2 (metrics + inventory data)
6. **Phase 6 (Launch Optimizer)** — Depends on Phase 1 (sales patterns for timing recommendation)

### Parallel-Safe Work
- Phase 2 + Phase 3 can run in parallel (no inter-phase IPC dependencies)
- Phase 4 should start once Phase 1 is verified

---

## Shared Infrastructure (All Phases)

### Types & Schemas
Create `src/types/ecommerce.ts`:
```typescript
export interface InventoryItem {
  sku: string;
  qty: number;
  store: 'shopify' | 'amazon' | 'tiktok' | 'shopee';
  lastSyncTime: Date;
}

export interface InventoryRule {
  ruleId: string;
  store: string;
  sku: string;
  rule: 'lower_price_on_low_stock' | 'pause_if_oos' | 'increase_margin_on_high_velocity';
  threshold?: number;
}

export interface TrendData {
  revenue: number;
  unitsSold: number;
  trend: 'up' | 'down' | 'flat';
  growth: number; // CAGR %
  period: '24h' | '7d' | '30d';
}

export interface FunnelStep {
  step: number;
  type: 'product' | 'upsell' | 'email';
  linkedItemId: string;
  price?: number;
  conversionRate?: number;
  revenue?: number;
}

export interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  overallConversionRate?: number;
  totalRevenue?: number;
}

export interface LaunchConfig {
  id: string;
  productName: string;
  channels: {
    channel: 'facebook' | 'google' | 'tiktok' | 'shopify' | 'amazon';
    campaignId?: string;
    budgetUSD: number;
    scheduledTime: Date;
  }[];
  status: 'draft' | 'scheduled' | 'live' | 'paused' | 'ended';
  totalBudgetUSD: number;
  createdAt: Date;
}

export interface LaunchMetrics {
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalSpend: number;
  overallRoas: number;
  perChannel: {
    channel: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    roas: number;
  }[];
}
```

### Error Handling Pattern
All IPC handlers should wrap API calls with consistent error handling:
```typescript
function wrap<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        log.warn('[service] api error', err.message);
        const e = new Error(err.message) as Error & { code?: number };
        e.code = err.status;
        throw e;
      }
      throw err;
    }
  };
}
```

### Workspace Scoping
All features should scope data to `workspaceId`:
- File paths: `app-data/{workspaceId}/{feature}-*.json`
- IPC calls: pass `workspaceId` as first/second parameter
- Zustand stores: use workspace context hook to isolate state per workspace

---

## Testing Strategy (Per Phase)

### Unit Tests
- Main process services: test API wrappers, data transformations, file I/O
- IPC handlers: mock electron ipcMain, verify argument validation
- Renderer stores: test Zustand state mutations

### Integration Tests
- IPC → Service flow: mock APIs, verify end-to-end invoke → service → response
- Multi-service coordination (e.g., inventory sync + rule evaluation)
- File persistence: write → read → verify round-trip

### Manual QA Checklist (Per Phase)
- [ ] Feature loads without crash
- [ ] Data persists across app restart
- [ ] IPC calls timeout gracefully (add 10s timeout to all handlers)
- [ ] UI responsive (no jank during API calls)
- [ ] Workspace isolation (data doesn't leak across workspaces)

---

## Security & Performance Notes

### Security
- **IPC Validation**: All handlers validate input types + length (especially user-supplied strings, arrays, file paths)
- **Credential Scope**: Store credentials in OS keychain (follow existing `credentialStore` pattern)
- **API Rate Limiting**: Implement exponential backoff for polling (start 5min, cap 30min)
- **File Paths**: Use app userData dir; sanitize workspaceId before building paths

### Performance
- **Caching**: In-memory cache (1hr TTL) for inventory snapshots + suggestions
- **Polling**: Stagger API calls across time (e.g., if 3 stores, space calls 20s apart)
- **Batch Operations**: Queue rule updates, apply 1x/hour instead of per-rule
- **Renderer State**: Use Zustand selectors to avoid re-renders on unrelated state changes

---

## Known Gaps & Future Work

1. **Real-time Sync**: All phases currently poll on demand / scheduled. Future: WebSocket listeners for instant stock/sales updates.
2. **AI Copy**: Phase 3 assumes OpenRouter API key. Future: Support multiple AI providers (fal.ai, Anthropic, OpenAI).
3. **Launch Analytics**: Phase 6 aggregates, but doesn't do anomaly detection. Future: Alert on sudden ROAS drop.
4. **Benchmarking Data**: Currently static (quarterly snapshots). Future: Ingest live seller cohort data via partner API.
5. **Inventory Linking**: Phase 2 maps by SKU; doesn't handle SKU mismatches across stores. Future: Manual SKU remapping UI.

---

## Rollout & Messaging

### User-Facing Rollout
- **Phase 1–3**: "Sales Intelligence" release (stable first, then email templates)
- **Phase 4–6**: "Advanced Planning" release (funnel mapping, benchmarking, launch coordination)

### Documentation
- Create in-app tutorial for each feature (video + static guide)
- API docs in `docs/ecommerce-features.md` for developer reference
- Video walkthrough on YouTube for community

---

## Summary

This roadmap adds six interconnected e-commerce features to King, leveraging the existing Electron + IPC + Zustand architecture. **Phase 1 must ship first** (sales velocity is foundational), followed by parallel work on Phases 2–3, then Phases 4–6. Total estimated effort: **12–14 weeks** for a team of 2 engineers (one main-process, one renderer-focused). Each phase is modular and can ship independently; phases 2–3 can ship before phases 4–6 with no user-visible gaps.

All code follows existing King patterns: secure IPC handlers, file-based persistence, workspace scoping, and Zustand stores for renderer state. Error handling, testing, and security validation are built in per phase.

