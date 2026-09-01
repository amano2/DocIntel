import React from 'react';
import { 
  FileText, 
  BarChart3, 
  MessageSquare, 
  Sun, 
  Moon, 
  Plus, 
  HelpCircle, 
  Download,
  Layers,
  Sparkles
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  theme, 
  toggleTheme, 
  onUploadClick,
  onExportClick 
}) {
  return (
    <header className="app-header border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-md sticky top-0 z-50">
      <div className="header-left flex items-center gap-6">
        <a 
          href="#" 
          className="brand-logo flex items-center gap-2.5 group cursor-pointer" 
          onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}
        >
          <div className="brand-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] border border-[rgba(255,255,255,0.15)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-transform duration-200 group-hover:scale-105">
            <Layers size={16} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[14.5px] font-extrabold tracking-tight text-[var(--text-primary)]">
              DocIntel Agent
            </span>
          </div>
        </a>

        <nav className="nav-tabs flex items-center gap-1 bg-[var(--bg-surface-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
          <button
            className={`nav-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={15} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'review' 
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('review')}
          >
            <FileText size={15} />
            <span>Review</span>
          </button>

          <button
            className={`nav-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ask' 
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab('ask')}
          >
            <MessageSquare size={15} />
            <span>Ask</span>
          </button>
        </nav>
      </div>

      <div className="header-right flex items-center gap-2.5">
        <button 
          className="taste-btn-primary sheen-sweep" 
          onClick={onUploadClick}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Upload</span>
        </button>

        <button 
          className="taste-btn-secondary" 
          onClick={onExportClick}
        >
          <Download size={14} />
          <span>Export</span>
        </button>

        <a 
          href="http://127.0.0.1:8000/docs" 
          target="_blank" 
          rel="noreferrer" 
          className="btn-icon" 
          title="FastAPI Swagger Documentation"
        >
          <HelpCircle size={16} />
        </a>

        <button 
          className="btn-icon" 
          onClick={toggleTheme} 
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#475569" />}
        </button>

        <div className="avatar-badge" title="Larsen & Toubro Mindtree Reviewer">
          LT
        </div>
      </div>
    </header>
  );
}
