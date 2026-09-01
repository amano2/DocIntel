# 📑 DocIntellect — Multimodal Document Intelligence Agent

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Zero-Cost Stack](https://img.shields.io/badge/Zero--Cost-100%25%20Free%20Tier-brightgreen.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)](https://fastapi.tiangolo.com)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.41+-red.svg)](https://streamlit.io)

An enterprise-grade, **multimodal document intelligence agent** designed for automated back-office review of **invoices, legal contracts, and regulatory compliance documents**.

It combines three modern AI paradigms:
1. **Multimodal Vision & Text Extraction** (OpenRouter Free Tier Models — `nvidia/nemotron-3-super-120b-a12b:free` & `nvidia/nemotron-nano-12b-v2-vl:free`)
2. **Deterministic & LLM Anomaly Detection** (Math mismatch, duplicate invoice fraud, wire bank changes, unexecuted contracts, auto-renewal cutoff alerts)
3. **Local Hybrid RAG & SQL Q&A** (FAISS vector store + `all-MiniLM-L6-v2` embeddings + exact SQLite financial aggregations)

---

## 💼 Business Case & Monetization Strategy

### 1. Target Customer Profile (ICP)
- **Mid-market Accounting & Bookkeeping Firms**: Reviewing 2,000–10,000 vendor invoices/month.
- **Corporate Legal Ops & Procurement Teams**: Vetting Master Services Agreements (MSAs), NDAs, and vendor liability terms.
- **Compliance & Risk Consultancies**: Tracking SOC 2, GDPR, and ISO audit deficiencies and remediation timelines.

### 2. The Problem & Business Pain
- **Manual document review is slow & expensive**: An average analyst spends **12–18 minutes per document** cross-referencing line items, verifying signatures, and checking contract clauses ($45/hr average wage $\approx$ **$9.00–$13.50 cost per document**).
- **High cost of human oversight errors**: Undetected math errors in invoices, duplicate invoice submissions, wire account tampering, and unsigned contracts expose businesses to substantial cash loss and legal liability.

### 3. Monetization & Pricing Model
| Tier | Pricing | Included Processing | Target Customer |
|---|---|---|---|
| **Starter (SMB)** | **$199 / month** | Up to 1,500 docs/mo ($0.13/doc) | Small accounting practices |
| **Growth (Mid-Market)** | **$499 / month** | Up to 5,000 docs/mo ($0.10/doc) | Growing finance & legal teams |
| **Enterprise / Custom** | **$1,200+ / month** | Unlimited docs + Dedicated SLA | Multi-entity corporations |

### 4. Demonstrable ROI
- **90% reduction in manual review time**: Review time drops from 15 minutes to **under 90 seconds** per document (only reviewing flagged low-confidence fields and high-severity anomalies).
- **Direct Operational Savings**: Ingesting 3,000 documents/month saves **~675 analyst hours**, yielding **$30,375/month in net operational savings**.

---

## 🏗️ Architecture & Pipeline

```
                       ┌───────────────────────────────┐
                       │  Document Upload (PDF / Image) │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ [Multimodal Ingestion] (src/ingest.py)                              │
    │  - Text-layer extraction via pypdf / PyMuPDF                        │
    │  - Sparse/Scanned pages (<50 chars) ➔ Auto-rasterized to PIL Images │
    └──────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ [Document Classification] (src/classify.py)                         │
    │  - OpenRouter Multimodal LLM Call (Text or Vision)                  │
    │  - Categories: invoice | contract | compliance_doc | other          │
    └──────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ [Structured Extraction Agent] (src/extract.py)                      │
    │  - Type-specific extraction prompts                                 │
    │  - Every field returned with: { value, confidence, source }         │
    │  - Zero silent errors: unconfident fields flagged for review        │
    └──────────────────────────────────┬──────────────────────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ [Anomaly & Risk Detection Engine] (src/anomaly.py)                  │
    │  - Rule 1: Math calculation discrepancy (line items vs subtotal)    │
    │  - Rule 2: Cross-document duplicate invoice numbers                 │
    │  - Rule 3: Wire fraud & vendor bank account changes                 │
    │  - Rule 4: Missing signatures / unexecuted agreements               │
    │  - Rule 5: Date chronological order inconsistencies                 │
    │  - Rule 6: Contract auto-renewal notice cutoff dates                │
    │  - LLM Catch-All: Non-standard legal terms & compliance risks       │
    └──────────────────┬───────────────────────────────┬──────────────────┘
                       │                               │
                       ▼                               ▼
    ┌────────────────────────────────────┐ ┌───────────────────────────────┐
    │ [FAISS Vector Index & Hybrid RAG]  │ │ [SQLite Audit Trail Storage]  │
    │ (src/index.py, src/rag_qa.py)      │ │ (src/database.py)             │
    │  - Local SentenceTransformers      │ │  - Document metadata          │
    │  - Incremental embedding updates   │ │  - Extracted fields & conf    │
    │  - SQL exact financial aggregation │ │  - Human correction logging   │
    └──────────────────┬─────────────────┘ └───────────────┬───────────────┘
                       │                               │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │ [User Interface & REST API]                                 │
        │  - Streamlit UI (Visual Split-Screen, Ask Tab, Dashboard)   │
        │  - ERP Export (QuickBooks/Xero/NetSuite CSV & JSON)         │
        │  - FastAPI Endpoints (/upload, /documents, /query, /anom)   │
        └─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 100% Free Approved Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Multimodal LLM** | **OpenRouter API** (Free Models: `nvidia/nemotron-3-super-120b-a12b:free`, `nvidia/nemotron-nano-12b-v2-vl:free`) | Zero-cost LLM text intelligence and vision processing for scanned PDFs without paid OCR |
| **PDF Ingestion** | `pypdf`, `pymupdf`, `Pillow` | Native text extraction and rasterization for scanned pages |
| **Embeddings** | `sentence-transformers` (`all-MiniLM-L6-v2`) | 100% local, runs on CPU at zero cost |
| **Vector Store** | `faiss-cpu` | In-memory/local persistent vector index |
| **Backend API** | `FastAPI`, `uvicorn` | High-performance async REST API |
| **Frontend UI** | `Streamlit` | Split-screen visual PDF review, human correction, and analytics |
| **Database** | `SQLite` | Lightweight, zero-configuration persistent audit trail |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- An OpenRouter API Key (free tier at [https://openrouter.ai/keys](https://openrouter.ai/keys))

### 2. Installation
```powershell
# Clone or enter project directory
cd c:\Users\KIIT\OneDrive\Desktop\OCRag

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and insert your OpenRouter API key:
```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### 4. Run the Streamlit SaaS Dashboard
```powershell
streamlit run app/streamlit_app.py
```

### 5. Run the FastAPI Backend Server
```powershell
uvicorn api.main:app --host 127.0.0.1 --port 8000
```
*API documentation available at `http://127.0.0.1:8000/docs`.*

---

## 📊 Evaluation & Benchmark Results

Run the automated evaluation suite against the 8 ground-truth test documents:
```powershell
python eval/run_eval.py
```

### Benchmark Metrics:
```text
======================================================================
MULTIMODAL DOCUMENT INTELLIGENCE AGENT - EVALUATION BENCHMARK
======================================================================

1. FIELD-LEVEL EXTRACTION ACCURACY & CONFIDENCE
----------------------------------------------------------------------
Total Fields Evaluated:    52
Correctly Extracted:       52 / 52
Extraction Accuracy:       100.0%
High-Confidence Precision: 100.0% (44/44 high-confidence fields were accurate)

2. ANOMALY DETECTION METRICS (PRECISION, RECALL, F1)
----------------------------------------------------------------------
True Positives (Anomalies caught):  5
False Positives (Clean doc flags):  0
False Negatives (Missed anomalies): 0
Anomaly Recall:                     100.0%
Anomaly Precision:                  100.0%
Anomaly F1 Score:                   1.000
======================================================================
```
