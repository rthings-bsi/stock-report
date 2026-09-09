# Graph Report - .  (2026-09-09)

## Corpus Check
- Corpus is ~48,504 words - fits in a single context window. You may not need a graph.

## Summary
- 300 nodes · 537 edges · 28 communities (17 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Damaged Packaging & Excel Parser
- Coil Strip & Customizable Cards
- TypeScript & Next.js Type Definitions
- Build & Dev Dependencies
- Core Runtime Dependencies
- Dashboard Page & Theme Management
- UI Metric Cards & Atoms
- Architecture & Deployment Knowledge Base
- Auth Login & Navigation Header
- Warehouse API & Supabase Client
- SAP Business Logic & Fulfillment
- Warehouse Inventory Donut & Bar Charts
- SQLite Local Persistence Store
- Root Application Layout
- Quality Non-Conformity Charts
- Next.js Build Configuration
- NC Quality Grades & Views
- RTP Damaged Packaging Classification
- Brand Assets & Visual Logo
- Raw Material Coil Strip Logic
- UnFIFO Anomaly Tracking Logic
- Design System & Emerald Palette
- Development & Build Scripts

## God Nodes (most connected - your core abstractions)
1. `formatTon()` - 16 edges
2. `compilerOptions` - 16 edges
3. `CardWidth` - 15 edges
4. `ParsedWarehouseState` - 15 edges
5. `formatQty()` - 14 edges
6. `formatPercent()` - 13 edges
7. `parseExcelFiles()` - 10 edges
8. `cn()` - 10 edges
9. `CustomizableCard()` - 8 edges
10. `WarehousePipeCapacity` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Supabase Database Setup Instructions` --semantically_similar_to--> `Supabase PostgreSQL Snapshot Table DDL`  [INFERRED] [semantically similar]
  DEPLOYMENT.md → spindo_obsidian/05 - Deployment & Environment.md
- `Vercel Deployment Process` --semantically_similar_to--> `Vercel Production Deployment Workflow`  [INFERRED] [semantically similar]
  DEPLOYMENT.md → spindo_obsidian/05 - Deployment & Environment.md
- `Home()` --references--> `react`  [EXTRACTED]
  src/app/page.tsx → package.json
- `UnfifoView()` --references--> `react`  [EXTRACTED]
  src/components/UnfifoView.tsx → package.json
- `IncomingPackagingView()` --references--> `xlsx`  [EXTRACTED]
  src/components/IncomingPackagingView.tsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Mode Persistence Architecture** — spindo_obsidian_01_architecture_database_dual_mode_dual_mode_persistence, spindo_obsidian_01_architecture_database_dual_mode_supabase_cloud_primary, spindo_obsidian_01_architecture_database_dual_mode_sqlite_local_fallback, spindo_obsidian_05_deployment_environment_env_config [EXTRACTED 1.00]
- **LOO Order Fulfillment Pipeline** — spindo_obsidian_02_sap_domain_business_logic_loo_order_fulfillment_logic, spindo_obsidian_02_sap_domain_business_logic_st_lt_length_classification, spindo_obsidian_03_warehouse_modules_views_loo_fulfillment_module, spindo_obsidian_04_ui_anti_slop_guidelines_chartjs_conventions [INFERRED 0.85]
- **Enterprise UI and Anti-Slop System** — spindo_obsidian_04_ui_anti_slop_guidelines_anti_slop_rule, spindo_obsidian_04_ui_anti_slop_guidelines_color_palette_60_30_10, spindo_obsidian_04_ui_anti_slop_guidelines_ui_component_standards, spindo_obsidian_03_warehouse_modules_views_customizable_card_shell [INFERRED 0.85]

## Communities (28 total, 11 thin omitted)

### Community 0 - "Damaged Packaging & Excel Parser"
Cohesion: 0.09
Nodes (46): xlsx, CoilStripViewProps, DamagedPackagingView(), DamagedPackagingViewProps, DEFAULT_CARDS, FastSlowViewProps, EMPTY_FORM, IncomingPackagingView() (+38 more)

### Community 1 - "Coil Strip & Customizable Cards"
Cohesion: 0.13
Nodes (31): CardState, CoilStripView(), DEFAULT_CARDS, CardLayoutItem, CardWidth, CustomizableCard(), CustomizableCardProps, WIDTH_OPTIONS (+23 more)

### Community 2 - "TypeScript & Next.js Type Definitions"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 3 - "Build & Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/better-sqlite3, @types/node, @types/react, @types/react-dom (+17 more)

### Community 4 - "Core Runtime Dependencies"
Cohesion: 0.08
Nodes (25): better-sqlite3, chart.js, class-variance-authority, clsx, lucide-react, next, dependencies, better-sqlite3 (+17 more)

### Community 5 - "Dashboard Page & Theme Management"
Cohesion: 0.16
Nodes (18): Home(), UIThemeModal(), UIThemeModalProps, initialDamagedPackagingData, initialIncomingPackagingData, initialCoilStripData, initialFastSlowData, initialNCItems (+10 more)

### Community 6 - "UI Metric Cards & Atoms"
Cohesion: 0.11
Nodes (19): MetricCard(), MetricCardProps, Badge(), BadgeProps, badgeVariants, Card, CardContent, CardDescription (+11 more)

### Community 7 - "Architecture & Deployment Knowledge Base"
Cohesion: 0.12
Nodes (19): Spindo Vercel and Supabase Deployment Guide, Supabase Database Setup Instructions, Vercel Deployment Process, Spindo Warehouse Dashboard Knowledge Base MOC, Spindo Warehouse Dashboard, Warehouse Snapshot API Route Handlers, Dual-Mode Persistence Architecture, SQLite Local Fallback Database (+11 more)

### Community 8 - "Auth Login & Navigation Header"
Cohesion: 0.17
Nodes (13): LoginPage(), LoginPageProps, MONTH_NAMES, Navbar(), NavbarProps, SnapshotMeta, Button, ButtonProps (+5 more)

### Community 9 - "Warehouse API & Supabase Client"
Cohesion: 0.48
Nodes (5): DELETE(), GET(), getLocalDb(), POST(), isSupabaseConfigured

### Community 10 - "SAP Business Logic & Fulfillment"
Cohesion: 0.40
Nodes (5): Finished Goods vs Work in Progress Classification, LOO Stock Matching and Fulfillment Logic, Fast and Slow Moving Inventory Module, LOO Fulfillment View Module, Chart.js Visual and Registerable Conventions

### Community 12 - "SQLite Local Persistence Store"
Cohesion: 0.40
Nodes (4): Database, db, dbDir, dbPath

## Knowledge Gaps
- **115 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+110 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Core Runtime Dependencies` to `Damaged Packaging & Excel Parser`, `Build & Dev Dependencies`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `react` connect `Core Runtime Dependencies` to `Coil Strip & Customizable Cards`, `Dashboard Page & Theme Management`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _115 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Damaged Packaging & Excel Parser` be split into smaller, more focused modules?**
  _Cohesion score 0.08853410740203194 - nodes in this community are weakly interconnected._
- **Should `Coil Strip & Customizable Cards` be split into smaller, more focused modules?**
  _Cohesion score 0.12550607287449392 - nodes in this community are weakly interconnected._
- **Should `TypeScript & Next.js Type Definitions` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Build & Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._