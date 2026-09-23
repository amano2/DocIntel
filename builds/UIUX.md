# UIUX.md — Design System & Screen Specification (Master Prompt)

## Document Control
- **Product:** DocIntel — Multimodal Document Intelligence Agent
- **Companion documents:** `PRD.md` (what to build), `TRD.md` (how it's wired), `BACKEND_SCHEMA.md` (data it renders)
- This document is the single source of truth for visual design, component sourcing, and screen-by-screen UX. Do not introduce a second design language, a second Button, or a second color-token system anywhere in the frontend.

## Project Identity
You are acting as the design engineer building DocIntel's frontend: React 19 + Vite + Tailwind CSS v4, with components sourced from the libraries specified below rather than hand-rolled from scratch wherever a good match exists. The reference screenshot (a dark-mode fintech dashboard, referred to below as "the reference") sets the visual bar: dense, confident, glassmorphic, data-forward. DocIntel is not a bank — every element below has been translated from the reference's finance-dashboard vocabulary into document-intelligence terms.

## Reading the Reference
The reference shows:
- A near-black background with glassmorphic cards (soft rounded corners, subtle borders, faint inner glow) — no flat, borderless panels.
- A persistent left sidebar, grouped into labeled sections (General / Tools / Insights / Shouts / Others), each item an icon + label, with a user profile card pinned at the bottom.
- A top bar with a global search field, a notification bell, and a primary export/action button.
- A row of KPI cards up top (three balance cards with a trend chip).
- A large "hero" card (Available Balance) with primary actions (Withdraw / History) and a secondary quick-actions panel (My Card) beside it.
- A grid of quick-action icons (Transfer, Scan, Top up, Partner, Promo, Wallet, Invest, More).
- A large chart card (Cashflow, monthly/yearly toggle) with an interactive tooltip callout on a specific data point ("insight").
- A recent-activity list with per-row brand icon, name, date, and amount.

## Translating the Reference to DocIntel
Every element above has a direct equivalent — do not copy financial language into a document-intelligence product.

| Reference element | DocIntel equivalent |
|---|---|
| Sidebar sections (General/Tools/Insights/Shouts/Others) | **General** (Dashboard) · **Workspace** (Review, Ask, Benchmark) · **Insights** (Analytics, Audit Trail) · **Account** (Billing, Team, Settings) |
| 3 balance KPI cards | **Documents Processed**, **Anomalies Flagged**, **Est. Time Saved** — each with a trend chip vs. the prior period |
| "Available Balance" hero + Withdraw/History | **Processing Queue** hero card — count of documents in flight, with **Upload** and **Export** as the two primary actions |
| "My Card" panel | **Plan & Usage** card — current tier (Starter/Growth/Enterprise), docs used vs. limit this period, upgrade CTA |
| Quick-action icon grid | **Upload**, **Ask**, **Review**, **Benchmark** — four quick-launch tiles to the product's core workflows |
| Cashflow bar chart + "insight" tooltip | **Processing Volume** or **Anomalies by Severity** chart, with a callout tooltip on the highest-anomaly day |
| Recent Activity list (brand icon, name, date, amount) | **Recent Documents** list — doc-type icon, filename, upload time, confidence/status badge in place of an amount |
| "US Dollar" currency selector | **Document type filter** (All / Invoice / Contract / Compliance / PO / Tax Form) |

## Tech Stack for UI

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 19 + Vite | Already the project's frontend base |
| Styling | Tailwind CSS v4 | Token-driven; see Design Tokens below |
| Component primitives | **shadcn/ui**, sourced via **21st.dev** | 21st.dev is a registry (not a single-vendor library) of React + Tailwind components built on shadcn/ui conventions. Install via the shadcn CLI pointed at the 21st registry (`npx shadcn@latest add "https://21st.dev/r/<author>/<component>"`), or pull components directly through the 21st MCP from inside the coding agent. Components are copied into the repo as owned source, not installed as an opaque dependency — expect to restyle them to match the tokens below. |
| Charts & data visualization | **Bklit UI** | A shadcn-registry chart library (Area, Bar, Funnel, Candlestick, Gauge, Radar, Sankey, and more) built on Visx + Motion, with token-based theming (`--chart-1` through `--chart-5` for series, `--chart-scale-01..05` for heatmaps). This is the library for the Processing Volume / Anomalies chart and any future data-viz — do not hand-roll charts with a second charting library. |
| Micro-interactions | **Anime.js v4** | Used *only* for bespoke motion a CSS transition can't express: KPI number count-up on dashboard load, staggered entrance of the Recent Documents list, the upload-progress stepper's stage transitions, and toast enter/exit. In React, use the official pattern: `createScope({ root }).add(...)` inside a `useEffect`, cleaned up on unmount. Anything achievable with a Tailwind transition or Bklit's built-in Motion-based chart animation should use that instead — do not reach for Anime.js by default. |

## Design Tokens

**Theme:** dark mode is the default and the primary design target (matching the reference); light mode is a supported toggle, not an afterthought.

**Color:**
- Background/surface tokens: `--background` (near-black), `--card` (slightly lighter, semi-transparent for the glassmorphic effect), `--border` (low-opacity hairline)
- Accent: 5 selectable palettes carried over from the existing design system — Electric Cyan, Emerald Pulse, Solar Amber, **Royal Violet** (default, matches the reference's purple/violet gradient), Cobalt Azure
- Semantic: success/high-confidence = green, warning/medium-confidence = amber, danger/high-severity anomaly = red — these map directly onto the existing `CONFIDENCE_THRESHOLD_HIGH` / `CONFIDENCE_THRESHOLD_MEDIUM` values from `TRD.md`, so a field's color in the UI must always agree with its actual confidence bucket, never be styled independently of it.

**Surface treatment:** glassmorphism — rounded corners (16–20px radius), 1px low-opacity border, subtle backdrop-blur, soft inner glow on hover/focus. Applied consistently to every card; do not mix flat and glassmorphic cards on the same screen.

**Typography:** a single type scale shared across the whole app (display / heading / body / caption / mono-for-numbers) — large, confident numerals for KPI values, matching the reference's oversized balance figures.

**Background texture:** dot-grid background pattern on empty canvas areas, consistent with the existing 35KB design-system file — do not introduce a second background treatment.

## Layout System
- Persistent left sidebar (collapses to an icon rail on tablet, a drawer on mobile), grouped sections as in the translation table above, user profile pinned at the bottom with a plan badge.
- Top bar: global search (with a keyboard shortcut hint), notification bell, primary action button (Export or Upload depending on screen).
- Main content area: responsive card grid — KPI row, hero + secondary card row, chart + list row — mirroring the reference's density, not a sparse single-column layout.

## Screen-by-Screen Specification

**1. Landing (public, pre-auth)**
Hero section stating the problem/solution in one screen (reuse `PRD.md`'s problem statement), a pricing table (the 3 finalized tiers), and a primary CTA into Auth. This is the only screen that should feel like a marketing page rather than a product surface.

**2. Auth**
Login/signup via Supabase email/password. Keep it to a single centered card, no sidebar. On success, route into the Dashboard with the JWT attached to all subsequent API calls.

**3. Dashboard** (the screen the reference most directly maps to)
KPI row (Documents Processed / Anomalies Flagged / Est. Time Saved) → Processing Queue hero + Plan & Usage card → quick-launch tiles (Upload/Ask/Review/Benchmark) → Processing Volume or Anomalies-by-Severity chart (Bklit) with a callout tooltip on a notable point → Recent Documents list.

**4. Review Console**
Split-screen: document preview (PDF/image) on the left, extracted fields on the right. Every field shows its value, a confidence-colored badge (green/amber/red per the shared thresholds), and is click-to-correct. Anomaly flags appear inline near the field they relate to, with a drill-down panel for details and severity.

**5. Ask (RAG Studio)**
Chat interface for cross-document Q&A, each answer showing its cited source document(s). A "Compare Mode" toggle scopes the query to a selected subset of documents.

**6. Benchmark**
Live accuracy metrics: overall and per-type precision/recall/F1, a confusion matrix, and pipeline latency — sourced from stored eval runs (`BACKEND_SCHEMA.md` → `eval_runs`), never hardcoded into the frontend.

**7. Billing / Team / Settings**
Plan tier, usage this period, upgrade path; account and (future) team settings.

## Interaction & Motion Spec
- Command palette (⌘K) for quick navigation to any document, tab, or action.
- Keyboard shortcuts: `1–4` for main tabs, `U` upload, `E` export, `T` theme toggle, `?` shortcuts guide.
- Real-time upload progress: a stage stepper matching the pipeline's actual progress percentages from `TRD.md` (Ingesting → Classifying → Extracting → Anomaly Detection → Indexing → Completed) — never a fake/simulated progress bar.
- Every data view (Dashboard, Review Console, Ask, Benchmark) defines explicit empty, loading, and error states — no view should ever render a blank card with no explanation.

## Accessibility & Responsiveness
- Maintain WCAG AA contrast minimums against the dark background for all text and status-color badges — glassmorphism must not be allowed to wash out contrast.
- The command palette and all keyboard shortcuts must be fully operable without a mouse.
- Sidebar collapses to an icon rail at tablet widths and a drawer at mobile widths; the card grid reflows to a single column below tablet width.

## Component Sourcing Workflow
1. Check whether a suitable component already exists in the project's `frontend/src/components/`.
2. If not, search 21st.dev (via its MCP inside the coding agent, or the CLI) for a shadcn-compatible match; pull it as owned source and restyle it against this document's tokens.
3. For any chart or data-visualization need, use Bklit UI rather than a general-purpose charting library.
4. Reach for Anime.js only for the specific micro-interactions named above; default to Tailwind transitions or Bklit's built-in Motion-based animation otherwise.
5. Never fork a second Button, Card, or Input — if a pulled component doesn't compose with existing shadcn primitives and tokens, don't use it.

## Definition of Done
- Every screen in the specification above is implemented, dark-mode-first, with a working light-mode toggle.
- Every KPI, chart, and list on the Dashboard is wired to real data from the API (`TRD.md`), never placeholder numbers.
- Confidence-badge colors on the Review Console always match the shared threshold constants — verified, not just visually similar.
- Command palette and all keyboard shortcuts are implemented and accessible.
- No component library beyond shadcn/21st.dev (primitives), Bklit UI (charts), and Anime.js (named micro-interactions) has been introduced.
