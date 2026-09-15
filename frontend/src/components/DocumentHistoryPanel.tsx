import React, { useState } from 'react';
import { 
  History, GitCommit, GitBranch, Clock, User, ArrowRight, 
  RotateCcw, CheckCircle2, AlertTriangle, FileText, Download, 
  ShieldCheck, Plus, Search, Filter, Layers, Eye, Tag, Hash,
  ChevronDown, ChevronUp, Check, X
} from 'lucide-react';
import { DocumentItem, DocumentVersion, AuditLogEntry, ExtractedField } from '../types';
import { getDocumentVersions, createNewVersion, generateFieldsChecksum } from '../utils/versionManager';
import { useToast } from './ToastProvider';

interface DocumentHistoryPanelProps {
  document: DocumentItem;
  onUpdateDocument: (updatedDoc: DocumentItem) => void;
  onClose?: () => void;
}

export function DocumentHistoryPanel({
  document: doc,
  onUpdateDocument,
  onClose
}: DocumentHistoryPanelProps) {
  const { showToast } = useToast();
  
  // Sub-tab inside History Panel: 'timeline' (chronological edits), 'versions' (snapshots), 'compare' (diff)
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'versions' | 'compare'>('timeline');
  
  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Selected version for viewing or comparing
  const versions = getDocumentVersions(doc);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(versions[versions.length - 1]?.id || '');
  const [compareVersionId, setCompareVersionId] = useState<string>(versions[0]?.id || '');

  // Checkpoint Modal / Inline form
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [checkpointNotes, setCheckpointNotes] = useState('');
  const [checkpointAuthor, setCheckpointAuthor] = useState('Aman Hossain');

  // Filtered chronological edits (audit trail)
  const allEdits: AuditLogEntry[] = doc.auditTrail || [];

  const filteredEdits = allEdits.filter(edit => {
    const matchesSearch = 
      edit.fieldLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edit.fieldKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edit.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edit.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edit.newValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edit.previousValue.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'ALL') return true;
    if (filterType === 'FIELD_EDIT') return edit.actionType === 'FIELD_EDIT' || (!edit.actionType && edit.fieldKey !== 'SYSTEM_INGEST' && edit.fieldKey !== 'ERP_EXPORT');
    if (filterType === 'STATUS') return edit.fieldKey === 'ERP_EXPORT' || edit.actionType === 'STATUS_CHANGE';
    if (filterType === 'RECALC') return edit.triggeredRecalc === true;
    if (filterType === 'CHECKPOINT') return edit.actionType === 'CHECKPOINT' || edit.actionType === 'VERSION_RESTORED';

    return true;
  });

  // Handle Restore Version
  const handleRestoreVersion = (version: DocumentVersion) => {
    if (!window.confirm(`Are you sure you want to restore "${version.versionNumber} — ${version.label}"? Current document fields will be reverted to this historical state.`)) {
      return;
    }

    const cloned: DocumentItem = JSON.parse(JSON.stringify(doc));
    cloned.fields = JSON.parse(JSON.stringify(version.fieldsSnapshot));
    cloned.status = version.status;

    // Create a new version for the restoration
    const restoredVer = createNewVersion(
      cloned,
      `Rollback to ${version.versionNumber}`,
      `Restored state from version ${version.versionNumber} (${version.label})`,
      'Aman Hossain',
      true
    );

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const auditEntry: AuditLogEntry = {
      id: `AUD-RESTORE-${Date.now()}`,
      timestamp: now,
      fieldKey: 'VERSION_ROLLBACK',
      fieldLabel: 'Document Version Rollback',
      previousValue: versions[versions.length - 1]?.versionNumber || 'CURRENT',
      newValue: `Restored to ${version.versionNumber} (${restoredVer.versionNumber})`,
      author: 'Aman Hossain (Controller)',
      reason: `Rolled back to snapshot ${version.versionNumber}: ${version.label}. Restored all ${Object.keys(version.fieldsSnapshot).length} key-value fields.`,
      triggeredRecalc: true,
      actionType: 'VERSION_RESTORED',
      versionNumber: restoredVer.versionNumber
    };

    cloned.auditTrail.unshift(auditEntry);
    cloned.versions = [...versions, restoredVer];

    onUpdateDocument(cloned);
    showToast(
      'success',
      `Restored to ${version.versionNumber}`,
      `Document state rolled back. Created new audit checkpoint ${restoredVer.versionNumber}.`
    );
  };

  // Handle Creating a Manual Milestone Checkpoint
  const handleSaveCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointLabel.trim()) return;

    const cloned: DocumentItem = JSON.parse(JSON.stringify(doc));
    const newVer = createNewVersion(
      cloned,
      checkpointLabel.trim(),
      checkpointNotes.trim() || 'Manual audit milestone checkpoint saved by controller.',
      checkpointAuthor.trim() || 'Aman Hossain',
      true
    );

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const auditEntry: AuditLogEntry = {
      id: `AUD-CHECKPOINT-${Date.now()}`,
      timestamp: now,
      fieldKey: 'MILESTONE_CHECKPOINT',
      fieldLabel: 'Manual Milestone Checkpoint',
      previousValue: versions[versions.length - 1]?.versionNumber || 'v1.0',
      newValue: newVer.versionNumber,
      author: `${checkpointAuthor.trim() || 'Aman Hossain'} (Controller)`,
      reason: checkpointNotes.trim() || `Saved milestone: ${checkpointLabel.trim()}`,
      triggeredRecalc: false,
      actionType: 'CHECKPOINT',
      versionNumber: newVer.versionNumber
    };

    cloned.auditTrail.unshift(auditEntry);
    cloned.versions = [...versions, newVer];

    onUpdateDocument(cloned);
    setIsCreatingCheckpoint(false);
    setCheckpointLabel('');
    setCheckpointNotes('');

    showToast(
      'success',
      `Milestone Created: ${newVer.versionNumber}`,
      `Checkpoint "${newVer.label}" permanently logged in version ledger.`
    );
  };

  // Export Audit Certificate as JSON
  const handleExportJSON = () => {
    const exportData = {
      documentId: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      docType: doc.docType,
      currentStatus: doc.status,
      latestVersion: versions[versions.length - 1]?.versionNumber || 'v1.0',
      checksum: generateFieldsChecksum(doc.fields),
      exportedAt: new Date().toISOString(),
      auditTrail: doc.auditTrail,
      versionHistory: versions.map(v => ({
        version: v.versionNumber,
        label: v.label,
        timestamp: v.timestamp,
        author: v.author,
        summary: v.changeSummary,
        checksum: v.checksum,
        fieldsCount: Object.keys(v.fieldsSnapshot || {}).length
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.id}_AuditCertificate_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('info', 'Audit Certificate Exported', `Downloaded compliance JSON manifest for ${doc.id}`);
  };

  // Export Audit Trail as CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Author', 'Action Type', 'Field Label', 'Field Key', 'Previous Value', 'New Value', 'Reason', 'Recalculated'];
    const rows = doc.auditTrail.map(entry => [
      `"${entry.timestamp}"`,
      `"${entry.author}"`,
      `"${entry.actionType || 'FIELD_EDIT'}"`,
      `"${entry.fieldLabel}"`,
      `"${entry.fieldKey}"`,
      `"${entry.previousValue.replace(/"/g, '""')}"`,
      `"${entry.newValue.replace(/"/g, '""')}"`,
      `"${entry.reason.replace(/"/g, '""')}"`,
      entry.triggeredRecalc ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.id}_AuditLedger_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('info', 'Audit Ledger Exported', `Downloaded CSV ledger for ${doc.id}`);
  };

  // Compute field differences for compare view
  const targetVersion = versions.find(v => v.id === compareVersionId) || versions[0];
  const compareDifferences = React.useMemo(() => {
    if (!targetVersion) return [];
    
    const diffList: Array<{
      key: string;
      label: string;
      targetVal: string;
      currentVal: string;
      isDifferent: boolean;
    }> = [];

    const allKeys = Array.from(new Set([
      ...Object.keys(doc.fields || {}),
      ...Object.keys(targetVersion.fieldsSnapshot || {})
    ]));

    for (const key of allKeys) {
      const currentField = doc.fields[key];
      const targetField = targetVersion.fieldsSnapshot[key];
      const label = currentField?.label || targetField?.label || key;
      const currentVal = currentField?.value || '(none)';
      const targetVal = targetField?.value || '(none)';
      const isDifferent = currentVal !== targetVal;

      diffList.push({
        key,
        label,
        targetVal,
        currentVal,
        isDifferent
      });
    }

    return diffList;
  }, [doc.fields, targetVersion]);

  return (
    <div id="document-history-panel" className="space-y-4">
      {/* Panel Top Summary Bar */}
      <div className="p-3 rounded-xl border border-[#2A2C31] bg-[#16171B] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-[#C5B358] px-2 py-0.5 rounded bg-[#0B0C0E] border border-[#2A2C31]">
              {versions[versions.length - 1]?.versionNumber || 'v1.0'}
            </span>
            <span className="text-xs font-semibold text-[#E5E5E5]">
              Document Version Ledger
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0B0C0E] border border-[#2A2C31] text-[#8E9097]">
              {allEdits.length} Events • {versions.length} Releases
            </span>
          </div>
          <p className="text-[11px] text-[#8E9097] flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-3 h-3 text-[#C5B358]" />
            SOC2 / HIPAA Tamper-Evident SHA-256 Audit Trail
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-create-checkpoint"
            onClick={() => setIsCreatingCheckpoint(prev => !prev)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0B0C0E] hover:bg-[#1A1B20] border border-[#2A2C31] text-[10px] font-mono text-[#E5E5E5] transition-colors cursor-pointer"
            title="Create a manual milestone snapshot"
          >
            <Plus className="w-3 h-3 text-[#C5B358]" />
            Checkpoint
          </button>
          <button
            id="btn-export-audit-json"
            onClick={handleExportJSON}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#0B0C0E] hover:bg-[#1A1B20] border border-[#2A2C31] text-[10px] font-mono text-[#8E9097] hover:text-[#E5E5E5] transition-colors cursor-pointer"
            title="Export JSON Certificate"
          >
            <Download className="w-3 h-3 text-[#C5B358]" />
            JSON
          </button>
          <button
            id="btn-export-audit-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#0B0C0E] hover:bg-[#1A1B20] border border-[#2A2C31] text-[10px] font-mono text-[#8E9097] hover:text-[#E5E5E5] transition-colors cursor-pointer"
            title="Export CSV Ledger"
          >
            <Download className="w-3 h-3 text-[#8E9097]" />
            CSV
          </button>
        </div>
      </div>

      {/* Checkpoint Creation Form */}
      {isCreatingCheckpoint && (
        <form 
          onSubmit={handleSaveCheckpoint}
          className="p-3.5 rounded-xl border border-[#C5B358]/40 bg-[#0B0C0E] space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif italic text-[#E5E5E5] flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-[#C5B358]" />
              Create Document Checkpoint / Milestone
            </h4>
            <button
              type="button"
              onClick={() => setIsCreatingCheckpoint(false)}
              className="text-[#8E9097] hover:text-[#E5E5E5] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[10px] font-mono uppercase text-[#8E9097] block mb-1">
                Checkpoint Name / Milestone Tag *
              </label>
              <input
                id="checkpoint-label-input"
                type="text"
                placeholder="e.g. Pre-Audit Financial Sign-off"
                value={checkpointLabel}
                onChange={e => setCheckpointLabel(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#16171B] border border-[#2A2C31] rounded text-[#E5E5E5] focus:outline-none focus:border-[#C5B358]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-[#8E9097] block mb-1">
                Audit Notes &amp; Justification
              </label>
              <textarea
                id="checkpoint-notes-input"
                rows={2}
                placeholder="Describe reason for this checkpoint snapshot..."
                value={checkpointNotes}
                onChange={e => setCheckpointNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#16171B] border border-[#2A2C31] rounded text-[#E5E5E5] focus:outline-none focus:border-[#C5B358] resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingCheckpoint(false)}
              className="px-2.5 py-1 rounded text-xs font-mono text-[#8E9097] hover:text-[#E5E5E5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-checkpoint-button"
              type="submit"
              className="px-3 py-1 rounded bg-[#C5B358] text-[#0B0C0E] text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer hover:bg-[#D8C76D]"
            >
              Commit Checkpoint
            </button>
          </div>
        </form>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex border-b border-[#2A2C31] pb-1 gap-2 text-xs font-mono">
        <button
          id="subtab-chronological-edits"
          onClick={() => setActiveSubTab('timeline')}
          className={`pb-2 px-2.5 uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'timeline'
              ? 'border-[#C5B358] text-[#C5B358] font-bold'
              : 'border-transparent text-[#8E9097] hover:text-[#E5E5E5]'
          }`}
        >
          <Clock className="w-3 h-3" />
          Timeline of Edits ({allEdits.length})
        </button>

        <button
          id="subtab-version-snapshots"
          onClick={() => setActiveSubTab('versions')}
          className={`pb-2 px-2.5 uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'versions'
              ? 'border-[#C5B358] text-[#C5B358] font-bold'
              : 'border-transparent text-[#8E9097] hover:text-[#E5E5E5]'
          }`}
        >
          <GitBranch className="w-3 h-3" />
          Releases ({versions.length})
        </button>

        <button
          id="subtab-compare-diff"
          onClick={() => setActiveSubTab('compare')}
          className={`pb-2 px-2.5 uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'compare'
              ? 'border-[#C5B358] text-[#C5B358] font-bold'
              : 'border-transparent text-[#8E9097] hover:text-[#E5E5E5]'
          }`}
        >
          <Layers className="w-3 h-3" />
          Diff / Compare
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: Chronological List of Edits & Audit Events */}
      {/* ========================================================================= */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-3">
          {/* Search & Filter bar for edits */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8E9097]" />
              <input
                id="search-edits-input"
                type="text"
                placeholder="Search audit trail by field, user, or reason..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#0B0C0E] border border-[#2A2C31] rounded-lg text-xs text-[#E5E5E5] placeholder-[#8E9097] focus:outline-none focus:border-[#C5B358]"
              />
            </div>

            <select
              id="filter-edits-select"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-[#0B0C0E] border border-[#2A2C31] rounded-lg px-2 py-1.5 text-xs text-[#8E9097] focus:outline-none focus:border-[#C5B358] font-mono cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="FIELD_EDIT">Field Calibrations</option>
              <option value="RECALC">Invariant Recalcs</option>
              <option value="STATUS">Status &amp; ERP</option>
              <option value="CHECKPOINT">Checkpoints</option>
            </select>
          </div>

          {/* Chronological List of Edits */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredEdits.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#2A2C31] rounded-xl text-[#8E9097] text-xs">
                No edit entries match your search criteria.
              </div>
            ) : (
              filteredEdits.map((entry, idx) => {
                const isFirst = idx === 0;
                const isInvariant = entry.triggeredRecalc;
                const isStatusChange = entry.actionType === 'STATUS_CHANGE' || entry.fieldKey === 'ERP_EXPORT';
                const isCheckpoint = entry.actionType === 'CHECKPOINT' || entry.actionType === 'VERSION_RESTORED';

                return (
                  <div
                    key={entry.id || idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isFirst
                        ? 'border-[#C5B358]/40 bg-[#16171B]'
                        : 'border-[#2A2C31] bg-[#141518] hover:border-[#3D4048]'
                    }`}
                  >
                    {/* Header line: Time, Author, Type */}
                    <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#0B0C0E] border border-[#2A2C31] flex items-center justify-center text-[9px] font-bold text-[#C5B358]">
                          {entry.author.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-semibold text-[#E5E5E5]">{entry.author}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E9097]">
                        <Clock className="w-3 h-3" />
                        <span>{entry.timestamp}</span>
                      </div>
                    </div>

                    {/* Action & Field Tag */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#0B0C0E] text-[#E5E5E5] border border-[#2A2C31]">
                          {entry.fieldLabel}
                        </span>

                        {isInvariant && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#C5B358]/10 text-[#C5B358] border border-[#C5B358]/30 font-semibold">
                            Recalculated
                          </span>
                        )}

                        {isStatusChange && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/30 font-semibold">
                            ERP Posted
                          </span>
                        )}

                        {isCheckpoint && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#7E57C2]/20 text-[#B39DDB] border border-[#7E57C2]/30 font-semibold">
                            Checkpoint
                          </span>
                        )}
                      </div>

                      {entry.versionNumber && (
                        <span className="text-[10px] font-mono text-[#C5B358]">
                          {entry.versionNumber}
                        </span>
                      )}
                    </div>

                    {/* Value Diff (Previous -> New) */}
                    {entry.previousValue !== entry.newValue && (
                      <div className="p-2 rounded bg-[#0B0C0E] border border-[#2A2C31] font-mono text-[11px] mb-2 flex items-center gap-2 overflow-x-auto">
                        <span className="text-[#D9534F] line-through decoration-[#D9534F] opacity-90 truncate max-w-[45%]">
                          {entry.previousValue || '(empty)'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#8E9097] shrink-0" />
                        <span className="text-[#C5B358] font-semibold truncate max-w-[45%]">
                          {entry.newValue}
                        </span>
                      </div>
                    )}

                    {/* Audit Reason / Log */}
                    <p className="text-xs text-[#8E9097] leading-relaxed">
                      {entry.reason}
                    </p>

                    {/* Cryptographic Proof Footer */}
                    <div className="pt-2 mt-2 border-t border-[#2A2C31]/50 flex items-center justify-between text-[9px] font-mono text-[#8E9097]">
                      <span className="flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5 text-[#C5B358]" />
                        ID: {entry.id}
                      </span>
                      <span className="text-[#8E9097]">Immutable Log</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: Document Version Releases & Snapshots */}
      {/* ========================================================================= */}
      {activeSubTab === 'versions' && (
        <div className="space-y-3">
          <div className="text-[11px] text-[#8E9097] flex items-center justify-between font-mono">
            <span>Historical Version Tree</span>
            <span>{versions.length} Snapshots Archived</span>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {versions.slice().reverse().map((ver, idx) => {
              const isCurrent = idx === 0;
              const fieldCount = Object.keys(ver.fieldsSnapshot || {}).length;

              return (
                <div
                  key={ver.id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                    isCurrent
                      ? 'border-[#C5B358] bg-[#16171B] ring-1 ring-[#C5B358]/20'
                      : 'border-[#2A2C31] bg-[#141518] hover:border-[#3D4048]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isCurrent 
                          ? 'bg-[#C5B358] text-[#0B0C0E]' 
                          : 'bg-[#0B0C0E] border border-[#2A2C31] text-[#E5E5E5]'
                      }`}>
                        {ver.versionNumber}
                      </span>
                      <span className="text-xs font-semibold text-[#E5E5E5]">
                        {ver.label}
                      </span>
                    </div>

                    {isCurrent ? (
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#C5B358]/20 text-[#C5B358] border border-[#C5B358]/40 font-bold">
                        ACTIVE HEAD
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#8E9097]">
                        Archived
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#8E9097] leading-relaxed">
                    {ver.changeSummary}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#0B0C0E] p-2 rounded border border-[#2A2C31] text-[#8E9097]">
                    <div>
                      <span className="text-[#8E9097] block text-[9px] uppercase">Author</span>
                      <span className="text-[#E5E5E5] font-semibold">{ver.author}</span>
                    </div>
                    <div>
                      <span className="text-[#8E9097] block text-[9px] uppercase">Committed</span>
                      <span className="text-[#E5E5E5]">{ver.timestamp}</span>
                    </div>
                    <div>
                      <span className="text-[#8E9097] block text-[9px] uppercase">Fields Stored</span>
                      <span className="text-[#C5B358]">{fieldCount} keys</span>
                    </div>
                    <div>
                      <span className="text-[#8E9097] block text-[9px] uppercase">Checksum</span>
                      <span className="text-[#8E9097] truncate block">{ver.checksum.slice(0, 16)}...</span>
                    </div>
                  </div>

                  {/* Actions on this version */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#2A2C31]/40">
                    <button
                      id={`compare-with-ver-${ver.versionNumber}`}
                      onClick={() => {
                        setCompareVersionId(ver.id);
                        setActiveSubTab('compare');
                      }}
                      className="text-[10px] font-mono uppercase tracking-wider text-[#C5B358] hover:text-[#D8C76D] flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Layers className="w-3 h-3" />
                      Compare with Current
                    </button>

                    {!isCurrent && (
                      <button
                        id={`restore-ver-${ver.versionNumber}`}
                        onClick={() => handleRestoreVersion(ver)}
                        className="text-[10px] font-mono uppercase tracking-wider text-[#8E9097] hover:text-[#D9534F] flex items-center gap-1 cursor-pointer transition-colors"
                        title="Revert document fields to this snapshot state"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore Version
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: Side-by-Side Version Diff & Field Comparison */}
      {/* ========================================================================= */}
      {activeSubTab === 'compare' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl border border-[#2A2C31] bg-[#0B0C0E] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#8E9097]">Compare:</span>
              <select
                id="select-compare-version"
                value={compareVersionId}
                onChange={e => setCompareVersionId(e.target.value)}
                className="bg-[#16171B] border border-[#2A2C31] rounded px-2 py-1 text-xs text-[#C5B358] font-mono focus:outline-none focus:border-[#C5B358] cursor-pointer"
              >
                {versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.versionNumber} ({v.label})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] font-mono text-[#8E9097] flex items-center gap-1.5">
              <span>vs.</span>
              <span className="text-[#C5B358] font-bold">Current Active Head</span>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {compareDifferences.map(item => (
              <div
                key={item.key}
                className={`p-3 rounded-xl border font-mono text-xs ${
                  item.isDifferent
                    ? 'border-[#C5B358]/50 bg-[#16171B]'
                    : 'border-[#2A2C31] bg-[#141518]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 text-[11px]">
                  <span className="font-sans font-semibold text-[#E5E5E5]">{item.label}</span>
                  {item.isDifferent ? (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#C5B358]/20 text-[#C5B358] border border-[#C5B358]/40 font-bold">
                      Modified
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#2A2C31] text-[#8E9097]">
                      Unchanged
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-[#0B0C0E] border border-[#2A2C31]">
                    <span className="text-[9px] text-[#8E9097] uppercase tracking-wider block mb-0.5">
                      {targetVersion.versionNumber} Snapshot:
                    </span>
                    <span className={item.isDifferent ? 'text-[#D9534F]' : 'text-[#8E9097]'}>
                      {item.targetVal}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[#0B0C0E] border border-[#2A2C31]">
                    <span className="text-[9px] text-[#8E9097] uppercase tracking-wider block mb-0.5">
                      Current State:
                    </span>
                    <span className={item.isDifferent ? 'text-[#C5B358] font-bold' : 'text-[#E5E5E5]'}>
                      {item.currentVal}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {targetVersion && targetVersion.versionNumber !== versions[versions.length - 1]?.versionNumber && (
            <div className="p-3 rounded-xl border border-[#2A2C31] bg-[#141518] flex items-center justify-between">
              <span className="text-xs text-[#8E9097]">
                Restore document to {targetVersion.versionNumber} state?
              </span>
              <button
                onClick={() => handleRestoreVersion(targetVersion)}
                className="px-3 py-1.5 rounded-lg bg-[#C5B358] hover:bg-[#D8C76D] text-[#0B0C0E] font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Revert to {targetVersion.versionNumber}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
