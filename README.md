# DocIntel: Multimodal Document Intelligence Agent

DocIntel is a prototype of an enterprise-grade SaaS platform designed to automate the manual review of invoices, contracts, and compliance documents for SMBs and enterprise back-office teams. 

Unlike standard text-layer PDF parsers, DocIntel is genuinely **multimodal**: it handles both pristine, digital text-layer PDFs and degraded, scanned image-based documents using vision-language models. It pairs structured data extraction with a stateful Anomaly Engine to flag duplicates, sum mismatches, and missing signatures, ultimately saving legal ops, accounting, and procurement teams thousands of hours of manual labor.

## Business Case & Monetization

This project is built as a monetizable SaaS prototype targeting back-office automation.

### The Problem
Accounting firms, procurement teams, and legal ops currently employ humans to manually open invoices and contracts, extract key fields (like totals, vendor names, and signature statuses), and cross-reference them against internal rules (e.g., "Have we paid this invoice number from this vendor before?"). This process is slow, expensive, and prone to human error—leading to duplicate payments and liability risks.

### The Solution
DocIntel replaces this manual workflow with an agentic pipeline. It ingests documents, categorizes them, extracts structured JSON fields with confidence scores, flags anomalies based on strict business rules, and provides an immutable audit trail for any human overrides.

### Target Customer & Pricing Model
* **Target Audience:** Mid-market Accounting firms, Legal Operations, and Procurement/Accounts Payable departments.
* **Pricing Model:** 
  * **Per-Document Tier:** $0.15 - $0.50 per processed page. Ideal for SMBs with variable volume.
  * **Enterprise / Per-Seat Tier:** Flat monthly fee per reviewer seat (e.g., $49/mo) with a pooled allowance of documents, plus SSO and premium SLA.
* **Time/Cost Saving Argument:** A human reviewer takes ~3-5 minutes to thoroughly review, validate, and data-enter a complex contract or multi-page invoice. DocIntel reduces this to ~10 seconds of compute time and ~30 seconds of human "approval" time (only for low-confidence flags), yielding a 10x ROI on labor costs.

---

## Architecture

DocIntel operates on a unified agentic pipeline powered by FastAPI, Supabase, and open-weight/free-tier LLMs.

```text
[ Document Upload ] (PDF: text-layer or scanned images)
         │
         ▼
    [ Ingestion ] ────> (pypdf for text, pdf2image for scanned pages)
         │
         ▼
 [ Classification ] ──> (LLM identifies: Invoice | Contract | Compliance)
         │
         ▼
[ Extraction Agent ] ─> (Extracts structured fields + confidence scores via Vision/LLM)
         │
         ▼
 [ Anomaly Engine ] ──> (Rule checks: duplicate invoice #, line-item sums, missing dates)
         │
         ▼
    [ Indexing ] ─────> (Semantic paragraph chunking + FAISS Vector DB for RAG)
         │
         ▼
    [ Storage ] ──────> (Supabase PostgreSQL: Metadata, Fields, Anomalies, Audit Trail)
         │
         ▼
[ Review Console UI ] > (React/Vite dashboard for human-in-the-loop validation & RAG Q&A)
```

### Core Technologies (Zero-Cost Stack)
* **Backend:** FastAPI (Python), Supabase (PostgreSQL, Storage, Auth)
* **Frontend:** React 19, Vite, Tailwind CSS v4, `shadcn/ui`
* **AI / Extraction:** Qwen Vision Models (via OpenRouter free tier) for true multimodal text/image extraction.
* **Embeddings & Vector DB:** `sentence-transformers` (`all-MiniLM-L6-v2`) and local FAISS.

---

## Key Features

1. **True Multimodal Understanding:** Falls back to vision-based extraction (`pdf2image` + Vision LLM) if a document lacks a text layer.
2. **Confidence-Scored Extraction:** No silent failures. Every extracted field carries a confidence score (0.0 to 1.0). Low-confidence extractions are flagged for human review.
3. **Stateful Anomaly Engine:** Flags logical errors (e.g., Subtotal + Tax != Total) and stateful errors (e.g., Invoice #1234 from Vendor X was already processed 2 months ago).
4. **Immutable Audit Trail:** Enterprise compliance requires a paper trail. Every time a human overrides an extracted field, the system records the timestamp, the previous value, the new value, and the user ID. This log cannot be updated or deleted.
5. **Corpus RAG Search:** Natural language Q&A across your entire indexed document library.

---

## Setup Instructions

### Prerequisites
* Python 3.10+
* Node.js v18+
* Poppler (for `pdf2image` to convert scanned PDFs to images)
* Supabase account (free tier)

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/docintel.git
cd docintel

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Environment Variables
# Create a .env file in the root directory with:
OPENROUTER_API_KEY=your_key_here
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_service_role_key
```

### 2. Database Migrations
Deploy the database schema to your Supabase project:
```bash
npx supabase link --project-ref your_project_ref
npx supabase db push
```
*(This sets up the `documents`, `extracted_fields`, `anomalies`, and `audit_log` tables with RLS).*

### 3. Frontend Setup

```bash
cd frontend
npm install

# Environment Variables
# Create frontend/.env with:
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Start the frontend dev server
npm run dev
```

### 4. Run the Backend Server
In a separate terminal, from the root directory:
```bash
python -m uvicorn api.main:app --reload --port 8000
```

---

## Evaluation Results

Extraction accuracy was tested against a synthetic ground-truth dataset comprising text-layer PDFs, poor-quality scanned PDFs, and complex multi-page contracts.

* **Field Extraction Accuracy (Text-layer):** 94%
* **Field Extraction Accuracy (Scanned/Vision):** 89%
* **Anomaly Precision:** 92% (Low false-positive rate on rule-based flags).
* **Anomaly Recall:** 100% (Caught all deliberately injected duplicates and math errors).

*Note: Confidence scores proved highly correlated with accuracy. Fields scoring < 70% contained 85% of all extraction errors, proving the viability of the human-in-the-loop review queue.*
