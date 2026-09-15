import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, X, Edit3, ShieldAlert, FileText, CheckCircle2, 
  Search, Filter, History, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, Maximize2, AlertTriangle, Eye, ArrowUpRight, 
  Cpu, Lock, Sparkles, Download, Loader2
} from 'lucide-react';
import { DocumentItem, DocumentType, AnomalySeverity, ExtractedField } from '../types';
import { recalculateDocumentInvariants } from '../utils/invariantEngine';
import { getDocumentVersions, createNewVersion } from '../utils/versionManager';
import { generateDocumentPdf } from '../utils/pdfGenerator';
import { correctDocumentField, fetchDocumentDetails, API_BASE } from '../api';
import { useToast } from './ToastProvider';
import { DocumentHistoryPanel } from './DocumentHistoryPanel';

interface CanvasFieldBoxProps {
  fieldKey: string;
  field?: ExtractedField;
  highlightedFieldKey: string | null;
  onSelectField: (key: string) => void;
  onHoverField: (key: string | null) => void;
  className?: string;
  children: React.ReactNode;
  label?: string;
  displayInline?: boolean;
}

function CanvasFieldBox({
  fieldKey,
  field,
  highlightedFieldKey,
  onSelectField,
  onHoverField,
  className = '',
  children,
  label,
  displayInline = false
}: CanvasFieldBoxProps) {
  const isHighlighted = highlightedFieldKey === fieldKey;
  const hasAnomaly = Boolean(field?.hasAnomaly);
  const displayLabel = label || field?.label || fieldKey.replace(/_/g, ' ').toUpperCase();

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelectField(fieldKey);
      }}
      onMouseEnter={() => onHoverField(fieldKey)}
      onMouseLeave={() => onHoverField(null)}
      className={`relative transition-all cursor-pointer ${
        displayInline ? 'inline-block' : 'block'
      } ${
        hasAnomaly
          ? 'ring-2 ring-[#D9534F] bg-[#D9534F]/15 rounded-sm p-0.5'
          : isHighlighted
          ? 'ring-2 ring-[#C5B358] bg-[#C5B358]/20 rounded-sm p-0.5 shadow-sm'
          : 'hover:ring-1 hover:ring-[#C5B358]/60 hover:bg-[#C5B358]/10 rounded-sm p-0.5'
      } ${className}`}
      title={`${displayLabel} (Click to inspect or calibrate in HITL console)`}
    >
      {/* Floating Metadata Provenance Tag when active, hovered, or has anomaly */}
      {(isHighlighted || hasAnomaly) && (
        <span
          className={`absolute -top-3.5 left-0 text-[8px] font-mono uppercase px-1 py-0.2 rounded-t font-bold z-30 shadow flex items-center gap-1 pointer-events-none whitespace-nowrap ${
            hasAnomaly
              ? 'bg-[#D9534F] text-white animate-pulse'
              : 'bg-[#C5B358] text-[#0B0C0E]'
          }`}
        >
          {hasAnomaly && <AlertTriangle className="w-2 h-2" />}
          <span>{displayLabel}</span>
          <span className="opacity-75">
            {field?.confidence ? `${Math.round(field.confidence)}%` : '95%'}
          </span>
        </span>
      )}
      {children}
    </div>
  );
}

interface ParsedLineItem {
  description: string;
  quantity: number | string;
  unit_price: number | string;
  amount: number | string;
}

function parseLineItems(doc?: DocumentItem | null): ParsedLineItem[] {
  if (!doc) return [];
  const field = doc.fields?.['line_items'];
  const raw = field?.rawValue;

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((it: any) => ({
      description: it.description || it.name || it.item || 'Enterprise Deliverable',
      quantity: it.quantity ?? it.qty ?? 1,
      unit_price: typeof it.unit_price === 'number' ? `$${it.unit_price.toFixed(2)}` : (it.unit_price || '$0.00'),
      amount: typeof it.amount === 'number' ? `$${it.amount.toFixed(2)}` : (it.amount || '$0.00'),
    }));
  }

  if (typeof field?.value === 'string' && field.value.trim()) {
    try {
      const parsed = JSON.parse(field.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((it: any) => ({
          description: it.description || it.name || it.item || 'Enterprise Deliverable',
          quantity: it.quantity ?? it.qty ?? 1,
          unit_price: typeof it.unit_price === 'number' ? `$${it.unit_price.toFixed(2)}` : (it.unit_price || '$0.00'),
          amount: typeof it.amount === 'number' ? `$${it.amount.toFixed(2)}` : (it.amount || '$0.00'),
        }));
      }
    } catch {
      if (field.value.includes(';')) {
        return field.value.split(';').map(part => ({
          description: part.trim(),
          quantity: 1,
          unit_price: '—',
          amount: '—'
        }));
      }
    }
  }

  if (doc.docType === 'INVOICE') {
    const subtotal = doc.fields?.['subtotal']?.value;
    const total = doc.fields?.['total_amount']?.value;
    return [
      {
        description: `${doc.vendorOrParties.split('→')[0]} - Back-Office Operations & Technology Services`,
        quantity: 1,
        unit_price: subtotal || total || '$10,000.00',
        amount: subtotal || total || '$10,000.00'
      }
    ];
  }
  return [];
}

interface ReviewConsoleProps {
  documents: DocumentItem[];
  selectedDocId: string;
  onSelectDoc: (id: string) => void;
  onUpdateDocument: (updatedDoc: DocumentItem) => void;
  initialSeverityFilter?: AnomalySeverity | 'all';
}

export function ReviewConsole({
  documents,
  selectedDocId,
  onSelectDoc,
  onUpdateDocument,
  initialSeverityFilter = 'all'
}: ReviewConsoleProps) {
  const { showToast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>(initialSeverityFilter);

  // Sync initialSeverityFilter when prop changes from chart drilldown
  useEffect(() => {
    if (initialSeverityFilter) {
      setSeverityFilter(initialSeverityFilter);
    }
  }, [initialSeverityFilter]);

  // Selected document
  const currentDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  // In-place editing state
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Viewer state
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [canvasViewMode, setCanvasViewMode] = useState<'vector' | 'scan' | 'raw'>('vector');
  const [highlightedFieldKey, setHighlightedFieldKey] = useState<string | null>(null);
  const [hitlTab, setHitlTab] = useState<'fields' | 'guardrails' | 'history'>('fields');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Quick field selector from canvas to synchronize with HITL Invariant Console
  const handleSelectCanvasField = (key: string) => {
    setHighlightedFieldKey(key);
    setHitlTab('fields');
    const fieldVal = currentDoc?.fields[key]?.value;
    if (fieldVal !== undefined) {
      handleStartEdit(key, fieldVal);
    }
  };

  // Lazy-load full document detail when selected doc has no fields (list-level only)
  useEffect(() => {
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) return;
    // If fields are empty, this is a list-level doc — fetch full detail
    if (Object.keys(doc.fields).length === 0 && selectedDocId) {
      setIsLoadingDetail(true);
      fetchDocumentDetails(selectedDocId)
        .then(fullDoc => {
          onUpdateDocument(fullDoc);
        })
        .catch(err => {
          console.warn('Failed to load document detail:', err);
        })
        .finally(() => setIsLoadingDetail(false));
    }
  }, [selectedDocId, documents, onUpdateDocument]);

  // Trigger simulated high-fidelity PDF generation of currently selected document view
  const handleDownloadPdf = async () => {
    if (!currentDoc) return;
    setIsGeneratingPdf(true);
    showToast(
      'info',
      'Generating Document PDF',
      `Compiling vector layout, extracted fields, and audit provenance for ${currentDoc.fileName}...`
    );

    try {
      // Simulate rendering vector canvas & parsing layout buffer
      await new Promise(resolve => setTimeout(resolve, 850));
      generateDocumentPdf(currentDoc);
      showToast(
        'success',
        'PDF Export Complete',
        `Downloaded ${currentDoc.fileName.replace(/\.[^/.]+$/, '')}_review.pdf`
      );
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      showToast('error', 'PDF Generation Failed', 'An error occurred while compiling the PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filtered documents list
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.vendorOrParties.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'ALL' || doc.docType === typeFilter;

    const matchesSeverity = 
      severityFilter === 'all' ||
      (severityFilter === 'high' && doc.anomalies.some(a => a.severity === 'high' && !a.resolved)) ||
      (severityFilter === 'medium' && doc.anomalies.some(a => a.severity === 'medium' && !a.resolved)) ||
      (severityFilter === 'low' && doc.anomalies.some(a => a.severity === 'low' && !a.resolved));

    return matchesSearch && matchesType && matchesSeverity;
  });

  // Keyboard navigation for document list (Arrow Up / Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingFieldKey) return; // Don't intercept while editing an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const currentIndex = filteredDocs.findIndex(d => d.id === currentDoc?.id);
      if (currentIndex === -1) return;

      if ((e.key === 'ArrowDown' || e.key === 'j') && currentIndex < filteredDocs.length - 1) {
        e.preventDefault();
        onSelectDoc(filteredDocs[currentIndex + 1].id);
      } else if ((e.key === 'ArrowUp' || e.key === 'k') && currentIndex > 0) {
        e.preventDefault();
        onSelectDoc(filteredDocs[currentIndex - 1].id);
      } else if (e.key === 'v' || e.key === 'V') {
        setCanvasViewMode(prev => prev === 'vector' ? 'scan' : prev === 'scan' ? 'raw' : 'vector');
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel(z => Math.min(180, z + 10));
      } else if (e.key === '-' || e.key === '_') {
        setZoomLevel(z => Math.max(50, z - 10));
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        setZoomLevel(85);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredDocs, currentDoc, onSelectDoc, editingFieldKey]);

  // Smooth wheel zoom with Ctrl/Cmd key
  const handleCanvasWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 10 : -10;
      setZoomLevel(prev => Math.min(180, Math.max(50, prev + delta)));
    }
  }, []);

  // Start field editing
  const handleStartEdit = (fieldKey: string, currentValue: string) => {
    setEditingFieldKey(fieldKey);
    setEditingValue(currentValue);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingFieldKey(null);
    setEditingValue('');
  };

  // Save field and trigger invariant engine
  const handleSaveField = (fieldKey: string) => {
    if (!currentDoc) return;

    const { updatedDoc, auditEntry, anomalyResolved } = recalculateDocumentInvariants(
      currentDoc,
      fieldKey,
      editingValue,
      'Aman Hossain' // Active reviewer
    );

    onUpdateDocument(updatedDoc);
    setEditingFieldKey(null);
    setEditingValue('');

    // Persist immediately to SQLite backend via /api/documents/{doc_id}/correct
    correctDocumentField(currentDoc.id, fieldKey, editingValue).catch(err => {
      console.warn('Backend correction persistence failed:', err);
    });

    if (anomalyResolved) {
      showToast(
        'success',
        'Mathematical Invariant Resolved & Reconciled',
        `Subtotal + Tax now equals Total. Anomaly cleared and logged to audit trail.`
      );
    } else {
      showToast(
        'info',
        'Audit Ledger Updated',
        `Field '${auditEntry.fieldLabel}' corrected and committed to immutable audit record.`
      );
    }
  };

  // Quick Approval to ERP
  const handleApproveDoc = () => {
    if (!currentDoc) return;
    const cloned: DocumentItem = JSON.parse(JSON.stringify(currentDoc));
    cloned.status = 'VERIFIED';
    cloned.anomalies.forEach(a => { a.resolved = true; });
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    cloned.auditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: now,
      fieldKey: 'ERP_EXPORT',
      fieldLabel: 'Status Transition',
      previousValue: currentDoc.status,
      newValue: 'VERIFIED_AND_POSTED_TO_ERP',
      author: 'Aman Hossain (Controller)',
      reason: 'Manual HITL validation completed. Pushed to SAP / NetSuite staging queue.',
      actionType: 'STATUS_CHANGE'
    });

    const currentVersions = getDocumentVersions(cloned);
    const newVer = createNewVersion(
      cloned,
      'Verified & Posted to ERP',
      'Manual HITL validation completed. Document sealed and queued for ERP sync.',
      'Aman Hossain',
      true
    );
    cloned.versions = [...currentVersions, newVer];

    onUpdateDocument(cloned);
    showToast('success', 'Document Approved & Pushed to ERP', `${cloned.id} posted to downstream accounting ledger.`);
  };

  return (
    <div id="review-console-container" className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-h-[780px]">
      {/* ========================================================================= */}
      {/* PANEL 1: Document Queue & Catalog (3 Cols) */}
      {/* ========================================================================= */}
      <div 
        id="review-panel-queue"
        className="xl:col-span-3 bg-[#141518] border border-[#2A2C31] rounded-xl flex flex-col overflow-hidden h-[calc(100vh-140px)] min-h-[580px] max-h-[920px] shadow-sm"
      >
        {/* Queue Header & Search */}
        <div className="p-4 border-b border-[#2A2C31] space-y-3 bg-[#141518]">
          <div className="flex items-center justify-between">
            <h3 className="font-serif italic text-base text-[#E5E5E5] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C5B358]" />
              Document Catalog
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#16171B] border border-[#2A2C31] text-[#C5B358] font-semibold">
              {filteredDocs.length} / {documents.length}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8E9097]" />
            <input
              id="catalog-search-input"
              type="text"
              placeholder="Search vendor, ID, terms..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#0B0C0E] border border-[#2A2C31] rounded-lg text-xs text-[#E5E5E5] placeholder-[#8E9097] focus:outline-none focus:border-[#C5B358] transition-colors"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] uppercase font-mono tracking-wider">
            {(['ALL', 'INVOICE', 'MSA_CONTRACT', 'COMPLIANCE_DOC', 'PURCHASE_ORDER', 'TAX_FORM'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-md shrink-0 font-medium transition-colors border cursor-pointer ${
                  typeFilter === t
                    ? 'bg-[#C5B358] border-[#C5B358] text-[#0B0C0E] font-bold'
                    : 'bg-[#16171B] border-[#2A2C31] text-[#8E9097] hover:text-[#E5E5E5]'
                }`}
              >
                {t === 'ALL' ? 'All' : t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Severity Chips */}
          <div className="flex items-center gap-1.5 pt-1 text-[10px]">
            <span className="text-[#8E9097] uppercase tracking-widest font-mono text-[9px]">Severity:</span>
            {(['all', 'high', 'medium', 'low'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2 py-0.5 rounded font-mono uppercase text-[9px] transition-colors border cursor-pointer ${
                  severityFilter === sev
                    ? sev === 'high' ? 'bg-[#D9534F]/20 text-[#D9534F] border-[#D9534F]'
                    : sev === 'medium' ? 'bg-[#E5A93C]/20 text-[#E5A93C] border-[#E5A93C]'
                    : sev === 'low' ? 'bg-[#C5B358]/20 text-[#C5B358] border-[#C5B358]'
                    : 'bg-[#16171B] text-[#E5E5E5] border-[#C5B358]'
                    : 'text-[#8E9097] border-[#2A2C31] hover:text-[#E5E5E5]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Queue List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredDocs.map(doc => {
            const isSelected = doc.id === currentDoc?.id;
            const hasHighAnom = doc.anomalies.some(a => a.severity === 'high' && !a.resolved);
            const hasMedAnom = doc.anomalies.some(a => a.severity === 'medium' && !a.resolved);

            return (
              <button
                key={doc.id}
                id={`doc-card-${doc.id}`}
                onClick={() => onSelectDoc(doc.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#16171B] border-[#C5B358] ring-1 ring-[#C5B358]/40 shadow-sm'
                    : 'bg-[#141518] border-[#2A2C31] hover:bg-[#16171B]/80 hover:border-[#3D4048]'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-mono font-bold text-[#8E9097] truncate">
                    {doc.id}
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase border ${
                    doc.status === 'VERIFIED' || doc.status === 'AUTO_APPROVED'
                      ? 'bg-[#C5B358]/10 border-[#C5B358]/30 text-[#C5B358]'
                      : 'bg-[#E5A93C]/10 border-[#E5A93C]/30 text-[#E5A93C]'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <h4 className="text-xs font-medium text-[#E5E5E5] line-clamp-1 leading-snug">
                  {doc.title}
                </h4>

                <p className="text-[11px] text-[#8E9097] truncate">
                  {doc.vendorOrParties}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[#2A2C31]/40 text-[10px] text-[#8E9097]">
                  <span className="font-mono">
                    {doc.totalAmount !== undefined && doc.totalAmount > 0 
                      ? `$${doc.totalAmount.toLocaleString()}` 
                      : doc.pages + ' Pages'}
                  </span>

                  {hasHighAnom ? (
                    <span className="flex items-center gap-1 text-[#D9534F] font-semibold font-mono text-[9px] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] animate-pulse" />
                      Math Flag
                    </span>
                  ) : hasMedAnom ? (
                    <span className="flex items-center gap-1 text-[#E5A93C] font-semibold font-mono text-[9px] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C]" />
                      Risk Flag
                    </span>
                  ) : (
                    <span className="text-[#C5B358] font-mono text-[9px]">
                      {doc.overallConfidence}% Conf.
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="text-center py-10 text-[#8E9097] text-xs font-serif italic">
              No documents match active filter.
            </div>
          )}
        </div>

        {/* Keyboard hint footer */}
        <div className="p-2.5 border-t border-[#2A2C31] bg-[#0B0C0E] text-[9px] uppercase tracking-wider text-[#8E9097] flex items-center justify-between font-mono">
          <span>Use <kbd className="px-1.5 py-0.5 rounded border border-[#2A2C31] bg-[#141518] text-[#E5E5E5]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded border border-[#2A2C31] bg-[#141518] text-[#E5E5E5]">↓</kbd> to traverse</span>
          <span>Esc cancels edit</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL 2: Document Canvas & Visual Provenance Viewer (5 Cols) */}
      {/* ========================================================================= */}
      <div 
        id="review-panel-canvas"
        className="xl:col-span-5 bg-[#141518] border border-[#2A2C31] rounded-xl flex flex-col overflow-hidden h-[calc(100vh-140px)] min-h-[580px] max-h-[920px] shadow-sm relative"
      >
        {/* Document Preview Container (the scrollable area ancestor for sticky toolbar) */}
        <div 
          id="document-preview-container"
          className="flex-1 overflow-y-auto overflow-x-auto relative flex flex-col scroll-smooth"
        >
          {/* Sticky Toolbar Row Wrapper */}
          <div 
            id="canvas-toolbar-sticky-container"
            className="sticky top-0 left-0 z-20 w-full bg-[#141518]/95 backdrop-blur-md border-b border-[#2A2C31] shrink-0"
            style={{ position: 'sticky', top: 0, left: 0, zIndex: 20 }}
          >
            {/* Canvas Toolbar with Horizontal Scroll Support */}
            <div 
              id="canvas-toolbar"
              className="p-2 sm:p-2.5 overflow-x-auto toolbar-scrollbar scroll-smooth"
            >
              <div className="flex items-center justify-between gap-2 sm:gap-3 w-full">
                {/* Document Identity */}
                <div className="flex items-center gap-2 shrink-0 min-w-0">
                  <div className="p-1 rounded bg-[#16171B] border border-[#2A2C31] text-[#C5B358] shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span 
                    className="font-mono text-xs text-[#C5B358] font-semibold tracking-tight whitespace-nowrap max-w-[130px] sm:max-w-[180px] lg:max-w-[210px] truncate"
                    title={currentDoc?.fileName}
                  >
                    {currentDoc?.fileName}
                  </span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-[#16171B] text-[#8E9097] border border-[#2A2C31] shrink-0">
                    {currentDoc?.ocrPathway}
                  </span>
                </div>

                {/* Action & Zoom Controls Group */}
                <div className="flex items-center gap-1.5 text-[#8E9097] shrink-0">
                  {/* Download as PDF Button */}
                  <button
                    id="btn-download-pdf"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="px-2.5 py-1 rounded-md border border-[#2A2C31] bg-[#16171B] hover:border-[#C5B358] hover:text-[#E5E5E5] transition-all text-[10px] uppercase font-mono cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-50"
                    title="Download simulated PDF report of currently selected document view"
                    aria-label="Download as PDF"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-[#C5B358] animate-spin" />
                        <span>PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-[#C5B358]" />
                        <span>PDF</span>
                      </>
                    )}
                  </button>

                  <div className="h-4 w-px bg-[#2A2C31] mx-0.5 sm:mx-1 shrink-0" />

                  {/* View Mode Toggle: Vector Doc vs Original Scan vs Raw Text */}
                  <div className="flex items-center gap-0.5 bg-[#16171B] border border-[#2A2C31] rounded-md p-0.5 shrink-0">
                    <button
                      id="btn-view-vector"
                      onClick={() => setCanvasViewMode('vector')}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono transition-colors cursor-pointer ${
                        canvasViewMode === 'vector'
                          ? 'bg-[#C5B358] text-[#0B0C0E] font-bold shadow-sm'
                          : 'text-[#8E9097] hover:text-[#E5E5E5]'
                      }`}
                      title="Structured Vector Document with Interactive Provenance Highlights"
                    >
                      Vector Doc
                    </button>
                    <button
                      id="btn-view-scan"
                      onClick={() => setCanvasViewMode('scan')}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono transition-colors cursor-pointer ${
                        canvasViewMode === 'scan'
                          ? 'bg-[#C5B358] text-[#0B0C0E] font-bold shadow-sm'
                          : 'text-[#8E9097] hover:text-[#E5E5E5]'
                      }`}
                      title="Original Document Scanned / Rendered PDF Raster"
                    >
                      Original Scan
                    </button>
                    <button
                      id="btn-view-raw"
                      onClick={() => setCanvasViewMode('raw')}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono transition-colors cursor-pointer ${
                        canvasViewMode === 'raw'
                          ? 'bg-[#C5B358] text-[#0B0C0E] font-bold shadow-sm'
                          : 'text-[#8E9097] hover:text-[#E5E5E5]'
                      }`}
                      title="OCR Extracted Raw Text Buffer"
                    >
                      Raw Text
                    </button>
                  </div>

                  <button
                    id="btn-quick-view-history"
                    onClick={() => setHitlTab(prev => prev === 'history' ? 'fields' : 'history')}
                    className={`p-1.5 sm:px-2 sm:py-1 rounded-md border transition-colors text-[10px] uppercase font-mono cursor-pointer flex items-center justify-center shrink-0 ${
                      hitlTab === 'history' ? 'bg-[#C5B358] border-[#C5B358] text-[#0B0C0E] font-bold' : 'border-[#2A2C31] bg-[#16171B] hover:text-[#E5E5E5]'
                    }`}
                    title="Toggle Document History & Versions"
                    aria-label="Toggle Document History & Versions"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-[#2A2C31] mx-0.5 sm:mx-1 shrink-0" />

                  {/* Quick Accessible Zoom Buttons */}
                  <div id="toolbar-zoom-group" className="flex items-center gap-0.5 sm:gap-1 bg-[#16171B] border border-[#2A2C31] rounded-md px-1 py-0.5 shrink-0">
                    <button
                      id="btn-toolbar-zoom-out"
                      onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                      className="p-1 rounded hover:text-[#C5B358] hover:bg-[#1E2024] cursor-pointer transition-colors"
                      title="Zoom out (Ctrl + -)"
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn-toolbar-zoom-reset"
                      onClick={() => setZoomLevel(85)}
                      className="font-mono text-[10px] w-9 text-center text-[#E5E5E5] hover:text-[#C5B358] cursor-pointer hover:underline"
                      title="Reset zoom to 85% Fit (Ctrl + 0)"
                    >
                      {zoomLevel}%
                    </button>
                    <button
                      id="btn-toolbar-zoom-in"
                      onClick={() => setZoomLevel(prev => Math.min(180, prev + 10))}
                      className="p-1 rounded hover:text-[#C5B358] hover:bg-[#1E2024] cursor-pointer transition-colors"
                      title="Zoom in (Ctrl + +)"
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-[#2A2C31] mx-0.5 sm:mx-1 shrink-0" />

                  {/* Page Navigation */}
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="p-1 rounded border border-[#2A2C31] bg-[#16171B] hover:text-[#C5B358] disabled:opacity-30 cursor-pointer"
                      title="Previous Page"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-[#E5E5E5] px-1 whitespace-nowrap">{currentPage} / {currentDoc?.pages || 1}</span>
                    <button
                      disabled={currentPage >= (currentDoc?.pages || 1)}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="p-1 rounded border border-[#2A2C31] bg-[#16171B] hover:text-[#C5B358] disabled:opacity-30 cursor-pointer"
                      title="Next Page"
                      aria-label="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Canvas Body with wheel zoom support */}
          <div 
            id="document-canvas-body"
            className="flex-1 p-4 sm:p-5 bg-[#0B0C0E] flex flex-col items-center relative select-text min-h-max"
            onWheel={handleCanvasWheel}
          >
          {canvasViewMode === 'raw' ? (
            <div className="w-full max-w-xl bg-[#141518] border border-[#2A2C31] p-5 font-mono text-xs text-[#E5E5E5] whitespace-pre-wrap leading-relaxed shadow-lg rounded-sm">
              <div className="text-[#8E9097] text-[10px] uppercase tracking-wider pb-2 border-b border-[#2A2C31] mb-3 flex items-center justify-between">
                <span>OCR Extracted Text Buffer</span>
                <span>Encoding: UTF-8</span>
              </div>
              {currentDoc?.rawTextPreview}
            </div>
          ) : canvasViewMode === 'scan' ? (
            /* Original Document Scanned / PDF Raster View */
            <div className="flex flex-col items-center max-w-full">
              <div 
                className="bg-white shadow-2xl transition-transform origin-top relative border border-[#2A2C31] rounded-sm overflow-hidden"
                style={{ 
                  width: `${560 * (zoomLevel / 100)}px`, 
                  transform: 'scale(1)' 
                }}
              >
                <img
                  src={`${API_BASE}/documents/${currentDoc?.id}/preview`}
                  alt={`Original Document - ${currentDoc?.fileName}`}
                  className="w-full h-auto object-contain select-none"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to vector canvas if image cannot be rendered
                    const target = e.target as HTMLElement;
                    target.style.display = 'none';
                    setCanvasViewMode('vector');
                    showToast('warning', 'Raster Preview Unavailable', 'Switching to high-fidelity structured vector document simulator.');
                  }}
                />
              </div>
              <div className="mt-3 text-center text-[10px] font-mono text-[#8E9097] bg-[#141518] px-3.5 py-1 rounded-full border border-[#2A2C31]">
                Document: <span className="text-[#E5E5E5]">{currentDoc?.fileName}</span> • Pathway: <span className="text-[#C5B358]">{currentDoc?.ocrPathway}</span>
              </div>
            </div>
          ) : (
            /* Vector Document Simulator with Editorial Aesthetic & Real Data */
            <div 
              className="bg-[#F8F8F6] text-[#1A1B1E] shadow-2xl p-8 transition-transform origin-top relative border border-[#D5D7DC] select-none rounded-sm"
              style={{ 
                width: `${560 * (zoomLevel / 100)}px`, 
                minHeight: `${760 * (zoomLevel / 100)}px`,
                transform: `scale(1)` 
              }}
            >
              {/* Document Stamp watermark */}
              <div className="absolute top-4 right-4 border border-[#1A1B1E] px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest text-[#1A1B1E] uppercase transform rotate-3 bg-[#EAE8DF]">
                RECORD: {currentDoc?.status}
              </div>

              {/* Vector Document Render */}
              <div className="space-y-6 text-xs text-[#1A1B1E]">
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-[#1A1B1E] pb-4">
                  <div className="space-y-1">
                    <CanvasFieldBox
                      fieldKey={
                        currentDoc?.docType === 'INVOICE' ? 'vendor_name' :
                        currentDoc?.docType === 'COMPLIANCE_DOC' ? 'framework_name' :
                        currentDoc?.docType === 'PURCHASE_ORDER' ? 'po_number' :
                        currentDoc?.docType === 'TAX_FORM' ? 'form_type' :
                        'agreement_title'
                      }
                      field={
                        currentDoc?.fields[
                          currentDoc?.docType === 'INVOICE' ? 'vendor_name' :
                          currentDoc?.docType === 'COMPLIANCE_DOC' ? 'framework_name' :
                          currentDoc?.docType === 'PURCHASE_ORDER' ? 'po_number' :
                          currentDoc?.docType === 'TAX_FORM' ? 'form_type' :
                          'agreement_title'
                        ]
                      }
                      highlightedFieldKey={highlightedFieldKey}
                      onSelectField={handleSelectCanvasField}
                      onHoverField={setHighlightedFieldKey}
                    >
                      <h2 className="text-base font-serif italic font-bold tracking-tight text-[#1A1B1E] leading-tight">
                        {currentDoc?.docType === 'INVOICE'
                          ? (currentDoc?.fields['vendor_name']?.value || currentDoc?.vendorOrParties.split('→')[0] || 'COMMERCIAL VENDOR ENTITY')
                          : currentDoc?.docType === 'COMPLIANCE_DOC'
                          ? (currentDoc?.fields['framework_name']?.value || currentDoc?.fields['standard_name']?.value || 'ENTERPRISE COMPLIANCE AUDIT')
                          : currentDoc?.docType === 'PURCHASE_ORDER'
                          ? `PURCHASE ORDER: ${currentDoc?.fields['po_number']?.value || 'PO-2026'}`
                          : currentDoc?.docType === 'TAX_FORM'
                          ? `IRS FORM ${currentDoc?.fields['form_type']?.value || 'W-9'} — TAXPAYER CERTIFICATION`
                          : (currentDoc?.fields['agreement_title']?.value || currentDoc?.title || 'COMMERCIAL CONTRACT AGREEMENT')}
                      </h2>
                    </CanvasFieldBox>
                    <p className="text-[10px] text-[#555] font-light">
                      {currentDoc?.docType === 'INVOICE'
                        ? 'Accounts Payable • Commercial Ingestion Audit'
                        : currentDoc?.docType === 'COMPLIANCE_DOC'
                        ? 'Governance, Risk & Compliance (GRC) Evaluation'
                        : currentDoc?.docType === 'PURCHASE_ORDER'
                        ? 'Enterprise Procurement • Authorized Requisition'
                        : currentDoc?.docType === 'TAX_FORM'
                        ? 'Tax Compliance & Withholding • TIN/EIN Validation'
                        : 'Legal Operations • Corporate Counsel Invariant Ledger'}
                    </p>
                    <p className="text-[9px] text-[#666] font-mono">
                      Doc UUID: {currentDoc?.id.substring(0, 16)}... | OCR Pathway: {currentDoc?.ocrPathway}
                    </p>
                  </div>
                  <div className="text-right font-mono text-[9px] shrink-0">
                    <div className="font-bold text-[#1A1B1E] text-xs">
                      {currentDoc?.fields['invoice_number']?.value || currentDoc?.fields['po_number']?.value || (currentDoc?.docType === 'TAX_FORM' ? `TIN: ${currentDoc?.fields['tin_ein']?.value || '***'}` : currentDoc?.id.substring(0, 12))}
                    </div>
                    <div className="text-[#555]">
                      Date: {currentDoc?.fields['invoice_date']?.value || currentDoc?.fields['order_date']?.value || currentDoc?.fields['effective_date']?.value || currentDoc?.fields['signature_date']?.value || currentDoc?.uploadDate.split(' ')[0]}
                    </div>
                    <div className="text-[#555]">
                      Archetype: <span className="font-semibold uppercase">{currentDoc?.docType}</span>
                    </div>
                  </div>
                </div>

                {/* Body Content - Archetype Aware */}
                <div className="space-y-4 leading-relaxed text-[11px]">
                  {/* ============================================================ */}
                  {/* ARCHETYPE 1: INVOICE */}
                  {/* ============================================================ */}
                  {currentDoc?.docType === 'INVOICE' && (
                    <>
                      {/* Vendor & Customer Billing Addresses */}
                      <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-[#D5D7DC] pb-3">
                        <div>
                          <span className="font-mono uppercase text-[9px] text-[#777] block mb-0.5">Remit / Vendor Entity:</span>
                          <CanvasFieldBox
                            fieldKey="vendor_name"
                            field={currentDoc?.fields['vendor_name']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="font-bold text-[#1A1B1E]">
                              {currentDoc?.fields['vendor_name']?.value || currentDoc?.vendorOrParties.split('→')[0]}
                            </div>
                          </CanvasFieldBox>
                          {currentDoc?.fields['vendor_address']?.value && (
                            <CanvasFieldBox
                              fieldKey="vendor_address"
                              field={currentDoc?.fields['vendor_address']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <div className="text-[#444] text-[9.5px] mt-0.5">{currentDoc.fields['vendor_address'].value}</div>
                            </CanvasFieldBox>
                          )}
                        </div>
                        <div>
                          <span className="font-mono uppercase text-[9px] text-[#777] block mb-0.5">Billed Entity:</span>
                          <CanvasFieldBox
                            fieldKey="customer_name"
                            field={currentDoc?.fields['customer_name']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="font-bold text-[#1A1B1E]">
                              {currentDoc?.fields['customer_name']?.value || 'DocIntel Enterprise Client'}
                            </div>
                          </CanvasFieldBox>
                          <div className="text-[#555] text-[9px] mt-0.5 font-mono">
                            Terms: {currentDoc?.fields['payment_terms']?.value || 'Net 30 Days'} | Due: {currentDoc?.fields['due_date']?.value || 'Upon Receipt'}
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Line Items Table */}
                      <div className="border border-[#1A1B1E] mt-3">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-[#EAE8DF] border-b border-[#1A1B1E] font-mono text-[9px] uppercase tracking-wider">
                            <tr>
                              <th className="p-2">Description</th>
                              <th className="p-2 text-right">Qty</th>
                              <th className="p-2 text-right">Unit Price</th>
                              <th className="p-2 text-right">Extended</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D5D7DC] font-mono text-[#1A1B1E]">
                            {parseLineItems(currentDoc).map((item, idx) => (
                              <tr key={idx} className="hover:bg-[#F2EFE6] transition-colors">
                                <td className="p-2 font-sans font-medium">{item.description}</td>
                                <td className="p-2 text-right">{item.quantity}</td>
                                <td className="p-2 text-right">{item.unit_price}</td>
                                <td className="p-2 text-right font-bold">{item.amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Financial Summary Schedule on Invoice */}
                      <div className="pt-2 flex justify-end">
                        <div className="w-64 space-y-1.5 font-mono text-[11px] border-t-2 border-[#1A1B1E] pt-2">
                          <div className="flex justify-between text-[#444]">
                            <span>Subtotal:</span>
                            <CanvasFieldBox
                              fieldKey="subtotal"
                              field={currentDoc?.fields['subtotal']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                              displayInline
                            >
                              <span>{currentDoc?.fields['subtotal']?.value || 'N/A'}</span>
                            </CanvasFieldBox>
                          </div>
                          <div className="flex justify-between text-[#444]">
                            <span>Tax Amount:</span>
                            <CanvasFieldBox
                              fieldKey="tax_amount"
                              field={currentDoc?.fields['tax_amount']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                              displayInline
                            >
                              <span>{currentDoc?.fields['tax_amount']?.value || '$0.00'}</span>
                            </CanvasFieldBox>
                          </div>
                          <div className="flex justify-between font-bold text-[#1A1B1E] border-t border-[#1A1B1E] pt-1 text-xs">
                            <span>Total Due ({currentDoc?.currency || 'USD'}):</span>
                            <CanvasFieldBox
                              fieldKey="total_amount"
                              field={currentDoc?.fields['total_amount']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                              displayInline
                            >
                              <span className="text-sm">{currentDoc?.fields['total_amount']?.value || 'N/A'}</span>
                            </CanvasFieldBox>
                          </div>
                        </div>
                      </div>

                      {/* Math Invariant Violation Warning Callout on Canvas */}
                      {currentDoc?.anomalies.some(a => a.ruleType === 'math_invariant' && !a.resolved) && (
                        <div className="p-2.5 bg-[#D9534F]/10 border-l-4 border-[#D9534F] text-[10px] text-[#900] space-y-0.5 mt-2">
                          <div className="font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#D9534F]" />
                            MATHEMATICAL INVARIANT MISMATCH DETECTED
                          </div>
                          <div>
                            Line items sum + tax does not equal printed total. Click field to calibrate in HITL console.
                          </div>
                        </div>
                      )}

                      {/* Remittance Banking Note */}
                      <div className={`mt-4 p-2.5 border text-[10px] font-mono ${
                        currentDoc?.anomalies.some(a => a.ruleType === 'wire_fraud_bank' && !a.resolved)
                          ? 'bg-[#D9534F]/10 border-[#D9534F] text-[#900]'
                          : 'bg-[#EAE8DF] border-[#1A1B1E] text-[#444]'
                      }`}>
                        <div className="font-bold uppercase mb-0.5">Remittance &amp; Wire Settlement:</div>
                        <div>ACH Wire Route: Silicon Valley Bank | Routing: 121000358 | Acct: 8944102910</div>
                        {currentDoc?.anomalies.some(a => a.ruleType === 'wire_fraud_bank' && !a.resolved) && (
                          <div className="text-[#D9534F] font-bold mt-1 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            ALERT: Remittance wire route discrepancy flagged against vendor profile!
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ============================================================ */}
                  {/* ARCHETYPE 2: CONTRACT */}
                  {/* ============================================================ */}
                  {currentDoc?.docType === 'CONTRACT' && (
                    <>
                      {/* Parties Recital */}
                      <div className="p-3 bg-[#F2EFE6] border border-[#D5D7DC] rounded-sm text-[11px]">
                        <span className="font-mono uppercase text-[9px] text-[#777] block mb-1">Contractual Counter-Parties:</span>
                        <CanvasFieldBox
                          fieldKey="parties"
                          field={currentDoc?.fields['parties']}
                          highlightedFieldKey={highlightedFieldKey}
                          onSelectField={handleSelectCanvasField}
                          onHoverField={setHighlightedFieldKey}
                        >
                          <div className="font-semibold text-[#1A1B1E] leading-relaxed">
                            {currentDoc?.fields['parties']?.value || currentDoc?.vendorOrParties || 'DocIntel Enterprise Corp. and Authorized Commercial Partner'}
                          </div>
                        </CanvasFieldBox>
                      </div>

                      {/* Operative Terms Grid */}
                      <div className="grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-b border-[#D5D7DC] py-3">
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Effective Date:</span>
                          <CanvasFieldBox
                            fieldKey="effective_date"
                            field={currentDoc?.fields['effective_date']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className="font-bold text-[#1A1B1E]">{currentDoc?.fields['effective_date']?.value || '2026-01-01'}</span>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Term &amp; Renewal:</span>
                          <CanvasFieldBox
                            fieldKey="term_renewal"
                            field={currentDoc?.fields['term_renewal'] || currentDoc?.fields['expiration_date']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className="font-bold text-[#1A1B1E]">
                              {currentDoc?.fields['term_renewal']?.value || currentDoc?.fields['expiration_date']?.value || '12-Month Mutual Renewal'}
                            </span>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Governing Law:</span>
                          <CanvasFieldBox
                            fieldKey="governing_law"
                            field={currentDoc?.fields['governing_law']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className="font-bold text-[#1A1B1E]">{currentDoc?.fields['governing_law']?.value || 'State of Delaware, US'}</span>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Execution Status:</span>
                          <span className={`font-bold ${
                            currentDoc?.fields['signature_status']?.value === 'signed' || currentDoc?.fields['is_signed']?.value === 'true'
                              ? 'text-[#2E7D32]'
                              : 'text-[#D9534F]'
                          }`}>
                            {currentDoc?.fields['signature_status']?.value?.toUpperCase() || (currentDoc?.fields['is_signed']?.value === 'true' ? 'SIGNED & EXECUTED' : 'UNSIGNED / PENDING')}
                          </span>
                        </div>
                      </div>

                      {/* Key Obligations */}
                      <div className="space-y-1">
                        <span className="font-mono uppercase text-[9px] text-[#777]">Key Covenants &amp; Obligations:</span>
                        <CanvasFieldBox
                          fieldKey="key_obligations"
                          field={currentDoc?.fields['key_obligations']}
                          highlightedFieldKey={highlightedFieldKey}
                          onSelectField={handleSelectCanvasField}
                          onHoverField={setHighlightedFieldKey}
                        >
                          <p className="text-[10.5px] text-[#333] leading-relaxed font-serif bg-[#FBFBFA] p-2.5 border border-[#E0E0E0] rounded-sm">
                            {currentDoc?.fields['key_obligations']?.value || 'Parties mutually agree to non-disclosure, intellectual property protection, $1,000,000 indemnification threshold, and 30-day notice prior to contract termination.'}
                          </p>
                        </CanvasFieldBox>
                      </div>

                      {/* Signature Blocks */}
                      <div className="mt-6 pt-4 border-t-2 border-[#1A1B1E]">
                        <div className="text-[9px] font-mono uppercase text-[#777] mb-2">Execution &amp; Attestation:</div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="border-t border-[#1A1B1E] pt-2 text-[10px]">
                            <div className="font-serif italic font-bold text-sm text-[#1A1B1E]">
                              {currentDoc?.fields['signature_status']?.value === 'signed' || currentDoc?.fields['is_signed']?.value === 'true'
                                ? 'Jane Doe, VP Procurement'
                                : '[ EXECUTION MISSING ]'}
                            </div>
                            <div className="text-[#666] font-mono text-[9px]">Party A: Client Authorized Signatory</div>
                            <div className="text-[#888] font-mono text-[8.5px]">Date: {currentDoc?.fields['signature_date']?.value || '2026-03-18'}</div>
                          </div>
                          <div className="border-t border-[#1A1B1E] pt-2 text-[10px]">
                            {currentDoc?.anomalies.some(a => a.ruleType === 'signature_missing' && !a.resolved) ? (
                              <div className="p-2 border-2 border-dashed border-[#D9534F] bg-[#D9534F]/10 text-center rounded">
                                <span className="text-[10px] font-mono font-bold text-[#D9534F] flex items-center justify-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> UNSIGNED BLOCK FLAGGED
                                </span>
                                <p className="text-[8.5px] text-[#900] mt-0.5">Counterparty signature missing from execution page.</p>
                              </div>
                            ) : (
                              <>
                                <div className="font-serif italic font-bold text-sm text-[#1A1B1E]">
                                  Marcus Vance, General Counsel
                                </div>
                                <div className="text-[#666] font-mono text-[9px]">Party B: Service Provider Legal Officer</div>
                                <div className="text-[#888] font-mono text-[8.5px]">Date: {currentDoc?.fields['signature_date']?.value || '2026-03-18'}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ============================================================ */}
                  {/* ARCHETYPE 3: COMPLIANCE_DOC */}
                  {/* ============================================================ */}
                  {currentDoc?.docType === 'COMPLIANCE_DOC' && (
                    <>
                      {/* Framework & Assessor Card */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-[#F2EFE6] border border-[#D5D7DC] rounded-sm text-[10px] font-mono">
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Audit Framework:</span>
                          <CanvasFieldBox
                            fieldKey="framework_name"
                            field={currentDoc?.fields['framework_name'] || currentDoc?.fields['standard_name']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="font-bold text-[#1A1B1E]">
                              {currentDoc?.fields['framework_name']?.value || currentDoc?.fields['standard_name']?.value || 'SOC 2 Type II / ISO 27001'}
                            </div>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Assessor Entity:</span>
                          <CanvasFieldBox
                            fieldKey="assessor_name"
                            field={currentDoc?.fields['assessor_name'] || currentDoc?.fields['auditor']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="font-bold text-[#1A1B1E]">
                              {currentDoc?.fields['assessor_name']?.value || currentDoc?.fields['auditor']?.value || 'Enterprise Assurance Partners LLP'}
                            </div>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Audit Period:</span>
                          <CanvasFieldBox
                            fieldKey="audit_period"
                            field={currentDoc?.fields['audit_period']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="font-bold text-[#1A1B1E]">{currentDoc?.fields['audit_period']?.value || 'Annual Assessment Period'}</div>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#777] block text-[9px] uppercase">Non-Compliant Findings:</span>
                          <CanvasFieldBox
                            fieldKey="non_compliant_count"
                            field={currentDoc?.fields['non_compliant_count']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                              Number(currentDoc?.fields['non_compliant_count']?.value || 0) > 0
                                ? 'bg-[#D9534F] text-white'
                                : 'bg-[#2E7D32] text-white'
                            }`}>
                              {currentDoc?.fields['non_compliant_count']?.value || '0'} Findings
                            </span>
                          </CanvasFieldBox>
                        </div>
                      </div>

                      {/* Clauses Referenced */}
                      <div className="space-y-1">
                        <span className="font-mono uppercase text-[9px] text-[#777]">Referenced Clauses &amp; Controls:</span>
                        <CanvasFieldBox
                          fieldKey="clauses_referenced"
                          field={currentDoc?.fields['clauses_referenced'] || currentDoc?.fields['relevant_clauses']}
                          highlightedFieldKey={highlightedFieldKey}
                          onSelectField={handleSelectCanvasField}
                          onHoverField={setHighlightedFieldKey}
                        >
                          <div className="text-[10px] font-mono bg-[#FBFBFA] p-2.5 border border-[#E0E0E0] text-[#333]">
                            {currentDoc?.fields['clauses_referenced']?.value || currentDoc?.fields['relevant_clauses']?.value || 'CC6.1 (Logical Access), CC6.6 (Boundary Protection), CC7.1 (Vulnerability Management)'}
                          </div>
                        </CanvasFieldBox>
                      </div>

                      {/* Required Actions & Deadlines */}
                      <div className="space-y-1">
                        <span className="font-mono uppercase text-[9px] text-[#777]">Required Remediation &amp; Critical Deadlines:</span>
                        <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                          <CanvasFieldBox
                            fieldKey="required_actions"
                            field={currentDoc?.fields['required_actions']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="bg-[#FBFBFA] p-2 border border-[#E0E0E0] text-[#333]">
                              <span className="text-[#888] block text-[8px] uppercase">Remediation Action:</span>
                              {currentDoc?.fields['required_actions']?.value || 'Implement automated rotation for privileged API tokens.'}
                            </div>
                          </CanvasFieldBox>
                          <CanvasFieldBox
                            fieldKey="critical_deadlines"
                            field={currentDoc?.fields['critical_deadlines'] || currentDoc?.fields['deadlines']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="bg-[#FBFBFA] p-2 border border-[#E0E0E0] text-[#333]">
                              <span className="text-[#888] block text-[8px] uppercase">Target Deadline:</span>
                              <span className="text-[#D9534F] font-bold">
                                {currentDoc?.fields['critical_deadlines']?.value || currentDoc?.fields['deadlines']?.value || '30 Days from Audit Issue'}
                              </span>
                            </div>
                          </CanvasFieldBox>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ============================================================ */}
                  {/* ARCHETYPE 4: PURCHASE_ORDER */}
                  {/* ============================================================ */}
                  {currentDoc?.docType === 'PURCHASE_ORDER' && (
                    <>
                      {/* Buyer & Vendor Details */}
                      <div className="grid grid-cols-2 gap-4 text-[10px] border-b border-[#D5D7DC] pb-3">
                        <div>
                          <span className="font-mono uppercase text-[9px] text-[#777] block mb-0.5">Purchasing Entity (Buyer):</span>
                          <CanvasFieldBox
                            fieldKey="buyer_name"
                            field={currentDoc?.fields['buyer_name']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="font-bold text-[#1A1B1E]">
                              {currentDoc?.fields['buyer_name']?.value || 'DocIntel Enterprise Corp.'}
                            </div>
                          </CanvasFieldBox>
                          <div className="text-[#555] text-[9px] mt-0.5 font-mono">
                            Requisition PO #: <span className="font-bold text-[#0f766e]">{currentDoc?.fields['po_number']?.value || 'PO-2026-8001'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="font-mono uppercase text-[9px] text-[#777] block mb-0.5">Supplying Vendor:</span>
                          <CanvasFieldBox
                            fieldKey="vendor_name"
                            field={currentDoc?.fields['vendor_name']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <div className="font-bold text-[#1A1B1E]">
                              {currentDoc?.fields['vendor_name']?.value || currentDoc?.vendorOrParties}
                            </div>
                          </CanvasFieldBox>
                          <div className="text-[#555] text-[9px] mt-0.5 font-mono">
                            Terms: {currentDoc?.fields['payment_terms']?.value || 'Net 45 Days'}
                          </div>
                        </div>
                      </div>

                      {/* Dates & Approval Strip */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#f0fdfa] border border-[#ccfbf1] rounded-sm text-[10px] font-mono">
                        <div>
                          <span className="text-[#555] block text-[8.5px] uppercase">Order Issue Date:</span>
                          <CanvasFieldBox
                            fieldKey="order_date"
                            field={currentDoc?.fields['order_date']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className="font-bold text-[#1A1B1E]">{currentDoc?.fields['order_date']?.value || '2026-03-01'}</span>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#555] block text-[8.5px] uppercase">Delivery Target:</span>
                          <CanvasFieldBox
                            fieldKey="delivery_date"
                            field={currentDoc?.fields['delivery_date']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className={`font-bold ${
                              currentDoc?.anomalies.some(a => a.fieldKey === 'delivery_date' && !a.resolved)
                                ? 'text-[#D9534F]'
                                : 'text-[#1A1B1E]'
                            }`}>
                              {currentDoc?.fields['delivery_date']?.value || '2026-04-15'}
                            </span>
                          </CanvasFieldBox>
                        </div>
                        <div>
                          <span className="text-[#555] block text-[8.5px] uppercase">Requisition Status:</span>
                          <CanvasFieldBox
                            fieldKey="approval_status"
                            field={currentDoc?.fields['approval_status']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className={`font-bold uppercase ${
                              currentDoc?.fields['approval_status']?.value === 'approved'
                                ? 'text-[#0f766e]'
                                : 'text-[#E5A93C]'
                            }`}>
                              {currentDoc?.fields['approval_status']?.value || 'APPROVED'}
                            </span>
                          </CanvasFieldBox>
                        </div>
                      </div>

                      {/* Line Items Table */}
                      <div>
                        <div className="text-[9px] font-mono uppercase text-[#777] mb-1">Authorized Purchase Requisition Items:</div>
                        <div className="border border-[#D5D7DC] rounded-sm overflow-hidden text-[10px]">
                          <div className="grid grid-cols-12 bg-[#1e293b] text-white font-mono text-[9px] uppercase px-2.5 py-1.5 font-bold">
                            <span className="col-span-6">Description</span>
                            <span className="col-span-2 text-center">Qty</span>
                            <span className="col-span-2 text-right">Rate</span>
                            <span className="col-span-2 text-right">Amount</span>
                          </div>
                          <div className="divide-y divide-[#E0E0E0] bg-white font-mono text-[9.5px]">
                            <div className="grid grid-cols-12 px-2.5 py-1.5 items-center">
                              <span className="col-span-6 text-[#1A1B1E] truncate font-sans">High-Performance Compute Blade Node</span>
                              <span className="col-span-2 text-center text-[#555]">2</span>
                              <span className="col-span-2 text-right text-[#555]">$4,200.00</span>
                              <span className="col-span-2 text-right font-bold text-[#1A1B1E]">$8,400.00</span>
                            </div>
                            <div className="grid grid-cols-12 px-2.5 py-1.5 items-center bg-[#FAFAFA]">
                              <span className="col-span-6 text-[#1A1B1E] truncate font-sans">Enterprise Storage Array &amp; Transceivers</span>
                              <span className="col-span-2 text-center text-[#555]">1</span>
                              <span className="col-span-2 text-right text-[#555]">$4,100.00</span>
                              <span className="col-span-2 text-right font-bold text-[#1A1B1E]">$4,100.00</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Totals Calculation */}
                      <div className="flex justify-end pt-1">
                        <div className="w-52 space-y-1 text-right font-mono text-[10px]">
                          <div className="flex justify-between text-[#555]">
                            <span>Subtotal:</span>
                            <CanvasFieldBox
                              fieldKey="subtotal"
                              field={currentDoc?.fields['subtotal']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <span>${Number(currentDoc?.fields['subtotal']?.numericValue || currentDoc?.fields['subtotal']?.value || 12500).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </CanvasFieldBox>
                          </div>
                          <div className="flex justify-between text-[#555]">
                            <span>Tax (8.25%):</span>
                            <CanvasFieldBox
                              fieldKey="tax_amount"
                              field={currentDoc?.fields['tax_amount']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <span>${Number(currentDoc?.fields['tax_amount']?.numericValue || currentDoc?.fields['tax_amount']?.value || 1031.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </CanvasFieldBox>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-[#1A1B1E] border-t-2 border-[#1A1B1E] pt-1">
                            <span>PO Total:</span>
                            <CanvasFieldBox
                              fieldKey="total_amount"
                              field={currentDoc?.fields['total_amount']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <span className={currentDoc?.anomalies.some(a => a.ruleType === 'math_invariant' && !a.resolved) ? 'text-[#D9534F]' : ''}>
                                ${Number(currentDoc?.fields['total_amount']?.numericValue || currentDoc?.fields['total_amount']?.value || 13531.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </CanvasFieldBox>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ============================================================ */}
                  {/* ARCHETYPE 5: TAX_FORM */}
                  {/* ============================================================ */}
                  {currentDoc?.docType === 'TAX_FORM' && (
                    <>
                      {/* Form Header / Masthead */}
                      <div className="p-3 bg-[#f8fafc] border border-[#cbd5e1] rounded-sm space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono border-b border-[#cbd5e1] pb-1.5">
                          <span className="font-bold text-[#0f172a]">IRS Form {currentDoc?.fields['form_type']?.value || 'W-9'}</span>
                          <span className="text-[#64748b]">Tax Year: {currentDoc?.fields['tax_year']?.value || '2026'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[10px]">
                          <div>
                            <span className="text-[#64748b] block text-[8.5px] uppercase font-mono">Taxpayer / Individual Name:</span>
                            <CanvasFieldBox
                              fieldKey="taxpayer_name"
                              field={currentDoc?.fields['taxpayer_name']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <div className="font-bold text-[#0f172a]">{currentDoc?.fields['taxpayer_name']?.value || 'Commercial Entity'}</div>
                            </CanvasFieldBox>
                          </div>
                          <div>
                            <span className="text-[#64748b] block text-[8.5px] uppercase font-mono">Business Name / Entity:</span>
                            <CanvasFieldBox
                              fieldKey="business_name"
                              field={currentDoc?.fields['business_name']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <div className="text-[#334155]">{currentDoc?.fields['business_name']?.value || 'Operating LLC'}</div>
                            </CanvasFieldBox>
                          </div>
                        </div>
                        <div className="pt-1">
                          <span className="text-[#64748b] block text-[8.5px] uppercase font-mono">Tax Classification:</span>
                          <CanvasFieldBox
                            fieldKey="tax_classification"
                            field={currentDoc?.fields['tax_classification']}
                            highlightedFieldKey={highlightedFieldKey}
                            onSelectField={handleSelectCanvasField}
                            onHoverField={setHighlightedFieldKey}
                          >
                            <span className="font-mono text-[9.5px] text-[#0f172a] font-semibold flex items-center gap-1">
                              <span className="inline-flex items-center justify-center w-3 h-3 rounded-[2px] border border-slate-700 bg-slate-900 text-white text-[8px] font-bold">X</span>
                              {currentDoc?.fields['tax_classification']?.value || 'C Corporation'}
                            </span>
                          </CanvasFieldBox>
                        </div>
                      </div>

                      {/* Part I: TIN/EIN Box */}
                      <div className="p-3 bg-white border-2 border-[#1e293b] rounded-sm space-y-1">
                        <div className="text-[9px] font-mono uppercase font-bold text-[#1e293b]">Part I: Taxpayer Identification Number (TIN / EIN)</div>
                        <CanvasFieldBox
                          fieldKey="tin_ein"
                          field={currentDoc?.fields['tin_ein']}
                          highlightedFieldKey={highlightedFieldKey}
                          onSelectField={handleSelectCanvasField}
                          onHoverField={setHighlightedFieldKey}
                        >
                          <div className="flex items-center justify-between font-mono bg-[#f1f5f9] p-2 border border-[#94a3b8] rounded">
                            <span className="text-xs font-bold tracking-widest text-[#0f172a]">
                              {currentDoc?.fields['tin_ein']?.value || '12-3456789'}
                            </span>
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                              currentDoc?.anomalies.some(a => a.fieldKey === 'tin_ein' && !a.resolved)
                                ? 'bg-[#D9534F]/20 text-[#D9534F]'
                                : 'bg-[#2E7D32]/20 text-[#2E7D32]'
                            }`}>
                              {currentDoc?.anomalies.some(a => a.fieldKey === 'tin_ein' && !a.resolved) ? 'INVALID FORMAT' : 'VALIDATED TIN'}
                            </span>
                          </div>
                        </CanvasFieldBox>
                      </div>

                      {/* Part II: Certification Signature */}
                      <div className="p-3 bg-white border border-[#cbd5e1] rounded-sm space-y-2">
                        <div className="text-[9px] font-mono uppercase text-[#64748b]">Part II: Certification Under Penalties of Perjury</div>
                        <p className="text-[9px] text-[#475569] leading-relaxed italic">
                          I certify that the number shown on this form is my correct taxpayer identification number and I am a U.S. person.
                        </p>
                        <div className="pt-2 border-t border-[#cbd5e1] flex justify-between items-center text-[10px]">
                          <div>
                            <span className="text-[#64748b] block text-[8px] uppercase font-mono">Attestation Signature:</span>
                            <CanvasFieldBox
                              fieldKey="is_signed"
                              field={currentDoc?.fields['is_signed']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <div className="font-serif italic font-bold text-[#0f172a]">
                                {currentDoc?.fields['is_signed']?.value === 'false' || currentDoc?.anomalies.some(a => a.fieldKey === 'is_signed' && !a.resolved)
                                  ? <span className="text-[#D9534F] font-mono text-[9px] font-bold">[ UNSIGNED CERTIFICATION ]</span>
                                  : 'Jane Doe, Authorized Corporate Controller'}
                              </div>
                            </CanvasFieldBox>
                          </div>
                          <div className="text-right">
                            <span className="text-[#64748b] block text-[8px] uppercase font-mono">Signature Date:</span>
                            <CanvasFieldBox
                              fieldKey="signature_date"
                              field={currentDoc?.fields['signature_date']}
                              highlightedFieldKey={highlightedFieldKey}
                              onSelectField={handleSelectCanvasField}
                              onHoverField={setHighlightedFieldKey}
                            >
                              <span className="font-mono text-[9.5px] text-[#0f172a]">{currentDoc?.fields['signature_date']?.value || '2026-01-15'}</span>
                            </CanvasFieldBox>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sticky Floating Zoom Dock for instant reach while scrolling */}
          {canvasViewMode !== 'raw' && (
            <div 
              id="sticky-canvas-zoom-dock" 
              className="sticky bottom-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141518]/95 backdrop-blur-md border border-[#2A2C31] shadow-2xl text-xs text-[#8E9097] transition-all hover:border-[#C5B358] mt-4 shrink-0 pointer-events-auto select-none"
            >
              <div className="flex items-center gap-1">
                <button
                  id="floating-zoom-out"
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
                  className="p-1 rounded-full hover:bg-[#1E2024] hover:text-[#C5B358] text-[#8E9097] cursor-pointer transition-colors"
                  title="Zoom Out (Ctrl -)"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  id="floating-zoom-reset"
                  onClick={() => setZoomLevel(85)}
                  className="font-mono text-[11px] font-semibold text-[#E5E5E5] px-1.5 py-0.5 rounded hover:bg-[#1E2024] hover:text-[#C5B358] transition-colors cursor-pointer"
                  title="Reset to 85% Fit (Ctrl 0)"
                >
                  {zoomLevel}%
                </button>
                <button
                  id="floating-zoom-in"
                  onClick={() => setZoomLevel(prev => Math.min(180, prev + 10))}
                  className="p-1 rounded-full hover:bg-[#1E2024] hover:text-[#C5B358] text-[#8E9097] cursor-pointer transition-colors"
                  title="Zoom In (Ctrl +)"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-3.5 w-px bg-[#2A2C31]" />

              <button
                id="floating-zoom-fit"
                onClick={() => setZoomLevel(85)}
                className="flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-0.5 rounded hover:bg-[#1E2024] hover:text-[#C5B358] text-[#8E9097] cursor-pointer transition-colors"
                title="Fit Document to Frame"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fit</span>
              </button>

              <div className="h-3.5 w-px bg-[#2A2C31]" />

              <div className="flex items-center gap-1 font-mono text-[10px]">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-1 rounded hover:bg-[#1E2024] hover:text-[#C5B358] disabled:opacity-30 cursor-pointer"
                  title="Previous Page"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[#E5E5E5] px-1">{currentPage}/{currentDoc?.pages || 1}</span>
                <button
                  disabled={currentPage >= (currentDoc?.pages || 1)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-1 rounded hover:bg-[#1E2024] hover:text-[#C5B358] disabled:opacity-30 cursor-pointer"
                  title="Next Page"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL 3: Structured Extraction, Invariant Recalc & Audit Ledger (4 Cols) */}
      {/* ========================================================================= */}
      <div 
        id="review-panel-hitl"
        className="xl:col-span-4 bg-[#141518] border border-[#2A2C31] rounded-xl flex flex-col overflow-hidden h-[calc(100vh-140px)] min-h-[580px] max-h-[920px] shadow-sm"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#2A2C31] bg-[#141518] flex items-center justify-between">
          <div>
            <h3 className="font-serif italic text-base text-[#E5E5E5] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5B358]" />
              HITL Invariant Console
            </h3>
            <p className="text-[11px] text-[#8E9097] mt-0.5">Deterministic checks &amp; in-place calibration</p>
          </div>
          <button
            id="approve-to-erp-button"
            onClick={handleApproveDoc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C5B358] hover:bg-[#D8C76D] text-[#0B0C0E] text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            Post to ERP
          </button>
        </div>

        {/* Triple Tab Navigation: Extracted Fields vs Rule Engine Guardrails vs Document History */}
        <div className="flex border-b border-[#2A2C31] bg-[#141518] px-4 pt-2 gap-1.5 overflow-x-auto no-scrollbar">
          <button
            id="tab-extracted-fields"
            onClick={() => setHitlTab('fields')}
            className={`pb-2.5 px-2.5 text-xs font-mono font-medium uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              hitlTab === 'fields'
                ? 'border-[#C5B358] text-[#C5B358]'
                : 'border-transparent text-[#8E9097] hover:text-[#E5E5E5]'
            }`}
          >
            Extracted Fields ({Object.keys(currentDoc?.fields || {}).length})
          </button>
          <button
            id="tab-rule-engine"
            onClick={() => setHitlTab('guardrails')}
            className={`pb-2.5 px-2.5 text-xs font-mono font-medium uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              hitlTab === 'guardrails'
                ? 'border-[#C5B358] text-[#C5B358]'
                : 'border-transparent text-[#8E9097] hover:text-[#E5E5E5]'
            }`}
          >
            Guardrails
            {currentDoc?.anomalies.filter(a => !a.resolved).length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] animate-pulse" />
            )}
          </button>
          <button
            id="tab-document-history"
            onClick={() => setHitlTab('history')}
            className={`pb-2.5 px-2.5 text-xs font-mono font-medium uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              hitlTab === 'history'
                ? 'border-[#C5B358] text-[#C5B358]'
                : 'border-transparent text-[#8E9097] hover:text-[#E5E5E5]'
            }`}
          >
            <History className="w-3 h-3" />
            History &amp; Versions
            <span className="text-[9px] px-1 py-0.2 rounded-full bg-[#0B0C0E] border border-[#2A2C31] text-[#C5B358]">
              {currentDoc?.auditTrail?.length || 0}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {hitlTab === 'history' ? (
            /* ========================================================================= */
            /* TAB 3: Document History & Versioning Panel */
            /* ========================================================================= */
            <DocumentHistoryPanel
              document={currentDoc}
              onUpdateDocument={onUpdateDocument}
            />
          ) : hitlTab === 'guardrails' ? (
            /* ========================================================================= */
            /* TAB 2: Rule Engine Guardrails (5 Deterministic Checks) */
            /* ========================================================================= */
            <div className="space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#8E9097] flex items-center justify-between">
                <span>Deterministic Invariant Rules</span>
                <span className="text-[#C5B358]">Zero-Tolerance</span>
              </div>

              {/* Rule 1: Subtotal + Tax == Total Math Invariant */}
              <div className="p-3.5 rounded-xl border border-[#2A2C31] bg-[#16171B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0B0C0E] text-[#E5E5E5] border border-[#2A2C31]">
                    RULE 01
                  </span>
                  {currentDoc?.anomalies.some(a => a.ruleType === 'math_invariant' && !a.resolved) ? (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/30 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] animate-pulse" />
                      Invariant Violation
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#C5B358]/20 text-[#C5B358] border border-[#C5B358]/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#C5B358]" />
                      Passed
                    </span>
                  )}
                </div>
                <h5 className="text-xs font-semibold text-[#E5E5E5]">Math Invariant: Subtotal + Tax = Total</h5>
                <p className="text-[11px] text-[#8E9097] leading-relaxed">
                  Asserts absolute mathematical equivalence within $0.02 rounding tolerance across extracted numeric currency tokens.
                </p>
                <div className="text-[10px] font-mono bg-[#0B0C0E] p-2 rounded border border-[#2A2C31] flex justify-between text-[#8E9097]">
                  <span>Subtotal: {currentDoc?.fields['subtotal']?.value || 'N/A'}</span>
                  <span>Tax: {currentDoc?.fields['tax_amount']?.value || 'N/A'}</span>
                  <span className="text-[#E5E5E5]">Total: {currentDoc?.fields['total_amount']?.value || 'N/A'}</span>
                </div>
              </div>

              {/* Rule 2: Cross-Document Duplicate Invoice Check */}
              <div className="p-3.5 rounded-xl border border-[#2A2C31] bg-[#16171B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0B0C0E] text-[#E5E5E5] border border-[#2A2C31]">
                    RULE 02
                  </span>
                  {currentDoc?.anomalies.some(a => a.ruleType === 'fraud_duplicate' && !a.resolved) ? (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/30 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#D9534F]" />
                      Duplicate Detected
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#C5B358]/20 text-[#C5B358] border border-[#C5B358]/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#C5B358]" />
                      Unique Catalog Entry
                    </span>
                  )}
                </div>
                <h5 className="text-xs font-semibold text-[#E5E5E5]">Cross-Document Duplicate Guard</h5>
                <p className="text-[11px] text-[#8E9097] leading-relaxed">
                  Performs exact match and fuzzy perceptual hash checks across invoice numbers, billing periods, and vendor entity IDs.
                </p>
                <div className="text-[10px] font-mono bg-[#0B0C0E] p-2 rounded border border-[#2A2C31] text-[#8E9097] flex justify-between">
                  <span>Vendor: {currentDoc?.vendorOrParties.split('→')[0]}</span>
                  <span>Invoice: {currentDoc?.fields['invoice_number']?.value || currentDoc?.id}</span>
                </div>
              </div>

              {/* Rule 3: Wire Fraud & Bank Account Modification Guard */}
              <div className="p-3.5 rounded-xl border border-[#2A2C31] bg-[#16171B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0B0C0E] text-[#E5E5E5] border border-[#2A2C31]">
                    RULE 03
                  </span>
                  {currentDoc?.anomalies.some(a => a.ruleType === 'wire_fraud_bank' && !a.resolved) ? (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/30 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-[#D9534F]" />
                      Wire Fraud Alert
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#C5B358]/20 text-[#C5B358] border border-[#C5B358]/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#C5B358]" />
                      Verified Bank Profile
                    </span>
                  )}
                </div>
                <h5 className="text-xs font-semibold text-[#E5E5E5]">Remittance Wire Fraud &amp; Bank Modification</h5>
                <p className="text-[11px] text-[#8E9097] leading-relaxed">
                  Compares remittance routing number and bank account against authorized vendor treasury records in master ERP.
                </p>
              </div>

              {/* Rule 4: Multi-Party Signature Verification */}
              <div className="p-3.5 rounded-xl border border-[#2A2C31] bg-[#16171B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0B0C0E] text-[#E5E5E5] border border-[#2A2C31]">
                    RULE 04
                  </span>
                  {currentDoc?.anomalies.some(a => a.ruleType === 'signature_missing' && !a.resolved) ? (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#E5A93C]/20 text-[#E5A93C] border border-[#E5A93C]/30 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#E5A93C]" />
                      Unsigned Block
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#C5B358]/20 text-[#C5B358] border border-[#C5B358]/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#C5B358]" />
                      Executed &amp; Bound
                    </span>
                  )}
                </div>
                <h5 className="text-xs font-semibold text-[#E5E5E5]">Multi-Party Contract Execution</h5>
                <p className="text-[11px] text-[#8E9097] leading-relaxed">
                  Evaluates digital and cursive signature blocks across all counter-parties, asserting high-confidence visual presence.
                </p>
              </div>

              {/* Rule 5: Chronological Date Inversion Guard */}
              <div className="p-3.5 rounded-xl border border-[#2A2C31] bg-[#16171B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0B0C0E] text-[#E5E5E5] border border-[#2A2C31]">
                    RULE 05
                  </span>
                  {currentDoc?.anomalies.some(a => a.ruleType === 'date_inversion' && !a.resolved) ? (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/30 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#D9534F]" />
                      Date Inversion
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#C5B358]/20 text-[#C5B358] border border-[#C5B358]/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#C5B358]" />
                      Chronologically Valid
                    </span>
                  )}
                </div>
                <h5 className="text-xs font-semibold text-[#E5E5E5]">Temporal Sequence Verification</h5>
                <p className="text-[11px] text-[#8E9097] leading-relaxed">
                  Enforces non-negotiable enterprise invariant: Due Date &gt;= Invoice Date &gt;= Purchase Order Date.
                </p>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* TAB 1: Extracted Fields, Active Anomalies & Audit Trail */
            /* ========================================================================= */
            <>
              {/* Active Anomalies Alert Box */}
              {currentDoc?.anomalies.filter(a => !a.resolved).length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#D9534F] flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Active Anomaly Flags ({currentDoc.anomalies.filter(a => !a.resolved).length})
                  </div>

                  {currentDoc.anomalies.filter(a => !a.resolved).map(anom => (
                    <div 
                      key={anom.id}
                      className="p-3.5 rounded-lg border border-[#D9534F]/30 bg-[#D9534F]/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#D9534F] px-2 py-0.5 rounded bg-[#0B0C0E] border border-[#D9534F]/30">
                          {anom.code}
                        </span>
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/30 font-semibold">
                          {anom.severity}
                        </span>
                      </div>

                      <h5 className="text-xs font-semibold text-[#E5E5E5] leading-snug">{anom.title}</h5>
                      <p className="text-xs text-[#8E9097] leading-relaxed">{anom.description}</p>

                      {anom.expectedValue && (
                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                          <div className="p-2 rounded bg-[#0B0C0E] border border-[#2A2C31]">
                            <span className="text-[#8E9097] text-[9px] uppercase tracking-wider block">Expected Sum:</span>
                            <span className="text-[#C5B358] font-bold">{anom.expectedValue}</span>
                          </div>
                          <div className="p-2 rounded bg-[#0B0C0E] border border-[#2A2C31]">
                            <span className="text-[#8E9097] text-[9px] uppercase tracking-wider block">Printed Total:</span>
                            <span className="text-[#D9534F] font-bold">{anom.actualValue}</span>
                          </div>
                        </div>
                      )}

                      {anom.ruleType === 'math_invariant' && (
                        <div className="text-[11px] text-[#E5E5E5] bg-[#16171B] p-2.5 rounded border border-[#2A2C31] flex items-center justify-between">
                          <span className="text-[11px] text-[#8E9097]">Suggested: $27,000.00 subtotal</span>
                          <button
                            onClick={() => handleStartEdit('subtotal', '$27,000.00')}
                            className="text-[10px] font-mono uppercase tracking-wider text-[#C5B358] hover:text-[#D8C76D] font-semibold cursor-pointer"
                          >
                            Auto-fill
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Resolved Anomalies (if any) */}
              {currentDoc?.anomalies.filter(a => a.resolved).length > 0 && (
                <div className="p-3 rounded-lg border border-[#C5B358]/30 bg-[#16171B] text-xs text-[#C5B358] space-y-1">
                  <div className="font-serif italic font-bold flex items-center gap-1.5 text-[#E5E5E5]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C5B358]" />
                    Invariants Verified &amp; Cleared
                  </div>
                  <p className="text-[11px] text-[#8E9097]">
                    {currentDoc.anomalies.find(a => a.resolved)?.resolutionNote || 'Verified by human reviewer.'}
                  </p>
                </div>
              )}

              {/* Extracted Fields Table with In-Place Edit */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#8E9097] flex items-center justify-between">
                  <span>Extracted Key-Value Fields</span>
                  <span>Confidence / Source</span>
                </div>

                <div className="space-y-2">
                  {Object.entries(currentDoc?.fields || {}).map(([key, field]) => {
                    const isEditing = editingFieldKey === key;

                    return (
                      <div
                        key={key}
                        onMouseEnter={() => setHighlightedFieldKey(key)}
                        onMouseLeave={() => setHighlightedFieldKey(null)}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isEditing
                            ? 'bg-[#16171B] border-[#C5B358] ring-1 ring-[#C5B358]/40'
                            : field.isCorrected
                            ? 'bg-[#16171B] border-[#C5B358]/40'
                            : 'bg-[#16171B] border-[#2A2C31] hover:border-[#3D4048]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#8E9097]">
                              {field.label}
                            </span>
                            {field.hasAnomaly && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full border border-[#D9534F]/40 bg-[#D9534F]/20 text-[#D9534F] font-mono flex items-center gap-0.5 font-bold animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" /> Anomaly
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {field.source && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#2A2C31] bg-[#0B0C0E] text-[#8E9097] font-mono">
                                {field.source}
                              </span>
                            )}
                            {field.isCorrected && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#C5B358]/40 bg-[#C5B358]/10 text-[#C5B358] font-mono">
                                Calibrated
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-[#8E9097]">
                              {field.confidence}%
                            </span>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <input
                              id={`edit-input-${key}`}
                              type="text"
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              className="flex-1 px-2.5 py-1 text-xs bg-[#0B0C0E] border border-[#C5B358] rounded text-[#E5E5E5] font-mono focus:outline-none"
                              autoFocus
                            />
                            <button
                              id={`save-field-${key}`}
                              onClick={() => handleSaveField(key)}
                              className="p-1 rounded bg-[#C5B358] text-[#0B0C0E] transition-colors cursor-pointer"
                              title="Save change"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`cancel-field-${key}`}
                              onClick={handleCancelEdit}
                              className="p-1 rounded bg-[#16171B] border border-[#2A2C31] text-[#8E9097] hover:text-[#E5E5E5] transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between group">
                            <span className={`text-xs font-mono font-medium ${field.hasAnomaly ? 'text-[#FF8080]' : 'text-[#E5E5E5]'}`}>
                              {field.value}
                            </span>
                            <button
                              id={`start-edit-${key}`}
                              onClick={() => handleStartEdit(key, field.value)}
                              className="opacity-0 group-hover:opacity-100 text-[#8E9097] hover:text-[#C5B358] p-1 transition-all cursor-pointer"
                              title="Edit field in-place"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {field.hasAnomaly && field.anomalyMessage && (
                          <div className="mt-1.5 pt-1 border-t border-[#D9534F]/20 text-[10px] text-[#D9534F] font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] shrink-0 animate-pulse" />
                            <span>{field.anomalyMessage}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Immutable Audit Trail Ledger */}
              <div className="space-y-2 pt-3 border-t border-[#2A2C31]">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#8E9097] flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[#E5E5E5]">
                    <History className="w-3.5 h-3.5 text-[#C5B358]" />
                    Compliance Audit Trail
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#8E9097]">
                      {currentDoc?.auditTrail.length} entries
                    </span>
                    <button
                      id="link-open-history-tab"
                      onClick={() => setHitlTab('history')}
                      className="text-[10px] font-mono text-[#C5B358] hover:text-[#D8C76D] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      Full Ledger <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {currentDoc?.auditTrail.map((entry, i) => (
                    <div 
                      key={entry.id || i}
                      className="p-2.5 rounded-lg border border-[#2A2C31] bg-[#0B0C0E] font-mono text-[10px] text-[#8E9097] space-y-1"
                    >
                      <div className="flex items-center justify-between text-[#8E9097]">
                        <span>{entry.timestamp}</span>
                        <span className="text-[#C5B358] font-medium">{entry.author}</span>
                      </div>
                      <div className="text-[#E5E5E5]">
                        <strong className="text-[#8E9097]">{entry.fieldLabel}:</strong> {entry.previousValue} → <span className="text-[#C5B358]">{entry.newValue}</span>
                      </div>
                      <div className="text-[9px] text-[#8E9097] italic">
                        Reason: {entry.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
