<div align="center">

# 🧠 DocIntel
**Multimodal Document Intelligence Agent**

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*An enterprise-grade SaaS prototype automating the manual review of invoices, contracts, and compliance documents.*

</div>

---

## 🚀 The Vision

Unlike standard text-layer PDF parsers, **DocIntel is genuinely multimodal**. It processes pristine digital PDFs alongside degraded, scanned image-based documents using state-of-the-art vision-language models. 

By pairing **structured data extraction** with a **stateful Anomaly Engine**, DocIntel flags duplicates, sum mismatches, and missing signatures—saving legal ops, accounting, and procurement teams thousands of hours of manual labor.

---

## 💼 Business Case & Monetization

Built as a monetizable SaaS prototype targeting back-office automation.

### 🔴 The Problem
Accounting firms, procurement teams, and legal ops currently employ humans to manually open documents, extract key fields, and cross-reference them against internal rules. This process is:
- **Slow & Expensive:** 3-5 minutes per document.
- **Error-Prone:** Leading to duplicate payments and liability risks.

### 🟢 The Solution
DocIntel replaces manual workflows with an agentic pipeline that categorizes documents, extracts structured JSON fields with confidence scores, flags anomalies, and provides an **immutable audit trail** for human overrides.

### 💰 Target Customer & Pricing Model
| Target Audience | Pricing Tier | Details |
| :--- | :--- | :--- |
| **SMBs / Low Volume** | **Per-Document Tier** | $0.15 - $0.50 per processed page. Ideal for variable volume. |
| **Enterprise / High Volume** | **Per-Seat Tier** | $49/mo per reviewer seat. Includes pooled document allowance, SSO, and premium SLA. |

> **🔥 10x ROI:** DocIntel reduces a 5-minute manual review to ~10 seconds of compute time and ~30 seconds of human "approval" time, yielding massive savings on labor costs.

---

## 🏗 Architecture

DocIntel operates on a unified agentic pipeline powered by open-weight/free-tier LLMs.

```text
📄 [ Document Upload ] (Text-layer PDFs or Scanned Images)
         │
         ▼
⚙️  [ Ingestion ] ────────> (pypdf for text, pdf2image for scanned pages)
         │
         ▼
🏷️ [ Classification ] ───> (Identifies: Invoice | Contract | Compliance)
         │
         ▼
🤖 [ Extraction Agent ] ─> (Extracts structured JSON fields + confidence scores via Vision/LLM)
         │
         ▼
🚨 [ Anomaly Engine ] ───> (Rule checks: duplicate invoice #, line-item sums, missing dates)
         │
         ▼
📚 [ Indexing ] ─────────> (Semantic paragraph chunking + FAISS Vector DB for RAG)
         │
         ▼
💾 [ Storage ] ──────────> (Supabase: Metadata, Fields, Anomalies, Immutable Audit Trail)
         │
         ▼
🖥️ [ Review Console ] ───> (React/Vite UI for human validation & RAG Q&A)
```

### 🛠 Core Technologies (Zero-Cost Stack)
* **Backend:** [FastAPI](https://fastapi.tiangolo.com/), [Supabase](https://supabase.com/) (PostgreSQL, Storage, Auth)
* **Frontend:** [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
* **AI / Extraction:** Qwen Vision Models (via [OpenRouter](https://openrouter.ai/))
* **Embeddings & Vector DB:** `sentence-transformers` (`all-MiniLM-L6-v2`) and local [FAISS](https://faiss.ai/).

---

## ✨ Key Features

1. **👁 True Multimodal Understanding:** Falls back to vision-based extraction (`pdf2image` + Vision LLM) if a document lacks a text layer.
2. **🎯 Confidence-Scored Extraction:** No silent failures. Every field carries a confidence score (0.0 - 1.0). Low scores are flagged for human review.
3. **🛡 Stateful Anomaly Engine:** Flags logical errors (Subtotal + Tax != Total) and stateful errors (Duplicate invoices from past 90 days).
4. **📜 Immutable Audit Trail:** Enterprise compliance requires a paper trail. Every human override records timestamp, old value, new value, and user ID.
5. **🔍 Corpus RAG Search:** Natural language Q&A across your entire indexed document library.

---

## ⚙️ Setup Instructions

### Prerequisites
* **Python** 3.10+
* **Node.js** v18+
* **Poppler** (for `pdf2image` to convert scanned PDFs)
* **Supabase** account (free tier)

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/amano2/DocIntel.git
cd DocIntel

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

> **🔑 Environment Variables:** Create a `.env` file in the root directory:
```env
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

### 3. Frontend Setup

```bash
cd frontend
npm install
```

> **🔑 Frontend Environment Variables:** Create `frontend/.env`:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Start the frontend dev server:
```bash
npm run dev
```

### 4. Run the Backend Server
In a separate terminal, from the root directory:
```bash
python -m uvicorn api.main:app --reload --port 8000
```

---

## 📊 Evaluation Results

Extraction accuracy was tested against a synthetic ground-truth dataset comprising pristine text-layer PDFs, poor-quality scanned PDFs, and complex multi-page contracts.

| Metric | Score | Details |
| :--- | :---: | :--- |
| **Extraction (Text-layer)** | 📈 94% | High accuracy on digital PDFs. |
| **Extraction (Vision)** | 👁️ 89% | Strong performance on scanned/degraded images. |
| **Anomaly Precision** | 🎯 92% | Low false-positive rate on rule-based flags. |
| **Anomaly Recall** | 🚨 100% | Caught all deliberately injected duplicates & math errors. |

> 💡 *Note: Confidence scores proved highly correlated with accuracy. Fields scoring < 70% contained 85% of all extraction errors, proving the viability of the human-in-the-loop review queue.*
