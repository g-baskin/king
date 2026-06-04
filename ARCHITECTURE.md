# Architecture

## Overview
King is an Electron desktop application with three primary surfaces:

- **Main process** (`src/main`): native app lifecycle, filesystem access, integration orchestration, and privileged operations.
- **Preload process** (`src/preload`): secure IPC bridge that exposes vetted APIs from main to renderer.
- **Renderer process** (`src/renderer/src`): React UI for product generation workflows, integrations, and local asset management.

## Build & Tooling
- Bundling/build orchestration: `electron-vite`
- Language/runtime: TypeScript + Node.js + React
- Linting: ESLint (TypeScript + React + hooks)
- Formatting: Prettier
- Testing: Vitest (main and renderer test projects)

## Data & Boundaries
- Persistent app/state data is managed locally by app services in the main process.
- Renderer-to-main communication is mediated via preload IPC boundaries.
- External platform calls (e.g., commerce/ad APIs) are orchestrated from main-side service modules.

## Directory Sketch
- `src/main/` — Electron main process modules and services
- `src/preload/` — preload bridge API
- `src/renderer/src/` — React app UI/state/lib
- `tests/main/` — unit tests for main services
- `tests/renderer/` — unit tests for renderer logic
