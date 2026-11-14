import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

os.makedirs('data/sample_docs', exist_ok=True)
os.makedirs('data/sample_docs/reserve_for_demo', exist_ok=True)

styles = getSampleStyleSheet()

header_style = ParagraphStyle(
    'DocHeader',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=colors.HexColor('#18181b')
)

sub_style = ParagraphStyle(
    'DocSub',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=colors.HexColor('#52525b')
)

body_style = ParagraphStyle(
    'DocBody',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=14,
    textColor=colors.HexColor('#27272a')
)

bold_style = ParagraphStyle(
    'DocBold',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=14,
    textColor=colors.HexColor('#18181b')
)

# ── 1. Ingested Anomaly 1: invoice_wire_tampering.pdf ──────────────────────────
def build_invoice_wire_tampering():
    pdf_path = 'data/sample_docs/invoice_wire_tampering.pdf'
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    story.append(Paragraph("APEX CLOUD INFRASTRUCTURE INC.", header_style))
    story.append(Paragraph("100 Enterprise Way, Suite 400, San Jose, CA 95110 | Billing: billing@apexcloud.io", sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#ea580c')))
    story.append(Spacer(1, 10))

    meta_data = [
        [Paragraph("<b>Invoice Number:</b> INV-2024-8841", body_style), Paragraph("<b>Invoice Date:</b> 2024-10-02", body_style)],
        [Paragraph("<b>Bill To:</b> Wayne Enterprises - Global Infrastructure", body_style), Paragraph("<b>Payment Terms:</b> Net 30 (Due: 2024-11-01)", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    items_data = [
        ["Line", "Description", "Qty", "Unit Price", "Total Amount"],
        ["1", "Dedicated GPU Compute Cluster - Oct 2024", "1 mo", "$12,500.00", "$12,500.00"],
        ["2", "Multi-Region Cloud Storage Tier (40 TB)", "40 TB", "$100.00", "$4,000.00"],
        ["3", "Premium Support & SLA Assurance", "1 mo", "$1,950.00", "$1,950.00"],
        ["", "", "", "SUBTOTAL:", "$18,450.00"],
        ["", "", "", "TAX (0.00% Exempt):", "$0.00"],
        ["", "", "", "TOTAL PAYABLE:", "$18,450.00 USD"]
    ]
    t = Table(items_data, colWidths=[35, 265, 55, 90, 95])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f4f4f5')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,3), 0.5, colors.HexColor('#e4e4e7')),
        ('FONTNAME', (2,4), (-1,-1), 'Helvetica-Bold'),
        ('ALIGN', (3,0), (-1,-1), 'RIGHT'),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # Anomaly Section: Wire Details Tampered
    story.append(Paragraph("<b>WIRE TRANSFER REMITTANCE INSTRUCTIONS (ATTENTION: UPDATED BANK):</b>", bold_style))
    wire_info = [
        ["Beneficiary Bank:", "Titan First Commercial Bank (Offshore Branch)"],
        ["Routing Number (ABA):", "021000021  <-- MISMATCH WITH VENDOR MASTER FILE (Expected: 121000035)"],
        ["Account Number:", "9948-2831-002 (Changed from master account: 4410-9281-001)"],
        ["Swift / BIC:", "TITNUS33XXX | Beneficiary: Apex Cloud Infrastructure LLC"]
    ]
    wt = Table(wire_info, colWidths=[150, 390])
    wt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fff7ed')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#f97316')),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#9a3412')),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
    ]))
    story.append(wt)
    doc.build(story)
    print(f"Generated: {pdf_path}")

# ── 2. Ingested Anomaly 2: contract_expired_effective.pdf ─────────────────────
def build_contract_expired_effective():
    pdf_path = 'data/sample_docs/contract_expired_effective.pdf'
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    story.append(Paragraph("MASTER CYBERSECURITY SERVICES AGREEMENT", header_style))
    story.append(Paragraph("Agreement Reference: MSA-CYBER-2023-09A | Classification: Legal Agreement", sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#71717a')))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>PARTIES:</b> This Agreement is entered into by and between <b>CyberShield Security Corp.</b> ('Vendor') and <b>Global Logistics Partners Inc.</b> ('Client').", body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>SECTION 1.1 — EFFECTIVE DATE & RETROACTIVE TERM:</b>", bold_style))
    story.append(Paragraph("This Agreement shall be deemed effective retroactively as of <b>January 15, 2023</b> ('Effective Date').", body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>SECTION 2.3 — TERM AND EXPIRATION WINDOW:</b>", bold_style))
    story.append(Paragraph("The initial term of this Agreement shall endure for exactly twelve (12) calendar months from the Effective Date, expiring on <b>January 15, 2024</b>, unless renewed in writing by both parties thirty (30) days prior.", body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>SECTION 14.1 — EXECUTION AND COUNTERPARTS:</b>", bold_style))
    story.append(Paragraph("IN WITNESS WHEREOF, the parties hereto have executed this Agreement by their duly authorized representatives on the dates written below.", body_style))
    story.append(Spacer(1, 14))

    sig_data = [
        [Paragraph("<b>CYBERSHIELD SECURITY CORP.</b>", bold_style), Paragraph("<b>GLOBAL LOGISTICS PARTNERS INC.</b>", bold_style)],
        [Paragraph("Signature: <i>/s/ Robert H. Miller</i>", body_style), Paragraph("Signature: <i>/s/ Elena Rostova</i>", body_style)],
        [Paragraph("Name: Robert H. Miller, Chief Information Officer", sub_style), Paragraph("Name: Elena Rostova, VP of Operations", sub_style)],
        [Paragraph("<b>Execution Date: June 20, 2024</b><br/><font color='#dc2626'>[ANOMALY: Executed 5+ months AFTER term expired on Jan 15, 2024]</font>", body_style),
         Paragraph("<b>Execution Date: June 21, 2024</b><br/><font color='#dc2626'>[ANOMALY: Agreement null & lapsed prior to signing]</font>", body_style)]
    ]
    st = Table(sig_data, colWidths=[270, 270])
    st.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e4e4e7')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fafafa')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(st)
    doc.build(story)
    print(f"Generated: {pdf_path}")

# ── 3. Ingested Anomaly 3: compliance_breach_soc2.pdf ─────────────────────────
def build_compliance_breach_soc2():
    pdf_path = 'data/sample_docs/compliance_breach_soc2.pdf'
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    story.append(Paragraph("ANNUAL SOC 2 TYPE II COMPLIANCE ASSESSMENT", header_style))
    story.append(Paragraph("Security, Confidentiality & Availability Trust Services Criteria | Audit Period: Q3-Q4 2024", sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#dc2626')))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>AUDITING BODY:</b> Apex Integrity Audit Partners LLP | <b>Client:</b> CloudSphere Enterprise Corp", body_style))
    story.append(Paragraph("<b>ASSESSMENT STATUS:</b> <font color='#dc2626'><b>QUALIFIED OPINION — DEFICIENCIES NOTED</b></font>", bold_style))
    story.append(Spacer(1, 10))

    findings_data = [
        ["Control Ref", "Trust Criteria", "Testing Result", "Risk Severity", "Remediation Status"],
        ["CC6.1", "Logical Access Controls", "EXCEPTION NOTED", "HIGH", "PAST DUE (>90 Days)"],
        ["CC6.6", "Boundary Protection & WAF", "Operating Nominally", "LOW", "Satisfied"],
        ["CC7.2", "System Monitoring & Alerting", "Operating Nominally", "LOW", "Satisfied"],
        ["A1.2", "Data Backup & Recovery", "Operating Nominally", "LOW", "Satisfied"]
    ]
    ft = Table(findings_data, colWidths=[65, 140, 115, 80, 140])
    ft.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f4f4f5')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e4e4e7')),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#fef2f2')),
        ('TEXTCOLOR', (2,1), (4,1), colors.HexColor('#dc2626')),
        ('FONTNAME', (2,1), (4,1), 'Helvetica-Bold'),
    ]))
    story.append(ft)
    story.append(Spacer(1, 14))

    story.append(Paragraph("<b>CONTROL EXCEPTION DETAIL (CC6.1 - CRYPTOGRAPHIC KEY STORAGE):</b>", bold_style))
    story.append(Paragraph("During auditor sample testing of 25 production microservices, auditors identified that production database credentials and API private keys were stored in unencrypted plaintext environment configurations in repository `.env.production` backups rather than an HSM vault. The remediation deadline of August 15, 2024 was exceeded without formal mitigation, violating SOC 2 CC6.1 criteria.", body_style))
    
    doc.build(story)
    print(f"Generated: {pdf_path}")

# ── 4. Reserve Demo 1: DEMO_invoice_math_error.pdf ─────────────────────────────
def build_demo_invoice():
    pdf_path = 'data/sample_docs/reserve_for_demo/DEMO_invoice_math_error.pdf'
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    story.append(Paragraph("NEXUS CLOUD SOLUTIONS LLC", header_style))
    story.append(Paragraph("500 Tech Parkway, Atlanta, GA 30332 | contact@nexuscloud.com", sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563eb')))
    story.append(Spacer(1, 10))

    meta_data = [
        [Paragraph("<b>Invoice Number:</b> INV-NEXUS-2024-904", body_style), Paragraph("<b>Date:</b> 2024-11-10", body_style)],
        [Paragraph("<b>Customer:</b> Enterprise Back-Office Operations", body_style), Paragraph("<b>Due Date:</b> 2024-12-10", body_style)]
    ]
    t_meta = Table(meta_data, colWidths=[270, 270])
    story.append(t_meta)
    story.append(Spacer(1, 12))

    items = [
        ["Line", "Item & Description", "Rate", "Qty", "Amount"],
        ["1", "Kubernetes Managed Cluster Hosting", "$1,600.00", "1", "$1,600.00"],
        ["2", "Elastic Search & Vector Query Capacity", "$800.00", "2", "$1,600.00"],
        ["", "", "", "SUBTOTAL:", "$3,200.00"],
        ["", "", "", "TAX (8.00%):", "$256.00"],
        ["", "", "", "STATED TOTAL:", "$3,856.00 USD"]
    ]
    it = Table(items, colWidths=[35, 255, 75, 55, 120])
    it.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,2), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (3,3), (-1,-1), 'Helvetica-Bold'),
        ('ALIGN', (2,0), (-1,-1), 'RIGHT'),
        ('TEXTCOLOR', (3,5), (4,5), colors.HexColor('#dc2626')),
    ]))
    story.append(it)
    story.append(Spacer(1, 12))
    story.append(Paragraph("<i>Note: Calculation Discrepancy — Subtotal ($3,200.00) + Tax ($256.00) = $3,456.00, but Stated Total is $3,856.00 ($400 overcharge).</i>", sub_style))

    doc.build(story)
    print(f"Generated: {pdf_path}")

# ── 5. Reserve Demo 2: DEMO_contract_unsigned_draft.pdf ────────────────────────
def build_demo_contract():
    pdf_path = 'data/sample_docs/reserve_for_demo/DEMO_contract_unsigned_draft.pdf'
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    story.append(Paragraph("MUTUAL NON-DISCLOSURE & INTELLECTUAL PROPERTY AGREEMENT", header_style))
    story.append(Paragraph("Draft Document Version 1.4 | Status: PENDING SIGNATURES", sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#f59e0b')))
    story.append(Spacer(1, 10))

    story.append(Paragraph("This Agreement is entered into between <b>Vanguard Enterprise Holdings</b> and <b>Helios Labs Ltd.</b>", body_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>CONFIDENTIALITY OBLIGATIONS:</b> Recipient agrees to safeguard Proprietary Information with at least the standard of care it uses for its own confidential assets.", body_style))
    story.append(Spacer(1, 16))

    sig_table = [
        [Paragraph("<b>VANGUARD ENTERPRISE HOLDINGS</b>", bold_style), Paragraph("<b>HELIOS LABS LTD.</b>", bold_style)],
        [Paragraph("Signature: __________________________<br/><font color='#d97706'>[DRAFT ONLY - UNSIGNED]</font>", body_style),
         Paragraph("Signature: __________________________<br/><font color='#d97706'>[DRAFT ONLY - UNSIGNED]</font>", body_style)],
        [Paragraph("Date: ________________________", body_style), Paragraph("Date: ________________________", body_style)]
    ]
    st = Table(sig_table, colWidths=[270, 270])
    st.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fde68a')),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fefce8')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(st)
    doc.build(story)
    print(f"Generated: {pdf_path}")

# ── 6. Reserve Demo 3: DEMO_clean_po_expedited.pdf ─────────────────────────────
def build_demo_po():
    pdf_path = 'data/sample_docs/reserve_for_demo/DEMO_clean_po_expedited.pdf'
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    story.append(Paragraph("PURCHASE ORDER — EXPEDITED LOGISTICS", header_style))
    story.append(Paragraph("Approved Corporate Procurement Order | Delegation Authority: Verified", sub_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#16a34a')))
    story.append(Spacer(1, 10))

    po_meta = [
        [Paragraph("<b>PO Number:</b> PO-2024-9100", body_style), Paragraph("<b>Order Date:</b> 2024-11-12", body_style)],
        [Paragraph("<b>Vendor:</b> Horizon Industrial Sensors Corp", body_style), Paragraph("<b>Delivery Required:</b> 2024-11-25", body_style)]
    ]
    story.append(Table(po_meta, colWidths=[270, 270]))
    story.append(Spacer(1, 12))

    po_items = [
        ["Item", "Part Description", "Qty", "Unit Price", "Total"],
        ["1", "Industrial Optical Sensors (Model X-40)", "100 units", "$95.00", "$9,500.00"],
        ["2", "Calibrated Mounting Hardware Brackets", "100 kits", "$47.00", "$4,700.00"],
        ["", "", "", "TOTAL COMMITTED:", "$14,200.00 USD"]
    ]
    pot = Table(po_items, colWidths=[40, 250, 70, 80, 100])
    pot.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f0fdf4')),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,2), 0.5, colors.HexColor('#bbf7d0')),
        ('FONTNAME', (3,3), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (3,3), (-1,-1), colors.HexColor('#16a34a')),
        ('ALIGN', (3,0), (-1,-1), 'RIGHT'),
    ]))
    story.append(pot)
    story.append(Spacer(1, 14))
    story.append(Paragraph("<b>STATUS:</b> <font color='#16a34a'><b>100% NOMINAL — WITHIN $50,000 DELEGATION LIMIT</b></font>", bold_style))
    doc.build(story)
    print(f"Generated: {pdf_path}")

if __name__ == '__main__':
    build_invoice_wire_tampering()
    build_contract_expired_effective()
    build_compliance_breach_soc2()
    build_demo_invoice()
    build_demo_contract()
    build_demo_po()
    print("All documents generated successfully.")
