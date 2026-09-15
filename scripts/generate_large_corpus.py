"""
Enterprise Scale Corpus Generator & Indexer for DocIntel Agent.
Generates 450 realistic multimodal sample documents across all supported business archetypes:
- 150 Invoices (Clean, Multi-line, Scanned Receipts, Math Discrepancies, Duplicate IDs)
- 120 Contracts (NDAs, MSAs, SOWs, Scanned Sign-offs, Missing Signatures, Date Inconsistencies)
- 75 Compliance Documents (SOC2, HIPAA BAAs, GDPR Addenda, Overdue Audit Deadlines)
- 55 Purchase Orders (Math Mismatches, Duplicate POs, Inverted Delivery Dates, Pending Approvals)
- 50 Tax Forms (IRS Form W-9 / 1099-NEC, Invalid TIN/EINs, Unsigned Certifications, Masked IDs)

Ingests, extracts structured fields, computes anomaly rules, and indexes all 450 documents
into the SQLite database (db/documents.db) and FAISS vector index.
Packages the full dataset into data/dataset_corpus_400plus.zip.
"""

import os
import sys
import random
import datetime
import uuid
import zipfile
from pathlib import Path
from typing import Dict, List, Any

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import faiss
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from PIL import Image, ImageFilter
import pymupdf as fitz  # PyMuPDF for realistic scanner rasterization

from src.database import default_db
from src.index import default_vector_index
from src.anomaly import detect_anomalies
from src.config import SAMPLE_DOCS_DIR

SAMPLE_DOCS_DIR.mkdir(parents=True, exist_ok=True)

# Vendors & Companies
VENDORS = [
    ("TechCorp Solutions LLC", "INV-2026-", "Software & Cloud Infrastructure"),
    ("Apex Cloud Systems", "APX-", "Hosting & Database Managed Services"),
    ("Quantum Logistics Inc.", "QL-", "Global Freight & Supply Chain"),
    ("BioHealth Analytics", "BHA-", "Clinical Data Processing"),
    ("CyberShield Security Ltd.", "CSS-", "SOC2 Penetration Testing & SIEM"),
    ("Vertex Hardware Group", "VHG-", "Server Racks & Edge Compute Units"),
    ("DataStream Networks", "DSN-", "Fiber Optical Dedicated Transit"),
    ("Starlight Digital Media", "SDM-", "Corporate Video & Asset Production"),
    ("Horizon Dynamics Corp.", "HDC-", "AI Acceleration GPUs & Workstations"),
    ("Nordic Data Partners", "NDP-", "GDPR EU Data Processing Services"),
]

PARTIES = [
    ("DocIntel Enterprise Corp.", "TechCorp Solutions LLC"),
    ("DocIntel Enterprise Corp.", "Apex Cloud Systems"),
    ("DocIntel Enterprise Corp.", "Quantum Logistics Inc."),
    ("DocIntel Enterprise Corp.", "CyberShield Security Ltd."),
    ("DocIntel Enterprise Corp.", "BioHealth Analytics"),
    ("DocIntel Enterprise Corp.", "Horizon Dynamics Corp."),
    ("DocIntel Enterprise Corp.", "Nordic Data Partners"),
]


def rasterize_pdf_to_scanned(pdf_path: Path):
    """Simulates a scanned physical document using PyMuPDF and PIL."""
    doc = fitz.open(str(pdf_path))
    scanned_images = []
    
    for page in doc:
        pix = page.get_pixmap(dpi=150)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        # Subtle scanner skew & blur
        angle = random.uniform(-0.8, 0.8)
        rotated = img.rotate(angle, resample=Image.BICUBIC, expand=False, fillcolor="white")
        gray = rotated.convert("L").filter(ImageFilter.SMOOTH_MORE)
        scanned_images.append(gray.convert("RGB"))
        
    doc.close()
    
    # Save to temp file and replace to avoid Windows file locks
    tmp_path = pdf_path.with_suffix(".tmp.pdf")
    if scanned_images:
        scanned_images[0].save(
            str(tmp_path),
            "PDF",
            resolution=150.0,
            save_all=True,
            append_images=scanned_images[1:] if len(scanned_images) > 1 else []
        )
        if tmp_path.exists():
            if pdf_path.exists():
                try:
                    pdf_path.unlink()
                except Exception:
                    pass
            try:
                tmp_path.rename(pdf_path)
            except Exception:
                pass


def generate_invoice_pdf(filename: str, vendor: str, inv_num: str, is_scanned: bool, has_math_anomaly: bool, is_duplicate: bool) -> Dict[str, Any]:
    filepath = SAMPLE_DOCS_DIR / filename
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []
    
    inv_date = (datetime.date(2026, 1, 1) + datetime.timedelta(days=random.randint(0, 200))).isoformat()
    due_date = (datetime.date.fromisoformat(inv_date) + datetime.timedelta(days=30)).isoformat()
    
    story.append(Paragraph(f"<b>INVOICE: {vendor}</b>", styles["Title"]))
    story.append(Paragraph(f"Invoice Number: <b>{inv_num}</b> | Date: {inv_date} | Due: {due_date}", styles["Normal"]))
    story.append(Spacer(1, 14))
    
    num_items = random.randint(2, 4)
    line_items = []
    calculated_subtotal = 0.0
    
    services = [
        "Cloud Compute Instance Hours (vCPU 16, 64GB RAM)",
        "Enterprise Dedicated Support & SLA Monitoring",
        "Managed Database Storage & Backup Replication",
        "SIEM Security Telemetry Ingestion",
        "API Gateway Throughput & Webhook Pipeline",
        "Automated Model Inference Compute",
    ]
    
    for i in range(num_items):
        desc = random.choice(services)
        qty = random.randint(1, 10)
        unit_price = round(random.uniform(120.0, 850.0), 2)
        total = round(qty * unit_price, 2)
        calculated_subtotal += total
        line_items.append({"description": desc, "quantity": qty, "unit_price": unit_price, "total": total})
        
    tax_amount = round(calculated_subtotal * 0.085, 2)
    
    if has_math_anomaly:
        # Deliberately inject mismatch in total
        reported_total = round(calculated_subtotal + tax_amount + random.choice([250.0, 500.0, -150.0]), 2)
    else:
        reported_total = round(calculated_subtotal + tax_amount, 2)
        
    table_data = [["Description", "Qty", "Unit Price", "Total"]]
    for item in line_items:
        table_data.append([item["description"], str(item["quantity"]), f"${item['unit_price']:,.2f}", f"${item['total']:,.2f}"])
        
    table_data.append(["", "", "Subtotal:", f"${calculated_subtotal:,.2f}"])
    table_data.append(["", "", "Tax (8.5%):", f"${tax_amount:,.2f}"])
    table_data.append(["", "", "TOTAL DUE:", f"${reported_total:,.2f}"])
    
    t = Table(table_data, colWidths=[280, 50, 90, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -4), 0.5, colors.HexColor("#cbd5e1")),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.HexColor("#0f172a")),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    story.append(t)
    doc.build(story)
    
    if is_scanned:
        rasterize_pdf_to_scanned(filepath)
        
    raw_text = f"INVOICE {vendor}\nInvoice Number: {inv_num}\nDate: {inv_date}\nDue: {due_date}\nSubtotal: ${calculated_subtotal:,.2f}\nTax: ${tax_amount:,.2f}\nTotal: ${reported_total:,.2f}\nLine Items:\n" + "\n".join([f"- {it['description']} (Qty: {it['quantity']}) = ${it['total']}" for it in line_items])
    
    fields = {
        "vendor_name": {"value": vendor, "confidence": 0.98 if not is_scanned else 0.88, "source": "visual" if is_scanned else "text"},
        "invoice_number": {"value": inv_num, "confidence": 0.99 if not is_scanned else 0.90, "source": "visual" if is_scanned else "text"},
        "invoice_date": {"value": inv_date, "confidence": 0.97, "source": "text"},
        "due_date": {"value": due_date, "confidence": 0.96, "source": "text"},
        "subtotal": {"value": calculated_subtotal, "confidence": 0.98, "source": "text"},
        "tax_amount": {"value": tax_amount, "confidence": 0.98, "source": "text"},
        "total_amount": {"value": reported_total, "confidence": 0.99, "source": "text"},
        "line_items": {"value": line_items, "confidence": 0.95, "source": "text"}
    }
    
    return {
        "filename": filename,
        "file_path": str(filepath),
        "doc_type": "invoice",
        "is_scanned": is_scanned,
        "raw_text": raw_text,
        "fields": fields,
        "overall_confidence": 0.96 if not is_scanned else 0.85
    }


def generate_contract_pdf(filename: str, party_a: str, party_b: str, contract_type: str, is_scanned: bool, missing_signature: bool, date_anomaly: bool) -> Dict[str, Any]:
    filepath = SAMPLE_DOCS_DIR / filename
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []
    
    eff_date = (datetime.date(2025, 6, 1) + datetime.timedelta(days=random.randint(0, 300))).isoformat()
    if date_anomaly:
        # Expiration before effective date
        exp_date = (datetime.date.fromisoformat(eff_date) - datetime.timedelta(days=60)).isoformat()
    else:
        exp_date = (datetime.date.fromisoformat(eff_date) + datetime.timedelta(days=365)).isoformat()
        
    story.append(Paragraph(f"<b>{contract_type.upper()} AGREEMENT</b>", styles["Title"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"This Master Agreement is entered into between <b>{party_a}</b> and <b>{party_b}</b>.", styles["Normal"]))
    story.append(Paragraph(f"Effective Date: <b>{eff_date}</b> | Expiration Date: <b>{exp_date}</b>", styles["Normal"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>1. SCOPE OF SERVICES & CONFIDENTIALITY</b>", styles["Heading2"]))
    story.append(Paragraph("The Receiving Party agrees to protect Proprietary Information with the same degree of care it uses for its own confidential records, but not less than reasonable care. Neither party shall disclose terms without prior written consent.", styles["Normal"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>2. INDEMNIFICATION & LIABILITY</b>", styles["Heading2"]))
    story.append(Paragraph("Total cumulative liability arising under this Agreement shall not exceed the aggregate fees paid in the twelve (12) month period preceding the claim.", styles["Normal"]))
    story.append(Spacer(1, 14))
    
    # Signature block
    sig_status = "unsigned" if missing_signature else "signed"
    sig_date = eff_date if not missing_signature else None
    
    story.append(Paragraph("<b>IN WITNESS WHEREOF</b>, the parties have executed this Agreement:", styles["Normal"]))
    story.append(Spacer(1, 8))
    
    sig_data = [
        [f"Party A: {party_a}", f"Party B: {party_b}"],
        [f"By: Jane Doe (VP Operations)", f"By: {'[NOT SIGNED - PENDING EXECUTION]' if missing_signature else 'Alex Mercer (Authorized Signatory)'}"],
        [f"Date: {eff_date}", f"Date: {'[MISSING]' if missing_signature else sig_date}"]
    ]
    t = Table(sig_data, colWidths=[260, 260])
    t.setStyle(TableStyle([
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.HexColor("#0f172a")),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    doc.build(story)
    
    if is_scanned:
        rasterize_pdf_to_scanned(filepath)
        
    raw_text = f"{contract_type.upper()} AGREEMENT\nParties: {party_a} and {party_b}\nEffective Date: {eff_date}\nExpiration Date: {exp_date}\nSignature Status: {sig_status}\nObligations: Proprietary information protection, SLA maintenance, liability cap."
    
    fields = {
        "parties": {"value": f"{party_a} and {party_b}", "confidence": 0.97 if not is_scanned else 0.86, "source": "visual" if is_scanned else "text"},
        "effective_date": {"value": eff_date, "confidence": 0.98, "source": "text"},
        "term_renewal": {"value": f"Expires {exp_date} with 30-day mutual renewal", "confidence": 0.94, "source": "text"},
        "key_obligations": {"value": "Confidentiality, IP ownership retention, $1M aggregate liability cap", "confidence": 0.92, "source": "text"},
        "signature_status": {"value": sig_status, "confidence": 0.98 if not is_scanned else 0.88, "source": "visual" if is_scanned else "text"},
        "signature_date": {"value": sig_date, "confidence": 0.95 if not missing_signature else 0.50, "source": "text"}
    }
    
    return {
        "filename": filename,
        "file_path": str(filepath),
        "doc_type": "contract",
        "is_scanned": is_scanned,
        "raw_text": raw_text,
        "fields": fields,
        "overall_confidence": 0.95 if not is_scanned else 0.83
    }


def generate_compliance_pdf(filename: str, doc_name: str, standard: str, is_scanned: bool, has_overdue_remediation: bool) -> Dict[str, Any]:
    filepath = SAMPLE_DOCS_DIR / filename
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []
    
    audit_date = (datetime.date(2026, 1, 10) + datetime.timedelta(days=random.randint(0, 180))).isoformat()
    remediation_deadline = "2025-11-30 (OVERDUE)" if has_overdue_remediation else (datetime.date.fromisoformat(audit_date) + datetime.timedelta(days=90)).isoformat()
    
    story.append(Paragraph(f"<b>{standard.upper()} COMPLIANCE & AUDIT REPORT</b>", styles["Title"]))
    story.append(Paragraph(f"Document: <b>{doc_name}</b> | Standard: {standard} | Audit Date: {audit_date}", styles["Normal"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>1. REGULATORY CLAUSE REFERENCES & SCOPE</b>", styles["Heading2"]))
    story.append(Paragraph(f"This evaluation reviews technical safeguards against {standard} regulatory benchmarks, covering data encryption at rest (AES-256), TLS 1.3 in transit, role-based access control, and automated audit logging.", styles["Normal"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>2. REQUIRED REMEDIATION ACTIONS & DEADLINES</b>", styles["Heading2"]))
    story.append(Paragraph(f"Status: {'CRITICAL DEFICIENCY - OVERDUE ACTION REQUIRED' if has_overdue_remediation else 'IN COMPLIANCE'}", styles["Normal"]))
    story.append(Paragraph(f"Mandated Remediation Deadline: <b>{remediation_deadline}</b>", styles["Normal"]))
    story.append(Paragraph("Key Action: Ensure annual third-party pen test report and BAA data protection addenda are counter-signed and registered in the internal compliance ledger.", styles["Normal"]))
    
    doc.build(story)
    
    if is_scanned:
        rasterize_pdf_to_scanned(filepath)
        
    raw_text = f"{standard.upper()} COMPLIANCE AUDIT REPORT\nDocument: {doc_name}\nStandard: {standard}\nAudit Date: {audit_date}\nRemediation Deadline: {remediation_deadline}\nClauses: AES-256 Encryption, TLS 1.3, RBAC, Data Protection Addenda."
    
    fields = {
        "standard_name": {"value": standard, "confidence": 0.98, "source": "text"},
        "relevant_clauses": {"value": "AES-256 encryption at rest, TLS 1.3 transit, RBAC enforcement, annual pen test", "confidence": 0.95, "source": "text"},
        "required_actions": {"value": "Counter-sign BAA addenda and remediate third-party penetration testing findings", "confidence": 0.93, "source": "text"},
        "deadlines": {"value": remediation_deadline, "confidence": 0.96, "source": "text"}
    }
    
    return {
        "filename": filename,
        "file_path": str(filepath),
        "doc_type": "compliance_doc",
        "is_scanned": is_scanned,
        "raw_text": raw_text,
        "fields": fields,
        "overall_confidence": 0.96 if not is_scanned else 0.87
    }


def generate_purchase_order_pdf(
    filename: str,
    vendor: str,
    po_num: str,
    is_scanned: bool,
    has_math_anomaly: bool,
    has_date_anomaly: bool,
    is_pending_approval: bool,
    is_duplicate: bool
) -> Dict[str, Any]:
    filepath = SAMPLE_DOCS_DIR / filename
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []

    order_date = (datetime.date(2026, 1, 1) + datetime.timedelta(days=random.randint(0, 180))).isoformat()
    if has_date_anomaly:
        delivery_date = (datetime.date.fromisoformat(order_date) - datetime.timedelta(days=14)).isoformat()
    else:
        delivery_date = (datetime.date.fromisoformat(order_date) + datetime.timedelta(days=random.choice([15, 30, 45]))).isoformat()

    buyer = "DocIntel Enterprise Corp."
    story.append(Paragraph(f"<b>PURCHASE ORDER: {po_num}</b>", styles["Title"]))
    story.append(Paragraph(f"<b>Buyer:</b> {buyer} | <b>Vendor:</b> {vendor}", styles["Normal"]))
    story.append(Paragraph(f"Order Date: <b>{order_date}</b> | Delivery Date: <b>{delivery_date}</b> | Payment Terms: <b>Net 45</b>", styles["Normal"]))
    story.append(Spacer(1, 14))

    num_items = random.randint(2, 4)
    line_items = []
    calculated_subtotal = 0.0
    po_catalog = [
        ("High-Performance Server Blade Node", 2, 4200.0),
        ("NVMe Enterprise Storage Array 100TB", 1, 8500.0),
        ("Cisco Nexus 48-Port Switch", 2, 1950.0),
        ("Redundant Power Supply Unit 1200W", 4, 350.0),
        ("Fiber Optic Transceiver Module 100G", 8, 220.0),
        ("Precision Air Conditioning Unit", 1, 6200.0)
    ]
    selected_items = random.sample(po_catalog, num_items)
    for desc, default_qty, default_price in selected_items:
        qty = random.randint(1, default_qty)
        unit_price = default_price
        total = round(qty * unit_price, 2)
        calculated_subtotal += total
        line_items.append({"description": desc, "quantity": qty, "unit_price": unit_price, "amount": total})

    tax_amount = round(calculated_subtotal * 0.0825, 2)
    if has_math_anomaly:
        reported_total = round(calculated_subtotal + tax_amount + random.choice([350.0, 750.0, -250.0]), 2)
    else:
        reported_total = round(calculated_subtotal + tax_amount, 2)

    table_data = [["Item Description", "Qty", "Unit Price", "Total Amount"]]
    for item in line_items:
        table_data.append([item["description"], str(item["quantity"]), f"${item['unit_price']:,.2f}", f"${item['amount']:,.2f}"])
    table_data.append(["", "", "Subtotal:", f"${calculated_subtotal:,.2f}"])
    table_data.append(["", "", "Sales Tax (8.25%):", f"${tax_amount:,.2f}"])
    table_data.append(["", "", "TOTAL PO AMOUNT:", f"${reported_total:,.2f}"])

    t = Table(table_data, colWidths=[280, 50, 90, 100])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -4), 0.5, colors.HexColor("#cbd5e1")),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.HexColor("#0f766e")),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    approver_name = "Marcus Vance, VP Global Procurement" if not is_pending_approval else "[UNAPPROVED - PENDING SIGN-OFF]"
    approval_status = "approved" if not is_pending_approval else "pending"
    story.append(Paragraph(f"<b>Requisition Authorization:</b> {approver_name} (Status: {approval_status.upper()})", styles["Normal"]))
    doc.build(story)

    if is_scanned:
        rasterize_pdf_to_scanned(filepath)

    raw_text = (
        f"PURCHASE ORDER: {po_num}\n"
        f"Buyer: {buyer}\n"
        f"Vendor: {vendor}\n"
        f"Order Date: {order_date}\n"
        f"Delivery Date: {delivery_date}\n"
        f"Payment Terms: Net 45\n"
        f"Subtotal: ${calculated_subtotal:,.2f}\n"
        f"Tax: ${tax_amount:,.2f}\n"
        f"Total Amount: ${reported_total:,.2f}\n"
        f"Approval Status: {approval_status}\n"
        f"Approver: {approver_name}\n"
        f"Line Items:\n" + "\n".join([f"- {it['description']} (Qty: {it['quantity']}) @ ${it['unit_price']:,.2f} = ${it['amount']:,.2f}" for it in line_items])
    )

    fields = {
        "po_number": {"value": po_num, "confidence": 0.99 if not is_scanned else 0.89, "source": "visual" if is_scanned else "text"},
        "vendor_name": {"value": vendor, "confidence": 0.98, "source": "text"},
        "buyer_name": {"value": buyer, "confidence": 0.98, "source": "text"},
        "order_date": {"value": order_date, "confidence": 0.96, "source": "text"},
        "delivery_date": {"value": delivery_date, "confidence": 0.95, "source": "text"},
        "payment_terms": {"value": "Net 45", "confidence": 0.94, "source": "text"},
        "line_items": {"value": line_items, "confidence": 0.95, "source": "text"},
        "subtotal": {"value": calculated_subtotal, "confidence": 0.98, "source": "text"},
        "tax_amount": {"value": tax_amount, "confidence": 0.97, "source": "text"},
        "total_amount": {"value": reported_total, "confidence": 0.99, "source": "text"},
        "approval_status": {"value": approval_status, "confidence": 0.96, "source": "text"},
        "approver_name": {"value": approver_name, "confidence": 0.93, "source": "text"},
    }

    return {
        "filename": filename,
        "file_path": str(filepath),
        "doc_type": "purchase_order",
        "is_scanned": is_scanned,
        "raw_text": raw_text,
        "fields": fields,
        "overall_confidence": 0.96 if not is_scanned else 0.86
    }


def generate_tax_form_pdf(
    filename: str,
    taxpayer_name: str,
    form_type: str,
    is_scanned: bool,
    has_tin_anomaly: bool,
    is_unsigned: bool
) -> Dict[str, Any]:
    filepath = SAMPLE_DOCS_DIR / filename
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []

    tax_year = "2026"
    business_name = f"{taxpayer_name} Operating LLC"
    classification = random.choice(["C Corporation", "Individual/Sole Proprietor", "Limited Liability Company - C", "S Corporation"])

    if has_tin_anomaly:
        tin_val = random.choice(["000-00-0000", "INVALID-TIN", "12-34", "99-XXXXXXX"])
    else:
        tin_val = f"{random.randint(10, 98)}-{random.randint(1000000, 9999999)}"

    story.append(Paragraph("<b>DEPARTMENT OF THE TREASURY - INTERNAL REVENUE SERVICE</b>", styles["Normal"]))
    story.append(Paragraph(f"<b>Form {form_type} (Rev. October 2024) — Tax Information Certification</b>", styles["Title"]))
    story.append(Spacer(1, 10))

    info_data = [
        ["1. Taxpayer Name (as shown on tax return):", taxpayer_name],
        ["2. Business Name / Disregarded Entity:", business_name],
        ["3. Federal Tax Classification:", classification],
        ["4. Address & City/State/Zip:", "500 Howard Street, Suite 300, San Francisco, CA 94105"],
        ["5. Part I - Taxpayer Identification Number (TIN/EIN):", tin_val]
    ]
    t_info = Table(info_data, colWidths=[240, 280])
    t_info.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>Part II: Certification</b>", styles["Heading2"]))
    story.append(Paragraph("Under penalties of perjury, I certify that: (1) The number shown on this form is my correct taxpayer identification number, and (2) I am not subject to backup withholding, and (3) I am a U.S. citizen or other U.S. person.", styles["Normal"]))
    story.append(Spacer(1, 10))

    sig_date = "2026-01-15" if not is_unsigned else None
    sig_line = "Jane Doe, Authorized Corporate Controller" if not is_unsigned else "___________________________ [UNSIGNED]"
    story.append(Paragraph(f"<b>Signature:</b> {sig_line} | <b>Date:</b> {sig_date or '[MISSING DATE]'}", styles["Normal"]))
    doc.build(story)

    if is_scanned:
        rasterize_pdf_to_scanned(filepath)

    raw_text = (
        f"INTERNAL REVENUE SERVICE Form {form_type}\n"
        f"Taxpayer Name: {taxpayer_name}\n"
        f"Business Name: {business_name}\n"
        f"Tax Classification: {classification}\n"
        f"TIN/EIN: {tin_val}\n"
        f"Address: 500 Howard Street, Suite 300, San Francisco, CA 94105\n"
        f"Certification Signature: {sig_line}\n"
        f"Signature Date: {sig_date or 'NONE'}\n"
        f"Is Signed: {'No' if is_unsigned else 'Yes'}"
    )

    fields = {
        "form_type": {"value": form_type, "confidence": 0.98, "source": "text"},
        "tax_year": {"value": tax_year, "confidence": 0.97, "source": "text"},
        "taxpayer_name": {"value": taxpayer_name, "confidence": 0.98 if not is_scanned else 0.88, "source": "visual" if is_scanned else "text"},
        "business_name": {"value": business_name, "confidence": 0.95, "source": "text"},
        "tax_classification": {"value": classification, "confidence": 0.96, "source": "text"},
        "tin_ein": {"value": tin_val, "confidence": 0.97 if not is_scanned else 0.89, "source": "visual" if is_scanned else "text"},
        "address": {"value": "500 Howard Street, Suite 300, San Francisco, CA 94105", "confidence": 0.92, "source": "text"},
        "is_signed": {"value": not is_unsigned, "confidence": 0.96, "source": "text"},
        "signature_date": {"value": sig_date, "confidence": 0.95 if not is_unsigned else 0.40, "source": "text"},
    }

    return {
        "filename": filename,
        "file_path": str(filepath),
        "doc_type": "tax_form",
        "is_scanned": is_scanned,
        "raw_text": raw_text,
        "fields": fields,
        "overall_confidence": 0.96 if not is_scanned else 0.86
    }


def package_corpus_zip():
    """Packages all generated PDF sample documents into a standalone zip archive."""
    zip_path = BASE_DIR / "data" / "dataset_corpus_400plus.zip"
    print(f"\n📦 Packaging complete document dataset into {zip_path}...", flush=True)
    pdf_count = 0
    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zipf:
        for pdf_file in SAMPLE_DOCS_DIR.glob("*.pdf"):
            if not pdf_file.name.endswith(".tmp.pdf"):
                zipf.write(pdf_file, arcname=pdf_file.name)
                pdf_count += 1
    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"✅ Created archive: {zip_path.name} ({pdf_count} files, {size_mb:.2f} MB)", flush=True)


def generate_and_index_full_corpus():
    print("================================================================================", flush=True)
    print("🚀 GENERATING & INDEXING LARGE MULTIMODAL ENTERPRISE CORPUS (450 DOCUMENTS)", flush=True)
    print("================================================================================", flush=True)
    
    # 0. Clean previous database and FAISS index for deterministic state
    print("🧹 Resetting SQLite tables and FAISS vector index for clean ingestion...", flush=True)
    with default_db.get_connection() as conn:
        conn.execute("DELETE FROM extracted_fields;")
        conn.execute("DELETE FROM anomalies;")
        conn.execute("DELETE FROM documents;")
        conn.commit()

    default_vector_index.index = faiss.IndexFlatIP(384)
    default_vector_index.metadata = []

    all_generated_docs = []
    
    # 1. Generate 150 Invoices
    print("\n📦 1/5: Generating 150 Invoices (Standard, Scanned, Multi-line, Anomaly Tests)...", flush=True)
    for i in range(1, 151):
        vendor, prefix, category = random.choice(VENDORS)
        inv_num = f"{prefix}{202600 + i}"
        is_scanned = (i % 5 == 0) # 20% scanned
        has_math_anomaly = (i in [4, 12, 28, 45, 68, 92, 114, 137])
        is_duplicate = (i in [15, 55, 105])
        if is_duplicate:
            inv_num = "INV-2026-DUPLICATE-001"
            
        fname = f"invoice_{i:03d}_{'scanned_' if is_scanned else ''}{vendor.split()[0].lower()}_{inv_num.lower()}.pdf"
        doc_meta = generate_invoice_pdf(fname, vendor, inv_num, is_scanned, has_math_anomaly, is_duplicate)
        all_generated_docs.append(doc_meta)
        
    # 2. Generate 120 Contracts
    print("📦 2/5: Generating 120 Contracts (NDAs, MSAs, SOWs, Missing Signatures, Dates)...", flush=True)
    contract_types = ["Master Services", "Non-Disclosure", "Statement of Work", "Software License", "Cloud Service Level"]
    for i in range(1, 121):
        party_a, party_b = random.choice(PARTIES)
        ctype = random.choice(contract_types)
        is_scanned = (i % 6 == 0) # ~17% scanned
        missing_sig = (i in [2, 18, 37, 59, 81, 104])
        date_anomaly = (i in [9, 24, 62, 95])
        
        fname = f"contract_{i:03d}_{'scanned_' if is_scanned else ''}{ctype.replace(' ', '_').lower()}_{party_b.split()[0].lower()}.pdf"
        doc_meta = generate_contract_pdf(fname, party_a, party_b, ctype, is_scanned, missing_sig, date_anomaly)
        all_generated_docs.append(doc_meta)
        
    # 3. Generate 75 Compliance Documents
    print("📦 3/5: Generating 75 Compliance Records (SOC2, HIPAA, GDPR, ISO 27001, Deadlines)...", flush=True)
    standards = ["SOC2 Type II", "HIPAA BAA", "GDPR Article 28", "ISO/IEC 27001", "PCI-DSS v4.0"]
    for i in range(1, 76):
        std = random.choice(standards)
        is_scanned = (i % 5 == 0)
        overdue = (i in [5, 19, 42, 67])
        
        fname = f"compliance_{i:03d}_{'scanned_' if is_scanned else ''}{std.replace(' ', '_').replace('/', '_').lower()}_audit.pdf"
        doc_meta = generate_compliance_pdf(fname, f"Annual Security Assessment {i}", std, is_scanned, overdue)
        all_generated_docs.append(doc_meta)

    # 4. Generate 55 Purchase Orders
    print("📦 4/5: Generating 55 Purchase Orders (PO Requisitions, Line Items, Delivery Dates)...", flush=True)
    for i in range(1, 56):
        vendor, prefix, category = random.choice(VENDORS)
        po_num = f"PO-2026-{8000 + i}"
        is_scanned = (i % 5 == 0)
        has_math_anomaly = (i in [3, 17, 34, 48])
        has_date_anomaly = (i in [7, 26, 44])
        is_pending_approval = (i in [2, 14, 29, 39, 51])
        is_duplicate = (i in [11, 33])
        if is_duplicate:
            po_num = "PO-2026-DUPLICATE-999"

        fname = f"purchase_order_{i:03d}_{'scanned_' if is_scanned else ''}{vendor.split()[0].lower()}_{po_num.lower()}.pdf"
        doc_meta = generate_purchase_order_pdf(
            fname, vendor, po_num, is_scanned, has_math_anomaly, has_date_anomaly, is_pending_approval, is_duplicate
        )
        all_generated_docs.append(doc_meta)

    # 5. Generate 50 Tax Forms (IRS Form W-9 / 1099-NEC)
    print("📦 5/5: Generating 50 Tax Records (IRS Form W-9, 1099-NEC, TIN Validations, Signatures)...", flush=True)
    for i in range(1, 51):
        vendor, prefix, category = random.choice(VENDORS)
        form_type = "W-9" if (i % 2 == 1) else "1099-NEC"
        is_scanned = (i % 5 == 0)
        has_tin_anomaly = (i in [4, 16, 28, 41])
        is_unsigned = (i in [6, 19, 32, 45])

        fname = f"tax_form_{i:03d}_{'scanned_' if is_scanned else ''}{form_type.lower()}_{vendor.split()[0].lower()}.pdf"
        doc_meta = generate_tax_form_pdf(
            fname, vendor, form_type, is_scanned, has_tin_anomaly, is_unsigned
        )
        all_generated_docs.append(doc_meta)
        
    print(f"\n✅ Total documents generated on disk: {len(all_generated_docs)}", flush=True)
    print("⚡ Ingesting into SQLite Database & Building FAISS Vector Index...", flush=True)
    
    # Ingest & Index into SQLite + FAISS
    total_anomalies_detected = 0
    
    for idx, d in enumerate(all_generated_docs, 1):
        doc_id = str(uuid.uuid4())
        
        # Detect anomalies
        anomalies = detect_anomalies(
            doc_id=doc_id,
            doc_type=d["doc_type"],
            extracted_fields=d["fields"],
            raw_text=d["raw_text"]
        )
        total_anomalies_detected += len(anomalies)
        
        # Save to SQLite
        default_db.insert_document(
            doc_id=doc_id,
            filename=d["filename"],
            file_path=d["file_path"],
            doc_type=d["doc_type"],
            is_scanned=d["is_scanned"],
            total_pages=1,
            raw_text=d["raw_text"],
            overall_confidence=d["overall_confidence"],
            status="needs_review" if anomalies else "clean"
        )
        
        default_db.save_extracted_fields(doc_id, d["fields"])
        if anomalies:
            default_db.save_anomalies(doc_id, anomalies)
            
        # Add to local FAISS vector store
        default_vector_index.add_document(
            doc_id=doc_id,
            filename=d["filename"],
            full_text=d["raw_text"],
            doc_type=d["doc_type"]
        )
        
        if idx % 50 == 0 or idx == len(all_generated_docs):
            print(f"  Processed & Indexed {idx}/{len(all_generated_docs)} documents into SQLite & FAISS...", flush=True)
            
    # Persist FAISS index to disk
    default_vector_index.save()
    
    # Package into zip archive
    package_corpus_zip()

    # Check final stats
    with default_db.get_connection() as conn:
        doc_count = conn.cursor().execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        anom_count = conn.cursor().execute("SELECT COUNT(*) FROM anomalies").fetchone()[0]
    vector_count = default_vector_index.index.ntotal if default_vector_index.index else 0
    
    print("\n================================================================================", flush=True)
    print("🎉 CORPUS TRAINING & INDEXING COMPLETED SUCCESSFULLY!", flush=True)
    print("================================================================================", flush=True)
    print(f"📊 Total Documents in DB:     {doc_count}", flush=True)
    print(f"🧠 Total Vectors in FAISS:    {vector_count}", flush=True)
    print(f"🚩 Total Anomalies Flagged:   {anom_count}", flush=True)
    print("================================================================================", flush=True)


if __name__ == "__main__":
    generate_and_index_full_corpus()
