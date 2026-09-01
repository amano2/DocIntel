"""
Synthetic Document Generator.
Generates 8 realistic synthetic PDFs (invoices, contracts, compliance docs):
- 4 native text-layer PDFs
- 4 scanned/image-based PDFs (rasterized images inserted into PDF)
- Deliberately injected anomalies for testing rule & LLM checks.
"""

import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import fitz  # PyMuPDF for high-fidelity PDF rendering to image

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLE_DIR = BASE_DIR / "data" / "sample_docs"
EVAL_DOCS_DIR = BASE_DIR / "eval" / "test_documents"

SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
EVAL_DOCS_DIR.mkdir(parents=True, exist_ok=True)


def create_scanned_pdf_from_pdf(source_pdf_path: Path, output_pdf_path: Path):
    """
    Renders a text PDF to high-res images, adds scanning artifacts (noise, slight rotation),
    and saves as an image-only (scanned) PDF with NO text layer.
    """
    doc = fitz.open(str(source_pdf_path))
    scanned_images = []
    
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        # Add slight rotation & subtle noise to simulate a physical scanner
        rotated = img.rotate(0.6, resample=Image.BICUBIC, expand=False, fillcolor="white")
        # Convert to grayscale and back to add slight scanner degradation
        gray = rotated.convert("L")
        noisy = gray.filter(ImageFilter.SMOOTH_MORE)
        final_img = noisy.convert("RGB")
        scanned_images.append(final_img)
        
    doc.close()
    
    if scanned_images:
        scanned_images[0].save(
            str(output_pdf_path),
            "PDF",
            resolution=200.0,
            save_all=True,
            append_images=scanned_images[1:] if len(scanned_images) > 1 else []
        )


def generate_invoice_1_standard():
    """Clean text-layer invoice with correct math."""
    filepath = SAMPLE_DIR / "invoice_01_standard_techcorp.pdf"
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []
    
    # Header
    story.append(Paragraph("<b>TechCorp Solutions LLC</b>", styles['Title']))
    story.append(Paragraph("100 Innovation Way, Suite 400, San Francisco, CA 94107 | billing@techcorp.io", styles['Normal']))
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1A365D")))
    story.append(Spacer(1, 10))
    
    # Metadata table
    meta_data = [
        [Paragraph("<b>INVOICE TO:</b>", styles['Normal']), Paragraph("<b>INVOICE DETAILS:</b>", styles['Normal'])],
        [Paragraph("Apex Global Enterprises Inc.<br/>742 Evergreen Terrace<br/>Seattle, WA 98101", styles['Normal']),
         Paragraph("<b>Invoice Number:</b> INV-2025-1089<br/><b>Date:</b> October 15, 2025<br/><b>Due Date:</b> November 14, 2025<br/><b>Payment Terms:</b> Net 30", styles['Normal'])]
    ]
    t_meta = Table(meta_data, colWidths=[270, 270])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 15))
    
    # Line items
    items_data = [
        ["Description", "Qty", "Unit Price ($)", "Amount ($)"],
        ["Cloud Architecture Consulting (Hours)", "40", "150.00", "6000.00"],
        ["Microservices Migration Sprint Support", "1", "3500.00", "3500.00"],
        ["Enterprise SLA Maintenance - Oct 2025", "1", "1200.00", "1200.00"],
        ["", "", "Subtotal:", "$10,700.00"],
        ["", "", "Tax (8.5%):", "$909.50"],
        ["", "", "Total Amount Due:", "$11,609.50"],
    ]
    t_items = Table(items_data, colWidths=[260, 60, 110, 110])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1A365D")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,3), 0.5, colors.grey),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (2,4), (3,6), 'Helvetica-Bold'),
        ('LINEABOVE', (2,4), (3,4), 1, colors.HexColor("#1A365D")),
        ('LINEBELOW', (2,6), (3,6), 1.5, colors.HexColor("#1A365D")),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 25))
    story.append(Paragraph("<b>Payment Instructions:</b> Wire transfer to TechCorp Solutions LLC, Bank: Chase, Account ending in #4921.", styles['Italic']))
    
    doc.build(story)


def generate_invoice_2_math_anomaly():
    """Text-layer invoice with deliberate calculation discrepancy."""
    filepath = SAMPLE_DIR / "invoice_02_math_anomaly_nexus.pdf"
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>Nexus Logistics & Supply Co.</b>", styles['Title']))
    story.append(Paragraph("450 Freight Blvd, Dallas, TX 75201 | accounts@nexuslogistics.com", styles['Normal']))
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#7B1113")))
    story.append(Spacer(1, 10))
    
    meta_data = [
        [Paragraph("<b>BILLED TO:</b>", styles['Normal']), Paragraph("<b>INVOICE DETAILS:</b>", styles['Normal'])],
        [Paragraph("Quantum Manufacturing Ltd.<br/>1200 Industrial Pkwy<br/>Austin, TX 78701", styles['Normal']),
         Paragraph("<b>Invoice Number:</b> NEX-88421<br/><b>Date:</b> November 01, 2025<br/><b>Due Date:</b> November 21, 2025<br/><b>Terms:</b> Net 20", styles['Normal'])]
    ]
    t_meta = Table(meta_data, colWidths=[270, 270])
    t_meta.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(t_meta)
    story.append(Spacer(1, 15))
    
    # Deliberate math error: Line items sum to $2,350.00, but subtotal is written as $2,850.00!
    items_data = [
        ["Item & Description", "Qty", "Rate ($)", "Total ($)"],
        ["Pallet Storage - Cold Zone A", "10", "75.00", "750.00"],
        ["Freight Expedited Delivery Service", "2", "600.00", "1200.00"],
        ["Handling & Hazardous Surcharge", "4", "100.00", "400.00"],
        ["", "", "Subtotal:", "$2,850.00"], # ANOMALY: 750 + 1200 + 400 = 2350, NOT 2850
        ["", "", "Sales Tax (5.0%):", "$142.50"],
        ["", "", "Total Due:", "$2,992.50"],
    ]
    t_items = Table(items_data, colWidths=[260, 60, 110, 110])
    t_items.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#7B1113")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,3), 0.5, colors.grey),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (2,4), (3,6), 'Helvetica-Bold'),
        ('LINEABOVE', (2,4), (3,4), 1, colors.black),
    ]))
    story.append(t_items)
    story.append(Spacer(1, 20))
    story.append(Paragraph("<b>Notice:</b> Please ensure prompt payment to avoid late fees of 1.5% per month.", styles['Normal']))
    
    doc.build(story)


def generate_invoice_3_scanned():
    """Scanned image PDF for vision-based extraction."""
    temp_pdf = SAMPLE_DIR / "_temp_inv_03.pdf"
    scanned_pdf = SAMPLE_DIR / "invoice_03_scanned_vertex_hardware.pdf"
    
    doc = SimpleDocTemplate(str(temp_pdf), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>VERTEX HARDWARE SUPPLIERS CORP</b>", styles['Title']))
    story.append(Paragraph("88 Industrial Loop, Chicago, IL 60607 | Phone: (312) 555-0199", styles['Normal']))
    story.append(Spacer(1, 15))
    
    meta_data = [
        [Paragraph("<b>CUSTOMER:</b>", styles['Normal']), Paragraph("<b>INVOICE INFO:</b>", styles['Normal'])],
        [Paragraph("BlueSky Dynamics LLC<br/>500 Tech Blvd<br/>Chicago, IL 60611", styles['Normal']),
         Paragraph("<b>Invoice #:</b> VTX-99042<br/><b>Date:</b> September 20, 2025<br/><b>Due Date:</b> October 20, 2025<br/><b>PO Number:</b> PO-7712", styles['Normal'])]
    ]
    story.append(Table(meta_data, colWidths=[260, 260]))
    story.append(Spacer(1, 15))
    
    items = [
        ["Item Description", "Qty", "Unit ($)", "Total ($)"],
        ["Server Rack 42U Enclosure", "2", "850.00", "1700.00"],
        ["Cat6 Ethernet Spool (1000ft)", "5", "120.00", "600.00"],
        ["Managed Gigabit Switch 24-Port", "3", "300.00", "900.00"],
        ["", "", "Subtotal:", "$3,200.00"],
        ["", "", "Tax (7.0%):", "$224.00"],
        ["", "", "Total:", "$3,424.00"]
    ]
    t = Table(items, colWidths=[250, 50, 110, 110])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2D3748")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('GRID', (0,0), (-1,3), 0.5, colors.gray),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (2,4), (3,6), 'Helvetica-Bold'),
    ]))
    story.append(t)
    doc.build(story)
    
    # Rasterize to scanned PDF
    create_scanned_pdf_from_pdf(temp_pdf, scanned_pdf)
    if temp_pdf.exists():
        temp_pdf.unlink()


def generate_invoice_4_duplicate_anomaly():
    """Scanned duplicate invoice sharing same invoice number (INV-2025-1089) with different date/amount."""
    temp_pdf = SAMPLE_DIR / "_temp_inv_04.pdf"
    scanned_pdf = SAMPLE_DIR / "invoice_04_scanned_duplicate_anomaly.pdf"
    
    doc = SimpleDocTemplate(str(temp_pdf), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>TechCorp Solutions LLC</b>", styles['Title']))
    story.append(Paragraph("100 Innovation Way, Suite 400, San Francisco, CA 94107", styles['Normal']))
    story.append(Spacer(1, 15))
    
    meta_data = [
        [Paragraph("<b>INVOICE TO:</b>", styles['Normal']), Paragraph("<b>INVOICE DETAILS:</b>", styles['Normal'])],
        [Paragraph("Apex Global Enterprises Inc.<br/>742 Evergreen Terrace<br/>Seattle, WA 98101", styles['Normal']),
         Paragraph("<b>Invoice Number:</b> INV-2025-1089<br/><b>Date:</b> December 05, 2025<br/><b>Due Date:</b> January 04, 2026<br/><b>Terms:</b> Net 30", styles['Normal'])]
    ]
    story.append(Table(meta_data, colWidths=[260, 260]))
    story.append(Spacer(1, 15))
    
    items = [
        ["Description", "Qty", "Rate ($)", "Amount ($)"],
        ["Additional Cloud DevOps Hours", "15", "150.00", "2250.00"],
        ["Database Optimization Service", "1", "1800.00", "1800.00"],
        ["", "", "Subtotal:", "$4,050.00"],
        ["", "", "Tax (8.5%):", "$344.25"],
        ["", "", "Total Due:", "$4,394.25"]
    ]
    t = Table(items, colWidths=[250, 50, 110, 110])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1A365D")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('GRID', (0,0), (-1,2), 0.5, colors.gray),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (2,3), (3,5), 'Helvetica-Bold'),
    ]))
    story.append(t)
    doc.build(story)
    
    create_scanned_pdf_from_pdf(temp_pdf, scanned_pdf)
    if temp_pdf.exists():
        temp_pdf.unlink()


def generate_contract_1_standard():
    """Text-layer Mutual NDA contract, fully executed and valid."""
    filepath = SAMPLE_DIR / "contract_01_standard_nda.pdf"
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=45, leftMargin=45, topMargin=45, bottomMargin=45)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>MUTUAL NON-DISCLOSURE AGREEMENT</b>", styles['Title']))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 15))
    
    p1 = ("This Mutual Non-Disclosure Agreement (\"Agreement\") is entered into as of <b>January 15, 2025</b> "
          "(\"Effective Date\"), by and between <b>Alpha Data Systems Inc.</b>, a Delaware corporation having its "
          "principal office at 101 Silicon Ave, Palo Alto, CA 94301 (\"Disclosing Party\"), and <b>Beacon Analytics Corp.</b>, "
          "a California corporation located at 500 Market St, San Francisco, CA 94105 (\"Receiving Party\").")
    story.append(Paragraph(p1, styles['Normal']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("<b>1. Purpose & Scope:</b> The parties wish to explore a potential business partnership regarding AI-powered document analytics and wish to share proprietary technical data.", styles['Normal']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("<b>2. Confidentiality Obligations:</b> The Receiving Party shall protect Confidential Information with the same degree of care it uses for its own confidential data, but in no event less than reasonable care. Receiving Party shall not disclose Confidential Information to third parties without prior written consent.", styles['Normal']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("<b>3. Term and Renewal:</b> This Agreement shall remain in effect for a period of <b>2 years</b> from the Effective Date (Term ending January 15, 2027), with automatic one-year renewals unless terminated in writing 30 days prior.", styles['Normal']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("<b>4. Governing Law:</b> This Agreement shall be governed by and construed in accordance with the laws of the State of California.", styles['Normal']))
    story.append(Spacer(1, 20))
    
    sig_data = [
        [Paragraph("<b>Alpha Data Systems Inc.</b>", styles['Normal']), Paragraph("<b>Beacon Analytics Corp.</b>", styles['Normal'])],
        [Paragraph("Signature: <i>/s/ Sarah Jenkins</i>", styles['Normal']), Paragraph("Signature: <i>/s/ Robert Chen</i>", styles['Normal'])],
        [Paragraph("Name: Sarah Jenkins", styles['Normal']), Paragraph("Name: Robert Chen", styles['Normal'])],
        [Paragraph("Title: Chief Executive Officer", styles['Normal']), Paragraph("Title: VP of Engineering", styles['Normal'])],
        [Paragraph("Date: January 15, 2025", styles['Normal']), Paragraph("Date: January 15, 2025", styles['Normal'])],
    ]
    t_sig = Table(sig_data, colWidths=[260, 260])
    t_sig.setStyle(TableStyle([('BOTTOMPADDING', (0,0), (-1,-1), 4)]))
    story.append(t_sig)
    
    doc.build(story)


def generate_contract_2_scanned_unsigned():
    """Scanned image PDF of a Master Services Agreement with missing signatures."""
    temp_pdf = SAMPLE_DIR / "_temp_contract_02.pdf"
    scanned_pdf = SAMPLE_DIR / "contract_02_scanned_unsigned_msa.pdf"
    
    doc = SimpleDocTemplate(str(temp_pdf), pagesize=letter, rightMargin=45, leftMargin=45, topMargin=45, bottomMargin=45)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>MASTER SERVICES AGREEMENT</b>", styles['Title']))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("This Master Services Agreement (\"Agreement\") is made effective as of <b>March 01, 2025</b>, by and between <b>CloudScale Infrastructure LLC</b> (\"Provider\") and <b>Evergreen Retail Partners</b> (\"Client\").", styles['Normal']))
    story.append(Spacer(1, 8))
    
    story.append(Paragraph("<b>Section 1 - Scope of Services:</b> Provider agrees to deliver managed cloud hosting and 24/7 incident response services as detailed in Exhibit A.", styles['Normal']))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Section 2 - Fees & Payment:</b> Client shall pay a recurring monthly fee of $4,500 due on the first day of each billing cycle. Net 30 payment terms apply.", styles['Normal']))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Section 3 - Term:</b> Initial term of 12 months with annual auto-renewal.", styles['Normal']))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Section 4 - Governing Law:</b> State of New York.", styles['Normal']))
    story.append(Spacer(1, 25))
    
    # Unsigned signature block (ANOMALY: Missing signatures & signature dates)
    sig_data = [
        [Paragraph("<b>CloudScale Infrastructure LLC</b>", styles['Normal']), Paragraph("<b>Evergreen Retail Partners</b>", styles['Normal'])],
        [Paragraph("Signature: ______________________", styles['Normal']), Paragraph("Signature: ______________________", styles['Normal'])],
        [Paragraph("Name: David Vance", styles['Normal']), Paragraph("Name: Linda Morris", styles['Normal'])],
        [Paragraph("Title: VP Sales", styles['Normal']), Paragraph("Title: Chief Operating Officer", styles['Normal'])],
        [Paragraph("Date: ________________________", styles['Normal']), Paragraph("Date: ________________________", styles['Normal'])],
    ]
    t_sig = Table(sig_data, colWidths=[260, 260])
    story.append(t_sig)
    
    doc.build(story)
    create_scanned_pdf_from_pdf(temp_pdf, scanned_pdf)
    if temp_pdf.exists():
        temp_pdf.unlink()


def generate_contract_3_date_anomaly():
    """Text-layer PDF with conflicting dates (termination date precedes effective date)."""
    filepath = SAMPLE_DIR / "contract_03_date_anomaly_vendor.pdf"
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=45, leftMargin=45, topMargin=45, bottomMargin=45)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>VENDOR SERVICES AGREEMENT</b>", styles['Title']))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#B91C1C")))
    story.append(Spacer(1, 12))
    
    p1 = ("This Vendor Services Agreement (\"Agreement\") is dated <b>July 01, 2025</b> (\"Effective Date\"), "
          "by and between <b>Summit Media Network Inc.</b> (\"Company\") and <b>Kite Creative Studio LLC</b> (\"Vendor\").")
    story.append(Paragraph(p1, styles['Normal']))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("<b>1. Services:</b> Vendor will provide video production and graphic design deliverables.", styles['Normal']))
    story.append(Spacer(1, 8))
    # ANOMALY: Agreement dated July 01, 2025, but expiration date is January 15, 2025 (in the past)!
    story.append(Paragraph("<b>2. Agreement Term & Termination:</b> The term of this agreement commences on July 01, 2025 and shall terminate on <b>January 15, 2025</b> unless renewed.", styles['Normal']))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>3. Compensation:</b> Fixed fee of $15,000 payable upon deliverable milestones.", styles['Normal']))
    story.append(Spacer(1, 20))
    
    sig_data = [
        [Paragraph("<b>Summit Media Network Inc.</b>", styles['Normal']), Paragraph("<b>Kite Creative Studio LLC</b>", styles['Normal'])],
        [Paragraph("Signature: <i>/s/ Daniel Craig</i>", styles['Normal']), Paragraph("Signature: <i>/s/ Karen White</i>", styles['Normal'])],
        [Paragraph("Date: July 01, 2025", styles['Normal']), Paragraph("Date: July 01, 2025", styles['Normal'])],
    ]
    story.append(Table(sig_data, colWidths=[260, 260]))
    doc.build(story)


def generate_compliance_1_standard():
    """Text-layer Compliance & Regulatory Audit Report with clauses, obligations, and deadlines."""
    filepath = SAMPLE_DIR / "compliance_01_soc2_gdpr_audit.pdf"
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph("<b>ANNUAL SOC 2 & GDPR COMPLIANCE AUDIT REPORT</b>", styles['Title']))
    story.append(Paragraph("Document ID: COMP-2025-Q3-08 | Audit Period: FY2025 | Assessor: CyberGuard Assurance LLP", styles['Normal']))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0F766E")))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("<b>1. Executive Summary:</b> This compliance document outlines mandatory security controls, identified non-conformities, and required remediation actions for FinTech Corp under SOC 2 Trust Services Criteria (CC6.1, CC6.6, CC7.2) and GDPR Article 32 (Security of Processing).", styles['Normal']))
    story.append(Spacer(1, 10))
    
    comp_items = [
        ["Control / Clause", "Required Action", "Status", "Deadline", "Responsible Entity"],
        ["SOC 2 CC6.1\nAccess Control", "Enforce hardware MFA across all administrative console accounts.", "Non-Compliant", "Dec 31, 2025", "SecOps Team"],
        ["GDPR Art. 32\nData Encryption", "Rotate AWS KMS customer-managed keys and encrypt legacy S3 buckets.", "Remediated", "Nov 15, 2025", "DevOps Lead"],
        ["SOC 2 CC7.2\nVulnerability Mgmt", "Patch critical CVEs in production container base images within 7 days.", "Action Required", "Jan 15, 2026", "Platform Engineering"],
        ["GDPR Art. 33\nIncident Notification", "Establish documented 72-hour regulatory breach reporting playbook.", "Under Review", "Feb 28, 2026", "Legal & Compliance"],
    ]
    t = Table(comp_items, colWidths=[110, 180, 80, 80, 90])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F766E")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.gray),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>Sign-off Authority:</b> Lead Auditor: Marcus Thorne, CISSP (CyberGuard Assurance LLP) — Signed: October 10, 2025.", styles['Italic']))
    
    doc.build(story)


def main():
    print("Generating synthetic multimodal document dataset...")
    generate_invoice_1_standard()
    generate_invoice_2_math_anomaly()
    generate_invoice_3_scanned()
    generate_invoice_4_duplicate_anomaly()
    generate_contract_1_standard()
    generate_contract_2_scanned_unsigned()
    generate_contract_3_date_anomaly()
    generate_compliance_1_standard()
    
    # Also copy documents to eval/test_documents/ for evaluation runner
    import shutil
    for doc_file in SAMPLE_DIR.glob("*.pdf"):
        shutil.copy(doc_file, EVAL_DOCS_DIR / doc_file.name)
        
    print(f"Successfully generated 8 documents in:\n- {SAMPLE_DIR}\n- {EVAL_DOCS_DIR}")


if __name__ == "__main__":
    main()
