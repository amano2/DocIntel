import React, { useState, useEffect } from 'react';
import { 
  X, Keyboard, Search, Sparkles, ArrowRight, CornerDownLeft, 
  Eye, ZoomIn, ZoomOut, Upload, Download, Compass, Terminal
} from 'lucide-react';
import { NavigationTab } from '../types';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenUpload: () => void;
  onOpenCommandPalette: () => void;
  onTriggerBatchExport: () => void;
  onToggleTheme?: () => void;
}

interface ShortcutItem {
  id: string;
  category: 'global' | 'navigation' | 'review' | 'actions';
  keys: string[];
  description: string;
  detail?: string;
  action?: () => void;
  actionLabel?: string;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenUpload,
  onOpenCommandPalette,
  onTriggerBatchExport,
  onToggleTheme,
}: KeyboardShortcutsModalProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'global' | 'navigation' | 'review' | 'actions'>('all');

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    // Global
    {
      id: 'palette',
      category: 'global',
      keys: ['⌘', 'K'],
      description: 'Open Command Palette & Global Search',
      detail: 'Quickly find any document, vendor, tax record, or execute system tasks',
      action: () => {
        onClose();
        onOpenCommandPalette();
      },
      actionLabel: 'Launch Palette'
    },
    {
      id: 'help',
      category: 'global',
      keys: ['?'],
      description: 'Toggle Keyboard Shortcuts Guide',
      detail: 'Opens this power-user hotkey reference anywhere in the application'
    },
    {
      id: 'theme',
      category: 'global',
      keys: ['T'],
      description: 'Toggle Dark / Light Editorial Theme',
      detail: 'Switches between the deep dark canvas and high-contrast light editorial theme',
      action: onToggleTheme ? () => {
        onToggleTheme();
      } : undefined,
      actionLabel: 'Switch Theme'
    },
    {
      id: 'esc',
      category: 'global',
      keys: ['ESC'],
      description: 'Dismiss Active Modal or Search Drawer',
      detail: 'Closes dialogs, clears input highlights, or cancels field edit in-place'
    },

    // Navigation
    {
      id: 'tab-1',
      category: 'navigation',
      keys: ['1'],
      description: 'Switch to Executive Dashboard',
      detail: 'Ingestion rates, invariant pass rates, anomaly distribution, and SLA graphs',
      action: () => {
        onClose();
        onNavigateTab('dashboard');
      },
      actionLabel: 'View Dashboard'
    },
    {
      id: 'tab-2',
      category: 'navigation',
      keys: ['2'],
      description: 'Switch to Review & Calibration Console',
      detail: 'Human-in-the-loop validation, OCR split-pane, and invariant auditing',
      action: () => {
        onClose();
        onNavigateTab('review');
      },
      actionLabel: 'View Console'
    },
    {
      id: 'tab-3',
      category: 'navigation',
      keys: ['3'],
      description: 'Switch to Grounded RAG Studio',
      detail: 'Natural language semantic Q&A with dual-index FAISS verification',
      action: () => {
        onClose();
        onNavigateTab('rag');
      },
      actionLabel: 'View RAG Studio'
    },
    {
      id: 'tab-4',
      category: 'navigation',
      keys: ['4'],
      description: 'Switch to Empirical Benchmarks & Telemetry',
      detail: 'Precision, recall, F1 matrix across 374 evaluated back-office documents',
      action: () => {
        onClose();
        onNavigateTab('benchmark');
      },
      actionLabel: 'View Benchmarks'
    },

    // Review Console
    {
      id: 'rev-next',
      category: 'review',
      keys: ['↓', 'or', 'J'],
      description: 'Next Document in Review Queue',
      detail: 'Advances to next instrument in filtered queue without using mouse'
    },
    {
      id: 'rev-prev',
      category: 'review',
      keys: ['↑', 'or', 'K'],
      description: 'Previous Document in Review Queue',
      detail: 'Moves up to previous document in queue'
    },
    {
      id: 'rev-raw',
      category: 'review',
      keys: ['V'],
      description: 'Toggle Visual Scan vs. Raw OCR Text',
      detail: 'Switches between stylized document viewport and raw text stream'
    },
    {
      id: 'rev-zoom-in',
      category: 'review',
      keys: ['+'],
      description: 'Zoom In Document Viewport',
      detail: 'Increases viewport scaling up to 200%'
    },
    {
      id: 'rev-zoom-out',
      category: 'review',
      keys: ['-'],
      description: 'Zoom Out Document Viewport',
      detail: 'Decreases viewport scaling down to 50%'
    },
    {
      id: 'rev-save',
      category: 'review',
      keys: ['Enter'],
      description: 'Save Field & Run Invariant Check',
      detail: 'Recalculates mathematical invariants and logs to audit trail immediately'
    },

    // Actions
    {
      id: 'act-upload',
      category: 'actions',
      keys: ['U', 'or', 'N'],
      description: 'Launch Multimodal Ingestion Pipeline',
      detail: 'Ingest sample accounting invoice, MSA, or upload custom PDF/TIFF',
      action: () => {
        onClose();
        onOpenUpload();
      },
      actionLabel: 'New Ingestion'
    },
    {
      id: 'act-export',
      category: 'actions',
      keys: ['E'],
      description: 'Trigger Enterprise Batch Archive (.ZIP)',
      detail: 'Packages all validated manifests and CSV audit ledger into a downloadable archive',
      action: () => {
        onClose();
        onTriggerBatchExport();
      },
      actionLabel: 'Export ZIP'
    },
  ];

  const filteredShortcuts = shortcuts.filter(s => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    const matchesSearch = 
      s.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (s.detail && s.detail.toLowerCase().includes(filterQuery.toLowerCase())) ||
      s.keys.join(' ').toLowerCase().includes(filterQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All Shortcuts', count: shortcuts.length },
    { id: 'global', label: 'Global', count: shortcuts.filter(s => s.category === 'global').length },
    { id: 'navigation', label: 'Tabs & Navigation', count: shortcuts.filter(s => s.category === 'navigation').length },
    { id: 'review', label: 'Review Console', count: shortcuts.filter(s => s.category === 'review').length },
    { id: 'actions', label: 'Ingestion & Export', count: shortcuts.filter(s => s.category === 'actions').length },
  ];

  return (
    <div 
      id="keyboard-shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C0E]/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="keyboard-shortcuts-modal"
        className="w-full max-w-2xl bg-[#141518] border border-[#2A2C31] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2C31] bg-[#141518]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#16171B] border border-[#2A2C31] flex items-center justify-center text-[#C5B358]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif italic text-base text-[#E5E5E5]">Keyboard Shortcuts</h3>
                <span className="font-mono text-[9px] px-1.5 py-0.5 border border-[#2A2C31] bg-[#16171B] text-[#C5B358] uppercase tracking-wider">
                  Power-User Mode
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8E9097] mt-0.5">
                Rapid Touchless Navigation &amp; Invariant Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-[#16171B] border border-[#2A2C31] text-[9px] font-mono text-[#8E9097]">
              ESC
            </kbd>
            <button
              id="close-shortcuts-modal-button"
              onClick={onClose}
              className="text-[#8E9097] hover:text-[#E5E5E5] p-1.5 border border-[#2A2C31] bg-[#16171B] hover:bg-[#2A2C31] transition-colors cursor-pointer"
              aria-label="Close shortcuts modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Category Toolbar */}
        <div className="px-6 py-3 border-b border-[#2A2C31] bg-[#16171B] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E9097]" />
            <input
              type="text"
              placeholder="Search shortcut (e.g. 'zoom', 'tab')..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="w-full bg-[#141518] border border-[#2A2C31] pl-8 pr-3 py-1.5 text-xs text-[#E5E5E5] placeholder-[#8E9097] focus:outline-none focus:border-[#C5B358]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer border ${
                  activeCategory === cat.id
                    ? 'border-[#C5B358] bg-[#C5B358]/10 text-[#C5B358]'
                    : 'border-[#2A2C31] bg-[#141518] text-[#8E9097] hover:text-[#E5E5E5]'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filteredShortcuts.length > 0 ? (
            <div className="space-y-2">
              {filteredShortcuts.map(item => (
                <div 
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[#2A2C31] bg-[#16171B]/60 hover:bg-[#16171B] hover:border-[#C5B358]/40 transition-colors gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Key Combination Pills */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5 sm:pt-0">
                      {item.keys.map((k, idx) => (
                        <React.Fragment key={idx}>
                          {k === 'or' ? (
                            <span className="text-[10px] font-mono text-[#8E9097] px-0.5">or</span>
                          ) : (
                            <kbd className="min-w-[24px] px-2 py-1 text-center text-[11px] font-mono font-semibold bg-[#141518] border border-[#2A2C31] text-[#C5B358] shadow-sm">
                              {k}
                            </kbd>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#E5E5E5] flex items-center gap-2">
                        <span>{item.description}</span>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#8E9097] border border-[#2A2C31] px-1 py-0.2 bg-[#141518]">
                          {item.category}
                        </span>
                      </div>
                      {item.detail && (
                        <p className="text-[11px] text-[#8E9097] mt-0.5 leading-snug">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.action && (
                    <button
                      onClick={item.action}
                      className="self-end sm:self-center shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border border-[#2A2C31] bg-[#141518] hover:border-[#C5B358] hover:text-[#C5B358] text-[#8E9097] transition-colors cursor-pointer"
                    >
                      <span>{item.actionLabel || 'Run'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#8E9097]">
              No shortcuts found matching "{filterQuery}".
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[#2A2C31] bg-[#141518] flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-[#8E9097]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5B358]" />
            <span>Shortcuts are active globally unless editing a form input or typing in search.</span>
          </div>
          <div className="flex items-center gap-2 text-[#E5E5E5]">
            <span>Press <kbd className="px-1.5 py-0.5 border border-[#2A2C31] bg-[#16171B] text-[#C5B358]">?</kbd> anywhere to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
