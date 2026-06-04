# E-Commerce Features Backlog: Patchy-Style Epic/Story Organization

**Status**: Structured backlog for phased implementation with iterative verification.

This document organizes the six e-commerce features from `ECOMMERCE_FEATURES_ROADMAP.md` into **epics** (phases) with **stories** (IPC handlers, services, UI components) suitable for Patchy-style backlog-to-dispatch-to-verify workflows.

> **Integration with existing docs**: This backlog is the **executable version** of the roadmap. Each epic/story maps to concrete deliverables in the roadmap. When a story is dispatched (e.g., via `patchy-plan-issue`), the relevant section from the roadmap provides engineering tasks, file lists, and verification steps.

---

## Backlog Organization

### Epic Allocation

| Epic | Deliverables (Stories) | Dependencies | Estimated Duration | Roadmap Ref |
|------|------------------------|--------------|-------------------|-------------|
| **Epic 1: Sales Velocity** | SV-1 thru SV-5 | None (foundation) | 1.5 weeks | Phase 1 (lines 34–121) |
| **Epic 2: Inventory Sync** | INV-1 thru INV-7 | Epic 1 (for sales data) | 2 weeks | Phase 2 (lines 124–238) |
| **Epic 3: Email Swipe Library** | EMAIL-1 thru EMAIL-5 | None (independent) | 1.5 weeks | Phase 3 (lines 242–348) |
| **Epic 4: Funnel/OTO Mapping** | FUNNEL-1 thru FUNNEL-6 | Epic 1 (conversion calc) | 1.5 weeks | Phase 4 (lines 352–460) |
| **Epic 5: Benchmarking** | BENCH-1 thru BENCH-5 | Epic 1, Epic 2 (metrics) | 2 weeks | Phase 5 (lines 464–557) |
| **Epic 6: Launch Optimizer** | LAUNCH-1 thru LAUNCH-8 | Epic 1 (patterns) | 2 weeks | Phase 6 (lines 561–687) |

---

## Epic 1: Sales Velocity (Foundation)

**Goal**: Track sales from connected stores in real-time, show trends.
**Status**: Not started
**Roadmap ref**: `ECOMMERCE_FEATURES_ROADMAP.md` lines 34–121

### Story SV-1: Sales Velocity Main Process Services
**Roadmap ref**: Lines 40–45 (Engineering Tasks - Main Process)

Create two main-process services: `salesVelocityStore.ts` (poll APIs, cache, aggregate trends) and `salesDataCache.ts` (in-memory staleness management).

**Acceptance Criteria**:
- [ ] `src/main/services/salesVelocityStore.ts` implements polling with exponential backoff (5min → 30min)
- [ ] `src/main/services/salesDataCache.ts` tracks poll timestamps + 5min staleness threshold
- [ ] Both services integrated into main process without race conditions
- [ ] Unit tests mock Shopify/TikTok/Amazon API responses

**Files to Create/Modify** (from roadmap line 85–95):
- Create: `src/main/services/salesVelocityStore.ts`
- Create: `src/main/services/salesDataCache.ts`

**Verification** (from roadmap line 114–120):
- `npm test -- src/main/services/salesVelocityStore.test.ts` passes
- CAGR calculation matches expected formula

---

### Story SV-2: Sales Velocity IPC Layer
**Roadmap ref**: Lines 52–59 (Engineering Tasks - IPC Layer)

Add four IPC handlers to `src/main/ipc/salesVelocity.ts` and register in `src/main/ipc/index.ts`.

**Acceptance Criteria**:
- [ ] Handler `sales:status()` returns connection + store count + last update
- [ ] Handler `sales:getTrends(period)` returns revenue, units, trend, growth
- [ ] Handler `sales:startPolling()` and `sales:stopPolling()` manage background polling
- [ ] All handlers wrap API calls with error handling (timeout, retry)
- [ ] IPC integration tests mock handlers + verify argument validation

**Files to Create/Modify**:
- Create: `src/main/ipc/salesVelocity.ts`
- Modify: `src/main/ipc/index.ts` (register handlers)

**Verification**:
- `npm test -- src/main/ipc/salesVelocity.test.ts` passes
- All four handlers callable from renderer without error

---

### Story SV-3: Sales Velocity Preload Bridge
**Roadmap ref**: Lines 72–83 (Preload Bridge)

Expose salesVelocity API to renderer via preload bridge.

**Acceptance Criteria**:
- [ ] Preload exports `api.salesVelocity.status()`, `.getTrends()`, `.startPolling()`, `.stopPolling()`
- [ ] Types exported for all return objects

**Files to Create/Modify**:
- Modify: `src/preload/index.ts`

**Verification**:
- `tsc --noEmit` passes (types correct)
- Renderer can call `window.api.salesVelocity.status()` without errors

---

### Story SV-4: Sales Velocity Zustand Store
**Roadmap ref**: Lines 61–65 (Renderer)

Create Zustand store to manage renderer-side trends state.

**Acceptance Criteria**:
- [ ] Store: `{ trends: TrendData; lastUpdate: Date; isPolling: boolean }`
- [ ] Methods: `setTrends(data)`, `setPolling(bool)`
- [ ] Hook: auto-fetch trends on mount, sync poll status with main process

**Files to Create/Modify**:
- Create: `src/renderer/src/stores/salesVelocityStore.ts`

**Verification**:
- Unit tests for state mutations pass
- Store initializes without errors

---

### Story SV-5: Sales Velocity UI Card
**Roadmap ref**: Lines 67–70 (Renderer)

Create dashboard card component to display trends.

**Acceptance Criteria**:
- [ ] Component: displays current revenue, units, trend arrow
- [ ] Period selector (24h / 7d / 30d) controls trend fetch
- [ ] Shows last update timestamp
- [ ] Responsive layout; no jank during API calls

**Files to Create/Modify**:
- Create: `src/renderer/src/components/dashboard/SalesVelocityCard.tsx`

**Verification**:
- Component renders without errors
- Period selector updates trends
- Snapshot test passes

---

## Epic 2: Inventory Sync + Pricing Rules

**Goal**: Auto-sync inventory from stores; apply dynamic pricing rules.
**Status**: Not started
**Depends on**: Epic 1 (optional, for sales velocity in rule evaluation)
**Roadmap ref**: `ECOMMERCE_FEATURES_ROADMAP.md` lines 124–238

### Story INV-1: Inventory Rule Engine (Main Process)
**Roadmap ref**: Lines 131–141 (Engineering Tasks - Main Process)

Create rule engine and evaluator to check conditions and queue updates.

**Acceptance Criteria**:
- [ ] `src/main/services/inventorySync.ts` persists rules: `inventory-rules-{workspaceId}.json`
- [ ] Rule schema: `{ ruleId, store, sku, rule: 'lower_price_on_low_stock' | 'pause_if_oos' | 'increase_margin_on_high_velocity' }`
- [ ] `src/main/services/inventoryRuleEvaluator.ts` evaluates conditions, returns queued actions
- [ ] Unit tests verify rule evaluation logic

**Files to Create/Modify**:
- Create: `src/main/services/inventorySync.ts`
- Create: `src/main/services/inventoryRuleEvaluator.ts`

**Verification**:
- `npm test -- src/main/services/inventory*.test.ts` passes
- Rule evaluation correctly queues price updates for low-stock items

---

### Story INV-2: Inventory Snapshot & Merge (Main Process)
**Roadmap ref**: Lines 143–146 (Engineering Tasks - Main Process)

Create multi-store inventory fetcher with SKU merging.

**Acceptance Criteria**:
- [ ] `src/main/services/inventoryStore.ts` fetches from Shopify, Amazon, TikTok
- [ ] Merges by SKU (map Shopify ID ↔ Amazon ASIN ↔ TikTok product_id)
- [ ] Returns unified view: `{ sku, qty, store, lastSyncTime }`
- [ ] Caches inventory with 5min staleness check

**Files to Create/Modify**:
- Create: `src/main/services/inventoryStore.ts`

**Verification**:
- `npm test -- src/main/services/inventoryStore.test.ts` passes
- Merges Shopify + Amazon test data correctly by SKU

---

### Story INV-3: Inventory IPC Handlers
**Roadmap ref**: Lines 148–157 (Engineering Tasks - IPC Layer)

Add seven IPC handlers for inventory operations.

**Acceptance Criteria**:
- [ ] Handlers: `inventory:sync`, `inventory:getSnapshot`, `inventory:createRule`, `inventory:listRules`, `inventory:deleteRule`, `inventory:getQueuedUpdates`, `inventory:applyUpdates`
- [ ] All validate workspaceId + input
- [ ] Return properly typed responses

**Files to Create/Modify**:
- Create: `src/main/ipc/inventory.ts`
- Modify: `src/main/ipc/index.ts` (register handlers)

**Verification**:
- `npm test -- src/main/ipc/inventory.test.ts` passes
- All handlers callable, argument validation works

---

### Story INV-4: Inventory Preload Bridge
**Roadmap ref**: Lines 178–196 (Preload Bridge)

Expose inventory API to renderer.

**Acceptance Criteria**:
- [ ] Preload exports all inventory handlers
- [ ] Types match IPC response schemas

**Files to Create/Modify**:
- Modify: `src/preload/index.ts`

**Verification**:
- `tsc --noEmit` passes
- Renderer can call `window.api.inventory.sync()` without errors

---

### Story INV-5: Inventory Zustand Store
**Roadmap ref**: Lines 160–162 (Renderer)

Create store for inventory state + rules.

**Acceptance Criteria**:
- [ ] Store: `{ inventory: Map<sku, InventoryItem>; rules: InventoryRule[]; queuedUpdates: Update[]; isSyncing: boolean }`
- [ ] Methods: `syncInventory()`, `addRule()`, `deleteRule()`, `applyUpdates()`

**Files to Create/Modify**:
- Create: `src/renderer/src/stores/inventoryStore.ts`

**Verification**:
- Unit tests pass
- Store initializes without errors

---

### Story INV-6: Inventory Page & Grid UI
**Roadmap ref**: Lines 164–168 (Renderer)

Create main page with two-panel layout: inventory grid + rules panel.

**Acceptance Criteria**:
- [ ] Inventory grid: SKU, qty per store, last sync, trend arrow
- [ ] Rules panel: list rules, create rule, enable/disable
- [ ] Queue panel: show pending updates, approve/reject, batch actions
- [ ] Responsive layout

**Files to Create/Modify**:
- Create: `src/renderer/src/pages/InventoryPage.tsx`

**Verification**:
- Component renders without errors
- Grid displays test inventory data
- Snapshot test passes

---

### Story INV-7: Rule Builder UI
**Roadmap ref**: Lines 170–175 (Renderer)

Create dropdown-based rule builder.

**Acceptance Criteria**:
- [ ] Condition selectors: SKU, store, stock threshold, velocity threshold
- [ ] Action type: lower_price, pause, unpause, increase_margin
- [ ] Preview queued update before save
- [ ] No-code UI (dropdowns, sliders, inputs)

**Files to Create/Modify**:
- Create: `src/renderer/src/components/inventory/RuleBuilder.tsx`

**Verification**:
- Component renders without errors
- Can build a valid rule object
- Snapshot test passes

---

## Epic 3: Email Swipe Library

**Goal**: Curated email copy templates; AI suggestions for subject lines, preview text, CTA.
**Status**: Not started
**Depends on**: None (independent)
**Roadmap ref**: `ECOMMERCE_FEATURES_ROADMAP.md` lines 242–348

### Story EMAIL-1: Email Template Library (Main Process)
**Roadmap ref**: Lines 249–252 (Engineering Tasks - Main Process)

Create template loader with metadata.

**Acceptance Criteria**:
- [ ] `src/main/services/emailLibrary.ts` loads `library/email-templates.json`
- [ ] Templates tagged: cart-abandon, flash-sale, launch, upsell
- [ ] Metadata: conversion_rate, avg_engagement, category
- [ ] Filters templates by tag/category

**Files to Create/Modify**:
- Create: `library/email-templates.json`
- Create: `src/main/services/emailLibrary.ts`

**Verification**:
- `npm test -- src/main/services/emailLibrary.test.ts` passes
- Templates load, filter correctly

---

### Story EMAIL-2: AI Copy Suggestions (Main Process)
**Roadmap ref**: Lines 254–258 (Engineering Tasks - Main Process)

Create AI copy generation service.

**Acceptance Criteria**:
- [ ] `src/main/services/emailSuggestions.ts` calls OpenRouter API
- [ ] Input: product name, category, offer type
- [ ] Output: 5 subject variants, preview text, CTA copy
- [ ] Caches suggestions (1hr TTL)

**Files to Create/Modify**:
- Create: `src/main/services/emailSuggestions.ts`

**Verification**:
- `npm test -- src/main/services/emailSuggestions.test.ts` passes
- Generates plausible subject line variants

---

### Story EMAIL-3: Email IPC Handlers
**Roadmap ref**: Lines 261–266 (Engineering Tasks - IPC Layer)

Add four IPC handlers for email operations.

**Acceptance Criteria**:
- [ ] Handlers: `email:listTemplates`, `email:getTemplate`, `email:suggestCopy`, `email:renderTemplate`
- [ ] All validate inputs
- [ ] Return properly typed responses

**Files to Create/Modify**:
- Create: `src/main/ipc/email.ts`
- Modify: `src/main/ipc/index.ts` (register handlers)

**Verification**:
- `npm test -- src/main/ipc/email.test.ts` passes
- All handlers callable

---

### Story EMAIL-4: Email Preload & Zustand Store
**Roadmap ref**: Lines 291–305 (Preload Bridge) + Lines 269–271 (Renderer)

Expose email API and create Zustand store.

**Acceptance Criteria**:
- [ ] Preload exports all email handlers
- [ ] Store: `{ templates: Template[]; selectedTemplate: Template | null; suggestions: Suggestion | null; isSuggestingCopy: boolean }`
- [ ] Methods: `selectTemplate()`, `requestSuggestions()`, `renderPreview()`

**Files to Create/Modify**:
- Modify: `src/preload/index.ts`
- Create: `src/renderer/src/stores/emailStore.ts`

**Verification**:
- `tsc --noEmit` passes
- Store initializes without errors

---

### Story EMAIL-5: Email Library UI
**Roadmap ref**: Lines 273–288 (Renderer)

Create email library page with three-column layout.

**Acceptance Criteria**:
- [ ] Three-column layout: templates list | selected template | AI suggestions
- [ ] Filter by tag/category
- [ ] Preview with variable substitution
- [ ] Copy buttons for subject/body/CTA
- [ ] AI suggestions UI with loading state

**Files to Create/Modify**:
- Create: `src/renderer/src/pages/EmailLibraryPage.tsx`
- Create: `src/renderer/src/components/email/EmailTemplateBrowser.tsx`
- Create: `src/renderer/src/components/email/CopyAISuggestions.tsx`

**Verification**:
- Components render without errors
- Template browser displays test data
- Snapshot tests pass

---

## Epic 4: Funnel/OTO Mapping

**Goal**: Visualize multi-step sales funnels; map front-end offer → OTO → email sequence.
**Status**: Not started
**Depends on**: Epic 1 (conversion calculation from sales data)
**Roadmap ref**: `ECOMMERCE_FEATURES_ROADMAP.md` lines 352–460

### Story FUNNEL-1: Funnel Store & Conversion Analyzer (Main Process)
**Roadmap ref**: Lines 359–368 (Engineering Tasks - Main Process)

Create funnel persistence and conversion calculation.

**Acceptance Criteria**:
- [ ] `src/main/services/funnelStore.ts` persists: `funnel-{workspaceId}-{funnelId}.json`
- [ ] Schema: `{ id, name, steps: [{ step, type, linkedItemId, price, orderPosition }] }`
- [ ] Validates step references (products/emails exist)
- [ ] `src/main/services/conversionAnalyzer.ts` computes step-by-step conversion %
- [ ] Matches orders → product SKU → funnel step

**Files to Create/Modify**:
- Create: `src/main/services/funnelStore.ts`
- Create: `src/main/services/conversionAnalyzer.ts`

**Verification**:
- `npm test -- src/main/services/funnelStore*.test.ts` passes
- Conversion analysis correctly matches orders to funnel steps

---

### Story FUNNEL-2: Funnel IPC Handlers
**Roadmap ref**: Lines 371–378 (Engineering Tasks - IPC Layer)

Add six IPC handlers for funnel operations.

**Acceptance Criteria**:
- [ ] Handlers: `funnel:listFunnels`, `funnel:getFunnel`, `funnel:createFunnel`, `funnel:updateFunnel`, `funnel:deleteFunnel`, `funnel:getConversions`
- [ ] All validate workspaceId
- [ ] Return properly typed responses

**Files to Create/Modify**:
- Create: `src/main/ipc/funnel.ts`
- Modify: `src/main/ipc/index.ts` (register handlers)

**Verification**:
- `npm test -- src/main/ipc/funnel.test.ts` passes

---

### Story FUNNEL-3: Funnel Preload & Zustand Store
**Roadmap ref**: Lines 403–419 (Preload Bridge) + Lines 381–383 (Renderer)

Expose funnel API and create Zustand store.

**Acceptance Criteria**:
- [ ] Preload exports all funnel handlers
- [ ] Store: `{ funnels: Funnel[]; selectedFunnel: Funnel | null; conversions: ConversionMetrics | null; isLoading: boolean }`
- [ ] Methods: `listFunnels()`, `selectFunnel()`, `createFunnel()`, `updateFunnel()`, `deleteFunnel()`

**Files to Create/Modify**:
- Modify: `src/preload/index.ts`
- Create: `src/renderer/src/stores/funnelStore.ts`

**Verification**:
- `tsc --noEmit` passes
- Store initializes without errors

---

### Story FUNNEL-4: Funnel Page & Flow Diagram
**Roadmap ref**: Lines 385–394 (Renderer)

Create main page with funnel flow visualization.

**Acceptance Criteria**:
- [ ] Two-pane layout: funnel list | funnel editor + metrics
- [ ] List shows: name, step count, conversion % (color-coded: red < 1%, yellow < 5%, green > 5%)
- [ ] SVG flow diagram: step boxes + arrows
- [ ] Click-to-edit step (modal)
- [ ] Hover shows conversion % + revenue
- [ ] Drag-to-reorder steps

**Files to Create/Modify**:
- Create: `src/renderer/src/pages/FunnelPage.tsx`
- Create: `src/renderer/src/components/funnel/FunnelFlowDiagram.tsx`

**Verification**:
- Components render without errors
- Flow diagram renders 3+ steps with arrows
- Drag-to-reorder updates positions
- Snapshot tests pass

---

### Story FUNNEL-5: Step Editor Modal
**Roadmap ref**: Lines 396–400 (Renderer)

Create modal for editing funnel steps.

**Acceptance Criteria**:
- [ ] Modal: select step type (product / upsell / email)
- [ ] Dropdown: pick product / email template
- [ ] Input: step price (optional override)
- [ ] Show: linked item preview
- [ ] Save updates funnel

**Files to Create/Modify**:
- Create: `src/renderer/src/components/funnel/StepEditor.tsx`

**Verification**:
- Modal renders without errors
- Can select item and save
- Snapshot test passes

---

## Epic 5: Benchmarking

**Goal**: Compare seller's metrics against industry averages (cohort-based).
**Status**: Not started
**Depends on**: Epic 1 + Epic 2 (metrics + inventory data)
**Roadmap ref**: `ECOMMERCE_FEATURES_ROADMAP.md` lines 464–557

### Story BENCH-1: Benchmark Data & Analyzer (Main Process)
**Roadmap ref**: Lines 471–479 (Engineering Tasks - Main Process)

Create benchmark reference and analysis engine.

**Acceptance Criteria**:
- [ ] `src/main/services/benchmarkData.ts` loads: `benchmark-data-{industry}-{quarter}.json`
- [ ] Schema: `{ metric, p10, p25, p50, p75, p90, sample_size }`
- [ ] Supports industries: beauty, fashion, health, home, tech, food
- [ ] `src/main/services/benchmarkAnalyzer.ts` computes user metrics
- [ ] Returns: `{ metric, userValue, percentile, comparison: 'above' | 'at' | 'below' }`

**Files to Create/Modify**:
- Create: `benchmark-data-{industry}-{quarter}.json` (sample data)
- Create: `src/main/services/benchmarkData.ts`
- Create: `src/main/services/benchmarkAnalyzer.ts`

**Verification**:
- `npm test -- src/main/services/benchmarkAnalyzer*.test.ts` passes
- Percentile comparison places user value correctly

---

### Story BENCH-2: Benchmark IPC Handlers
**Roadmap ref**: Lines 482–487 (Engineering Tasks - IPC Layer)

Add four IPC handlers for benchmark operations.

**Acceptance Criteria**:
- [ ] Handlers: `benchmark:getProfile`, `benchmark:updateProfile`, `benchmark:getReport`, `benchmark:suggestImprovement`
- [ ] All validate workspaceId
- [ ] Return properly typed responses

**Files to Create/Modify**:
- Create: `src/main/ipc/benchmark.ts`
- Modify: `src/main/ipc/index.ts` (register handlers)

**Verification**:
- `npm test -- src/main/ipc/benchmark.test.ts` passes

---

### Story BENCH-3: Benchmark Preload & Zustand Store
**Roadmap ref**: Lines 504–516 (Preload Bridge) + Lines 490–492 (Renderer)

Expose benchmark API and create Zustand store.

**Acceptance Criteria**:
- [ ] Preload exports all benchmark handlers
- [ ] Store: `{ profile: BenchmarkProfile | null; report: BenchmarkReport | null; isLoading: boolean }`
- [ ] Methods: `fetchReport()`, `updateProfile()`

**Files to Create/Modify**:
- Modify: `src/preload/index.ts`
- Create: `src/renderer/src/stores/benchmarkStore.ts`

**Verification**:
- `tsc --noEmit` passes
- Store initializes without errors

---

### Story BENCH-4: Benchmark Page & Chart
**Roadmap ref**: Lines 494–501 (Renderer)

Create benchmark comparison UI.

**Acceptance Criteria**:
- [ ] Profile card: industry selector, product type summary
- [ ] Benchmark table: metric, user value, percentile (color: red < 25, yellow 25–75, green > 75), benchmark range
- [ ] Improvement tips: text suggestions for low-percentile metrics
- [ ] Horizontal bar chart: p10–p90 range + user value marker

**Files to Create/Modify**:
- Create: `src/renderer/src/pages/BenchmarkPage.tsx`
- Create: `src/renderer/src/components/benchmark/BenchmarkChart.tsx`

**Verification**:
- Components render without errors
- Bar chart renders with percentile markers
- Snapshot tests pass

---

## Epic 6: Launch Optimizer

**Goal**: Coordinate multi-channel product launch; recommend timing, channel mix, sequencing.
**Status**: Not started
**Depends on**: Epic 1 (sales patterns for timing recommendation)
**Roadmap ref**: `ECOMMERCE_FEATURES_ROADMAP.md` lines 561–687

### Story LAUNCH-1: Launch Planner (Main Process)
**Roadmap ref**: Lines 568–571 (Engineering Tasks - Main Process)

Create launch schedule recommendation engine.

**Acceptance Criteria**:
- [ ] `src/main/services/launchPlanner.ts` accepts: product name, target channels, budget allocation
- [ ] Models historical patterns per channel: best day/time, seasonal patterns
- [ ] Returns recommended schedule: `{ channel, day, time, estimatedReach, estimatedCost }`
- [ ] Recommendations are plausible (same-day for image, staggered for video)

**Files to Create/Modify**:
- Create: `src/main/services/launchPlanner.ts`

**Verification**:
- `npm test -- src/main/services/launchPlanner.test.ts` passes
- Recommendation engine returns plausible schedule

---

### Story LAUNCH-2: Launch Executor & Monitor (Main Process)
**Roadmap ref**: Lines 573–581 (Engineering Tasks - Main Process)

Create launch lifecycle management and metrics polling.

**Acceptance Criteria**:
- [ ] `src/main/services/launchExecutor.ts` tracks: draft → scheduled → live → paused → ended
- [ ] Coordinates API calls across platforms in sequence
- [ ] Persists: `launch-{workspaceId}-{launchId}.json`
- [ ] `src/main/services/launchMonitor.ts` polls metrics daily
- [ ] Aggregates impressions, clicks, conversions, spend per channel
- [ ] Auto-pauses channel if ROAS < threshold

**Files to Create/Modify**:
- Create: `src/main/services/launchExecutor.ts`
- Create: `src/main/services/launchMonitor.ts`

**Verification**:
- `npm test -- src/main/services/launchExecutor*.test.ts` passes
- Metrics aggregation correct
- Auto-pause triggers correctly

---

### Story LAUNCH-3: Launch IPC Handlers
**Roadmap ref**: Lines 584–593 (Engineering Tasks - IPC Layer)

Add eight IPC handlers for launch operations.

**Acceptance Criteria**:
- [ ] Handlers: `launch:getRecommendation`, `launch:createLaunch`, `launch:listLaunches`, `launch:getLaunch`, `launch:scheduleLaunch`, `launch:startLaunch`, `launch:pauseLaunch`, `launch:getMetrics`
- [ ] All validate workspaceId
- [ ] Return properly typed responses

**Files to Create/Modify**:
- Create: `src/main/ipc/launch.ts`
- Modify: `src/main/ipc/index.ts` (register handlers)

**Verification**:
- `npm test -- src/main/ipc/launch.test.ts` passes

---

### Story LAUNCH-4: Launch Preload & Zustand Store
**Roadmap ref**: Lines 618–641 (Preload Bridge) + Lines 596–598 (Renderer)

Expose launch API and create Zustand store.

**Acceptance Criteria**:
- [ ] Preload exports all launch handlers
- [ ] Store: `{ launches: Launch[]; selectedLaunch: Launch | null; metrics: LaunchMetrics | null; isExecuting: boolean }`
- [ ] Methods: `listLaunches()`, `selectLaunch()`, `createLaunch()`, `getRecommendation()`, `startLaunch()`, `pauseLaunch()`

**Files to Create/Modify**:
- Modify: `src/preload/index.ts`
- Create: `src/renderer/src/stores/launchStore.ts`

**Verification**:
- `tsc --noEmit` passes
- Store initializes without errors

---

### Story LAUNCH-5: Launch Page & Metrics Dashboard
**Roadmap ref**: Lines 600–604 (Renderer)

Create main page with launch list and metrics dashboard.

**Acceptance Criteria**:
- [ ] Three-column layout: launch list | launch editor | live metrics
- [ ] List shows: name, status, channels, budget, start date
- [ ] Metrics dashboard: pie chart (budget), line chart (impressions + conversions), table (per-channel)
- [ ] Responsive layout

**Files to Create/Modify**:
- Create: `src/renderer/src/pages/LaunchOptimizerPage.tsx`

**Verification**:
- Component renders without errors
- Displays test launch data
- Snapshot test passes

---

### Story LAUNCH-6: Channel Sequencer UI
**Roadmap ref**: Lines 606–610 (Renderer)

Create drag-to-order channel activation UI.

**Acceptance Criteria**:
- [ ] Drag-to-reorder channel activation sequence
- [ ] Shows recommended timing (day + hour)
- [ ] Override timing per channel (date picker + time picker)
- [ ] Warns if channels too spread out

**Files to Create/Modify**:
- Create: `src/renderer/src/components/launch/ChannelSequencer.tsx`

**Verification**:
- Component renders without errors
- Drag-to-reorder updates positions
- Snapshot test passes

---

### Story LAUNCH-7: Budget Allocator UI
**Roadmap ref**: Lines 612–615 (Renderer)

Create budget allocation UI with sliders.

**Acceptance Criteria**:
- [ ] Sliders for budget allocation per channel (total lock)
- [ ] Shows estimated reach + cost per channel (read-only)
- [ ] Preset buttons: "Even split", "Video-first", "ROI-optimized"

**Files to Create/Modify**:
- Create: `src/renderer/src/components/launch/BudgetAllocator.tsx`

**Verification**:
- Component renders without errors
- Sliders update budget allocation
- Snapshot test passes

---

## Shared Infrastructure (All Epics)

**Roadmap ref**: Lines 709–845

### Story SHARED-1: Type Definitions
Create `src/types/ecommerce.ts` with all type interfaces for all six features.

**Status**: Prerequisite (should be created first)
**Files**: Create `src/types/ecommerce.ts`

### Story SHARED-2: Error Handling Pattern
All IPC handlers use consistent error wrapping (see roadmap line 783–800).

**Status**: Shared pattern (apply per epic)

### Story SHARED-3: Workspace Scoping
All features scope data to workspaceId in file paths and IPC calls (see roadmap line 803–807).

**Status**: Shared pattern (apply per epic)

---

## Execution Workflow (Patchy-Style)

### Recommended Dispatch Order

1. **SHARED-1**: Create shared type definitions (prerequisite)
2. **Epic 1 (SV-1 through SV-5)**: Sales Velocity (foundation; required for other epics)
3. **Epic 2 & 3 in parallel**:
   - **Epic 2 (INV-1 through INV-7)**: Inventory Sync + Pricing Rules
   - **Epic 3 (EMAIL-1 through EMAIL-5)**: Email Swipe Library (independent)
4. **Epic 4 (FUNNEL-1 through FUNNEL-5)**: Funnel/OTO Mapping (depends on Epic 1)
5. **Epic 5 (BENCH-1 through BENCH-4)**: Benchmarking (depends on Epic 1 + 2)
6. **Epic 6 (LAUNCH-1 through LAUNCH-7)**: Launch Optimizer (depends on Epic 1)

### Per-Epic Dispatch Pattern

When dispatching an epic (e.g., Epic 2: Inventory Sync):

1. **Create GitHub issue** labeled with epic tag (e.g., `epic:inventory-sync`)
2. **Assign stories** as sub-tasks or separate issues (e.g., `INV-1`, `INV-2`, etc.)
3. **Run `patchy-plan-issue`** on the epic to generate a technical plan
4. **Dispatch each story** sequentially once prior story verifies
5. **Verification gates** (from roadmap):
   - Unit tests pass (`npm test -- src/...test.ts`)
   - TypeScript types check (`tsc --noEmit`)
   - Component snapshot tests pass
   - Integration tests verify IPC ↔ service ↔ renderer flow

### Story-Level Dispatch

When dispatching a story (e.g., SV-1):

1. **Prompt includes**:
   - Story title + acceptance criteria (from backlog)
   - List of files to create/modify (from roadmap)
   - Verification steps (from roadmap)
   - Link to roadmap section for detailed engineering tasks

2. **Agent runs**:
   - Read roadmap section (lines provided)
   - Create/modify files per list
   - Implement per detailed engineering tasks
   - Run verification tests
   - Report: pass/fail + any blocking issues

3. **Verification gate** (before merging):
   - All acceptance criteria met
   - Tests pass
   - Types check
   - No regressions in adjacent code

---

## Metrics & Tracking

### Per-Epic Metrics
- **Stories completed**: X / Y stories shipped
- **Test coverage**: % of stories with unit + integration tests
- **Verification gate pass rate**: % of stories passing verification on first dispatch

### Overall Metrics
- **Roadmap progress**: % of 6 epics shipped (0%, 16%, 33%, 50%, 66%, 83%, 100%)
- **Timeline**: Actual duration vs estimated (from roadmap)
- **Quality**: Test coverage + regressions + post-ship bugs

---

## Appendix: File Checklist (All Phases)

### Main Process Files
- [ ] `src/main/services/salesVelocityStore.ts`
- [ ] `src/main/services/salesDataCache.ts`
- [ ] `src/main/ipc/salesVelocity.ts`
- [ ] `src/main/services/inventorySync.ts`
- [ ] `src/main/services/inventoryRuleEvaluator.ts`
- [ ] `src/main/services/inventoryStore.ts`
- [ ] `src/main/ipc/inventory.ts`
- [ ] `src/main/services/emailLibrary.ts`
- [ ] `src/main/services/emailSuggestions.ts`
- [ ] `src/main/ipc/email.ts`
- [ ] `src/main/services/funnelStore.ts`
- [ ] `src/main/services/conversionAnalyzer.ts`
- [ ] `src/main/ipc/funnel.ts`
- [ ] `src/main/services/benchmarkData.ts`
- [ ] `src/main/services/benchmarkAnalyzer.ts`
- [ ] `src/main/ipc/benchmark.ts`
- [ ] `src/main/services/launchPlanner.ts`
- [ ] `src/main/services/launchExecutor.ts`
- [ ] `src/main/services/launchMonitor.ts`
- [ ] `src/main/ipc/launch.ts`
- [ ] `src/main/ipc/index.ts` (extend with all handlers)

### Renderer Files
- [ ] `src/renderer/src/stores/salesVelocityStore.ts`
- [ ] `src/renderer/src/components/dashboard/SalesVelocityCard.tsx`
- [ ] `src/renderer/src/stores/inventoryStore.ts`
- [ ] `src/renderer/src/pages/InventoryPage.tsx`
- [ ] `src/renderer/src/components/inventory/RuleBuilder.tsx`
- [ ] `src/renderer/src/stores/emailStore.ts`
- [ ] `src/renderer/src/pages/EmailLibraryPage.tsx`
- [ ] `src/renderer/src/components/email/EmailTemplateBrowser.tsx`
- [ ] `src/renderer/src/components/email/CopyAISuggestions.tsx`
- [ ] `src/renderer/src/stores/funnelStore.ts`
- [ ] `src/renderer/src/pages/FunnelPage.tsx`
- [ ] `src/renderer/src/components/funnel/FunnelFlowDiagram.tsx`
- [ ] `src/renderer/src/components/funnel/StepEditor.tsx`
- [ ] `src/renderer/src/stores/benchmarkStore.ts`
- [ ] `src/renderer/src/pages/BenchmarkPage.tsx`
- [ ] `src/renderer/src/components/benchmark/BenchmarkChart.tsx`
- [ ] `src/renderer/src/stores/launchStore.ts`
- [ ] `src/renderer/src/pages/LaunchOptimizerPage.tsx`
- [ ] `src/renderer/src/components/launch/ChannelSequencer.tsx`
- [ ] `src/renderer/src/components/launch/BudgetAllocator.tsx`

### Preload Bridge
- [ ] `src/preload/index.ts` (extend with all feature APIs)

### Library & Config
- [ ] `library/email-templates.json`
- [ ] `benchmark-data-{industry}-{quarter}.json` (sample)
- [ ] `src/types/ecommerce.ts` (shared types)

---

## Summary

This backlog organizes the `ECOMMERCE_FEATURES_ROADMAP.md` into **6 epics** with **32 executable stories**, ready for Patchy-style dispatch-to-verify workflows. Each story includes acceptance criteria, file lists, and verification steps. Epics can be executed sequentially or in parallel per dependencies, with shared infrastructure (types, error handling, workspace scoping) applied cross-cutting.

**Key supports for backlog-to-dispatch-to-verify**:
- **Epic labels** for grouping related work
- **Story IDs** (SV-1, INV-2, EMAIL-5, etc.) for referencing specific tasks
- **Acceptance criteria** per story for verification gates
- **File lists** per story (from roadmap) for dispatch clarity
- **Roadmap cross-refs** (line numbers) to detailed engineering tasks
- **Verification steps** (from roadmap) to confirm completion

Use this document to:
1. Create GitHub issues per epic/story
2. Label issues with `epic:*`, `story:*` tags
3. Dispatch to agents with story ID + acceptance criteria + roadmap line ref
4. Verify per acceptance criteria + test suite
5. Track progress as stories ship
