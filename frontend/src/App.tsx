import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/ToastProvider';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ReviewConsole } from './components/ReviewConsole';
import { GroundedRAGStudio } from './components/GroundedRAGStudio';
import { EvaluationBenchmarkView } from './components/EvaluationBenchmarkView';
import { UploadProgressModal } from './components/UploadProgressModal';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { Auth } from './components/Auth';
import { Landing } from './components/Landing';
import { supabase } from './lib/supabase';
import { DocumentItem, AnomalySeverity, AccentColor } from './types';
import { generateEnterpriseBatchZip, triggerFileDownload } from './utils/invariantEngine';
import { fetchDocuments, fetchDashboardStats, getExportAllUrl } from './api';
import { ShieldCheck, Cpu, Database, Award, ExternalLink, Lock, HelpCircle } from 'lucide-react';

function DocIntelApp() {
  const { showToast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Primary State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'rag' | 'benchmark'>(() => {
    const hash = window.location.hash.replace('#', '');
    if (['dashboard', 'review', 'rag', 'benchmark'].includes(hash)) {
      return hash as any;
    }
    const saved = localStorage.getItem('docintel-active-tab');
    if (saved && ['dashboard', 'review', 'rag', 'benchmark'].includes(saved)) {
      return saved as any;
    }
    return 'review';
  });

  const handleSelectTab = useCallback((tab: 'dashboard' | 'review' | 'rag' | 'benchmark') => {
    setActiveTab(tab);
    localStorage.setItem('docintel-active-tab', tab);
    window.location.hash = tab;
  }, []);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<AnomalySeverity | 'all'>('all');

  // Load real documents from FastAPI backend on mount
  const loadBackendDocuments = useCallback(async () => {
    try {
      setIsLoadingDocs(true);
      // Load both documents list and dashboard stats in parallel
      const [res, stats] = await Promise.all([
        fetchDocuments(1, 500),
        fetchDashboardStats().catch(() => null)
      ]);
      if (res.documents && res.documents.length > 0) {
        setDocuments(res.documents);
        setSelectedDocId(res.documents[0].id);
      }
      if (stats) setDashboardStats(stats);
    } catch (err: any) {
      console.warn('Backend connection failed, maintaining local dataset:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    loadBackendDocuments();
  }, [loadBackendDocuments]);

  // Theme State (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('docintel-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Dark Mode Accent State (cyan, emerald, amber, violet, azure)
  const [accent, setAccent] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('docintel-accent') as AccentColor | null;
    if (saved && ['cyan', 'emerald', 'amber', 'violet', 'azure'].includes(saved)) {
      return saved;
    }
    return 'cyan';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('docintel-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('docintel-accent', accent);
  }, [accent]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    if (typeof (document as any).startViewTransition === 'function') {
      (document as any).startViewTransition(() => {
        setTheme(next);
      });
    } else {
      const root = document.documentElement;
      root.classList.add('theme-transitioning');
      setTheme(next);
      window.setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 350);
    }
  }, [theme]);

  const handleSelectAccent = useCallback((newAccent: AccentColor) => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    setAccent(newAccent);

    const timer = window.setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 450);

    const accentLabels: Record<AccentColor, string> = {
      cyan: 'Electric Cyan',
      emerald: 'Emerald Pulse',
      amber: 'Solar Amber',
      violet: 'Royal Violet',
      azure: 'Cobalt Azure',
    };

    showToast(
      'success',
      `Accent Updated: ${accentLabels[newAccent]}`,
      `Applied ${accentLabels[newAccent]} accent palette across all dashboards and review consoles.`
    );
    return () => window.clearTimeout(timer);
  }, [showToast]);

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Global Keyboard Shortcuts (Cmd+K, ?, 1-4, U, E, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Check if user is typing in a text field
      const isInput = 
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement)?.isContentEditable;

      if (isInput) return;

      // ? or Shift + / -> Toggle Keyboard Shortcuts Guide
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      // Escape -> close topmost open modal
      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
          return;
        }
        if (isUploadOpen) {
          setIsUploadOpen(false);
          return;
        }
      }

      // Single-key hotkeys (disabled when any modal is active)
      if (isShortcutsOpen || isCommandPaletteOpen || isUploadOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '1') {
        setActiveTab('dashboard');
      } else if (e.key === '2') {
        setActiveTab('review');
      } else if (e.key === '3') {
        setActiveTab('rag');
      } else if (e.key === '4') {
        setActiveTab('benchmark');
      } else if (e.key === 'u' || e.key === 'U' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsUploadOpen(true);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleTriggerBatchExport();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsOpen, isCommandPaletteOpen, isUploadOpen, toggleTheme]);

  // Update a document in-place (from review console, audit logs, or approval)
  const handleUpdateDocument = useCallback((updatedDoc: DocumentItem) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  }, []);

  // New document created from upload pipeline
  const handleDocumentCreated = useCallback((newDoc: DocumentItem) => {
    setDocuments(prev => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
    handleSelectTab('review');
  }, [handleSelectTab]);

  // Chart drilldown to review console with preset severity filter
  const handleFilterSeverityAndReview = useCallback((severity: AnomalySeverity | 'all') => {
    setSeverityFilter(severity);
    handleSelectTab('review');
  }, [handleSelectTab]);

  // Jump to document from Grounded RAG citations
  const handleJumpToDocument = useCallback((docId: string) => {
    setSelectedDocId(docId);
    handleSelectTab('review');
    showToast('info', 'Switched to Source Document', `Viewing ${docId} in Review Console.`);
  }, [handleSelectTab, showToast]);

  // Batch Export (.ZIP) of all manifests + CSV ledger
  const handleTriggerBatchExport = async () => {
    try {
      setIsExporting(true);
      showToast('info', 'Compiling Enterprise Export Archive', 'Streaming JSON extraction manifests and master audit CSV ledger from backend...');

      const exportUrl = getExportAllUrl();
      const a = document.createElement('a');
      a.href = exportUrl;
      a.download = `DocIntel_Enterprise_Audit_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast(
        'success',
        'Batch Export Archive Downloaded',
        `Successfully streamed export archive containing JSON manifests and audit CSV.`
      );
    } catch (err) {
      // Client-side fallback if backend unreachable
      const zipBlob = await generateEnterpriseBatchZip(documents);
      const timestamp = new Date().toISOString().slice(0, 10);
      triggerFileDownload(zipBlob, `DocIntel_Enterprise_Audit_Export_${timestamp}.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  if (!session) {
    if (showAuth) {
      return <Auth onAuthSuccess={() => setShowAuth(false)} onBack={() => setShowAuth(false)} />;
    }
    return <Landing onGetStarted={() => setShowAuth(true)} />;
  }

  return (
    <div className="min-h-screen bg-[var(--editorial-bg,#090A0D)] text-[var(--editorial-text,#E5E5E5)] flex flex-col font-sans selection:bg-[var(--accent-muted-30)] selection:text-[#FFFFFF] relative overflow-x-hidden bg-dot-grid">
      {/* 21st.dev Ambient Glow Backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-radial-glow z-0" aria-hidden="true" />

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        documents={documents}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onTriggerBatchExport={handleTriggerBatchExport}
        isExporting={isExporting}
        theme={theme}
        onToggleTheme={toggleTheme}
        accent={accent}
        onSelectAccent={handleSelectAccent}
      />

      {/* Main App Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            documents={documents}
            dashboardStats={dashboardStats}
            onSelectDoc={setSelectedDocId}
            onNavigateTab={handleSelectTab}
            onFilterSeverityAndReview={handleFilterSeverityAndReview}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        )}

        {activeTab === 'review' && (
          <ReviewConsole
            documents={documents}
            selectedDocId={selectedDocId}
            onSelectDoc={setSelectedDocId}
            onUpdateDocument={handleUpdateDocument}
            initialSeverityFilter={severityFilter}
          />
        )}

        {activeTab === 'rag' && (
          <GroundedRAGStudio
            documents={documents}
            onJumpToDocument={handleJumpToDocument}
          />
        )}

        {activeTab === 'benchmark' && (
          <EvaluationBenchmarkView />
        )}
      </main>

      {/* Enterprise System Footer - Editorial Aesthetic */}
      <footer className="border-t border-[#2A2C31] bg-[#0B0C0E] px-4 sm:px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8E9097]">
          <div className="flex items-center gap-3">
            <span className="font-serif italic text-sm text-[#E5E5E5]">DocIntel Intelligence</span>
            <span className="text-[#2A2C31]">|</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#8E9097]">Autonomous Ingestion & Guardrails</span>
            <span className="font-mono text-[9px] px-2 py-0.5 border border-[#2A2C31] bg-[#141518] text-[#C5B358] tracking-widest uppercase">
              v3.4.0-EDT
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-[10px] uppercase tracking-[0.2em] font-mono flex-wrap">
            <span className="flex items-center gap-1.5 text-[#8E9097]">
              <Database className="w-3 h-3 text-[#C5B358]" />
              SQLite Relational
            </span>
            <span className="hidden md:inline-block text-[#2A2C31]">•</span>
            <span className="hidden md:flex items-center gap-1.5 text-[#8E9097]">
              <Cpu className="w-3 h-3 text-[#C5B358]" />
              FAISS FlatIP
            </span>
            <span className="hidden md:inline-block text-[#2A2C31]">•</span>
            <span className="flex items-center gap-1.5 text-[#C5B358]">
              <ShieldCheck className="w-3 h-3" />
              SOC 2 Verified
            </span>
            <span className="text-[#2A2C31]">•</span>
            <button
              id="footer-help-shortcuts-button"
              onClick={() => setIsShortcutsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-[#2A2C31] bg-[#141518] hover:border-[#C5B358] hover:bg-[#16171B] text-[#E5E5E5] hover:text-[#C5B358] transition-all cursor-pointer group"
              title="View Keyboard Shortcuts (?)"
              aria-label="View Keyboard Shortcuts (?)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#C5B358] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest font-mono">Shortcuts</span>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono border border-[#2A2C31] bg-[#0B0C0E] text-[#C5B358] group-hover:border-[#C5B358]/50">
                ?
              </kbd>
            </button>
          </div>
        </div>
      </footer>

      {/* Persistent floating '?' shortcut pill pinned to bottom-right footer area */}
      <button
        id="persistent-floating-help-button"
        onClick={() => setIsShortcutsOpen(true)}
        className="fixed bottom-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 border border-[#2A2C31] bg-[#141518]/95 hover:border-[#C5B358] hover:bg-[#16171B] text-[#E5E5E5] hover:text-[#C5B358] shadow-2xl backdrop-blur-md transition-all cursor-pointer group"
        title="Quick Help & Keyboard Shortcuts (?)"
        aria-label="Quick Help & Keyboard Shortcuts (?)"
      >
        <HelpCircle className="w-3.5 h-3.5 text-[#C5B358] group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-mono text-[#8E9097] group-hover:text-[#E5E5E5] uppercase tracking-wider hidden sm:inline-block">Shortcuts</span>
        <kbd className="px-1.5 py-0.5 text-[9px] font-mono border border-[#2A2C31] bg-[#0B0C0E] text-[#C5B358]">
          ?
        </kbd>
      </button>

      {/* Modals & Overlays */}
      <UploadProgressModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDocumentCreated={handleDocumentCreated}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        documents={documents}
        onSelectDoc={setSelectedDocId}
        onOpenUpload={() => setIsUploadOpen(true)}
        onTriggerBatchExport={handleTriggerBatchExport}
        onNavigateTab={setActiveTab}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        onNavigateTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onTriggerBatchExport={handleTriggerBatchExport}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DocIntelApp />
    </ToastProvider>
  );
}
