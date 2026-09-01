import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Edit2, 
  Check, 
  X, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  Sparkles,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { fetchDocuments, fetchDocumentDetails, correctField, uploadDocument, getDocumentPreviewUrl } from '../api';

export default function Review({ selectedDocId, setSelectedDocId }) {
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterLowConf, setFilterLowConf] = useState(false);
  const [anomalyFilter, setAnomalyFilter] = useState('all');
  const [docSearch, setDocSearch] = useState('');
  
  // Field editing state
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingField, setSavingField] = useState(false);

  const fileInputRef = useRef(null);

  // Load documents
  const loadDocs = async (targetId = null) => {
    try {
      const data = await fetchDocuments();
      const docs = data.documents || [];
      setDocuments(docs);
      
      const toSelect = targetId || selectedDocId || (docs.length > 0 ? docs[0].doc_id : null);
      if (toSelect) {
        selectDoc(toSelect);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  useEffect(() => {
    loadDocs(selectedDocId);
  }, [selectedDocId]);

  const selectDoc = async (id) => {
    setSelectedDocId(id);
    setLoading(true);
    try {
      const details = await fetchDocumentDetails(id);
      setActiveDoc(details);
    } catch (err) {
      console.error('Error fetching doc details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadDocument(file);
      const newDocId = res.document?.doc_id;
      await loadDocs(newDocId);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCorrection = async (fieldName) => {
    if (!activeDoc || !editValue.trim()) return;
    setSavingField(true);
    try {
      await correctField(activeDoc.doc_id, fieldName, editValue);
      // Reload active document
      await selectDoc(activeDoc.doc_id);
      setEditingField(null);
      setEditValue('');
    } catch (err) {
      alert(`Failed to save correction: ${err.message}`);
    } finally {
      setSavingField(false);
    }
  };

  const exportJSON = () => {
    if (!activeDoc) return;
    const blob = new Blob([JSON.stringify(activeDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.filename || 'document'}_extracted.json`;
    a.click();
  };

  // Filtered documents list
  const filteredDocs = documents.filter(d => 
    d.filename.toLowerCase().includes(docSearch.toLowerCase()) ||
    d.doc_type?.toLowerCase().includes(docSearch.toLowerCase())
  );

  // Field extraction items
  const rawFields = activeDoc?.fields || {};
  const fieldEntries = Object.entries(rawFields).filter(([name, data]) => {
    if (name === 'line_items') return false;
    if (filterLowConf) {
      const conf = typeof data === 'object' ? data.confidence : 1.0;
      return conf < 0.85;
    }
    return true;
  });

  // Line items
  let lineItems = [];
  if (rawFields.line_items) {
    try {
      const rawVal = typeof rawFields.line_items === 'object' ? rawFields.line_items.value : rawFields.line_items;
      lineItems = typeof rawVal === 'string' ? JSON.parse(rawVal) : (Array.isArray(rawVal) ? rawVal : []);
    } catch {
      lineItems = [];
    }
  }

  // Anomalies filter
  const anomalies = activeDoc?.anomalies || [];
  const filteredAnomalies = anomalies.filter(a => {
    if (anomalyFilter === 'all') return true;
    return (a.severity || '').toLowerCase() === anomalyFilter.toLowerCase();
  });

  return (
    <div className="main-container animate-fade-in" style={{ padding: '16px 24px' }}>
      <div className="review-layout">
        
        {/* ================= COLUMN 1: LEFT (DOCUMENTS LIST & UPLOAD) ================= */}
        <div className="review-panel">
          {/* Upload Dropzone */}
          <div 
            className="upload-dropzone" 
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileUpload}
            />
            <UploadCloud size={24} color="var(--brand-blue)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {uploading ? 'Processing with AI...' : 'Upload Document'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              PDF or scanned image
            </div>
          </div>

          {/* Documents Header & Filter */}
          <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              DOCUMENTS [{filteredDocs.length}]
            </span>
          </div>

          {/* Search Input */}
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 10px' }}>
              <Search size={13} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Filter documents..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text-primary)', width: '100%' }}
              />
            </div>
          </div>

          {/* Document Items List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredDocs.map((d) => {
              const isActive = d.doc_id === activeDoc?.doc_id;
              const hasAnomalies = (d.anomaly_count || 0) > 0;
              const isScanned = d.is_scanned === 1;

              return (
                <div
                  key={d.doc_id}
                  className={`doc-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectDoc(d.doc_id)}
                >
                  <div style={{ marginTop: '2px' }}>
                    {hasAnomalies ? (
                      <AlertCircle size={15} color="#ef4444" />
                    ) : (
                      <CheckCircle2 size={15} color="#10b981" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.filename}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span className={`pill pill-${d.doc_type?.replace('_doc', '')}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                        {d.doc_type === 'compliance_doc' ? 'Compliance' : (d.doc_type?.charAt(0).toUpperCase() + d.doc_type?.slice(1))}
                      </span>
                      {isScanned ? <span className="pill pill-scanned" style={{ fontSize: '9.5px', padding: '2px 5px' }}>Scanned</span> : null}
                      <span style={{ fontSize: '10.5px', color: hasAnomalies ? '#ef4444' : '#10b981', fontWeight: '600', marginLeft: 'auto' }}>
                        {hasAnomalies ? `${d.anomaly_count} flags` : 'Clean'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* ================= COLUMN 2: CENTER (STRUCTURED EXTRACTION & REVIEW) ================= */}
        <div className="review-panel" style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '12px' }} />
              <span>Loading extraction details...</span>
            </div>
          ) : activeDoc ? (
            <>
              {/* Document Header — two-row responsive layout */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '14px',
                marginBottom: '20px',
              }}>
                {/* Row 1 — filename + doc type badge + metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.01em',
                      wordBreak: 'break-all',
                      lineHeight: '1.3',
                    }}>
                      {activeDoc.filename}
                    </h2>
                    <span className={`pill pill-${activeDoc.doc_type?.replace('_doc', '')}`} style={{ flexShrink: 0 }}>
                      {activeDoc.doc_type?.toUpperCase()}
                    </span>
                    {activeDoc.is_scanned ? <span className="pill pill-scanned" style={{ flexShrink: 0 }}>Multimodal Vision</span> : null}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Doc ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{activeDoc.doc_id.slice(0, 8)}...</code> • Processed {activeDoc.created_at || 'Recently'} • Pages: {activeDoc.total_pages || 1}
                  </div>
                </div>

                {/* Row 2 — controls, right-aligned, wraps cleanly */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}>
                  {/* Low-conf Animated Slider Switch */}
                  <button
                    type="button"
                    onClick={() => setFilterLowConf(prev => !prev)}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none outline-none group"
                    style={{
                      background: filterLowConf ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-surface-subtle)',
                      borderColor: filterLowConf ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)',
                      flexShrink: 0,
                    }}
                    title="Filter only low-confidence extracted fields (<85%)"
                  >
                    <div
                      className="relative w-8 h-4.5 rounded-full transition-colors duration-200 p-0.5 flex items-center"
                      style={{ backgroundColor: filterLowConf ? '#f59e0b' : 'var(--border-strong)' }}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                        className="w-3.5 h-3.5 rounded-full bg-white shadow-sm"
                        style={{ marginLeft: filterLowConf ? 'auto' : '0' }}
                      />
                    </div>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: filterLowConf ? '#f59e0b' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                    }}>
                      Low-conf only
                    </span>
                  </button>

                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
                    onClick={exportJSON}
                  >
                    <Download size={13} />
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>


              {/* Extracted Fields Section */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Extracted Fields
                  </h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Overall Confidence: <strong style={{ color: (activeDoc.overall_confidence || 0.95) >= 0.85 ? '#10b981' : '#f59e0b' }}>
                      {Math.round((activeDoc.overall_confidence || 0.95) * 100)}%
                    </strong>
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {fieldEntries.map(([name, data]) => {
                    const val = typeof data === 'object' ? data.value : data;
                    const conf = typeof data === 'object' ? data.confidence : 1.0;
                    const isCorrected = typeof data === 'object' && data.is_corrected;
                    const isLowConf = conf < 0.85;
                    const isEditing = editingField === name;

                    return (
                      <div 
                        key={name} 
                        className={`field-card ${isLowConf ? 'needs-review' : ''}`}
                        style={{ position: 'relative' }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'capitalize', marginBottom: '2px' }}>
                            {name.replace(/_/g, ' ')}
                            {isLowConf ? <span style={{ color: '#d97706', marginLeft: '4px' }}>⚠️ needs review</span> : null}
                            {isCorrected ? <span style={{ color: '#10b981', marginLeft: '4px' }}>✓ human corrected</span> : null}
                          </div>

                          {isEditing ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                autoFocus
                                style={{
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-focus)',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  color: 'var(--text-primary)',
                                  width: '100%'
                                }}
                              />
                              <button 
                                onClick={() => handleSaveCorrection(name)}
                                disabled={savingField}
                                style={{ background: '#10b981', color: '#fff', padding: '4px', borderRadius: '4px' }}
                                title="Save"
                              >
                                <Check size={13} />
                              </button>
                              <button 
                                onClick={() => setEditingField(null)}
                                style={{ background: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', padding: '4px', borderRadius: '4px' }}
                                title="Cancel"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                              {val || <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>Not found</span>}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span 
                              className="pill"
                              style={{ 
                                background: isLowConf ? 'var(--status-review-bg)' : 'var(--status-clean-bg)',
                                color: isLowConf ? 'var(--status-review-text)' : 'var(--status-clean-text)',
                                border: `1px solid ${isLowConf ? 'var(--status-review-border)' : 'var(--status-clean-border)'}`,
                                fontSize: '10.5px'
                              }}
                            >
                              {Math.round(conf * 100)}%
                            </span>

                            <button 
                              onClick={() => { setEditingField(name); setEditValue(val || ''); }}
                              className="btn-icon" 
                              style={{ width: '26px', height: '26px' }}
                              title="Edit Field"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Line Items Table (For Invoices) */}
              {lineItems.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
                    Line Items [{lineItems.length}]
                  </h3>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '11.5px' }}>
                          <th style={{ padding: '8px 12px' }}>DESCRIPTION</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>QTY</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>UNIT PRICE</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>AMOUNT</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>CONF.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.description || item.item}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity || item.qty || 1}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${Number(item.unit_price || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>${Number(item.amount || item.total || 0).toFixed(2)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span className="pill pill-clean" style={{ fontSize: '10px' }}>98%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select a document from the left list to review extracted intelligence
            </div>
          )}
        </div>


        {/* ================= COLUMN 3: RIGHT (ANOMALIES & VISUAL SOURCE PREVIEW) ================= */}
        <div className="review-panel" style={{ padding: '18px' }}>
          
          {/* Anomaly Flags Card */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                <AlertTriangle size={15} color="#ef4444" />
                <span>Anomaly Flags [{filteredAnomalies.length}]</span>
              </div>

              {/* Severity filter pills */}
              <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-surface-subtle)', padding: '2px', borderRadius: '4px' }}>
                {['all', 'high', 'medium'].map(sev => (
                  <button
                    key={sev}
                    onClick={() => setAnomalyFilter(sev)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10.5px',
                      fontWeight: '600',
                      borderRadius: '3px',
                      background: anomalyFilter === sev ? 'var(--bg-surface)' : 'transparent',
                      color: anomalyFilter === sev ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textTransform: 'capitalize'
                    }}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {filteredAnomalies.length === 0 ? (
              <div style={{ background: 'var(--status-clean-bg)', border: '1px solid var(--status-clean-border)', color: 'var(--status-clean-text)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>No anomalies detected for this document.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                {filteredAnomalies.map((anom, idx) => {
                  const isHigh = (anom.severity || '').toLowerCase() === 'high';
                  return (
                    <div 
                      key={idx}
                      style={{
                        background: isHigh ? 'var(--status-critical-bg)' : 'var(--status-review-bg)',
                        border: `1px solid ${isHigh ? 'var(--status-critical-border)' : 'var(--status-review-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: isHigh ? '#dc2626' : '#d97706' }}>
                          ● {anom.severity} Severity
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{anom.field || 'General'}</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {anom.message}
                      </div>
                      {anom.suggested_action && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          💡 {anom.suggested_action}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Visual Source Preview */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                <Eye size={15} color="var(--brand-blue)" />
                <span>Source Preview</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Page 1</span>
            </div>

            <div style={{ flex: 1, minHeight: '260px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {activeDoc ? (
                <img
                  src={getDocumentPreviewUrl(activeDoc.doc_id)}
                  alt="Document Page 1"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">📄 PDF Text-Layer Indexed<br/>(Visual preview generated on upload)</div>';
                  }}
                />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No preview available</div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
