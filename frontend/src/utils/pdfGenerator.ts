import { jsPDF } from 'jspdf';
import { DocumentItem } from '../types';

/**
 * Generates and downloads a high-fidelity PDF report of the selected document review view.
 */
export function generateDocumentPdf(doc: DocumentItem): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // #0F172A
  pdf.rect(0, 0, pageWidth, 28, 'F');

  // Accent Line
  pdf.setFillColor(6, 182, 212); // #06B6D4 (Cyan accent)
  pdf.rect(0, 27, pageWidth, 1.5, 'F');

  // Header Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('DOCINTEL INTELLIGENCE REPORT', margin, 12);

  // Header Subtitle / Verification badge
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`EXTRACTED MANIFEST & AUDIT PROVENANCE | ID: ${doc.id}`, margin, 19);

  // Status Badge in Header
  const statusText = doc.status.replace(/_/g, ' ');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const badgeWidth = pdf.getTextWidth(statusText) + 8;
  pdf.setFillColor(30, 41, 59);
  pdf.roundedRect(pageWidth - margin - badgeWidth, 8, badgeWidth, 6.5, 1, 1, 'F');
  pdf.setTextColor(6, 182, 212);
  pdf.text(statusText, pageWidth - margin - badgeWidth + 4, 12.5);

  y = 36;

  // Document Overview Box
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(15, 23, 42);
  pdf.text(doc.title, margin + 4, y + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(`File: ${doc.fileName} (${doc.fileSize})`, margin + 4, y + 13);
  pdf.text(`Parties: ${doc.vendorOrParties}`, margin + 4, y + 18);
  pdf.text(`OCR Engine: ${doc.ocrPathway} | Document Type: ${doc.docType}`, margin + 4, y + 23);
  pdf.text(`Pages: ${doc.pages} | Ingestion: ${new Date(doc.uploadDate).toLocaleString()}`, margin + 4, y + 28);

  // Confidence Metric on Right side of Box
  const confText = `${doc.overallConfidence}%`;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text(confText, pageWidth - margin - 26, y + 15, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('CONFIDENCE', pageWidth - margin - 26, y + 21, { align: 'right' });

  y += 42;

  // Section: Extracted Structured Fields
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('STRUCTURED FIELD EXTRACTIONS', margin, y);

  pdf.setDrawColor(6, 182, 212);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y + 2, margin + 35, y + 2);

  y += 7;

  // Fields Table Header
  pdf.setFillColor(241, 245, 249);
  pdf.rect(margin, y, contentWidth, 7, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(71, 85, 105);

  pdf.text('FIELD KEY', margin + 3, y + 4.8);
  pdf.text('EXTRACTED VALUE', margin + 50, y + 4.8);
  pdf.text('CONFIDENCE', margin + 115, y + 4.8);
  pdf.text('STATUS', margin + 145, y + 4.8);

  y += 7;

  // Render Extracted Fields from doc.fields record
  const fieldList = Object.values(doc.fields);
  fieldList.forEach((field, index) => {
    // Alternate row backgrounds
    if (index % 2 === 1) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y, contentWidth, 6.5, 'F');
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(30, 41, 59);
    pdf.text(field.label || field.key, margin + 3, y + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(51, 65, 85);
    const valueStr = String(field.value);
    const truncatedVal = valueStr.length > 36 ? valueStr.substring(0, 34) + '...' : valueStr;
    pdf.text(truncatedVal, margin + 50, y + 4.5);

    // Confidence
    pdf.text(`${field.confidence}%`, margin + 115, y + 4.5);

    // Status
    if (field.isCorrected) {
      pdf.setTextColor(59, 130, 246); // blue
      pdf.text('Human Corrected', margin + 145, y + 4.5);
    } else {
      pdf.setTextColor(16, 185, 129); // green
      pdf.text('Verified Model', margin + 145, y + 4.5);
    }

    y += 6.5;

    // Page overflow guard
    if (y > 260) {
      pdf.addPage();
      y = 20;
    }
  });

  y += 6;

  // Anomalies / Guardrail Section
  if (doc.anomalies.length > 0 && y < 240) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`DETECTED ANOMALIES & GUARDRAILS (${doc.anomalies.length})`, margin, y);

    pdf.setDrawColor(239, 68, 68);
    pdf.line(margin, y + 2, margin + 35, y + 2);
    y += 7;

    doc.anomalies.forEach((anom) => {
      pdf.setFillColor(254, 242, 242);
      pdf.setDrawColor(254, 202, 202);
      pdf.roundedRect(margin, y, contentWidth, 10, 1, 1, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(185, 28, 28);
      pdf.text(`[${anom.severity.toUpperCase()}] ${anom.code || anom.title}`, margin + 3, y + 4.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(69, 10, 10);
      const desc = anom.description.length > 70 ? anom.description.substring(0, 68) + '...' : anom.description;
      pdf.text(desc, margin + 3, y + 8);

      pdf.setFont('helvetica', 'bold');
      if (anom.resolved) {
        pdf.setTextColor(22, 101, 52);
      } else {
        pdf.setTextColor(185, 28, 28);
      }
      pdf.text(anom.resolved ? 'RESOLVED' : 'UNRESOLVED', pageWidth - margin - 22, y + 6);

      y += 12;
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }
    });
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 284, pageWidth - margin, 284);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `Generated by Document Intelligence Engine | Hash: SHA-256(${doc.id}) | Page ${i} of ${totalPages}`,
      margin,
      289
    );
    pdf.text(new Date().toISOString(), pageWidth - margin - 35, 289);
  }

  // Sanitize filename for download
  const cleanName = doc.fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`${cleanName}_review.pdf`);
}
