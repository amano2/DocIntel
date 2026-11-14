# 📁 Reserve Demo & Practice Documents Guide

These 3 reserve documents are intentionally created for your **live interview demo** or **personal practice**. Keep them on hand (or drag-and-drop them into the **Review Console** -> **"Ingest PDF"** button) during the interview.

---

### 1. `DEMO_invoice_math_error.pdf` (Interactive Math Anomaly)
- **Document Type:** `invoice`
- **Vendor:** Nexus Cloud Solutions LLC
- **Anomaly Injected:** **High-Severity Math Mismatch**
  - Subtotal: `$3,200.00`
  - Tax (8%): `$256.00`
  - Expected Total: `$3,456.00`
  - Stated Billed Total: `$3,856.00` ($400 overcharge discrepancy)
- **Demo Script Action:**
  1. Click **"Ingest PDF"** in the Review Console and select this file.
  2. Watch the live 5-stage pipeline progress bar.
  3. Show how the Anomaly Detection engine automatically catches the $400 calculation mismatch.
  4. Edit the Total in the Field Matrix to `$3,456.00` to show the **Audit Trail** in action.

---

### 2. `DEMO_contract_unsigned_draft.pdf` (Unsigned Draft Anomaly)
- **Document Type:** `contract`
- **Parties:** Vanguard Enterprise Holdings & Helios Labs Ltd.
- **Anomaly Injected:** **High-Severity Unsigned Contract Draft**
  - Both signature blocks display `[DRAFT ONLY - UNSIGNED]`.
- **Demo Script Action:**
  1. Upload this document.
  2. The system types it as `contract` and flags: *"Unsigned Contract: The contract document appears to lack authorized execution signatures."*
  3. Explain to the interviewer how this prevents unauthorized counterparty obligations from slipping through unreviewed.

---

### 3. `DEMO_clean_po_expedited.pdf` (Clean Verified Document)
- **Document Type:** `purchase_order`
- **Vendor:** Horizon Industrial Sensors Corp
- **Total Amount:** `$14,200.00` (well within the $50,000 threshold)
- **Result:** **100% Clean / Nominal**
  - Zero anomalies detected.
  - High confidence across all fields.
  - Demonstrates straight-through processing (STP) for clean enterprise records.

---

## 💡 Quick Tips for the Live Interview
- You can keep this folder open on your Desktop during the screen-share.
- Drag-and-drop or select any of these files to show the interviewer that your pipeline dynamically processes real PDFs in real time rather than just showing pre-loaded data!
