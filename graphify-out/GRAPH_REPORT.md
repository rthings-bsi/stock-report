# Graph Report - .  (2026-09-12)

## Corpus Check
- 78 files · ~84,096 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 409 nodes · 766 edges · 39 communities (18 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Coil & Strip Customizable Views
- Application Routing & Authentication Pages
- Production Dependencies & Libraries
- Warehouse API Route Handlers
- Damaged & Incoming Packaging Views
- Development Tooling & Tailwind Setup
- TypeScript Configurations & Env Types
- UI Component Library & Badges
- NC Progress Tracking & Excel Export
- SAP Raw Data & Dimensional Parsers
- Architecture & Deployment Documentation
- Inventory Classification & Stock Matching
- Warehouse Inventory Donut & Bar Charts
- Supabase Integration Test 1
- Supabase Integration Test 2
- Supabase Integration Test 3
- Supabase Integration Test 4
- Supabase Table Creation Test
- SQLite Webpack Database Fix
- Webpack Bundler Database Patch
- User Database Migration Scripts
- Next.js Root Layout & Meta
- Non-Conformity Grade Donut Charts
- Next.js Build Configuration
- Non-Conformity Quality Grades
- Returnable Transport Packaging Defect Docs
- Role Access Testing
- SPINDO Brand Identity Assets
- Coil & Strip Raw Material Docs
- UnFIFO Anomaly Tracking Docs
- Corporate Emerald Design System
- NPM Local Development Scripts
- Application Favicon & Assets

## God Nodes (most connected - your core abstractions)
1. `NCProgressView()` - 18 edges
2. `formatTon()` - 18 edges
3. `CardWidth` - 17 edges
4. `ParsedWarehouseState` - 16 edges
5. `formatQty()` - 16 edges
6. `compilerOptions` - 16 edges
7. `formatPercent()` - 15 edges
8. `parseExcelFiles()` - 12 edges
9. `cn()` - 12 edges
10. `IncomingPackagingView()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Supabase Database Setup Instructions` --semantically_similar_to--> `Supabase PostgreSQL Snapshot Table DDL`  [INFERRED] [semantically similar]
  DEPLOYMENT.md → spindo_obsidian/05 - Deployment & Environment.md
- `Vercel Deployment Process` --semantically_similar_to--> `Vercel Production Deployment Workflow`  [INFERRED] [semantically similar]
  DEPLOYMENT.md → spindo_obsidian/05 - Deployment & Environment.md
- `Home()` --references--> `react`  [EXTRACTED]
  src/app/page.tsx → package.json
- `exportNCProgressToExcel()` --references--> `xlsx`  [EXTRACTED]
  src/lib/exportNCProgressExcel.ts → package.json
- `readExcelFile()` --references--> `xlsx`  [EXTRACTED]
  src/lib/parser.ts → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dual-Mode Persistence Architecture** — spindo_obsidian_01_architecture_database_dual_mode_dual_mode_persistence, spindo_obsidian_01_architecture_database_dual_mode_supabase_cloud_primary, spindo_obsidian_01_architecture_database_dual_mode_sqlite_local_fallback, spindo_obsidian_05_deployment_environment_env_config [EXTRACTED 1.00]
- **LOO Order Fulfillment Pipeline** — spindo_obsidian_02_sap_domain_business_logic_loo_order_fulfillment_logic, spindo_obsidian_02_sap_domain_business_logic_st_lt_length_classification, spindo_obsidian_03_warehouse_modules_views_loo_fulfillment_module, spindo_obsidian_04_ui_anti_slop_guidelines_chartjs_conventions [INFERRED 0.85]
- **Enterprise UI and Anti-Slop System** — spindo_obsidian_04_ui_anti_slop_guidelines_anti_slop_rule, spindo_obsidian_04_ui_anti_slop_guidelines_color_palette_60_30_10, spindo_obsidian_04_ui_anti_slop_guidelines_ui_component_standards, spindo_obsidian_03_warehouse_modules_views_customizable_card_shell [INFERRED 0.85]

## Communities (39 total, 21 thin omitted)

### Community 0 - "Coil & Strip Customizable Views"
Cohesion: 0.09
Nodes (45): CardState, CoilStripView(), DEFAULT_CARDS, CardLayoutItem, CardWidth, COL_SPAN_MAP, CustomizableCard(), CustomizableCardProps (+37 more)

### Community 1 - "Application Routing & Authentication Pages"
Cohesion: 0.08
Nodes (35): Home(), TabType, VALID_TABS, LoginPage(), LoginPageProps, MONTH_NAMES, Navbar(), NavbarProps (+27 more)

### Community 2 - "Production Dependencies & Libraries"
Cohesion: 0.06
Nodes (33): bcryptjs, better-sqlite3, chart.js, class-variance-authority, clsx, exceljs, lucide-react, next (+25 more)

### Community 3 - "Warehouse API Route Handlers"
Cohesion: 0.11
Nodes (21): DELETE(), GET(), getLocalDb(), POST(), GET(), getLocalDb(), POST(), GET() (+13 more)

### Community 4 - "Damaged & Incoming Packaging Views"
Cohesion: 0.15
Nodes (21): DamagedPackagingView(), DamagedPackagingViewProps, DEFAULT_CARDS, EMPTY_FORM, formatDisplayDate(), getTodayIsoString(), IncomingPackagingView(), IncomingPackagingViewProps (+13 more)

### Community 5 - "Development Tooling & Tailwind Setup"
Cohesion: 0.07
Nodes (27): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/bcryptjs, @types/better-sqlite3, @types/node, @types/react (+19 more)

### Community 6 - "TypeScript Configurations & Env Types"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 7 - "UI Component Library & Badges"
Cohesion: 0.09
Nodes (22): MetricCard(), MetricCardProps, Badge(), BadgeProps, badgeVariants, Button, ButtonProps, buttonVariants (+14 more)

### Community 8 - "NC Progress Tracking & Excel Export"
Cohesion: 0.22
Nodes (23): DEFAULT_CARDS, GroupedNCItem, NCProgressView(), NCProgressViewProps, SubTabType, exportNCProgressToExcel(), buildNCProgressPipeline(), classifyTransaction() (+15 more)

### Community 9 - "SAP Raw Data & Dimensional Parsers"
Cohesion: 0.16
Nodes (21): CoilStripViewProps, NCQualityViewProps, UploadModalProps, COIL_AREA_LABELS, COIL_CAPACITY_MAP, DIAMETER_MAP, extractPipeDimension(), extractProductionYear() (+13 more)

### Community 10 - "Architecture & Deployment Documentation"
Cohesion: 0.12
Nodes (19): Spindo Vercel and Supabase Deployment Guide, Supabase Database Setup Instructions, Vercel Deployment Process, Spindo Warehouse Dashboard Knowledge Base MOC, Spindo Warehouse Dashboard, Warehouse Snapshot API Route Handlers, Dual-Mode Persistence Architecture, SQLite Local Fallback Database (+11 more)

### Community 11 - "Inventory Classification & Stock Matching"
Cohesion: 0.40
Nodes (5): Finished Goods vs Work in Progress Classification, LOO Stock Matching and Fulfillment Logic, Fast and Slow Moving Inventory Module, LOO Fulfillment View Module, Chart.js Visual and Registerable Conventions

## Knowledge Gaps
- **139 isolated node(s):** `fs`, `code`, `fs`, `code`, `nextConfig` (+134 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Production Dependencies & Libraries` to `Development Tooling & Tailwind Setup`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Why does `Home()` connect `Application Routing & Authentication Pages` to `Coil & Strip Customizable Views`, `Production Dependencies & Libraries`, `UI Component Library & Badges`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `react` connect `Production Dependencies & Libraries` to `Application Routing & Authentication Pages`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `fs`, `code`, `fs` to the rest of the system?**
  _139 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Coil & Strip Customizable Views` be split into smaller, more focused modules?**
  _Cohesion score 0.08944793850454227 - nodes in this community are weakly interconnected._
- **Should `Application Routing & Authentication Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.08383838383838384 - nodes in this community are weakly interconnected._
- **Should `Production Dependencies & Libraries` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._