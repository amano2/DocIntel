# PRD.md — Product Requirement Document (Master Prompt)

## Document Control
- **Product:** DocIntel — Multimodal Document Intelligence Agent
- **Companion documents:** `GEMINI.md` (original build prompt), `TRD.md` (technical requirements), `UIUX.md` (design system), `BACKEND_SCHEMA.md` (data model)
- **Status:** MVP built and running (per project walkthrough); this document is the source of truth for product scope going forward — treat it as authoritative over any older, looser description of the product elsewhere in the repo.

## Project Identity
You are acting as a product manager defining what DocIntel is, who it is for, and what it must do — for an LTM assessment's "monetizable AI-trend" project. This document governs product scope and priority. It does not dictate implementation (see `TRD.md`) or visual design (see `UIUX.md`), but every feature built must trace back to a line in this document.

## Problem Statement
Manual document review is the bottleneck for every accounting firm, legal-ops team, and procurement department. A human analyst spends 12–18 minutes per document cross-referencing line items, verifying signatures, and checking contract clauses — at $45/hr, that is $9–$13.50 per document. Worse, human error causes real financial loss: undetected math errors, duplicate invoice submissions, wire-account tampering, and unsigned contracts expose businesses to cash loss and legal liability.

## Product Vision
A SaaS tool that ingests invoices, contracts, and compliance documents (including scanned/photographed ones), extracts structured fields with a confidence score on every value, flags anomalies a human reviewer would otherwise have to catch manually, and answers natural-language questions across the whole document corpus — with every action logged to an auditable trail.

## Target Users & Personas

| Persona | Role | Primary need |
|---|---|---|
| **Mara** | AP/accounting analyst at a mid-market firm | Process 2,000–10,000 invoices/month without missing math errors or duplicates |
| **Devon** | Corporate legal-ops / procurement manager | Vet MSAs, NDAs, and vendor liability terms faster than manual clause-by-clause review |
| **Priya** | Compliance/risk consultant | Track SOC 2, GDPR, and ISO audit deficiencies across a client's document set |
| **Sam** | Finance or ops leader (the buyer) | Needs the ROI case, the audit trail for compliance, and confidence the tool won't silently misreport a number |

## Jobs To Be Done
- As **Mara**, I want to upload a batch of invoices (including scanned ones) and get structured fields back with confidence scores, so I can focus my attention only on what's actually uncertain.
- As **Mara**, I want duplicate invoices and math mismatches flagged automatically, so I don't have to cross-check every line by hand.
- As **Devon**, I want to ask "which contracts have auto-renewal clauses expiring this quarter?" across the whole corpus and get a cited answer, so I don't have to reopen every PDF.
- As **Priya**, I want compliance documents classified and their clause references extracted, so I can track deficiencies without manually re-reading each one.
- As **any reviewer**, I want to correct a wrong extracted value in one click and have that correction logged, so the audit trail reflects the truth, not the model's first guess.
- As **Sam**, I want a dashboard showing documents processed, anomalies caught, and estimated time/cost saved, so I can justify the subscription internally.
- As **Sam**, I want every extraction, flag, and correction logged per-user with row-level security, so the tool is safe to use with sensitive financial documents.

## Feature Set & Prioritization (MoSCoW)

**Must have (in the current MVP):**
- Multimodal ingestion: native-text PDFs and scanned/image-based PDFs
- Type-specific structured extraction (invoice, contract, compliance doc, purchase order, tax form) with `{ value, confidence, source }` on every field
- Rule-based anomaly detection (math mismatch, duplicate invoice number, wire-account change, missing signature, date chronology, auto-renewal cutoff) plus an LLM catch-all check
- RAG Q&A across the document corpus with source citation
- Human-in-the-loop field correction, logged to the audit trail
- Multi-tenant auth (email/password) with per-user data isolation
- Dashboard: documents processed, anomalies by severity, ROI estimate
- Review console: side-by-side document preview and extracted fields with low-confidence highlighting

**Should have (near-term):**
- Benchmark/evaluation view showing live accuracy metrics per document type
- Batch export (ZIP with JSON manifests + CSV audit ledger)
- Command palette and keyboard shortcuts for power users
- Compare Mode in the Ask tab (scope RAG Q&A to a specific subset of documents)

**Could have (later):**
- Team/organization-level accounts with seat-based permissions (beyond the current per-user model)
- Additional document types beyond the current 5
- Multi-language document support

**Won't have (explicitly out of scope for this iteration):**
- Integration with any real ERP/accounting system (SAP, QuickBooks, NetSuite)
- Automated fraud verdicts — the product flags for human review, it never accuses or auto-rejects
- Non-English document support
- On-prem/self-hosted deployment as a supported product tier (Docker Compose exists for local dev/self-host convenience only, not as a sold product)

## Success Metrics / KPIs

**Product health:**
- Straight-through processing rate (documents needing zero human correction)
- Field extraction precision/recall per document type
- Anomaly detection recall (catches injected/real anomalies) and false-positive rate
- Average end-to-end pipeline latency per document

**Business health:**
- Monthly active documents processed (proxy for usage-based revenue)
- Trial-to-paid conversion rate
- Monthly churn and net revenue retention
- CAC payback period against the $199–$1,200+/mo tiers

These are targets to instrument and track, not numbers to assume — actual measured values belong in evaluation reports (`TRD.md` → Testing & Evaluation Strategy), not in this document.

## Pricing & Packaging (finalized)

| Tier | Price | Volume |
|---|---|---|
| Starter (SMB) | $199/mo | Up to 1,500 docs |
| Growth (Mid-Market) | $499/mo | Up to 5,000 docs |
| Enterprise | $1,200+/mo | Unlimited + SLA |

**ROI case:** ~90% reduction in manual review time (15 min → 90 sec/doc). At 3,000 docs/month, this is roughly 675 analyst-hours saved, or ~$30,375/month at a $45/hr blended rate.

## Release Phases
- **MVP (built):** end-to-end pipeline, dashboard, review console, RAG Q&A, multi-tenant auth, audit trail — as described in the Must-have list above.
- **V1 (near-term):** full-scale evaluation against the 450-document benchmark set, production hardening (see `TRD.md`), benchmark view backed by real stored eval runs, batch export.
- **V2 (future):** team/org accounts, additional document types, multi-language support, deeper ERP integrations — none of these are commitments, they are the logical next scope once V1 ships.

## Assumptions & Dependencies
- OpenRouter continues to offer free-tier vision-capable models at sufficient rate limits for demo/pilot-scale usage.
- Supabase and Vercel free/hobby tiers remain sufficient through the pilot stage; upgrading to paid tiers is a scaling decision, not an MVP requirement.
- Customers are willing to trust AI-extracted financial data when every field carries a visible confidence score and a one-click correction path.

## Risks (Product/Business)
- **Trust risk:** a single confidently-wrong extraction in a customer's early usage could sour trust in the whole product — mitigated by never suppressing low-confidence flags, and by prominently distinguishing "human corrected" from "model extracted" in the audit trail.
- **Competitive risk:** established AP-automation vendors already sell anomaly detection as an add-on — DocIntel's differentiation is the combination of confidence-scored extraction + anomaly flagging + RAG Q&A in one small, fast-moving product, not any single feature in isolation.
- **Free-tier dependency risk:** the entire cost model assumes free-tier LLM/embedding/hosting access holds at pilot scale; this is a real constraint on how much volume the product can responsibly promise before a paid-tier migration plan is needed.

## Open Questions
- At what usage volume does the free-tier LLM/hosting stack need to migrate to paid infrastructure, and what does that do to the pricing model's margins?
- Does the Enterprise tier's "SLA" promise require team/org-level accounts before it can be sold, or can it launch on the current per-user model?

## Glossary
- **Straight-through processing:** a document that completes extraction and anomaly detection with no human correction needed.
- **Confidence score:** a 0–1 value attached to every extracted field, used to decide whether it needs human review (see `TRD.md` for thresholds).
- **Anomaly:** a flagged discrepancy (math mismatch, duplicate, missing signature, etc.) surfaced for human review — never an automated accusation.
