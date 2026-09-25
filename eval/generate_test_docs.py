"""
Synthetic Document Generator for DocIntel Evaluation.
Creates realistic text-layer PDFs for invoices, contracts, and compliance docs.
Each document is designed to test specific pipeline capabilities:
  - Classification accuracy
  - Field extraction accuracy
  - Anomaly detection precision and recall

Documents are generated in pairs: one clean (no anomalies) and one deliberately
injected with anomalies that the pipeline should flag.
"""

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
import json
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_docs")
GROUND_TRUTH_DIR = os.path.join(os.path.dirname(__file__))


def _ensure_dirs():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(GROUND_TRUTH_DIR, exist_ok=True)


# ── Invoice Generators ──────────────────────────────────────────────────────

def _generate_invoice_clean(filepath: str):
    """Clean invoice: all math checks out, all fields present."""
    c = canvas.Canvas(filepath, pagesize=letter)
    w, h = letter

    c.setFont("Helvetica-Bold", 24)
    c.drawString(1*inch, h - 1*inch, "INVOICE")

    c.setFont("Helvetica", 10)
    c.drawString(1*inch, h - 1.5*inch, "From: Northwind Industrial Supply Co.")
    c.drawString(1*inch, h - 1.7*inch, "123 Commerce Blvd, Suite 400")
    c.drawString(1*inch, h - 1.9*inch, "Chicago, IL 60601")

    c.drawString(4.5*inch, h - 1.5*inch, "Invoice Number: INV-2024-0871")
    c.drawString(4.5*inch, h - 1.7*inch, "Date: 2024-08-15")
    c.drawString(4.5*inch, h - 1.9*inch, "Due Date: 2024-09-15")
    c.drawString(4.5*inch, h - 2.1*inch, "Payment Terms: Net 30")
    c.drawString(4.5*inch, h - 2.3*inch, "Currency: USD")

    c.drawString(1*inch, h - 2.7*inch, "Bill To: Contoso Manufacturing LLC")
    c.drawString(1*inch, h - 2.9*inch, "456 Factory Row, Detroit, MI 48201")

    # Line items table header
    y = h - 3.5*inch
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1*inch, y, "Description")
    c.drawString(3.5*inch, y, "Qty")
    c.drawString(4.2*inch, y, "Unit Price")
    c.drawString(5.5*inch, y, "Amount")
    c.line(1*inch, y - 5, 7*inch, y - 5)

    c.setFont("Helvetica", 9)
    items = [
        ("Steel Bearings (Pack of 100)", "5", "$120.00", "$600.00"),
        ("Hydraulic Pump Assembly", "2", "$1,450.00", "$2,900.00"),
        ("Industrial Lubricant (5L)", "10", "$35.00", "$350.00"),
        ("Safety Valve Kit", "3", "$210.00", "$630.00"),
    ]
    for i, (desc, qty, unit, amt) in enumerate(items):
        row_y = y - 20 - (i * 18)
        c.drawString(1*inch, row_y, desc)
        c.drawString(3.5*inch, row_y, qty)
        c.drawString(4.2*inch, row_y, unit)
        c.drawString(5.5*inch, row_y, amt)

    # Totals
    totals_y = y - 20 - (len(items) * 18) - 30
    c.line(4.2*inch, totals_y + 15, 7*inch, totals_y + 15)
    c.setFont("Helvetica", 10)
    c.drawString(4.2*inch, totals_y, "Subtotal:")
    c.drawString(5.5*inch, totals_y, "$4,480.00")
    c.drawString(4.2*inch, totals_y - 18, "Tax (8%):")
    c.drawString(5.5*inch, totals_y - 18, "$358.40")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(4.2*inch, totals_y - 40, "TOTAL:")
    c.drawString(5.5*inch, totals_y - 40, "$4,838.40")

    c.save()


def _generate_invoice_anomaly_math(filepath: str):
    """Invoice with deliberate math mismatch: subtotal + tax != total."""
    c = canvas.Canvas(filepath, pagesize=letter)
    w, h = letter

    c.setFont("Helvetica-Bold", 24)
    c.drawString(1*inch, h - 1*inch, "INVOICE")

    c.setFont("Helvetica", 10)
    c.drawString(1*inch, h - 1.5*inch, "From: Globex Corporation")
    c.drawString(1*inch, h - 1.7*inch, "742 Evergreen Terrace, Springfield")

    c.drawString(4.5*inch, h - 1.5*inch, "Invoice Number: INV-2024-1337")
    c.drawString(4.5*inch, h - 1.7*inch, "Date: 2024-09-01")
    c.drawString(4.5*inch, h - 1.9*inch, "Due Date: 2024-10-01")
    c.drawString(4.5*inch, h - 2.1*inch, "Payment Terms: Net 30")
    c.drawString(4.5*inch, h - 2.3*inch, "Currency: USD")

    c.drawString(1*inch, h - 2.7*inch, "Bill To: Initech Solutions")

    y = h - 3.3*inch
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1*inch, y, "Description")
    c.drawString(3.5*inch, y, "Qty")
    c.drawString(4.2*inch, y, "Unit Price")
    c.drawString(5.5*inch, y, "Amount")
    c.line(1*inch, y - 5, 7*inch, y - 5)

    c.setFont("Helvetica", 9)
    items = [
        ("Widget Alpha", "10", "$50.00", "$500.00"),
        ("Widget Beta", "5", "$80.00", "$400.00"),
    ]
    for i, (desc, qty, unit, amt) in enumerate(items):
        row_y = y - 20 - (i * 18)
        c.drawString(1*inch, row_y, desc)
        c.drawString(3.5*inch, row_y, qty)
        c.drawString(4.2*inch, row_y, unit)
        c.drawString(5.5*inch, row_y, amt)

    # ANOMALY: Subtotal ($900) + Tax ($72) = $972, but stated total is $1,050
    totals_y = y - 20 - (len(items) * 18) - 30
    c.setFont("Helvetica", 10)
    c.drawString(4.2*inch, totals_y, "Subtotal:")
    c.drawString(5.5*inch, totals_y, "$900.00")
    c.drawString(4.2*inch, totals_y - 18, "Tax (8%):")
    c.drawString(5.5*inch, totals_y - 18, "$72.00")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(4.2*inch, totals_y - 40, "TOTAL:")
    c.drawString(5.5*inch, totals_y - 40, "$1,050.00")  # Wrong! Should be $972

    c.save()


def _generate_invoice_duplicate(filepath: str):
    """Invoice that shares the same invoice number as the math-anomaly invoice."""
    c = canvas.Canvas(filepath, pagesize=letter)
    w, h = letter

    c.setFont("Helvetica-Bold", 24)
    c.drawString(1*inch, h - 1*inch, "INVOICE")

    c.setFont("Helvetica", 10)
    c.drawString(1*inch, h - 1.5*inch, "From: Globex Corporation")
    c.drawString(1*inch, h - 1.7*inch, "742 Evergreen Terrace, Springfield")

    # ANOMALY: Same invoice number as invoice_anomaly_math.pdf
    c.drawString(4.5*inch, h - 1.5*inch, "Invoice Number: INV-2024-1337")
    c.drawString(4.5*inch, h - 1.7*inch, "Date: 2024-09-15")
    c.drawString(4.5*inch, h - 1.9*inch, "Due Date: 2024-10-15")
    c.drawString(4.5*inch, h - 2.1*inch, "Payment Terms: Net 30")

    c.drawString(1*inch, h - 2.7*inch, "Bill To: Initech Solutions")

    y = h - 3.3*inch
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1*inch, y, "Description")
    c.drawString(3.5*inch, y, "Qty")
    c.drawString(4.2*inch, y, "Unit Price")
    c.drawString(5.5*inch, y, "Amount")

    c.setFont("Helvetica", 9)
    items = [("Widget Alpha", "20", "$50.00", "$1,000.00")]
    for i, (desc, qty, unit, amt) in enumerate(items):
        row_y = y - 20 - (i * 18)
        c.drawString(1*inch, row_y, desc)
        c.drawString(3.5*inch, row_y, qty)
        c.drawString(4.2*inch, row_y, unit)
        c.drawString(5.5*inch, row_y, amt)

    totals_y = y - 80
    c.setFont("Helvetica", 10)
    c.drawString(4.2*inch, totals_y, "Subtotal:")
    c.drawString(5.5*inch, totals_y, "$1,000.00")
    c.drawString(4.2*inch, totals_y - 18, "Tax (8%):")
    c.drawString(5.5*inch, totals_y - 18, "$80.00")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(4.2*inch, totals_y - 40, "TOTAL:")
    c.drawString(5.5*inch, totals_y - 40, "$1,080.00")

    c.save()


# ── Contract Generators ──────────────────────────────────────────────────────

def _generate_contract_clean(filepath: str):
    """A fully signed, well-formed service agreement."""
    c = canvas.Canvas(filepath, pagesize=letter)
    w, h = letter

    c.setFont("Helvetica-Bold", 18)
    c.drawString(1.5*inch, h - 1*inch, "SERVICE AGREEMENT")

    c.setFont("Helvetica", 10)
    text_lines = [
        "This Service Agreement ('Agreement') is entered into as of January 15, 2024",
        "by and between:",
        "",
        "Party A: Acme Consulting Group, LLC ('Provider')",
        "Party B: Wayne Enterprises, Inc. ('Client')",
        "",
        "1. TERM: This Agreement is effective from January 15, 2024 through",
        "   January 14, 2025 (the 'Initial Term'). It will auto-renew annually",
        "   unless either party provides 30 days written notice.",
        "",
        "2. SCOPE OF SERVICES: Provider shall deliver monthly financial advisory",
        "   reports, quarterly strategic planning sessions, and ad-hoc consulting",
        "   as reasonably requested by Client.",
        "",
        "3. COMPENSATION: Client agrees to pay Provider $12,500.00 per month,",
        "   due on the first business day of each calendar month.",
        "",
        "4. GOVERNING LAW: This Agreement shall be governed by the laws of the",
        "   State of Delaware.",
        "",
        "5. KEY OBLIGATIONS:",
        "   - Provider must deliver reports by the 5th of each month",
        "   - Client must provide data access within 3 business days of request",
        "   - Both parties must maintain confidentiality of shared information",
        "",
        "",
        "SIGNED:",
        "",
        "___________________________          ___________________________",
        "Acme Consulting Group, LLC           Wayne Enterprises, Inc.",
        "Date: January 15, 2024               Date: January 15, 2024",
        "Status: SIGNED                       Status: SIGNED",
    ]
    y = h - 1.5*inch
    for line in text_lines:
        c.drawString(1*inch, y, line)
        y -= 14

    c.save()


def _generate_contract_unsigned(filepath: str):
    """Contract with ANOMALY: missing signature / unsigned status."""
    c = canvas.Canvas(filepath, pagesize=letter)
    w, h = letter

    c.setFont("Helvetica-Bold", 18)
    c.drawString(1.5*inch, h - 1*inch, "MASTER SERVICE AGREEMENT")

    c.setFont("Helvetica", 10)
    text_lines = [
        "This Master Service Agreement ('MSA') is dated March 1, 2024",
        "by and between:",
        "",
        "Party A: Stark Industries ('Provider')",
        "Party B: Oscorp Technologies ('Client')",
        "",
        "1. TERM: Effective from March 1, 2024 through February 28, 2025.",
        "   Renewal: Manual renewal required.",
        "",
        "2. SCOPE: Full-stack engineering consulting and code review services.",
        "",
        "3. GOVERNING LAW: State of New York.",
        "",
        "4. KEY OBLIGATIONS:",
        "   - Provider: Weekly sprint reports and code deliverables",
        "   - Client: Timely payment within Net 45 terms",
        "",
        "",
        "SIGNATURE BLOCK:",
        "",
        "___________________________          ___________________________",
        "Stark Industries                     Oscorp Technologies",
        "Date: _______________                Date: _______________",
        # ANOMALY: Explicitly marked as unsigned
        "Status: UNSIGNED - DRAFT             Status: UNSIGNED - PENDING REVIEW",
    ]
    y = h - 1.5*inch
    for line in text_lines:
        c.drawString(1*inch, y, line)
        y -= 14

    c.save()


# ── Compliance Document Generators ───────────────────────────────────────────

def _generate_compliance_clean(filepath: str):
    """Well-formed GDPR compliance checklist."""
    c = canvas.Canvas(filepath, pagesize=letter)
    w, h = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(1*inch, h - 1*inch, "COMPLIANCE ASSESSMENT REPORT")

    c.setFont("Helvetica", 10)
    lines = [
        "Document Title: Q3 2024 GDPR Compliance Audit",
        "Issuing Authority: Internal Data Protection Office",
        "Assessment Date: September 30, 2024",
        "",
        "Relevant Clause References:",
        "  - GDPR Article 5(1)(a): Lawfulness, fairness and transparency",
        "  - GDPR Article 13: Information to be provided at point of collection",
        "  - GDPR Article 25: Data protection by design and by default",
        "  - GDPR Article 32: Security of processing",
        "",
        "Required Actions:",
        "  1. Update privacy notice on customer portal by October 15, 2024",
        "  2. Complete Data Protection Impact Assessment for Project Atlas",
        "  3. Conduct employee training on new data handling procedures",
        "  4. Review and update data processor agreements with third parties",
        "",
        "Deadlines:",
        "  - Privacy notice update: October 15, 2024",
        "  - DPIA completion: November 1, 2024",
        "  - Employee training: November 30, 2024",
        "  - Processor agreement review: December 15, 2024",
        "",
        "Compliance Status: PARTIALLY COMPLIANT",
        "",
        "Summary: The organization meets most GDPR requirements but needs",
        "to address the above items before the next regulatory review.",
    ]
    y = h - 1.5*inch
    for line in lines:
        c.drawString(1*inch, y, line)
        y -= 14

    c.save()


# ── Purchase Order Generator ────────────────────────────────────────────────

def _generate_po_high_value(filepath: str):
    """Purchase order with a deliberately high amount to trigger anomaly."""
    c = canvas.Canvas(filepath, pagesize=letter)
    w, h = letter

    c.setFont("Helvetica-Bold", 20)
    c.drawString(1*inch, h - 1*inch, "PURCHASE ORDER")

    c.setFont("Helvetica", 10)
    c.drawString(1*inch, h - 1.5*inch, "PO Number: PO-2024-5599")
    c.drawString(1*inch, h - 1.7*inch, "Vendor: Precision Machining Ltd.")
    c.drawString(1*inch, h - 1.9*inch, "Order Date: 2024-10-01")
    c.drawString(1*inch, h - 2.1*inch, "Expected Delivery: 2024-11-15")
    c.drawString(1*inch, h - 2.3*inch, "Ship To: 789 Warehouse Ave, Houston, TX 77001")

    y = h - 3*inch
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1*inch, y, "Item")
    c.drawString(3.5*inch, y, "Qty")
    c.drawString(4.2*inch, y, "Unit Price")
    c.drawString(5.5*inch, y, "Amount")

    c.setFont("Helvetica", 9)
    items = [
        ("CNC Milling Machine Model X7", "1", "$45,000.00", "$45,000.00"),
        ("Titanium Stock (500kg)", "1", "$18,500.00", "$18,500.00"),
        ("Calibration Service", "1", "$2,200.00", "$2,200.00"),
    ]
    for i, (desc, qty, unit, amt) in enumerate(items):
        row_y = y - 20 - (i * 18)
        c.drawString(1*inch, row_y, desc)
        c.drawString(3.5*inch, row_y, qty)
        c.drawString(4.2*inch, row_y, unit)
        c.drawString(5.5*inch, row_y, amt)

    totals_y = y - 100
    c.setFont("Helvetica-Bold", 12)
    # ANOMALY: Total > $50,000 threshold
    c.drawString(4.2*inch, totals_y, "TOTAL: $65,700.00")

    c.save()


# ── Ground Truth ─────────────────────────────────────────────────────────────

GROUND_TRUTH = {
    "invoice_clean.pdf": {
        "expected_doc_type": "invoice",
        "expected_fields": {
            "vendor_name": "Northwind Industrial Supply Co.",
            "invoice_number": "INV-2024-0871",
            "date": "2024-08-15",
            "due_date": "2024-09-15",
            "subtotal": "4480.00",
            "tax": "358.40",
            "total": "4838.40",
            "payment_terms": "Net 30",
            "currency": "USD",
        },
        "expected_anomalies": [],
        "description": "Clean invoice with correct math. No anomalies expected.",
    },
    "invoice_anomaly_math.pdf": {
        "expected_doc_type": "invoice",
        "expected_fields": {
            "vendor_name": "Globex Corporation",
            "invoice_number": "INV-2024-1337",
            "date": "2024-09-01",
            "subtotal": "900.00",
            "tax": "72.00",
            "total": "1050.00",
        },
        "expected_anomalies": ["Math Mismatch"],
        "description": "Invoice where subtotal+tax != total. Math Mismatch anomaly expected.",
    },
    "invoice_duplicate.pdf": {
        "expected_doc_type": "invoice",
        "expected_fields": {
            "vendor_name": "Globex Corporation",
            "invoice_number": "INV-2024-1337",
        },
        "expected_anomalies": ["Duplicate Invoice Number"],
        "description": "Invoice with same number as invoice_anomaly_math. Duplicate anomaly expected.",
    },
    "contract_clean.pdf": {
        "expected_doc_type": "contract",
        "expected_fields": {
            "parties": ["Acme Consulting Group", "Wayne Enterprises"],
            "effective_date": "2024-01-15",
            "signature_status": "signed",
            "governing_law": "Delaware",
        },
        "expected_anomalies": [],
        "description": "Fully signed contract. No anomalies expected.",
    },
    "contract_unsigned.pdf": {
        "expected_doc_type": "contract",
        "expected_fields": {
            "parties": ["Stark Industries", "Oscorp Technologies"],
            "signature_status": "unsigned",
        },
        "expected_anomalies": ["Unsigned Contract"],
        "description": "Unsigned contract draft. Unsigned anomaly expected.",
    },
    "compliance_clean.pdf": {
        "expected_doc_type": "compliance_doc",
        "expected_fields": {
            "document_title": "Q3 2024 GDPR Compliance Audit",
            "issuing_authority": "Internal Data Protection Office",
            "compliance_status": "partially compliant",
        },
        "expected_anomalies": [],
        "description": "Clean compliance doc. No anomalies expected.",
    },
    "po_high_value.pdf": {
        "expected_doc_type": "purchase_order",
        "expected_fields": {
            "po_number": "PO-2024-5599",
            "vendor_name": "Precision Machining Ltd.",
            "total_amount": "65700.00",
        },
        "expected_anomalies": ["High Value PO"],
        "description": "PO over $50k threshold. High Value PO anomaly expected.",
    },
}


# ── Main Generator ───────────────────────────────────────────────────────────

def generate_all():
    _ensure_dirs()

    generators = {
        "invoice_clean.pdf": _generate_invoice_clean,
        "invoice_anomaly_math.pdf": _generate_invoice_anomaly_math,
        "invoice_duplicate.pdf": _generate_invoice_duplicate,
        "contract_clean.pdf": _generate_contract_clean,
        "contract_unsigned.pdf": _generate_contract_unsigned,
        "compliance_clean.pdf": _generate_compliance_clean,
        "po_high_value.pdf": _generate_po_high_value,
    }

    for filename, gen_fn in generators.items():
        filepath = os.path.join(OUTPUT_DIR, filename)
        gen_fn(filepath)
        print(f"  [OK] Generated {filename}")

    # Write ground truth
    gt_path = os.path.join(GROUND_TRUTH_DIR, "ground_truth.json")
    with open(gt_path, "w") as f:
        json.dump(GROUND_TRUTH, f, indent=2)
    print(f"  [OK] Ground truth written to {gt_path}")

    print(f"\n  Total: {len(generators)} documents generated in {OUTPUT_DIR}")


if __name__ == "__main__":
    generate_all()
