# TRD.md — Technical Requirement Document (Master Prompt)

## Document Control
- **Product:** DocIntel — Multimodal Document Intelligence Agent
- **Companion documents:** `PRD.md` (product scope/why), `UIUX.md` (design system), `BACKEND_SCHEMA.md` (data model detail)
- This document is the single source of truth for architecture, API contract, and non-functional requirements. Where `GEMINI.md` (the original build prompt) and this document disagree, this document wins — it reflects the system as actually built and hardened.

## Project Identity
You are acting as the technical lead implementing and hardening DocIntel — a multimodal document-intelligence pipeline deployed as a SaaS product on Supabase + Vercel. Every feature in `PRD.md` must be traceable to a concrete implementation described here.

## Hard Constraints
- **100% free tier.** Every model, API, and hosting service must have a free tier or be open-source. No paid services, ever, without an explicit, documented decision to migrate.
- **RLS is mandatory, not optional.** Every table holding user data must have Row-Level Security enabled before it is considered done — see `BACKEND_SCHEMA.md`.
- **No secrets in the frontend bundle.** The Supabase `service_role` key never ships to the client. Only `SUPABASE_ANON_KEY` (public-safe under RLS) is exposed to the browser.
- **No silent failures.** Every pipeline stage and every LLM call either succeeds with a validated result or raises a clear, logged error — never a guessed fallback presented as a real result.

## System Architecture
```
Document Upload (PDF / Image)
        │
        ▼
[1. Ingestion]        src/ingest.py
  • pypdf/PyMuPDF text extraction
  • Pages with < MIN_CHAR_COUNT_FOR_TEXT_LAYER chars → rasterized to PIL Images (200 DPI)
        │
        ▼
[2. Classification]   src/classify.py
  • OpenRouter LLM call (text or vision) → invoice | contract | compliance_doc | purchase_order | tax_form | other
        │
        ▼
[3. Structured Extraction]  src/extract.py
  • Type-specific prompt per doc_type
  • Every field returned as { value, confidence, source } — never a bare value
        │
        ▼
[4. Anomaly Detection]  src/anomaly.py
  • 6 deterministic rule checks + 1 LLM catch-all check
        │
        ├──────────────┬───────────────────
        ▼                              ▼
[5. FAISS Index]              [6. Supabase Postgres]
  src/index.py + rag_qa.py       src/database.py
  Local embeddings, semantic     Audit trail: documents,
  search across corpus           fields, anomalies, corrections
        │                              │
        └──────────────┬───────────────┘
                        ▼
        [7. FastAPI REST API + React/Tailwind frontend]
         api/main.py · frontend/
         Dashboard · Review Console · Ask (RAG Studio) · Benchmark
```

## Tech Stack (locked)

| Layer | Technology | Why |
|---|---|---|
| Multimodal LLM | OpenRouter free models (`nvidia/nemotron-*`, `google/gemma-*`) with automatic vision-model fallback chain | Zero-cost text + vision, replaces paid OCR entirely |
| PDF ingestion | `pypdf`, `pymupdf`, `Pillow` | Native text extraction + rasterization for scanned pages |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) | 100% local, CPU, zero API cost |
| Vector store | `faiss-cpu` (IndexFlatIP) | Local, persistent, exact cosine similarity |
| Backend API | FastAPI + uvicorn | Async REST API with background-thread pipeline execution |
| Frontend | React 19 + Vite + Tailwind CSS v4 | See `UIUX.md` for component sourcing |
| Database | Supabase (Postgres + RLS) | Cloud-hosted, free tier, row-level multi-tenancy |
| Auth | Supabase Auth (email/password, JWT) | Free tier, integrates directly with Postgres RLS via `auth.uid()` |
| Deployment | Vercel (static frontend + Python serverless backend) | Free hobby tier, git-integrated auto-deploy |
| Containerization | Docker Compose | Local dev and self-host convenience, not the primary deployment path |

## API Contract

All endpoints (except `/` and `/health`) require `Authorization: Bearer <JWT>` from Supabase Auth.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health` | Deep probe: DB, FAISS, LLM, worker status |
| POST | `/api/upload` | Upload + process a document (async, backgrounded) |
| GET | `/api/upload/status/{job_id}` | Real-time pipeline progress (stage + %) |
| GET | `/api/documents` | Paginated document list, filterable by type/status |
| GET | `/api/documents/{doc_id}` | Full document detail: fields + anomalies |
| GET | `/api/documents/{doc_id}/preview` | PNG thumbnail of first page |
| POST | `/api/documents/{doc_id}/correct` | Human correction of a field (sets confidence to 1.0, logs correction) |
| GET | `/api/documents/export-all` | Batch export ZIP (JSON manifests + CSV audit ledger) |
| POST | `/api/query` | RAG Q&A with source citations, optional `doc_ids` scope (Compare Mode) |
| GET | `/api/anomalies` | All anomalies, filterable by severity |
| GET | `/api/dashboard/stats` | Executive dashboard metrics + ROI estimate |
| GET | `/api/eval/summary` | Benchmark accuracy results |

**Async upload pipeline stages** (emitted as progress callbacks, forwarded to the frontend via status polling):
```
INGESTING (15%) → CLASSIFYING (35%) → EXTRACTING (60%) → ANOMALY_DETECTION (80%) → INDEXING (92%) → COMPLETED (100%)
```

## Non-Functional Requirements

**Performance**
- Target end-to-end pipeline latency: sub-2s for text-layer documents, sub-5s for vision-path (scanned) documents, measured and reported per the Testing strategy below — treat any number not yet measured against the full corpus as a target, not a claim.

**Scalability**
- Current: background-thread execution per upload, suitable for pilot-scale concurrent usage.
- Documented future path: move to a queue/worker pool (e.g. a task queue backed by Supabase or a lightweight external queue) before promising SLA-backed throughput at the Enterprise tier — this is a V1/V2 decision, not an MVP requirement.

**Security**
- JWT-based auth via Supabase; every API request scoped to the authenticated user's `auth.uid()`.
- RLS enforced at the database layer on every table with user data — the API must never be the only thing standing between one user's data and another's.
- No service-role key in any client-shipped code or environment variable prefixed `VITE_`.

**Reliability**
- OpenRouter calls use an automatic fallback chain across multiple free vision models so a single model's outage or rate limit doesn't take down the pipeline.
- LLM JSON responses are parsed defensively: strip markdown code fences, validate shape, and raise a clear error rather than silently accepting malformed output.

**Observability**
- `/health` performs a deep probe (DB connectivity, FAISS index load, LLM reachability, background worker status), not just a liveness ping.
- Upload progress is real, stage-based telemetry, not a fake progress bar.

**Cost**
- Every new model, API, or service introduced must be verified free-tier before it is added to the stack. Zero-cost compliance is a build gate, not an afterthought.

## Environment & Secrets Management
- Local dev: `.env` (from `.env.example`) with `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Vercel: the same variables set in the dashboard, plus `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for the frontend build.
- Never commit `.env`. `.env.example` documents required variables with no real values.

## Deployment Architecture
- **Vercel (primary):** `package.json` builds the frontend (`frontend/dist`) served as static assets; `api/main.py` deploys as a Python serverless function; `vercel.json` rewrites `/api/*` to the function and everything else to the static frontend.
- **Docker Compose (local/self-host):** two services — `backend` (2.5 CPU / 3GB RAM limit) and `frontend` (1.0 CPU / 512MB RAM limit), with the frontend depending on the backend passing `/health` before starting, and persistent volumes for uploads and the vector store.

## CI/CD
GitHub Actions validates Python syntax, the TypeScript/Vite build, and Docker image packaging on every commit. A red CI run blocks merge — this is a hard gate, not advisory.

## Testing & Evaluation Strategy
- `eval/` holds a 450-document test suite across the 5 supported document types, with ground-truth field values (`test_extraction.json`) and deliberately injected anomalies (`test_anomalies.json`), kept separate from any data used to write prompts.
- `eval/run_eval.py` runs the full pipeline against the test suite and produces `eval_results.json`: overall accuracy, per-type precision/recall/F1, anomaly detection recall/precision, average latency, straight-through processing rate.
- The Benchmark tab in the frontend should read from stored eval runs (see `BACKEND_SCHEMA.md` → `eval_runs`), not a static file, once V1 lands — this makes benchmark numbers auditable and re-run-able rather than a one-time snapshot.

## Error Handling Conventions
- Every module raises typed, descriptive exceptions rather than returning `None` or an empty result on failure.
- The API layer converts internal exceptions into structured JSON error responses with an HTTP status that matches the failure (4xx for bad input/auth, 5xx for pipeline/infra failure) — never a 200 with an error message buried in the body.

## Build Order / Implementation Checklist
1. `config.py` — central configuration, thresholds, supported types
2. `ingest.py` — text + vision ingestion
3. `classify.py` — document type classification
4. `extract.py` — structured extraction with confidence
5. `anomaly.py` — rule-based + LLM anomaly detection
6. `index.py` + `rag_qa.py` — FAISS indexing and RAG Q&A
7. `database.py` — Supabase access layer (see `BACKEND_SCHEMA.md`)
8. `pipeline.py` — orchestration with progress callbacks
9. `openrouter_service.py` — unified LLM client with fallback chain
10. `api/main.py` — FastAPI REST layer
11. `frontend/` — React/Tailwind SaaS UI (see `UIUX.md`)
12. Auth + multi-tenancy wiring (Supabase Auth + RLS)
13. DevOps: Docker Compose, GitHub Actions CI
14. Vercel deployment configuration

## Definition of Done
- Every endpoint in the API Contract is implemented, authenticated, and returns structured errors on failure.
- RLS verified on every table (a user cannot read another user's row, tested directly against the database, not just through the API).
- `/health` reports true status of DB, FAISS, LLM, and workers.
- The 450-document eval suite runs end-to-end via `run_eval.py` and produces a complete `eval_results.json`.
- CI passes on a clean clone with no manual setup beyond `.env` configuration.
- Docker Compose and Vercel deployment paths both work from a clean clone.
