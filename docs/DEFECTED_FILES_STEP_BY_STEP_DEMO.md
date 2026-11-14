# LIVE DEMO RUNBOOK: DEFECTED DOCUMENTS WALKTHROUGH
## Step-by-Step Demonstration Script for Every Anomaly File in the System

This runbook provides the exact word-for-word talking points, click paths, and counter-question strategies for demonstrating each defective file in the **Multimodal Document Intelligence Agent** during your interview or live assessment.

---

## Quick Navigation: The 7 Active Ingested Defect Files

| # | File Name | Document Type | Detected Anomaly | Severity |
|---|---|---|---|---|
| 1 | `invoice_anomaly_math.pdf` | Invoice | Arithmetic calculation error ($900 + $72 != $1,050) | **HIGH** |
| 2 | `invoice_duplicate.pdf` | Invoice | Duplicate invoice number (INV-2024-1337) | **HIGH** |
| 3 | `invoice_wire_tampering.pdf` | Invoice | Wire bank routing mismatch (Offshore vs Vendor Master) | **HIGH** |
| 4 | `contract_unsigned.pdf` | Contract | Unsigned legal draft missing signatures | **HIGH** |
| 5 | `contract_expired_effective.pdf` | Contract | Chronological inconsistency (Executed 5 mo post-expiration) | **HIGH** |
| 6 | `compliance_breach_soc2.pdf` | Compliance | Critical SOC 2 CC6.1 audit deficiency past 90-day SLA | **HIGH** |
| 7 | `po_high_value.pdf` | Purchase Order | Exceeds $50k secondary approval threshold ($65,700) | **LOW** |

---

## Document 1: `invoice_anomaly_math.pdf`
### 1. The Scenario & Anomaly
- **Vendor:** Globex Corporation | **Invoice #:** INV-2024-1337
- **The Defect:** Subtotal is `$900.00` (Widget Alpha 10 × $50 = $500, Widget Beta 5 × $80 = $400). Tax (8%) is `$72.00`. Expected total is `$972.00`, but the invoice grand total states **`$1,050.00`** (an unreconciled variance of **+$78.00**).
- **Detected Rule:** `Mathematical Checksum Mismatch` (Severity: **HIGH**).

### 2. Step-by-Step Live Demo Script
1. **Click:** In the left sidebar Document Queue, click on **`invoice_anomaly_math.pdf`**.
2. **Narration:**
   > *"Here we have an invoice from Globex Corporation. Notice that the AI vision model extracted all tabular fields with high confidence (0.95–0.99), including subtotal, tax, and total. However, our deterministic Python rule engine immediately flagged an integrity defect: the subtotal plus tax equals $972.00, but the printed total is $1,050.00."*
3. **Click:** Switch to **Tab 2: Defect Rules (1)**.
   > *"Under Defect Rules, the reviewer sees the exact arithmetic breakdown: 'Stated total is $1,050.00, but Subtotal ($900.00) + Tax ($72.00) equals $972.00. Variance of +$78.00 detected.'"*
4. **Click:** Switch to **Tab 3: OCR & Text Dossier**.
   > *"In Tab 3, the reviewer can verify the exact optical text buffer extracted from the physical scan. In Vector View, the document is segmented into FAISS 384-dimensional dense vectors ready for RAG querying."*
5. **Interactive HITL Correction:**
   - Switch back to **Tab 1: Extracted Matrix**.
   - Hover over the `total` field (`$1,050.00`) and click **"Edit"**.
   - Change the value to **`$972.00`** and click **"Save"**.
   - Point out that the confidence updates to **1.0 (Manual Correction)** with an orange indicator.
6. **Click:** In the top header toolbar, click **`Approve & Clear`**.
   > *"Once the human reviewer reconciles the discrepancy with the vendor, they click 'Approve & Clear'. The status shifts from 'FLAGGED' to 'CERTIFIED CLEAN'."*
7. **Click:** Switch to **Tab 4: Immutable Audit Ledger**.
   > *"Notice that our action was immediately written to the immutable audit ledger with user ID, previous value ($1,050.00), new value ($972.00), and UTC timestamp. This satisfies Sarbanes-Oxley (SOX) compliance without any manual logging."*

---

## Document 2: `invoice_duplicate.pdf`
### 1. The Scenario & Anomaly
- **Vendor:** Globex Corporation | **Invoice #:** INV-2024-1337
- **The Defect:** Globex Corporation previously billed for invoice `INV-2024-1337`. This new PDF carries the exact same invoice identifier for a different widget quantity ($1,080.00), submitted 14 days later.
- **Detected Rule:** `Duplicate Invoice Reference` (Severity: **HIGH**).

### 2. Step-by-Step Live Demo Script
1. **Click:** In the left sidebar, select **`invoice_duplicate.pdf`**.
2. **Narration:**
   > *"Duplicate billing is one of the most common causes of corporate cash leakage. Vendors often resend uncollected invoices or inadvertently reuse invoice sequence numbers. Naive OCR models extract the invoice without context, but our system queries previous batch records in Supabase and catches that INV-2024-1337 has already been ingested."*
3. **Click:** Switch to **Tab 2: Defect Rules (1)**.
   > *"The Defect Rule explicitly warns: 'Invoice number INV-2024-1337 has already been processed previously in batch. Risk of duplicate remittance.'"*
4. **Demonstrating RAG Cross-Document Interrogation:**
   - Click the header button: **`Interrogate in RAG`**.
   - The interactive RAG Chat Modal opens with this document pre-selected.
   - Enter the query: **`Are there any duplicate invoices in the corpus?`**
   - Click **Send**.
   - Show the generated answer:
     > *"Notice that the RAG synthesis engine constructs a comparative markdown table citing both `invoice_anomaly_math.pdf` and `invoice_duplicate.pdf`, confirming duplicate vendor references and recommending payment suspension until vendor reconciliation."*
5. **Close Modal:** Click the close button on the chat modal.

---

## Document 3: `invoice_wire_tampering.pdf`
### 1. The Scenario & Anomaly
- **Vendor:** Apex Cloud Infrastructure Inc. | **Invoice #:** INV-2024-8841 | **Total:** $18,450.00
- **The Defect:** Remittance instructions list beneficiary bank *Titan First Commercial Bank (Offshore Branch)* with ABA Routing Number **`021000021`** and Account **`9948-2831-002`**. The verified vendor master profile specifies domestic Routing Number **`121000035`** and Account **`4410-9281-001`**.
- **Detected Rule:** `Wire Details Tampering & Diverted Routing` (Severity: **HIGH**).

### 2. Step-by-Step Live Demo Script
1. **Click:** Select **`invoice_wire_tampering.pdf`** in the queue.
2. **Narration:**
   > *"This document demonstrates our most monetizable security feature: Business Email Compromise (BEC) and Wire Transfer Tampering Detection. Fraudsters routinely intercept PDF invoices and alter the remittance bank details. Here, Apex Cloud is billing $18,450.00 for GPU compute clusters. The invoice looks 100% genuine visually."*
3. **Click:** Open **Tab 2: Defect Rules (1)**.
   > *"However, our pipeline cross-references the extracted ABA routing number 021000021 against the corporate vendor master database. The vendor master profile expects routing 121000035. The engine blocks the payment run, flagging potential fraudulent diversion risk."*
4. **Interrogate in RAG:**
   - Click **`Interrogate in RAG`**.
   - Enter query: **`Check wire transfer instructions and routing numbers across all invoices`**.
   - Click **Send**.
   - Show the generated audit table:
     > *"The RAG engine outputs a dedicated Wire Remittance Audit table with Stated Routing vs Master Profile Match and highlights the High Risk fraud indicator on INV-2024-8841."*

---

## Document 4: `contract_unsigned.pdf`
### 1. The Scenario & Anomaly
- **Parties:** Stark Industries ('Provider') & Oscorp Technologies ('Client')
- **The Defect:** Master Service Agreement for full-stack engineering consulting. Signature block is blank with printed underscores (`___________________________`) and status marked `UNSIGNED - DRAFT`.
- **Detected Rule:** `Unsigned Contract Draft` (Severity: **HIGH**).

### 2. Step-by-Step Live Demo Script
1. **Click:** Select **`contract_unsigned.pdf`** in the left queue.
2. **Narration:**
   > *"Legal operations teams often manage hundreds of agreements simultaneously. Executing work under an unexecuted draft exposes organizations to unlimited liability and non-payment risk. In this Stark Industries contract, the AI vision model inspected the signature counterpart block on the final page."*
3. **Click:** Look at **Tab 1: Extracted Matrix**.
   - Point out `signature_status: "Unsigned - Draft"` with confidence `0.96`.
4. **Click:** Switch to **Tab 2: Defect Rules (1)**.
   > *"Rule Engine flagged: 'The contract appears to be an unexecuted draft missing an authorized counter-signature.' The system prevents downstream onboarding or procurement approval until signed counterparts are re-uploaded."*

---

## Document 5: `contract_expired_effective.pdf`
### 1. The Scenario & Anomaly
- **Parties:** CyberShield Security Corp. & Global Logistics Partners Inc.
- **The Defect:** Agreement Section 1.1 states retroactive effective date of January 15, 2023. Section 2.3 stipulates a 12-month term expiring **January 15, 2024**. However, Section 14.1 shows authorized signatures executed on **June 20, 2024** (5+ months after the term lapsed), with no retroactive revival or ratification clause.
- **Detected Rule:** `Chronological Inconsistency (Lapsed Expiration)` (Severity: **HIGH**).

### 2. Step-by-Step Live Demo Script
1. **Click:** Select **`contract_expired_effective.pdf`** in the queue.
2. **Narration:**
   > *"This tests advanced legal chronological reasoning. The contract states an initial term of 12 months starting January 15, 2023, which expired on January 15, 2024. Yet the parties signed on June 20, 2024—meaning the agreement was legally lapsed prior to execution. A standard OCR tool wouldn't notice, but our anomaly engine correlates effective date, term duration, and counterpart execution timestamps."*
3. **Click:** Switch to **Tab 3: OCR & Text Dossier** -> click **`Vector View`**.
   > *"Here in the FAISS Vector Index, you can see chunk `chk_0009_03` capturing Section 14.1 and the execution dates. When queried via RAG, the system explains why this contract presents legal enforceability concerns."*

---

## Document 6: `compliance_breach_soc2.pdf`
### 1. The Scenario & Anomaly
- **Auditing Body:** Apex Integrity Audit Partners LLP | **Client:** CloudSphere Enterprise Corp.
- **The Defect:** SOC 2 Type II assessment issued a **QUALIFIED OPINION** due to Control CC6.1 (Logical Access Controls) having a high-severity exception: production database credentials and API private keys were stored in plaintext `.env.production` files. The remediation deadline of August 15, 2024 has elapsed (>90 days past due).
- **Detected Rule:** `Critical Audit Deficiency & SLA Overdue` (Severity: **HIGH**).

### 2. Step-by-Step Live Demo Script
1. **Click:** Select **`compliance_breach_soc2.pdf`**.
2. **Narration:**
   > *"Enterprise compliance officers must rapidly triage annual vendor compliance reports (SOC 2, ISO 27001, GDPR). Here, CloudSphere received a Qualified Opinion—which immediately invalidates vendor risk approval. Control CC6.1 has an unresolved high-risk finding past the 90-day SLA."*
3. **Click:** Open **Tab 2: Defect Rules (1)**.
   > *"The Defect Rule highlights: 'Control CC6.1 has an unresolved High-Severity exception exceeding the 90-day remediation SLA. Compliance rating downgraded to Qualified Opinion.'"*
4. **Click:** In the top header toolbar, click **`Report`** to trigger client-side PDF audit generation.
   > *"A formatted PDF executive audit dossier is generated instantly for the vendor risk management team."*

---

## Document 7: `po_high_value.pdf`
### 1. The Scenario & Anomaly
- **Vendor:** Precision Machining Ltd. | **PO #:** PO-2024-5599 | **Total:** $65,700.00
- **The Defect:** Procurement for CNC milling machines ($45k) and titanium stock ($18.5k) totals $65,700.00, exceeding standard departmental approval limit of $50,000.00.
- **Detected Rule:** `High Value PO Governance Threshold` (Severity: **LOW** / Advisory).

### 2. Step-by-Step Live Demo Script
1. **Click:** Select **`po_high_value.pdf`**.
2. **Narration:**
   > *"Not all anomalies are errors—some are governance alerts. Here, the purchase order is mathematically sound and clean, but the amount of $65,700.00 exceeds the $50,000 threshold. The system tags it with a Low-severity flag advising that secondary approval is required before PO transmission."*

---

## Reserve Files for Live Interactive Ingestion Practice

Located in [`data/sample_docs/reserve_for_demo/`](file:///c:/Users/KIIT/OneDrive/Desktop/OCRag/data/sample_docs/reserve_for_demo/):
If an interviewer asks: *"Can you upload a fresh document right now and show the pipeline processing it live?"*

1. **`DEMO_invoice_math_error.pdf`**
   - Ingest via the **"Upload & Ingest PDF"** button.
   - Shows live multi-stage pipeline: `INGESTION` -> `CLASSIFICATION` -> `EXTRACTION` -> `ANOMALY DETECTION` -> `INDEXING`.
   - Pipeline instantly catches: Line items ($3,500 + $2,400 = $5,900) vs stated total ($6,300), showing a +$400 math error!
2. **`DEMO_contract_unsigned_draft.pdf`**
   - Ingest live to show immediate detection of unexecuted signature blocks.
3. **`DEMO_clean_po_expedited.pdf`**
   - Ingest live to demonstrate zero false positives: clean extraction, nominal status, immediate green checkmark.
