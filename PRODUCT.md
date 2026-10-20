# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are warehouse leads and supervisors at SPINDO Unit 5 Karawang who need to see capacity risk across pipe and coil storage at a glance. Staff operasional use the same dashboard to upload SAP extracts, verify incoming packaging, reconcile stock opname, and keep daily records current. Administrators manage users, roles, capacity limits, snapshots, and data resets.

## Product Purpose

SPINDO Warehouse Analytics turns uploaded SAP warehouse extracts into one operational view of stock, capacity, quality, and fulfillment. It exists so the warehouse team can stop reconciling spreadsheets by hand and instead see which warehouse is over capacity, which stock is slow-moving or non-conforming, which customer orders are exposed, and what needs action today. Success means a lead can identify the highest-risk warehouse and the next action within seconds of opening the dashboard.

## Positioning

A single warehouse cockpit that combines SAP uploads, per-warehouse capacity limits, stock-quality views, LOO fulfillment, packaging workflows, date snapshots, and role-based access in one place. The product is not a generic BI tool: its vocabulary, thresholds, and calculations are specific to SPINDO's pipe and coil operations.

## Operating Context

- Used on desktop browsers in a warehouse office, with occasional tablet and phone access for quick checks.
- Data arrives as SAP Excel extracts and is uploaded by authorized users, then saved as dated snapshots.
- Operational language is Indonesian; dates and times use WIB.
- The core monitoring model compares `stock` against `kapasitas` per `gudang`, then explains the result through WIP/FG, LT/ST, customer stock, free stock, quality grade, slow-moving status, and LOO fulfillment.
- Warehouse leads need warning states (normal, priority, critical, overcapacity) to be unambiguous and consistent across charts, cards, and tables.
- Admins can change capacity masters, manage users and roles, and reset data; staff have view and limited edit access.

## Capabilities and Constraints

- Tabs: Stock Pipa vs Kapasitas, Fast vs Slow Moving, Coil & Strip, Stock NC, Progres NC, Stock Opname, Audit SLoc, Stock Pipa vs LOO, UNFIFO, Packaging Rusak, Incoming Packaging, Packaging Master, Master Kapasitas, and Kelola Pengguna.
- Uploads, snapshots, capacity settings, user management, and destructive resets are permission-gated.
- Authentication uses a server-issued HttpOnly session cookie; no credentials or privileged Supabase keys may be exposed to the browser.
- Built with Next.js 15, React 19, Tailwind CSS 4, Chart.js, and Lucide icons.
- Existing product terminology, calculations, data fields, and workflows must be preserved.
- The interface is data-dense and must remain usable at 1280–1920 px desktop widths and at 390 px mobile width.
- The current visual implementation is the incumbent system. A redesign may replace its look but not its product truth, features, or terminology.

## Brand Commitments

- Product name: SPINDO Warehouse Analytics Dashboard; operating unit: SPINDO Unit 5 Karawang.
- The SPINDO logo at `public/spindo-logo.png` must remain visible and unaltered.
- The redesign brief commits to a modern, interactive, clean interface with a 60/30/10 composition: porcelain/off-white as the dominant ground, pine green as the structural color, and amber as the action and risk accent.

## Evidence on Hand

- Real product data structures and representative records live in `src/lib/mockData.ts`, `src/types/warehouse.ts`, and the Supabase snapshot tables.
- The live application has working upload, snapshot, permission, and dashboard flows.
- Brand assets: `public/spindo-logo.png`, `public/warehouse-illustration.webp`, `src/app/icon.png`.
- No customer testimonials, marketing claims, benchmarks, or pricing evidence exist; future work must not invent them.

## Product Principles

1. Risk first: surface the warehouse that needs attention before secondary detail.
2. One source of truth: every number traces to an uploaded snapshot and its timestamp.
3. Dense but calm: show a lot without making the operator hunt or squint.
4. Preserve the operator's language: keep Indonesian labels and established warehouse terms.
5. Action follows insight: every warning should make the next step obvious.

## Accessibility & Inclusion

No formal accessibility standard has been established. The redesign should provide readable contrast, visible keyboard focus, semantic controls, and usable touch targets, especially for staff working quickly on shared warehouse machines.
