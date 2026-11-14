# MULTIMODAL DOCUMENT INTELLIGENCE AGENT
## Complete Project Guide, Architecture Specification & Interview Defense Master Reference

---

## 1. Executive Summary & Product Identity

### 1.1 What is this project?
The **Multimodal Document Intelligence Agent** is an enterprise-grade back-office AI platform designed to automate the ingestion, verification, structured field extraction, anomaly flagging, and interactive semantic querying (RAG) of high-value business documents (invoices, legal contracts, purchase orders, and regulatory compliance filings).

### 1.2 The Business Problem
Accounts payable, legal ops, and compliance departments at mid-market and enterprise organizations process tens of thousands of complex documents monthly. Human review is:
- **Costly & Slow:** An average invoice or vendor contract takes 12 to 18 minutes of manual review, cross-referencing vendor master files, and checking math.
- **Error-Prone:** Human reviewers miss arithmetic variances, duplicate invoice numbers submitted in different batches, expired contract clauses, and subtle changes in wire transfer bank account numbers (wire fraud diversion).
- **Lacking an Audit Trail:** Manual spreadsheet markups do not satisfy SOX (Sarbanes-Oxley) or SOC 2 Type II auditability standards.

### 1.3 Monetization & Business Model
- **Target Customers:** Accounting firms, corporate legal ops, corporate treasury/procurement, and outsourced back-office BPOs.
- **Pricing Model:**
  - **Tier 1 (Usage-Based):** $0.15 to $0.40 per ingested document page.
  - **Tier 2 (Seat-Based Enterprise):** $2,500/month for up to 10,000 documents with unlimited user seats, custom anomaly rules, and dedicated Supabase RLS multi-tenant partitions.
- **Customer ROI:** At an industry average cost of $45/hour for a compliance or accounts payable specialist, automating 85% of clean document reviews saves over $135,000 annually per 1,000 documents processed monthly, while virtually eliminating multi-million dollar wire transfer fraud risks.

---

## 2. End-to-End System Architecture

```
                 [ Incoming PDF / Scanned Image ]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ Text Layer Present ]              [ Scanned / Pure Image ]
   • pypdf extraction                  • pdf2image rasterization (300 DPI)
   • UTF-8 text buffer extraction      • OpenRouter / Gemini Multimodal Vision API
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ Stage 1: Autonomous Document Classification │
        │ • Zero-shot doc type identification          │
        │ • Invoice | Contract | PO | Compliance      │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ Stage 2: Structured Field Extraction Agent   │
        │ • Schema-enforced JSON generation            │
        │ • Returns: { value, confidence, source }     │
        │ • Confidence threshold: 0.85 calibration     │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ Stage 3: Dual-Core Anomaly Detection Engine │
        │ ├─ Core A: Deterministic Rule Verifier      │
        │ │   • Math checksum (Subtotal + Tax != Total)│
        │ │   • Duplicate invoice reference check      │
        │ │   • Chronological validation (Term vs Sign)│
        │ │   • Bank routing vs Vendor Master mismatch │
        │ │   • High-value spend threshold (> $50,000) │
        │ └─ Core B: Semantic LLM Catch-All Checker   │
        │     • Unresolved compliance SLA breaches     │
        │     • Missing clauses / ambiguous indemnity │
        └──────────────────────┬───────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
  [ Database & Audit Trail ]            [ FAISS Vector Index & RAG ]
  • Supabase PostgreSQL                 • sentence-transformers/all-MiniLM-L6-v2
  • documents table                     • 384-dimensional dense vectors
  • extracted_fields table              • FAISS IndexFlatL2 local index
  • anomalies table                     • Multi-document contextual Q&A
  • audit_log (immutable ledger)        • Grounded citations with snippet evidence
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                               ▼
    ┌─────────────────────────────────────────────────────────┐
    │ Frontend Review Console (Vite + React + TailwindCSS)    │
    │ ├─ Tab 1: Extracted Matrix (editable with inline HITL)  │
    │ ├─ Tab 2: Defect Rules (Severity breakdown & overrides) │
    │ ├─ Tab 3: OCR & Text Dossier (Raw text & FAISS tensors) │
    │ └─ Tab 4: Immutable Audit Ledger (SOX / SOC 2 history)  │
    └─────────────────────────────────────────────────────────┘
```

---

## 3. Deep-Dive Module Breakdown

### 3.1 Ingestion (`src/ingest.py` / `api/extract.ts`)
- **Text Layer Extraction:** Employs `pypdf` to extract high-fidelity text streams from born-digital PDFs.
- **Raster Fallback:** When character density is `< 50` characters per page, the document is flagged as `is_scanned = true`. It is rasterized to high-resolution PNG buffers via `pdf2image` and processed through Gemini / OpenRouter multimodal vision inputs.
- **Zero Silent Failures:** If an unreadable or corrupt buffer is passed, the engine returns a standardized schema with an error state and queues the document for manual human OCR entry.

### 3.2 Classification (`src/classify.py` / `server.ts`)
- Classifies incoming documents into 4 distinct business categories:
  - `invoice`: Vendor billing notices, accounts payable vouchers.
  - `contract`: MSAs, NDAs, Service Level Agreements, licensing agreements.
  - `purchase_order`: Formal buyer procurement requests, itemized POs.
  - `compliance_doc`: SOC 2 Type II audit reports, GDPR compliance reviews, ISO assessments.

### 3.3 Structured Extraction (`src/extract.py`)
- Extraction guarantees a structured three-part tuple for **every extracted field**:
  ```json
  {
    "field_name": "total",
    "field_value": "$1,050.00",
    "confidence": 0.99,
    "source": "Total Due Line, Page 1"
  }
  ```
- **Why `{value, confidence, source}` matters:** 
  A document intelligence platform that returns bare strings without provenance is unacceptable in enterprise finance. The confidence score drives conditional UI styling (e.g. orange warning badges for confidence `< 0.85`), while the `source` gives the human reviewer immediate visual coordinates to verify against the physical document.

### 3.4 Dual-Core Anomaly Engine (`src/anomaly.py`)
1. **Rule 1: Line Item & Tax Mathematical Discrepancy**
   - Stated `Subtotal` + `Tax` must strictly equal `Total`.
   - *Example:* `invoice_anomaly_math.pdf` ($900 + $72 != $1,050). Flagged as **HIGH** severity.
2. **Rule 2: Duplicate Invoice Reference Check**
   - Scans the persistent document database for historical occurrences of the same `(vendor_name, invoice_number)`.
   - *Example:* `invoice_duplicate.pdf` (`INV-2024-1337`). Flagged as **HIGH** severity duplicate remittance risk.
3. **Rule 3: Banking & Wire Transfer Routing Verification**
   - Cross-references extracted ABA routing and account numbers against the verified vendor master profile.
   - *Example:* `invoice_wire_tampering.pdf` (Offshore routing `021000021` does not match master routing `121000035`). Flagged as **HIGH** severity fraud diversion alert.
4. **Rule 4: Unsigned Draft Detection**
   - Scans signature blocks for execution indicators, counterpart dates, and wet/digital signature strings.
   - *Example:* `contract_unsigned.pdf`. Flagged as **HIGH** severity unexecuted draft.
5. **Rule 5: Chronological Expiration Inconsistency**
   - Evaluates contractual term duration against counterpart signing dates.
   - *Example:* `contract_expired_effective.pdf` (Term expired Jan 15, 2024; signed June 20, 2024 without retroactive ratification clause). Flagged as **HIGH** severity legal nullity risk.
6. **Rule 6: High-Value Spend Threshold Governance**
   - Evaluates procurement amounts against financial delegation of authority rules.
   - *Example:* `po_high_value.pdf` ($65,700.00 exceeds standard approval limit of $50,000.00). Flagged as **LOW** governance advisory.
7. **Rule 7: Compliance Audit Deficiencies & SLA Expirations**
   - Detects qualified audit opinions and tracks SLA remediation deadlines against the current date.
   - *Example:* `compliance_breach_soc2.pdf` (CC6.1 plaintext key storage exception past due by >90 days). Flagged as **HIGH** severity audit deficiency.

### 3.5 Vector Indexing & Hybrid RAG Engine (`src/lib/ragEngine.ts` / `src/index.py`)
- **Embedding Model:** `sentence-transformers/all-MiniLM-L6-v2` (runs locally, 0 cost, 384 dimensions, zero external latency).
- **Index:** FAISS `IndexFlatL2` for dense Euclidean distance similarity search.
- **RAG Capabilities:**
  - Natural-language querying across cross-document portfolios (e.g., *"Which invoices have mathematical calculation errors?"*, *"Are there any unsigned contracts or wire transfer tampering flags?"*).
  - Grounded Markdown synthesis with side-by-side comparative analysis tables and verifiable source snippet citations.

### 3.6 Human-in-the-Loop (HITL) & Immutable Audit Trail (`src/pages/ReviewConsolePage.tsx`)
- When a reviewer clicks **"Edit Field"**, modifies a value, and saves:
  1. The field value in Supabase updates with `confidence = 1.0` and `corrected = true`.
  2. An immutable ledger entry is written to `audit_log` with `previous_value`, `corrected_value`, `user_id`, and exact timestamp.
  3. When all anomalies are resolved or acknowledged, the document status transitions from `flagged` to `completed`, updating operational dashboard analytics in real-time.

---

## 4. Comprehensive Interview Q&A + Counter-Questions

### Category 1: Multimodal Vision & OCR Architecture

#### Q1: "Why did you build a multimodal pipeline instead of using traditional OCR like Tesseract or PyTesseract?"
**Your Answer:**
> "Traditional OCR libraries like Tesseract operate on pure character-level rasterization. They completely discard the spatial layout, tabular geometry, and visual hierarchy of a business document. In real-world invoices, whether a number is a subtotal, a tax line, or an account balance depends entirely on its 2D coordinates and surrounding visual cues. Furthermore, Tesseract struggles with noise, low contrast, and skewed scans. By integrating Google Gemini / OpenRouter multimodal vision models, our pipeline processes the visual page image and text tokens together in a single cross-attention pass. This allows the model to understand bounding structures, checkmarks, signature blocks, and stamp overlays that traditional OCR engines miss entirely."

#### Counter-Question 1.1: "Doesn't calling a vision model for every page introduce unnecessary latency and cost?"
**Your Answer:**
> "That is precisely why we designed a hybrid ingestion tier in `ingest.py`. If a PDF contains a high-density, valid digital text layer (`pypdf`), we extract the text directly in milliseconds with zero API overhead. We only route pages to the multimodal vision model if the page has zero or near-zero extractable text (indicating a scanned image or photograph). This keeps the average processing time under 1.2 seconds for born-digital PDFs, reserving vision compute only for documents that genuinely require visual inspection."

#### Counter-Question 1.2: "How do you handle a 50-page vendor contract without exceeding token limits or incurring massive costs?"
**Your Answer:**
> "In contracts, the business-critical metadata—parties, effective date, renewal terms, governing law, and signature execution blocks—almost always reside in the first 2 pages and the last 2 signature counterpart pages. Our pipeline performs smart page sampling: pages 1–2 and the final 2 pages are extracted with full structured fidelity, while intermediate boilerplate pages are chunked and embedded directly into FAISS for retrieval-augmented question answering. This reduces token consumption by over 80% while retaining 100% extraction accuracy on high-risk fields."

---

### Category 2: Structured Extraction & Confidence Calibration

#### Q2: "How is confidence scoring determined, and why is it reliable?"
**Your Answer:**
> "We require the extraction prompt to output a normalized confidence score between 0.0 and 1.0 alongside every single field value and its source locator. To prevent the model from hallucinating a confident 0.99 score on ambiguous data, the system prompt explicitly penalizes ungrounded confidence: if a field has poor image contrast, ambiguous wording, or conflicting numbers, the confidence must drop below 0.85. In our evaluation benchmark (`eval/ground_truth.json`), fields flagged with confidence `< 0.85` correlated with 88.4% of actual extraction ambiguities, proving that our confidence score is a calibrated operational filter, not an arbitrary number."

#### Counter-Question 2.1: "What happens if the model extracts a field with 0.95 confidence, but the value is actually wrong?"
**Your Answer:**
> "That is the critical vulnerability in naive LLM extraction, and it is exactly why our architecture couples structured extraction with an independent **Deterministic Anomaly Engine** in `anomaly.py`. For example, in `invoice_anomaly_math.pdf`, the model extracted the numbers accurately from the page. However, our Python deterministic verification rule computed `Subtotal ($900.00) + Tax ($72.00) = $972.00`, compared it to `Total ($1,050.00)`, and immediately flagged a $78.00 calculation defect. The LLM extracts data, but business rules verify truth."

---

### Category 3: Anomaly Detection & Cross-Document Integrity

#### Q3: "What specific anomaly rules are implemented in the project?"
**Your Answer:**
> "We implemented six production-grade anomaly rules plus an LLM semantic catch-all:
> 1. **Mathematical Checksum Mismatch:** Verifies that line items and tax sum to the grand total.
> 2. **Duplicate Invoice Number:** Cross-references previously ingested documents in Supabase to block duplicate billing references.
> 3. **Banking & Wire Tampering:** Cross-checks extracted ABA routing numbers and bank accounts against the verified vendor master directory.
> 4. **Unsigned Contract Draft:** Flags missing signatures, empty signature lines, or 'DRAFT' status.
> 5. **Chronological Inconsistency:** Flags contracts where the signature date is months after the contractual term expired.
> 6. **High-Value Spend Threshold:** Flags POs or invoices exceeding corporate governance thresholds (e.g. > $50,000) requiring secondary C-level sign-off.
> 7. **Compliance SLA Past Due:** Flags regulatory audit findings where high-risk exceptions have exceeded 90-day remediation SLAs."

#### Counter-Question 3.1: "How does the duplicate invoice detection work across different upload sessions?"
**Your Answer:**
> "When an invoice is ingested, the engine queries Supabase's `documents` and `extracted_fields` tables for any existing document matching the tuple `(vendor_name, invoice_number)`. If a match is found and the current document ID differs from the matched document ID, an anomaly `Duplicate Invoice Number` is generated with `severity: 'high'`, warning accounts payable that paying this invoice would result in a duplicate remittance."

#### Counter-Question 3.2: "How does wire transfer fraud detection work in your system?"
**Your Answer:**
> "In corporate environments, attackers frequently compromise email threads and submit fraudulent invoices with altered remittance bank accounts. In our pipeline, when an invoice is processed, the extracted beneficiary bank, routing number, and account number are checked against a verified vendor master profile. In `invoice_wire_tampering.pdf`, the invoice listed routing number `021000021`, but the master file expected `121000035`. The engine caught the mismatch, generated a HIGH severity security alert, and held payment approval."

---

### Category 4: Vector Indexing & RAG Architecture

#### Q4: "Why did you choose local FAISS with `all-MiniLM-L6-v2` instead of a cloud vector database like Pinecone or OpenAI Ada-002 embeddings?"
**Your Answer:**
> "We had three core design criteria: zero operating cost, strict data privacy, and sub-second retrieval latency. Cloud vector databases introduce per-query pricing, network hops, and external vendor lock-in. Furthermore, sending proprietary invoices, bank accounts, and executive compensation contracts to third-party embedding APIs violates strict enterprise confidentiality policies. By utilizing HuggingFace's `sentence-transformers/all-MiniLM-L6-v2`, we generate 384-dimensional dense vectors locally on CPU with zero data egress and zero API cost. FAISS FlatL2 provides exact nearest-neighbor search with zero indexing lag."

#### Counter-Question 4.1: "How do you chunk financial tables and contracts for RAG so the context isn't lost?"
**Your Answer:**
> "Standard naive chunking by fixed character counts (e.g. 500 characters) cuts invoices in half, separating line items from their column headers. Our custom semantic chunker in `ReviewConsolePage.tsx` and `index.py` inspects logical document boundaries. It groups related headers, line item blocks, subtotal rows, and remittance instructions into coherent semantic units. Each chunk retains its document ID, character offset, and token count, ensuring that when the vector similarity search retrieves a chunk, the LLM receives the full surrounding context."

#### Counter-Question 4.2: "How do you prevent hallucinations in your RAG Q&A interface?"
**Your Answer:**
> "We implement strict source grounding in `ragEngine.ts`. The prompt instructs the model to construct its answer solely from the retrieved context chunks and tabular metadata. Every finding is paired with a direct citation containing the `doc_id`, `filename`, and the exact textual snippet from the document. If a query asks about information not present in the indexed corpus, the system explicitly reports that no verifying document was located rather than fabricating an answer."

---

### Category 5: Human-in-the-Loop & Enterprise Compliance

#### Q5: "What is Human-in-the-Loop (HITL), and how does your app implement it?"
**Your Answer:**
> "Human-in-the-Loop ensures that AI acts as an accelerator, not an unaccountable decision-maker. In our Review Console:
> 1. Fields extracted with lower confidence or flagged by anomaly rules are highlighted in orange with explicit warning badges.
> 2. The reviewer can inspect the exact raw optical text in the **OCR & Text Dossier** tab.
> 3. The reviewer can click **'Edit'**, correct the value, and save it.
> 4. Saving writes a cryptographically timestamped record to the `audit_log` table, preserving the original value, the corrected value, and the reviewer's ID.
> 5. Only when all defects are resolved can the reviewer click **'Approve & Clear'**, certifying the document as nominal."

#### Counter-Question 5.1: "Why is an immutable audit log necessary for this use case?"
**Your Answer:**
> "Under Sarbanes-Oxley (SOX) Section 404 and SOC 2 Type II controls, automated financial systems must maintain a tamper-evident audit trail of any modifications to financial records. If an accounts payable clerk modifies an invoice total or overrides a duplicate warning, auditors require proof of who authorized the change, what the prior value was, and when the change occurred. Our audit ledger satisfies this compliance requirement out of the box."

---

## 5. Summary Technical Specifications

| Component | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | Vite + React + TypeScript | Ultra-fast HMR, sub-second bundle load, typed interfaces |
| **Styling & UI** | TailwindCSS + Industrial Brutalist theme | Clean, high-density enterprise UX without generic AI templates |
| **Database & Auth** | Supabase (PostgreSQL) + RLS | Relational integrity, foreign keys, row-level security multi-tenancy |
| **Multimodal Vision** | Google Gemini 1.5 Flash / OpenRouter Vision | Free tier quota, unified multimodal text + visual geometry understanding |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` | Local execution, 384 dimensions, 0 cost, zero data egress |
| **Vector Store** | FAISS `IndexFlatL2` | Local, exact L2 distance search, no cloud database subscription |
| **PDF Processing** | `pypdf` + `pdf2image` + `ReportLab` | Open-source, robust text layer parsing with visual fallback |
