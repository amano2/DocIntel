import React, { useState } from 'react';
import { 
  FileText, Download, Search, Bot, 
  BarChart3, ShieldCheck, CheckCircle2, AlertTriangle, 
  Sparkles, Command, Cpu, RefreshCw, Sun, Moon, Palette
} from 'lucide-react';
import { DocumentItem, AccentColor } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'review' | 'rag' | 'benchmark';
  onSelectTab: (tab: 'dashboard' | 'review' | 'rag' | 'benchmark') => void;
  documents: DocumentItem[];
  onOpenUpload?: () => void;
  onOpenCommandPalette: () => void;
  onTriggerBatchExport: () => void;
  isExporting: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  accent: AccentColor;
  onSelectAccent: (accent: AccentColor) => void;
}

export function Header({
  activeTab,
  onSelectTab,
  documents,
  onOpenUpload,
  onOpenCommandPalette,
  onTriggerBatchExport,
  isExporting,
  theme,
  onToggleTheme,
  accent,
  onSelectAccent,
}: HeaderProps) {
  const [isAccentMenuOpen, setIsAccentMenuOpen] = useState(false);

  const ACCENTS: { id: AccentColor; label: string; color: string; hover: string }[] = [
    { id: 'cyan', label: 'Electric Cyan', color: '#06B6D4', hover: '#22D3EE' },
    { id: 'emerald', label: 'Emerald Pulse', color: '#10B981', hover: '#34D399' },
    { id: 'amber', label: 'Solar Amber', color: '#F59E0B', hover: '#FBBF24' },
    { id: 'violet', label: 'Royal Violet', color: '#8B5CF6', hover: '#A78BFA' },
    { id: 'azure', label: 'Cobalt Azure', color: '#3B82F6', hover: '#60A5FA' },
  ];

  // Count unresolved anomalies
  const unresolvedAnomalies = documents.reduce((acc, doc) => {
    return acc + doc.anomalies.filter(a => !a.resolved).length;
  }, 0);

  return (
    <header id="docintel-main-header" className="bg-[#090A0D]/90 border-b border-white/[0.08] sticky top-0 z-40 backdrop-blur-xl transition-colors duration-300">
      {/* Top Telemetry & Micro-Status Bar - 21st.dev Live Beacon */}
      <div className="border-b border-white/[0.05] px-4 sm:px-6 py-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[#8E9097] font-mono bg-black/20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[var(--accent-text,var(--accent-primary))] font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
            </span>
            Ingestion Pipeline Active
          </span>
          <span className="hidden sm:inline text-white/[0.15]">/</span>
          <span className="hidden sm:flex items-center gap-1.5 text-[#E5E5E5]/75">
            <Cpu className="w-3 h-3 text-[var(--accent-primary)]" />
            Invariant Engine v3.4
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span className="text-[#8E9097]">
            Touchless STP: <strong className="text-[var(--accent-text,var(--accent-primary))] font-semibold">88.4%</strong>
          </span>
          <span className="hidden md:inline px-2 py-0.5 rounded-full bg-[var(--accent-muted-10)] text-[var(--accent-primary)] font-medium text-[9px] border border-[var(--accent-border-40)]">
            Enterprise Tier
          </span>
        </div>
      </div>

      {/* Main Header Navigation Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-muted-20)] to-white/[0.03] border border-white/[0.12] flex items-center justify-center text-[var(--accent-primary)] shadow-[0_0_15px_-4px_var(--accent-primary)]">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif italic text-xl tracking-tight text-[#E5E5E5] leading-none">
                DocIntel <span className="text-[var(--accent-text,var(--accent-primary))] font-light">Agent</span>
              </h1>
              <span className="text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.1] text-[var(--accent-text,var(--accent-primary))] font-mono font-medium">
                v0.4
              </span>
            </div>
            <p className="text-[11px] text-[#8E9097] font-light tracking-wide mt-0.5">
              Multimodal Document Intelligence &amp; Verification
            </p>
          </div>
        </div>

        {/* Navigation Tabs - 21st.dev Segmented Pill Container */}
        <nav id="header-nav-pill" className="hidden lg:flex items-center gap-1 bg-[#101115]/90 dark:bg-[#101115]/90 p-1 rounded-xl border border-white/[0.08] shadow-inner backdrop-blur-md transition-colors duration-200">
          <button
            id="nav-tab-dashboard"
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.14em] font-medium transition-all duration-200 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-[0_0_18px_-3px_var(--accent-primary)]'
                : 'text-[#8E9097] hover:text-[#E5E5E5] hover:bg-white/[0.05]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Telemetry
          </button>

          <button
            id="nav-tab-review"
            onClick={() => onSelectTab('review')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.14em] font-medium transition-all duration-200 cursor-pointer relative ${
              activeTab === 'review'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-[0_0_18px_-3px_var(--accent-primary)]'
                : 'text-[#8E9097] hover:text-[#E5E5E5] hover:bg-white/[0.05]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Review Queue
            {unresolvedAnomalies > 0 && (
              <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                activeTab === 'review' ? 'bg-black/25 text-white' : 'bg-[#D9534F] text-white animate-pulse'
              }`}>
                {unresolvedAnomalies}
              </span>
            )}
          </button>

          <button
            id="nav-tab-rag"
            onClick={() => onSelectTab('rag')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.14em] font-medium transition-all duration-200 cursor-pointer ${
              activeTab === 'rag'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-[0_0_18px_-3px_var(--accent-primary)]'
                : 'text-[#8E9097] hover:text-[#E5E5E5] hover:bg-white/[0.05]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Grounded RAG
          </button>

          <button
            id="nav-tab-benchmark"
            onClick={() => onSelectTab('benchmark')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.14em] font-medium transition-all duration-200 cursor-pointer ${
              activeTab === 'benchmark'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-[0_0_18px_-3px_var(--accent-primary)]'
                : 'text-[#8E9097] hover:text-[#E5E5E5] hover:bg-white/[0.05]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Benchmarks
          </button>
        </nav>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Accent Color Palette Selector */}
          <div className="relative">
            <button
              id="accent-palette-button"
              onClick={() => setIsAccentMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#141518] border border-[#2A2C31] hover:border-[#C5B358] text-[#8E9097] hover:text-[#E5E5E5] text-xs transition-all duration-300 cursor-pointer active:scale-95 group"
              title="Select Accent Color"
              aria-label="Select Accent Color"
            >
              <Palette className="w-3.5 h-3.5 text-[#C5B358] transition-transform duration-300 group-hover:rotate-12" />
              <span 
                className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20 transition-colors duration-300 shadow-xs" 
                style={{ backgroundColor: ACCENTS.find(a => a.id === accent)?.color || '#06B6D4' }} 
              />
            </button>

            {isAccentMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsAccentMenuOpen(false)} 
                />
                <div 
                  id="accent-palette-dropdown"
                  className="absolute right-0 mt-2 w-48 p-2 rounded-xl bg-[#141518]/95 border border-[#2A2C31] shadow-2xl z-50 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-2 py-1 text-[9px] uppercase tracking-widest font-mono text-[#8E9097] border-b border-[#2A2C31]/60 flex items-center justify-between mb-1">
                    <span>Accent Palette</span>
                    <span className="text-[8px] text-[#C5B358] font-bold">LIVE</span>
                  </div>
                  {ACCENTS.map((item) => {
                    const isSelected = accent === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`accent-choice-${item.id}`}
                        onClick={() => {
                          onSelectAccent(item.id);
                          setIsAccentMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#1E2024] text-[#F4F4F6] font-semibold border border-[#2A2C31]' 
                            : 'text-[#8E9097] hover:text-[#F4F4F6] hover:bg-[#16171B]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/10"
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="text-[11px]">{item.label}</span>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C5B358]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle (Dark / Light) with silky 400ms transition */}
          <button
            id="theme-toggle-button"
            onClick={onToggleTheme}
            className="flex items-center justify-center p-1.5 rounded-md bg-[#141518] border border-[#2A2C31] hover:border-[#C5B358] text-[#8E9097] hover:text-[#E5E5E5] text-xs transition-all duration-300 cursor-pointer active:scale-95 group"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            <span className="relative flex items-center justify-center w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-12">
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-[#C5B358] transition-all duration-300" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#C5B358] transition-all duration-300 -rotate-12" />
              )}
            </span>
          </button>

          {/* Cmd+K Command Search trigger */}
          <button
            id="trigger-command-palette-button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141518] border border-[#2A2C31] text-[#8E9097] hover:text-[#E5E5E5] hover:border-[#C5B358] text-xs transition-colors cursor-pointer"
            title="Open Global Command Palette (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-[#C5B358]" />
            <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Search</span>
            <kbd className="hidden sm:inline text-[9px] font-mono px-1 py-0.5 rounded bg-[#16171B] border border-[#2A2C31] text-[#8E9097]">
              ⌘K
            </kbd>
          </button>

          {/* Batch Export All (.ZIP) */}
          <button
            id="batch-export-all-button"
            onClick={onTriggerBatchExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#2A2C31] bg-[#141518] hover:bg-[#16171B] hover:border-[#C5B358]/60 text-[#E5E5E5] text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            title="Download full JSON manifests & CSV audit sheet as .ZIP"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C5B358]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#C5B358]" />
            )}
            <span className="hidden sm:inline text-[10px] uppercase tracking-wider">Export All</span>
          </button>
        </div>
      </div>

      {/* Mobile Nav Tabs */}
      <div className="flex lg:hidden overflow-x-auto px-4 py-2 border-t border-[#2A2C31] gap-1 bg-[#0B0C0E] no-scrollbar text-xs">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${
            activeTab === 'dashboard' ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-xs' : 'text-[#8E9097]'
          }`}
        >
          Telemetry
        </button>
        <button
          onClick={() => onSelectTab('review')}
          className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap flex items-center gap-1 transition-colors ${
            activeTab === 'review' ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-xs' : 'text-[#8E9097]'
          }`}
        >
          Review Console
          {unresolvedAnomalies > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#D9534F] text-white font-mono font-bold">
              {unresolvedAnomalies}
            </span>
          )}
        </button>
        <button
          onClick={() => onSelectTab('rag')}
          className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${
            activeTab === 'rag' ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-xs' : 'text-[#8E9097]'
          }`}
        >
          RAG Studio
        </button>
        <button
          onClick={() => onSelectTab('benchmark')}
          className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider whitespace-nowrap transition-colors ${
            activeTab === 'benchmark' ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold shadow-xs' : 'text-[#8E9097]'
          }`}
        >
          Benchmarks
        </button>
      </div>
    </header>
  );
}
