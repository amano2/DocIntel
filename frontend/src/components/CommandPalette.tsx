import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, FileText, Upload, Download, Bot, Award, 
  AlertTriangle, ShieldCheck, ArrowRight, X, Command
} from 'lucide-react';
import { DocumentItem } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onSelectDoc: (id: string) => void;
  onOpenUpload: () => void;
  onTriggerBatchExport: () => void;
  onNavigateTab: (tab: 'dashboard' | 'review' | 'rag' | 'benchmark') => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  documents,
  onSelectDoc,
  onOpenUpload,
  onTriggerBatchExport,
  onNavigateTab
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter actions and documents
  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(query.toLowerCase()) ||
    d.id.toLowerCase().includes(query.toLowerCase()) ||
    d.vendorOrParties.toLowerCase().includes(query.toLowerCase())
  );

  const actions = [
    {
      id: 'act-upload',
      title: 'Multimodal Ingestion Pipeline',
      subtitle: 'Upload PDF / TIFF with async micro-stage telemetry',
      icon: Upload,
      action: () => { onOpenUpload(); onClose(); }
    },
    {
      id: 'act-export',
      title: 'Export All Documents & Compliance Audit (.ZIP)',
      subtitle: 'Download individual JSON manifests + master CSV ledger',
      icon: Download,
      action: () => { onTriggerBatchExport(); onClose(); }
    },
    {
      id: 'act-rag',
      title: 'Grounded RAG & Comparison Studio',
      subtitle: 'Perform cross-document queries with exact source citations',
      icon: Bot,
      action: () => { onNavigateTab('rag'); onClose(); }
    },
    {
      id: 'act-benchmark',
      title: 'Empirical Accuracy & Benchmark Telemetry',
      subtitle: 'View precision, recall, F1 score and latency metrics',
      icon: Award,
      action: () => { onNavigateTab('benchmark'); onClose(); }
    },
    {
      id: 'act-anom',
      title: 'Review High-Severity Math Anomalies',
      subtitle: 'Jump to review queue filtered by arithmetic invariant errors',
      icon: AlertTriangle,
      action: () => { onNavigateTab('review'); onClose(); }
    }
  ].filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const totalItems = actions.length + filteredDocs.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < actions.length) {
        actions[selectedIndex].action();
      } else {
        const doc = filteredDocs[selectedIndex - actions.length];
        if (doc) {
          onSelectDoc(doc.id);
          onNavigateTab('review');
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-[#0B0C0E]/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="command-palette-modal"
        className="w-full max-w-xl bg-[#141518] border border-[#2A2C31] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[520px]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#2A2C31] bg-[#141518] gap-3">
          <Search className="w-4 h-4 text-[#8E9097] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands or instruments (e.g. 'invoice', 'export', 'tax')..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none text-xs text-[#E5E5E5] placeholder-[#8E9097] focus:outline-none font-sans"
          />
          <kbd className="px-2 py-0.5 rounded bg-[#16171B] border border-[#2A2C31] text-[9px] font-mono text-[#8E9097]">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          {actions.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#8E9097] px-2 pb-1.5 font-semibold">
                System Commands
              </div>
              <div className="space-y-1">
                {actions.map((act, i) => {
                  const isSelected = selectedIndex === i;
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={act.action}
                      className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#C5B358] text-[#0B0C0E]' : 'hover:bg-[#16171B] text-[#E5E5E5]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md border ${isSelected ? 'border-black/20 bg-black/10 text-[#0B0C0E]' : 'border-[#2A2C31] bg-[#16171B] text-[#C5B358]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{act.title}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-[#0B0C0E]/80' : 'text-[#8E9097]'}`}>
                          {act.subtitle}
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0B0C0E]' : 'text-[#8E9097]'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documents */}
          {filteredDocs.length > 0 && (
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-[#8E9097] px-2 pb-1.5 font-semibold">
                Matching Documents ({filteredDocs.length})
              </div>
              <div className="space-y-1">
                {filteredDocs.map((doc, docIdx) => {
                  const itemIndex = actions.length + docIdx;
                  const isSelected = selectedIndex === itemIndex;

                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        onSelectDoc(doc.id);
                        onNavigateTab('review');
                        onClose();
                      }}
                      className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#C5B358] text-[#0B0C0E]' : 'hover:bg-[#16171B] text-[#E5E5E5]'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md border ${isSelected ? 'border-black/20 bg-black/10 text-[#0B0C0E]' : 'border-[#2A2C31] bg-[#16171B] text-[#8E9097]'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold truncate">{doc.title}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            isSelected ? 'border-black/20 bg-black/10 text-[#0B0C0E]' : 'border-[#2A2C31] bg-[#16171B] text-[#8E9097]'
                          }`}>
                            {doc.id}
                          </span>
                        </div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-[#0B0C0E]/80' : 'text-[#8E9097]'}`}>
                          {doc.vendorOrParties} • {doc.docType}
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono ${isSelected ? 'text-[#0B0C0E] font-bold' : 'text-[#C5B358]'}`}>
                        {doc.overallConfidence}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <div className="p-8 text-center text-xs text-[#8E9097]">
              No matching commands or documents found for "{query}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-[#2A2C31] bg-[#0B0C0E] flex items-center justify-between text-[10px] text-[#8E9097] font-mono">
          <div className="flex items-center gap-2">
            <span><kbd className="px-1.5 py-0.5 rounded border border-[#2A2C31] bg-[#16171B] text-[#8E9097]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded border border-[#2A2C31] bg-[#16171B] text-[#8E9097]">↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded border border-[#2A2C31] bg-[#16171B] text-[#8E9097]">ENTER</kbd> execute</span>
          </div>
          <span>DocIntel Fast Nav</span>
        </div>
      </div>
    </div>
  );
}
