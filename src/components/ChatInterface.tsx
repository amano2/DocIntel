import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  User, 
  Bot, 
  FileText, 
  Terminal, 
  RotateCcw, 
  Copy, 
  Check, 
  Filter, 
  Sparkles, 
  AlertCircle,
  ExternalLink,
  Layers,
  ChevronRight,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface Citation {
  doc_id: string;
  filename: string;
  doc_type: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citedDocs?: string[];
  citations?: Citation[];
  scopedDocId?: string | null;
  error?: boolean;
}

interface ChatInterfaceProps {
  initialDocumentId?: string | null;
  className?: string;
  embedded?: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Unpaid / Due Invoices', query: 'Which invoices from vendors are unpaid or have payment terms due?' },
  { label: 'Math Discrepancies', query: 'Which invoices contain calculation or tax math discrepancies?' },
  { label: 'Unsigned Contracts', query: 'Are there any contracts missing signatures or marked unsigned?' },
  { label: 'High-Value POs (> $50k)', query: 'Which purchase orders exceed the $50,000 secondary approval threshold?' },
  { label: 'Compliance Audit Status', query: 'What is the compliance audit status for GDPR and data protection?' },
];

export default function ChatInterface({ 
  initialDocumentId = null, 
  className = '', 
  embedded = false 
}: ChatInterfaceProps) {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg-1',
      role: 'assistant',
      content: `SYSTEM ONLINE. RAG KNOWLEDGE BASE INITIALIZED.\n\nReady for natural-language interrogation across all ingested invoices, executed contracts, compliance filings, and purchase orders.\n\nSelect a prompt chip below or type an exact query to retrieve cited records.`,
      timestamp: '00:00',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocScope, setSelectedDocScope] = useState<string | null>(initialDocumentId);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectedDoc, setInspectedDoc] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Set real timestamp on mount once client is ready
  useEffect(() => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'init-msg-1') {
        return [{ ...prev[0], timestamp: nowTime }];
      }
      return prev;
    });
  }, []);

  // Fetch available documents for scope filtering and citation resolution
  useEffect(() => {
    async function loadDocuments() {
      if (!session) return;
      try {
        const res = await fetch('/api/documents', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableDocs(data.documents || []);
        }
      } catch (err) {
        console.error('Failed to load documents for chat scope:', err);
      }
    }
    loadDocuments();
  }, [session]);

  // Update scope if prop changes
  useEffect(() => {
    if (initialDocumentId !== undefined) {
      setSelectedDocScope(initialDocumentId);
    }
  }, [initialDocumentId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText !== undefined ? queryText : query).trim();
    if (!textToSend || loading || !session) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: currentTime,
      scopedDocId: selectedDocScope,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const payload: any = { query: textToSend };
      if (selectedDocScope) {
        payload.doc_ids = [selectedDocScope];
      }

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Query execution failed.`);
      }

      const data = await res.json();

      // Resolve citations with document list if backend only sent IDs
      let resolvedCitations: Citation[] = data.citations || [];
      if (!resolvedCitations.length && data.cited_doc_ids && data.cited_doc_ids.length > 0) {
        resolvedCitations = data.cited_doc_ids.map((id: string) => {
          const found = availableDocs.find((d) => d.doc_id === id);
          return {
            doc_id: id,
            filename: found ? found.filename : id,
            doc_type: found ? found.doc_type : 'document',
          };
        });
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.answer || 'No relevant information located in the specified document corpus.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citedDocs: data.cited_doc_ids,
        citations: resolvedCitations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('RAG query error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `ERROR: Failed to retrieve intelligence from vector store. ${err.message || 'Connection refused'}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Clear current interrogation session history?')) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages([
        {
          id: `init-msg-${Date.now()}`,
          role: 'assistant',
          content: 'SYSTEM SESSION RESET. Knowledge base standing by for new queries.',
          timestamp: nowTime,
        },
      ]);
    }
  };

  const handleInspectCitation = async (docId: string) => {
    setInspectLoading(true);
    setInspectedDoc(null);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInspectedDoc(data);
      }
    } catch (e) {
      console.error('Failed to load doc detail:', e);
    } finally {
      setInspectLoading(false);
    }
  };

  const activeScopeDoc = availableDocs.find((d) => d.doc_id === selectedDocScope);

  return (
    <div className={`flex flex-col h-full w-full min-h-0 min-w-0 bg-background overflow-hidden relative ${embedded ? 'border-0' : 'border-2 border-border shadow-xl'} ${className}`}>
      {/* Header Bar (Shrink-0: Fixed height, non-scrolling) */}
      <header className="p-3.5 sm:p-4 border-b-2 border-border bg-card/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-primary bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0">
            <Terminal size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold uppercase tracking-wider text-sm sm:text-base text-foreground truncate">
                RAG Document Intelligence
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 border border-primary/40 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-widest shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Live Index
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground truncate">
              {availableDocs.length} documents indexed • Grounded semantic retrieval
            </p>
          </div>
        </div>

        {/* Scope Selector & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center border-2 border-border bg-background px-2 py-1 text-xs font-mono">
            <Filter size={12} className="text-primary mr-1.5 shrink-0" />
            <span className="text-muted-foreground mr-1.5 uppercase text-[10px] hidden sm:inline">Scope:</span>
            <select
              value={selectedDocScope || 'all'}
              onChange={(e) => setSelectedDocScope(e.target.value === 'all' ? null : e.target.value)}
              className="bg-transparent text-foreground font-mono text-xs focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[190px] truncate"
            >
              <option value="all" className="bg-card text-foreground">
                All Documents ({availableDocs.length})
              </option>
              {availableDocs.map((doc) => (
                <option key={doc.doc_id} value={doc.doc_id} className="bg-card text-foreground">
                  {doc.filename} ({doc.doc_type})
                </option>
              ))}
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="h-8 border-2 border-border px-2.5 font-mono text-xs text-muted-foreground hover:text-foreground shrink-0"
            title="Reset Chat Session"
          >
            <RotateCcw size={12} className="mr-1" />
            Clear
          </Button>
        </div>
      </header>

      {/* Scope banner if filtered (Shrink-0) */}
      {selectedDocScope && activeScopeDoc && (
        <div className="px-4 py-2 border-b border-border bg-primary/10 text-primary font-mono text-xs flex items-center justify-between shrink-0 gap-2">
          <span className="flex items-center gap-2 truncate min-w-0">
            <Layers size={13} className="shrink-0" />
            <span className="truncate">Targeting: <strong>{activeScopeDoc.filename}</strong></span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedDocScope(null)}
            className="text-[10px] uppercase underline hover:opacity-80 shrink-0 font-bold"
          >
            Query All Docs
          </button>
        </div>
      )}

      {/* Message History Display (Flex-1 Min-H-0: Sole scrollable flex container) */}
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-5 font-mono bg-industrial-grid">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2.5 sm:gap-3 max-w-[95%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 border-2 flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-primary text-primary-foreground border-primary'
                      : msg.error
                      ? 'bg-destructive/20 text-destructive border-destructive'
                      : 'bg-card text-primary border-border shadow-sm'
                  }`}
                >
                  {isUser ? <User size={16} /> : msg.error ? <AlertCircle size={16} /> : <Bot size={16} />}
                </div>

                {/* Message Body */}
                <div className={`flex flex-col gap-1.5 min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Meta header */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono px-1">
                    <span className="font-bold uppercase tracking-wider text-foreground">
                      {isUser ? 'OPERATOR' : 'DOCINTEL AGENT'}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {msg.scopedDocId && isUser && (
                      <span className="px-1.5 py-0.2 border border-border bg-secondary text-[9px] uppercase">
                        Filtered Scope
                      </span>
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div
                    className={`p-3.5 sm:p-4 border-2 relative group text-xs sm:text-sm leading-relaxed max-w-full overflow-hidden ${
                      isUser
                        ? 'bg-primary text-primary-foreground border-primary brutalist-button'
                        : msg.error
                        ? 'bg-destructive/10 text-destructive border-destructive'
                        : 'bg-card/95 backdrop-blur-sm text-foreground border-border shadow-[3px_3px_0px_0px_var(--color-primary)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-mono break-words break-all">
                      {msg.content}
                    </div>

                    {/* Copy action on hover */}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className={`absolute top-2 right-2 p-1 border border-border transition-opacity opacity-0 group-hover:opacity-100 ${
                        isUser
                          ? 'bg-black/40 text-primary-foreground hover:bg-black/60'
                          : 'bg-background/80 text-foreground hover:bg-background'
                      }`}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                    </button>
                  </div>

                  {/* Cited Documents Chips */}
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-1 uppercase tracking-wider max-w-full">
                      <span className="font-bold text-foreground flex items-center gap-1 shrink-0 mr-1">
                        <FileText size={11} className="text-primary" /> Sources:
                      </span>
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleInspectCitation(c.doc_id)}
                          className="flex items-center gap-1.5 border border-border px-2 py-0.5 bg-secondary/80 hover:bg-primary/20 hover:border-primary text-foreground transition-all cursor-pointer font-mono shrink-0 max-w-[200px]"
                          title={`Click to inspect ${c.filename}`}
                        >
                          <span className="text-primary font-bold">[{c.doc_type || 'DOC'}]</span>
                          <span className="truncate">{c.filename}</span>
                          <ExternalLink size={9} className="text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2.5 sm:gap-3 max-w-[85%]">
              <div className="w-8 h-8 sm:w-9 sm:h-9 border-2 bg-card border-border text-primary flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="p-3.5 sm:p-4 border-2 bg-card border-border shadow-[3px_3px_0px_0px_var(--color-primary)] flex items-center gap-3">
                <span className="w-2 h-2 bg-primary animate-ping rounded-none shrink-0" />
                <span className="text-xs uppercase tracking-widest text-primary font-mono font-bold">
                  Interrogating Vector Index & Generating Synthesis...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Suggested Quick Prompts (Shrink-0) */}
      <nav aria-label="Suggested Prompts" className="px-3 sm:px-4 py-2 border-t border-border bg-card/60 overflow-x-auto flex items-center gap-2 scrollbar-none shrink-0">
        <span className="text-[10px] font-mono uppercase text-muted-foreground shrink-0 flex items-center gap-1">
          <Sparkles size={11} className="text-primary" /> Prompts:
        </span>
        {QUICK_PROMPTS.map((qp, i) => (
          <button
            key={i}
            type="button"
            disabled={loading}
            onClick={() => handleSend(qp.query)}
            className="shrink-0 text-[10px] sm:text-[11px] font-mono px-2 sm:px-2.5 py-1 border border-border bg-background hover:border-primary hover:text-primary transition-colors text-muted-foreground whitespace-nowrap"
          >
            {qp.label}
          </button>
        ))}
      </nav>

      {/* Input Field & Submit Controls (Shrink-0: Fixed at bottom of flex column) */}
      <footer className="p-3 sm:p-4 border-t-2 border-border bg-background shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex flex-col sm:flex-row gap-2.5 sm:gap-3"
        >
          <div className="flex-1 relative min-w-0">
            <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-primary font-mono font-bold text-sm select-none pointer-events-none">
              &gt;
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                selectedDocScope && activeScopeDoc
                  ? `Interrogate ${activeScopeDoc.filename}... (e.g. 'what is the balance?')`
                  : "Enter query... (e.g. 'which invoices have calculation errors?')"
              }
              className="w-full pl-8 sm:pl-9 pr-9 h-11 sm:h-12 bg-card border-2 border-border focus:border-primary focus:outline-none font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
              disabled={loading}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                title="Clear input"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={!query.trim() || loading}
            className="h-11 sm:h-12 px-6 sm:px-8 font-mono font-bold uppercase tracking-widest brutalist-button rounded-none shrink-0 text-xs sm:text-sm"
          >
            <Send size={14} className="mr-1.5" /> Execute
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-1 mt-2 text-[10px] font-mono text-muted-foreground px-1">
          <span className="truncate">Press Enter to execute • Grounded in FAISS vector embeddings</span>
          <span className="truncate font-semibold text-primary">
            Target: {selectedDocScope ? (activeScopeDoc?.filename || '1 document') : 'Entire Document Corpus'}
          </span>
        </div>
      </footer>

      {/* Citation Preview Modal */}
      <Dialog open={!!inspectedDoc || inspectLoading} onOpenChange={(open) => !open && setInspectedDoc(null)}>
        <DialogContent className="max-w-2xl w-[95vw] bg-card border-2 border-border text-foreground font-mono p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider text-lg sm:text-xl flex items-center justify-between border-b-2 border-border pb-3">
              <span className="flex items-center gap-2">
                <FileText className="text-primary" />
                Source Document Detail
              </span>
              {inspectedDoc && (
                <span className="text-xs px-2 py-0.5 border border-primary text-primary">
                  {inspectedDoc.document?.doc_type?.toUpperCase()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {inspectLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin" />
              <span>Fetching document records...</span>
            </div>
          ) : inspectedDoc ? (
            <div className="space-y-4 pt-2">
              <div className="bg-background p-3 border border-border">
                <div className="text-xs text-muted-foreground uppercase">File Name</div>
                <div className="text-sm font-bold text-foreground break-all">{inspectedDoc.document?.filename}</div>
                <div className="text-xs text-muted-foreground mt-1">ID: {inspectedDoc.document?.doc_id}</div>
              </div>

              {/* Extracted Fields Table */}
              <div>
                <div className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-1">
                  <ChevronRight size={14} /> Extracted Structured Fields ({inspectedDoc.fields?.length || 0})
                </div>
                <div className="border border-border divide-y divide-border text-xs bg-background max-h-60 overflow-y-auto">
                  {inspectedDoc.fields && inspectedDoc.fields.length > 0 ? (
                    inspectedDoc.fields.map((f: any) => (
                      <div key={f.id} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold uppercase text-muted-foreground truncate">{f.field_name}</div>
                          <div className="text-foreground text-sm break-words">{f.field_value}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`px-1.5 py-0.5 text-[10px] border ${f.confidence >= 0.8 ? 'border-green-500/50 text-green-400' : 'border-amber-500/50 text-amber-400'}`}>
                            {(f.confidence * 100).toFixed(0)}% CONF
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-muted-foreground">No extracted fields recorded.</div>
                  )}
                </div>
              </div>

              {/* Anomalies if any */}
              {inspectedDoc.anomalies && inspectedDoc.anomalies.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-destructive mb-2 flex items-center gap-1">
                    <AlertCircle size={14} /> Flagged Anomalies ({inspectedDoc.anomalies.length})
                  </div>
                  <div className="border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                    {inspectedDoc.anomalies.map((a: any) => (
                      <div key={a.id} className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0">
                        <div className="font-bold text-destructive flex items-center justify-between">
                          <span>{a.rule_name}</span>
                          <span className="uppercase text-[9px] border border-destructive px-1">{a.severity}</span>
                        </div>
                        <div className="text-muted-foreground mt-1">{a.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
