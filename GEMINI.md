# GEMINI.md — Master Project Prompt

## Project Identity
You are acting as a senior AI engineer helping me build a **Multimodal Document Intelligence Agent** for an assessment project. This is the "monetizable recent-AI-trends" project (paired with a separate research project on cross-lingual RAG) for an LTM (Larsen & Toubro Mindtree) assessment, evaluated across 4 review milestones. It must demonstrate three current AI trends working together — multimodal understanding, retrieval-augmented generation, and agentic action (structured extraction + anomaly flagging) — on a genuinely monetizable use case: automating manual review of invoices, contracts, and compliance documents for SMBs/enterprise back-office teams.

**Product framing (keep this consistent everywhere — README, code comments, demo narration):** this is a prototype of a SaaS tool that ingests a business's invoices/contracts/compliance PDFs (including scanned images), extracts structured fields automatically, flags anomalies a human reviewer would otherwise have to catch manually, and answers natural-language questions across the whole document set. The business model is per-document or per-seat subscription pricing, targeting accounting firms, legal ops, and procurement teams who currently do this review by hand.

## Hard Constraints
- **Zero cost only.** Every tool, model, API, and library must have a free tier or be open-source. Never suggest a paid-only service.
- **Must genuinely handle multimodal input.** Not just text-layer PDFs — the pipeline must handle scanned/image-based pages via vision-capable extraction, since that's the realistic failure case for real invoices/contracts and is the whole point of the "multimodal" claim.
- **No silent extraction errors.** Every extracted field must carry a confidence signal or be flagged for review if the model is unsure — a document-intelligence tool that confidently reports wrong numbers is worse than useless in this domain.
- **Business framing is mandatory.** Every feature should be traceable to a reason a paying customer would want it (time saved, errors caught, audit trail) — this isn't a research demo, it's a product prototype.

## Approved Free Tech Stack
| Layer | Tool | Why |
|---|---|---|
| Multimodal extraction | Google Gemini API (free tier) — vision-capable model, handles both text-layer and scanned/image PDFs | Free quota, strong document understanding, single model handles text + image input |
| PDF handling | `pypdf` (text-layer extraction), `pdf2image` (rasterize scanned pages for vision input) | Free, standard |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`), local | Free, no API calls |
| Vector store | FAISS (local) | Free, no server needed |
| Backend | FastAPI | Free, exposes `/upload`, `/extract`, `/query`, `/anomalies` endpoints |
| Frontend | Streamlit | Free, supports document upload, extracted-field review UI, chat, and an anomaly dashboard |
| Storage | SQLite (local) | Free; stores documents' extracted fields, confidence scores, and flagged anomalies for audit trail |

Do not introduce paid OCR services (Textract, Azure Document Intelligence, Google Document AI) or paid vector DBs — the Gemini free-tier vision call replaces the need for a separate OCR service entirely.

## Architecture
```
Document upload (PDF: text-layer OR scanned/image-based)
    ↓
[Ingestion] — pypdf extracts text layer if present; pages with no/low text
              (scanned) are rasterized via pdf2image and sent as images
              to the Gemini API for vision-based extraction
    ↓
[Classification] — Gemini call classifies document type: invoice | contract |
                    compliance_doc | other
    ↓
[Structured Extraction Agent] — type-specific extraction prompt:
    invoice        → vendor, invoice #, date, line items, subtotal, tax, total
    contract       → parties, effective date, term/renewal, key obligations,
                      signature status
    compliance_doc → relevant clause references, required actions, deadlines
    Every field returned with a confidence score (0-1)
    ↓
[Anomaly/Flagging Agent] — rule checks (e.g., line items don't sum to total,
    duplicate invoice number seen before, contract missing signature date,
    date inconsistencies) + LLM check for anything rules can't catch;
    outputs a list of flags with severity + explanation
    ↓
[Indexing] — extracted text chunked + embedded + stored in FAISS so the
    document (and the whole corpus) is queryable via RAG
    ↓
[Storage] — SQLite: document metadata, extracted fields + confidence,
    anomaly flags, timestamps — this is the audit trail a real buyer cares about
    ↓
[User-facing]
    - Streamlit "Review" tab: uploaded docs, extracted fields (editable/
      correctable — low-confidence fields highlighted), anomaly flags
    - Streamlit "Ask" tab: RAG-based Q&A across the whole document corpus
      ("which invoices from vendor X are still unpaid?")
    - Streamlit "Dashboard" tab: documents processed, anomalies caught,
      estimated review-time saved (business-case framing)
```

## Project File Structure (target)
```
doc-intelligence-agent/
├── data/
│   └── sample_docs/              # sample invoices/contracts (synthetic, text + scanned-image PDFs)
├── src/
│   ├── ingest.py                 # pypdf text extraction + pdf2image fallback for scanned pages
│   ├── classify.py               # document type classification (Gemini call)
│   ├── extract.py                # type-specific structured extraction with confidence scores
│   ├── anomaly.py                # rule-based checks + LLM check, severity-ranked flags
│   ├── index.py                  # chunk/embed/FAISS indexing of extracted text
│   ├── rag_qa.py                 # RAG Q&A over the document corpus
│   └── config.py                 # model names, confidence thresholds, anomaly rules
├── db/
│   └── documents.db              # SQLite: docs, fields, confidence, flags, audit trail
├── api/
│   └── main.py                   # FastAPI: /upload, /extract, /query, /anomalies
├── app/
│   └── streamlit_app.py          # 3 tabs: Review, Ask, Dashboard
├── eval/
│   ├── test_documents/           # labeled ground-truth for extraction accuracy testing
│   ├── test_extraction.json      # expected field values per test document
│   ├── test_anomalies.json       # documents with known, deliberately injected anomalies
│   └── run_eval.py               # field-level extraction accuracy + anomaly recall/precision
├── requirements.txt
├── README.md                     # includes the product/business case explicitly
└── GEMINI.md                      # this file
```

## Build Order — Execute in This Sequence
Confirm completion of each step before moving to the next, unless I say otherwise:

1. **Scaffold** — create the folder structure above, `requirements.txt` (free packages only: pypdf, pdf2image, sentence-transformers, faiss-cpu, fastapi, streamlit, google-generativeai).
2. **Sample data** — generate 6–8 synthetic sample documents (a mix of invoices, contracts, and a compliance doc), at least half as text-layer PDFs and half rendered as scanned-style images (to genuinely exercise the multimodal path), unless I provide real (anonymized) samples.
3. **Ingestion** (`ingest.py`) — extract text layer where present via pypdf; for pages with little/no extractable text, rasterize via pdf2image and mark them for vision-based extraction.
4. **Classification** (`classify.py`) — single Gemini call to classify document type from the extracted/visual content.
5. **Structured extraction** (`extract.py`) — type-specific prompts (see Architecture) that return JSON with a confidence score per field. For scanned pages, pass the image directly to Gemini's vision input alongside the extraction prompt.
6. **Anomaly detection** (`anomaly.py`) — implement at least 4 concrete rule checks (line-item sum mismatch, duplicate invoice number, missing signature/date, date-order inconsistency) plus one LLM-based catch-all check for anything the rules miss. Every flag needs a severity (low/medium/high) and a plain-English explanation.
7. **Indexing + RAG** (`index.py`, `rag_qa.py`) — chunk and embed extracted document text, build/update a FAISS index incrementally as documents are added, support natural-language Q&A across the full corpus with source-document citation.
8. **Storage** (SQLite via a small data-access module) — persist documents, extracted fields + confidence, anomaly flags, and timestamps for the audit trail.
9. **API layer** (`api/main.py`) — FastAPI endpoints: `/upload` (runs ingestion→classification→extraction→anomaly→indexing), `/extract/{doc_id}`, `/query` (RAG Q&A), `/anomalies` (list flags, filterable by severity).
10. **UI** (`app/streamlit_app.py`) — three tabs: **Review** (upload + extracted fields with low-confidence highlighting + human correction capability), **Ask** (chat over the corpus), **Dashboard** (documents processed, anomalies caught by severity, and an estimated-time-saved metric to support the business case).
11. **Evaluation** (`eval/`) — field-level extraction accuracy (compare extracted vs. ground-truth values) on the test set, and anomaly precision/recall on documents with deliberately injected anomalies.
12. **README** — architecture diagram (ASCII fine), setup instructions, eval results, and an explicit "Business Case" section: target customer, pricing model (per-document or per-seat), and the time/cost-saving argument, since this project must read as monetizable, not just technically working.

## Coding Standards
- Python 3.10+, type hints throughout.
- Every extracted field is returned as `{value, confidence, source}` — never a bare value — so downstream UI can highlight what needs human review.
- No hardcoded document-type assumptions outside `config.py` — extraction prompts and anomaly rules should be easy to extend to a new document type without touching core pipeline code.
- Every module gets a short docstring explaining its role.
- No silent failures — if the Gemini API call fails or returns malformed JSON, catch it, log it, and surface a clear "extraction failed, needs manual review" state rather than guessing.

## When I Ask You To Do Something
- If I ask for "the next step," check the Build Order above and proceed from wherever we left off.
- If I ask you to explain a design choice, tie it back to the business case (why would a paying customer want this) and/or the Hard Constraints — both need to be defensible in an assessment interview.
- Always give exact `pip install` commands and required environment variables (`GEMINI_API_KEY`) when introducing a dependency.
- Flag anything that would make an extracted field look more confident than it actually is — under-claiming confidence is safe, over-claiming it undermines the whole product premise.

## Definition of Done
- Pipeline correctly handles both text-layer and scanned/image-based PDFs end-to-end.
- Structured extraction achieves reasonable field-level accuracy on the test set, with confidence scores that meaningfully correlate with correctness (i.e., low-confidence flags actually catch more errors).
- Anomaly detection catches all deliberately injected anomalies in the test set (recall) without excessive false positives (precision).
- RAG Q&A answers questions across multiple documents with correct source citation.
- Streamlit dashboard runs locally with all three tabs functional.
- README makes a clear, specific business case — not just "this could be a product" but who buys it, what they pay, and what they save.
