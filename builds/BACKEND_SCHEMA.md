# BACKEND_SCHEMA.md — Data Model & Backend Master Prompt

## Document Control
- **Product:** DocIntel — Multimodal Document Intelligence Agent
- **Companion documents:** `PRD.md` (why), `TRD.md` (API contract this schema serves), `UIUX.md` (screens this data renders)
- Database: **Supabase (Postgres + Row-Level Security)**. Deployment: **Vercel** (frontend static + Python serverless backend). This document is the single source of truth for tables, policies, storage, and auth configuration.

## Project Identity
You are acting as the backend/data engineer responsible for DocIntel's Supabase schema. Every table holding user data must ship with Row-Level Security from the moment it's created — RLS is not a hardening pass applied later, it is part of the table's definition.

## Hard Constraints
- **RLS on every table, no exceptions.** A table without RLS enabled is not considered done, even if the API happens to filter correctly today.
- **No service-role key outside trusted server contexts.** It is never sent to the frontend, never referenced in any `VITE_`-prefixed environment variable, and only used in the Vercel serverless function environment where required.
- **Schema changes go through migrations.** No hand-edits in the Supabase dashboard for anything destined for production — every change is a versioned migration file, applied the same way in dev, staging, and prod.
- **Every table with a `user_id` column is scoped by `auth.uid() = user_id`** in its RLS policies — this is the single mechanism multi-tenancy relies on; do not introduce a second isolation mechanism.

## Entity Overview

```
auth.users (Supabase-managed)
    │
    ├── profiles            (1:1 — plan tier, usage counters)
    │
    ├── documents           (1:many — one row per uploaded document)
    │       │
    │       ├── extracted_fields   (many:1 documents — one row per field)
    │       ├── anomalies          (many:1 documents — one row per flag)
    │       └── query_log          (many:1 — RAG Q&A audit trail, references cited doc_ids)
    │
    └── eval_runs           (not user-scoped by document — one row per benchmark run)
```

`organizations` / `memberships` are noted as a **planned V1.1 extension** (see bottom) for team/seat-based accounts implied by the Enterprise tier — the MVP schema below is deliberately per-user, matching the system as built, and should not be complicated with team tables until `PRD.md`'s open question on team accounts is resolved.

## Table Definitions

### `profiles`
Extends `auth.users` with product-specific fields.
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  plan_tier text not null default 'starter' check (plan_tier in ('starter', 'growth', 'enterprise')),
  docs_processed_this_period integer not null default 0,
  period_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Insert happens via a trigger on auth.users signup (see Auth Configuration below), not directly by the client.
```

### `documents`
```sql
create table public.documents (
  doc_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  file_path text not null,              -- Supabase Storage path
  doc_type text check (doc_type in ('invoice','contract','compliance_doc','purchase_order','tax_form','other')),
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  is_scanned boolean not null default false,
  total_pages integer,
  extracted_text text,
  upload_time timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

create index documents_user_upload_idx on public.documents (user_id, upload_time desc);
```

### `extracted_fields`
```sql
create table public.extracted_fields (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.documents(doc_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  field_name text not null,
  field_value text,
  confidence numeric(3,2) not null check (confidence >= 0 and confidence <= 1),
  source text,                          -- e.g. page/region provenance
  corrected boolean not null default false,
  corrected_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.extracted_fields enable row level security;

create policy "fields_select_own" on public.extracted_fields
  for select using (auth.uid() = user_id);
create policy "fields_insert_own" on public.extracted_fields
  for insert with check (auth.uid() = user_id);
create policy "fields_update_own" on public.extracted_fields
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index fields_doc_idx on public.extracted_fields (doc_id);
```

### `anomalies`
```sql
create table public.anomalies (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.documents(doc_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_name text not null,
  description text not null,
  severity text not null check (severity in ('high','medium','low')),
  status text not null default 'open' check (status in ('open','acknowledged','dismissed')),
  created_at timestamptz not null default now()
);

alter table public.anomalies enable row level security;

create policy "anomalies_select_own" on public.anomalies
  for select using (auth.uid() = user_id);
create policy "anomalies_insert_own" on public.anomalies
  for insert with check (auth.uid() = user_id);
create policy "anomalies_update_own" on public.anomalies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index anomalies_user_severity_idx on public.anomalies (user_id, severity);
create index anomalies_doc_idx on public.anomalies (doc_id);
```

### `query_log` (recommended addition — RAG Q&A audit trail)
Not explicit in the original build, but needed so "Ask" queries are as auditable as extraction and anomaly actions.
```sql
create table public.query_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  cited_doc_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.query_log enable row level security;

create policy "query_log_select_own" on public.query_log
  for select using (auth.uid() = user_id);
create policy "query_log_insert_own" on public.query_log
  for insert with check (auth.uid() = user_id);
```

### `eval_runs` (recommended addition — persists Benchmark tab data)
So the Benchmark screen (`UIUX.md`) reads real, re-runnable results instead of a static file.
```sql
create table public.eval_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  overall_accuracy numeric(5,4),
  precision numeric(5,4),
  recall numeric(5,4),
  f1 numeric(5,4),
  avg_latency_seconds numeric(6,3),
  straight_through_rate numeric(5,4),
  per_type_results jsonb not null default '{}'::jsonb
);

alter table public.eval_runs enable row level security;
-- eval_runs is not per-user data (it's a system benchmark), so policy allows read to any authenticated user:
create policy "eval_runs_select_authenticated" on public.eval_runs
  for select using (auth.role() = 'authenticated');
-- Inserts happen only from the eval pipeline via a service-role context, never from client code.
```

## Storage
- Bucket: `documents` (private, not public).
- Path convention: `${user_id}/${doc_id}/${filename}` — this mirrors the RLS pattern and makes storage policies straightforward.
```sql
create policy "storage_select_own"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage_delete_own"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
```

## Migrations Workflow
- Use the Supabase CLI: `supabase migration new <descriptive_name>` to scaffold, write SQL in the generated file, `supabase db push` (or CI-driven deploy) to apply.
- Every table and policy above should exist as its own migration file, in dependency order (`profiles` → `documents` → `extracted_fields`/`anomalies`/`query_log` → `eval_runs` → storage policies).
- Never apply a schema change directly in the Supabase dashboard SQL editor for anything meant to reach production — the dashboard is for inspection and local experimentation only.

## Auth Configuration
- Provider: Supabase Auth, email/password.
- On signup, a database trigger inserts the corresponding `profiles` row (do not rely on client-side inserts for this — a client that never calls it would leave a user without a profile).
- JWT is attached by the Supabase client on the frontend (`supabase.auth.getSession()`) and forwarded as `Authorization: Bearer <token>` on every API call; the FastAPI backend's `HTTPBearer` dependency extracts it to build a request-scoped, RLS-respecting database client.
- Configure redirect URLs for both the Vercel preview domains and the production domain in the Supabase Auth settings — a missing preview-domain entry is a common cause of "auth works locally, breaks on preview deploys."

## Vercel + Supabase Integration Notes
- Server-side (Vercel Python function): `SUPABASE_URL`, `SUPABASE_ANON_KEY` — plus `service_role` only where a genuinely privileged server-side operation requires it (e.g. the `eval_runs` insert from the evaluation pipeline), never for ordinary request handling.
- Build-time (frontend): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — the anon key is safe to expose because RLS, not key secrecy, is what actually protects the data.
- Be aware of serverless cold-start behavior when initializing the Supabase client in `api/main.py` — initialize once at module scope, not per-request.

## Planned V1.1 Extension — Organizations (not built yet)
If/when team accounts are needed for the Enterprise tier:
```sql
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier text not null default 'enterprise',
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
```
This would require revisiting every RLS policy above to check organization membership in addition to (or instead of) direct `user_id` ownership — do not attempt this piecemeal; it's a single coordinated migration when the product actually needs it, per `PRD.md`'s open question.

## Definition of Done
- Every table above exists as a migration, with RLS enabled and policies matching this document exactly.
- A direct database-level test (not just an API-level test) confirms one user cannot read, insert, update, or delete another user's rows in any table.
- Storage policies verified the same way, at the storage-object level.
- The signup trigger reliably creates a `profiles` row for every new `auth.users` entry, with no client-side dependency.
- `eval_runs` is populated by `run_eval.py` (see `TRD.md`) and readable by the Benchmark screen for any authenticated user.
