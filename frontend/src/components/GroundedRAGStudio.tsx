import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, Bot, Sparkles, FileText, CheckSquare, Square, 
  ExternalLink, Layers, ArrowRight, ArrowUpRight, ShieldCheck, HelpCircle, 
  MessageSquare, SlidersHorizontal, Trash2, Cpu, Database, RotateCcw,
  Calculator, Search, Scale, DollarSign, Check
} from 'lucide-react';
import { DocumentItem, RAGMessage } from '../types';
import { executeRAGQuery } from '../utils/ragEngine';
import { useToast } from './ToastProvider';

interface GroundedRAGStudioProps {
  documents: DocumentItem[];
  onJumpToDocument: (docId: string) => void;
}

const PRESET_PROMPTS = [
  {
    title: 'Invoice Math Discrepancies',
    prompt: 'Which invoices have arithmetic discrepancies where subtotal plus tax does not equal the total amount?',
    category: 'Finance Invariant',
    icon: Calculator
  },
  {
    title: 'Duplicate Invoice Fraud Risk',
    prompt: 'List all invoices with duplicate invoice numbers that could indicate double-billing or fraud risk.',
    category: 'Fraud Guard',
    icon: Search
  },
  {
    title: 'Contract Compliance & Obligation Audit',
    prompt: 'Summarize all contracts and their key obligations, renewal dates, and any missing signature fields.',
    category: 'Legal Ops',
    icon: Scale
  },
  {
    title: 'Vendor Spend Breakdown',
    prompt: 'What is the total spend and amount billed by each vendor across all invoices?',
    category: 'Procurement',
    icon: DollarSign
  }
];

export function GroundedRAGStudio({ documents, onJumpToDocument }: GroundedRAGStudioProps) {
  const { showToast } = useToast();

  const [messages, setMessages] = useState<RAGMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  // Empty array = all documents query. Only set specific IDs when user manually selects docs.
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const toggleDocSelection = (docId: string) => {
    if (selectedDocIds.includes(docId)) {
      setSelectedDocIds(prev => prev.filter(id => id !== docId));
    } else {
      if (isCompareMode && selectedDocIds.length >= 2) {
        // Replace second item
        setSelectedDocIds([selectedDocIds[0], docId]);
      } else {
        setSelectedDocIds(prev => [...prev, docId]);
      }
    }
  };

  const handleResetConversation = () => {
    setMessages([]);
    showToast('info', 'Conversation Reset', 'Grounded intelligence studio cleared.');
  };

  const handleSendQuery = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isLoading) return;

    if (isCompareMode && selectedDocIds.length < 2) {
      showToast('warning', 'Comparison Requires 2 Documents', 'Please select 2 documents from the scope sidebar to compare.');
      return;
    }

    const userMsg: RAGMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: q
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Filter out any empty strings before sending to backend
      const validDocIds = selectedDocIds.filter(id => id && id.length > 0);
      const responseMsg = await executeRAGQuery(
        q,
        documents,
        validDocIds,
        isCompareMode
      );
      setMessages(prev => [...prev, responseMsg]);
    } catch (err) {
      showToast('error', 'Retrieval Error', 'Failed to retrieve grounded response.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="grounded-rag-studio-container" className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[760px]">
      {/* Sidebar: Document Scope & Comparison Scope (4 Cols) */}
      <div className="lg:col-span-4 bento-card flex flex-col overflow-hidden max-h-[840px] shadow-lg">
        <div className="p-4 border-b border-white/[0.08] bg-[#141518]/90 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif italic text-base text-[#E5E5E5] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
              Document Scope
            </h3>
            <span className="text-[10px] font-mono text-[var(--accent-text,var(--accent-primary))] bg-white/[0.04] border border-white/[0.1] px-2.5 py-0.5 rounded-full font-semibold">
              Vector Index: {documents.length}
            </span>
          </div>

          {/* Compare Mode Switcher */}
          <div className="p-3 bg-[#16171B]/90 border border-white/[0.08] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#E5E5E5] block">Cross-Doc Comparative Mode</span>
              <span className="text-[10px] text-[#8E9097]">Select exactly 2 documents to contrast</span>
            </div>
            <button
              id="toggle-compare-mode-button"
              onClick={() => {
                const next = !isCompareMode;
                setIsCompareMode(next);
                if (next && selectedDocIds.length < 2 && documents.length >= 2) {
                  setSelectedDocIds([documents[0].id, documents[1].id]);
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer active:scale-95 ${
                isCompareMode
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-[0_0_12px_-2px_var(--accent-primary)]'
                  : 'bg-[#141518] border-white/[0.1] text-[#8E9097] hover:text-[#E5E5E5]'
              }`}
            >
              {isCompareMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Document Checklist for Query Scoping */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-mono text-[#8E9097] px-1">
            {isCompareMode ? 'Selected for Comparison (Pick 2):' : 'Document Scope (All Ingested):'}
          </div>

          {documents.map(doc => {
            const isChecked = selectedDocIds.includes(doc.id);

            return (
              <div
                key={doc.id}
                onClick={() => toggleDocSelection(doc.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  isChecked
                    ? 'bg-[#16171B] border-[var(--accent-border)] ring-1 ring-[var(--accent-ring)] shadow-md'
                    : 'bg-[#141518]/70 border-white/[0.06] hover:bg-[#16171B] hover:border-white/[0.15]'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center text-[10px] border transition-colors shrink-0 ${
                  isChecked
                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--accent-contrast)] font-bold'
                    : 'border-white/[0.2] bg-transparent'
                }`}>
                  {isChecked && <Check className="w-2.5 h-2.5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-medium text-[#E5E5E5] truncate">{doc.title}</span>
                    <span className="text-[10px] font-mono text-[var(--accent-primary)] shrink-0 ml-1">
                      {/* @ts-ignore */}
                      {doc.overallConfidence}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8E9097] truncate">{doc.vendorOrParties}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Viewport: Chat, Prompt Presets & Citations (8 Cols) */}
      <div className="lg:col-span-8 bento-card flex flex-col overflow-hidden max-h-[840px] shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] bg-[#141518]/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted-10)] border border-[var(--accent-border-40)] flex items-center justify-center text-[var(--accent-primary)]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif italic text-base text-[#E5E5E5] flex items-center gap-2">
                Multimodal Grounded Intelligence
              </h3>
              <span className="text-[10px] text-[#8E9097]">Dense FAISS Retrieval + Hybrid Relational SQL Invariants</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleResetConversation}
                title="Clear thread and return to Studio home"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#8E9097] hover:text-[#E5E5E5] bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-colors cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3 h-3 text-[var(--accent-primary)]" />
                <span>New Thread</span>
              </button>
            )}
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E9097] bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
              Fine-Tuned MiniLM / Free
            </span>
          </div>
        </div>

        {/* Viewport Content: Minimal Empty-State OR Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#090A0D]/90">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center py-6 px-4 max-w-2xl mx-auto space-y-6">
              {/* Minimalist Studio Intro (Zero bulky banner, clean & uncluttered) */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono uppercase tracking-widest text-[var(--accent-text,var(--accent-primary))] font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)] animate-pulse" />
                  Grounded Intelligence Studio
                </div>

                <h2 className="text-xl md:text-2xl font-serif italic text-[#E5E5E5] tracking-tight font-normal">
                  Deterministic Verification &amp; Semantic Retrieval
                </h2>

                <p className="text-xs text-[#8E9097] max-w-lg mx-auto leading-relaxed">
                  Query invoices, contracts, purchase orders, compliance audits, and tax filings with verifiable source citations and deterministic invariants.
                </p>
              </div>

              {/* Recommended Enterprise Inquiries with Professional SVG Icons (Zero Emojis) */}
              <div className="w-full space-y-2 text-left">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#8E9097] flex items-center gap-1.5 px-1">
                  <MessageSquare className="w-3 h-3 text-[var(--accent-primary)]" />
                  Suggested Inquiries:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {PRESET_PROMPTS.map((p, idx) => {
                    const IconComponent = p.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendQuery(p.prompt)}
                        className="p-3.5 rounded-xl text-left border border-white/[0.08] bg-[#141518]/90 hover:bg-[#1A1C22] hover:border-[var(--accent-border)] transition-all duration-200 text-xs text-[#8E9097] flex items-start gap-3 cursor-pointer group shadow-sm hover:shadow-md active:scale-98 relative overflow-hidden"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted-10)] border border-[var(--accent-border-40)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-xs text-[#E5E5E5] group-hover:text-[var(--accent-text,var(--accent-primary))] transition-colors">
                              {p.title}
                            </span>
                            <span className="text-[9px] font-mono text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              Ask <ArrowUpRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                          <span className="text-[11px] text-[#8E9097] line-clamp-2 leading-relaxed">
                            {p.prompt}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-medium border border-[var(--accent-primary)] shadow-[0_0_20px_-5px_var(--accent-primary)]'
                      : 'bg-[#141518]/95 border border-white/[0.08] text-[#E5E5E5]'
                  }`}
                >
                  {/* Message Header */}
                  <div className={`flex items-center justify-between text-[10px] pb-2 mb-2 border-b ${
                    msg.sender === 'user' ? 'text-[var(--accent-contrast)]/70 border-[var(--accent-contrast)]/20' : 'text-[#8E9097] border-white/[0.08]'
                  }`}>
                    <span className="font-semibold flex items-center gap-1 font-mono uppercase tracking-wider text-[9px]">
                      {msg.sender === 'assistant' ? (
                        <>
                          <Cpu className="w-3 h-3 text-[var(--accent-primary)]" />
                          DocIntel Grounded Agent ({msg.reasoningType || 'HYBRID_VECTOR_SQL'})
                        </>
                      ) : (
                        'Reviewer (You)'
                      )}
                    </span>
                    <span className="font-mono">{msg.timestamp}</span>
                  </div>

                  {/* Clean Rich Markdown Rendering */}
                  {msg.sender === 'assistant' ? (
                    <div className="space-y-2 text-xs text-[#E5E5E5]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-base font-serif italic text-[#E5E5E5] font-semibold mt-3 mb-1.5 flex items-center gap-1.5">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-serif italic text-[#E5E5E5] font-medium mt-2.5 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-semibold text-[var(--accent-text,var(--accent-primary))] font-mono uppercase tracking-wide mt-2 mb-1">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 leading-relaxed text-[#D1D5DB]">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-[#D1D5DB] pl-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-[#D1D5DB] pl-1">{children}</ol>,
                          li: ({ children }) => <li className="text-xs leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-[var(--accent-primary)] pl-3 my-2 text-[#8E9097] italic">{children}</blockquote>,
                          table: ({ children }) => <div className="overflow-x-auto my-2.5 rounded-lg border border-white/[0.08]"><table className="w-full text-left text-xs">{children}</table></div>,
                          thead: ({ children }) => <thead className="bg-white/[0.04] text-[#8E9097] border-b border-white/[0.08]">{children}</thead>,
                          th: ({ children }) => <th className="p-2 font-mono text-[10px] uppercase tracking-wider">{children}</th>,
                          td: ({ children }) => <td className="p-2 border-b border-white/[0.05] text-[#E5E5E5] font-mono text-[11px]">{children}</td>,
                          code: ({ children }) => <code className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[var(--accent-primary)] font-mono text-[11px] border border-white/[0.06]">{children}</code>
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>
                  )}

                  {/* Grounded Source Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
                      <div className="text-[10px] font-semibold font-mono uppercase tracking-wider text-[var(--accent-text,var(--accent-primary))] flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
                        Grounded Citations ({msg.citations.length}):
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {msg.citations.map((cite, cIdx) => (
                          <div
                            key={cIdx}
                            onClick={() => onJumpToDocument(cite.docId)}
                            className="p-2.5 rounded-xl border border-white/[0.08] bg-[#16171B]/90 hover:border-[var(--accent-border)] cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--accent-text,var(--accent-primary))] mb-1">
                              <span className="font-bold truncate">{cite.docId}</span>
                              <span className="text-[#8E9097] group-hover:text-[var(--accent-text,var(--accent-primary))] flex items-center gap-0.5">
                                p.{cite.page}
                                <ArrowUpRight className="w-3 h-3" />
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8E9097] italic line-clamp-2">
                              "{cite.snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[var(--accent-text,var(--accent-primary))] font-mono p-3 rounded-xl bg-[#141518] border border-white/[0.1] w-fit shadow-md">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-ping" />
              Synthesizing dense vectors &amp; checking mathematical invariants...
            </div>
          )}
        </div>

        {/* Compact Floating Suggestions Chip Bar when in Active Conversation */}
        {messages.length > 0 && (
          <div className="px-4 py-2 border-t border-white/[0.06] bg-[#141518]/60 flex items-center gap-2 overflow-x-auto text-[11px] font-mono no-scrollbar">
            <span className="text-[9px] uppercase tracking-wider text-[#8E9097] shrink-0">Inquire:</span>
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(p.prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[var(--accent-border)] text-[#8E9097] hover:text-[#E5E5E5] transition-colors shrink-0 cursor-pointer active:scale-95 disabled:opacity-40"
              >
                {p.title}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-[#141518]/90">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="rag-studio-input"
              type="text"
              placeholder={
                isCompareMode
                  ? 'Ask comparison query across selected documents (e.g. "Compare liability caps & fees")...'
                  : 'Ask question about line items, taxes, contracts, or vendor terms...'
              }
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[#090A0D] border border-white/[0.1] rounded-xl text-xs text-[#E5E5E5] placeholder-[#8E9097] focus:outline-none focus:border-[var(--accent-border)] focus:ring-1 focus:ring-[var(--accent-ring)] transition-all"
            />
            <button
              id="rag-studio-send-button"
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="shimmer-button px-4 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--accent-contrast)] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-xl transition-all cursor-pointer shadow-[0_0_15px_-3px_var(--accent-primary)] active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
