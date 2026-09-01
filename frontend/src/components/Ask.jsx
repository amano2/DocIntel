import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  FileText, 
  Sparkles, 
  Database, 
  Bot, 
  User, 
  RefreshCw,
  Search,
  DollarSign,
  ShieldAlert,
  FileSearch,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { fetchDocuments, queryRAG } from '../api';
import { KokonutPromptInput } from './kokonutui/KokonutPromptInput';
import { AnimatedBadge } from './kokonutui/AnimatedBadge';
import { SpotlightCard } from './kokonutui/SpotlightCard';

/**
 * Collapsible Accordion Item for Source Citations
 * Compact 48-52px collapsed row with rotating chevron and smooth animated excerpt expansion.
 */
function CitationAccordionItem({ citation, index }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const docTitle = citation.document || citation.source || `Document ${citation.doc_id || index + 1}`;
  const excerptText = citation.snippet || citation.text || citation.content || '';

  return (
    <div
      style={{
        background: 'var(--bg-surface-subtle)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
      className="group hover:border-[var(--border-strong)]"
    >
      {/* Clickable Compact Header Row */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          minHeight: '44px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          <FileText size={14} color="var(--brand-blue)" className="shrink-0" />
          <span 
            style={{ 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {docTitle}
          </span>
          {citation.page && (
            <span 
              style={{ 
                color: 'var(--text-muted)', 
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                flexShrink: 0
              }}
            >
              • Page {citation.page}
            </span>
          )}
        </div>

        {/* 180° Rotating Chevron Indicator */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
          className="group-hover:text-[var(--text-primary)] shrink-0"
        >
          <ChevronDown size={15} />
        </motion.div>
      </button>

      {/* Smooth Height Transition Excerpt Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 14px 12px 14px',
                fontSize: '12px',
                lineHeight: '1.55',
                color: 'var(--text-secondary)',
                borderTop: '1px dashed var(--border-subtle)',
                paddingTop: '8px',
                marginTop: '2px',
                fontStyle: 'italic',
                fontFamily: 'var(--font-sans)',
              }}
            >
              "{excerptText}"
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Ask({ onSelectDocument, onSwitchTab }) {
  const [documents, setDocuments] = useState([]);
  const [docSearch, setDocSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am your Multimodal Document Intelligence Agent. I have indexed your entire corpus of invoices, contracts, and compliance records. Ask me any cross-document or extraction question!',
      citations: []
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments().then(data => {
      setDocuments(data.documents || []);
    }).catch(err => console.error('Error fetching docs for Ask:', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText) => {
    const q = questionText?.trim();
    if (!q || loading) return;

    // Add user message
    const newMessages = [...messages, { role: 'user', text: q }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await queryRAG(q);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: res.answer || 'No specific answer found.',
          citations: res.sources || []
        }
      ]);
    } catch (err) {
      console.error('RAG query failed:', err);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: `⚠️ Query error: ${err.message || 'Failed to communicate with RAG agent.'}`,
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter(d => 
    d.filename.toLowerCase().includes(docSearch.toLowerCase()) ||
    (d.vendor && d.vendor.toLowerCase().includes(docSearch.toLowerCase()))
  );

  const kokonutSuggestions = [
    { text: 'Which invoices have math inconsistencies in line items?', icon: DollarSign, label: 'Invoice Math Anomaly' },
    { text: 'Find contracts missing signature dates or renewals', icon: ShieldAlert, label: 'Missing Signatures' },
    { text: 'What are the SOC2 and GDPR compliance audit findings?', icon: FileSearch, label: 'Compliance Audits' },
    { text: 'List all vendors with total billed amount across invoices', icon: CheckCircle2, label: 'Vendor Summary' },
  ];

  return (
    <div className="main-container animate-fade-in" style={{ paddingBottom: '32px' }}>
      <div className="ask-layout">
        
        {/* Left Sidebar: Document Index */}
        <div className="review-panel" style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                <Database size={15} color="var(--brand-blue)" />
                <span>Knowledge Corpus</span>
              </div>
              <span className="pill" style={{ fontSize: '10.5px' }}>{documents.length} docs</span>
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Filter index..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 30px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Doc List in Ask tab */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredDocs.map((doc) => (
              <div
                key={doc.doc_id}
                className="doc-item"
                onClick={() => { onSelectDocument(doc.doc_id); onSwitchTab('review'); }}
                title="Click to view extraction in Review tab"
              >
                <FileText size={15} color="var(--brand-blue)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {doc.filename}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <span className={`pill pill-${doc.doc_type?.replace('_doc', '')}`} style={{ fontSize: '9.5px', padding: '1px 5px' }}>
                      {doc.doc_type === 'compliance_doc' ? 'Compliance' : (doc.doc_type?.charAt(0).toUpperCase() + doc.doc_type?.slice(1))}
                    </span>
                    {doc.is_scanned ? <span className="pill pill-scanned" style={{ fontSize: '9.5px', padding: '1px 5px' }}>Scanned</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sticky RAG index status */}
          <div style={{ padding: '12px 16px', background: 'var(--bg-surface-subtle)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <Database size={14} color="#10b981" />
            <span>Indexed & searchable via RAG</span>
          </div>
        </div>

        {/* Right Workspace: Chat Area */}
        <div className="review-panel" style={{ height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Ask across your documents
                </h2>
                <AnimatedBadge variant="clean" icon={<Sparkles size={11} />} pulse={false}>
                  LLM RAG
                </AnimatedBadge>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Natural-language Q&A over the full corpus with grounded source citations
              </p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="chat-thread" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={isUser ? 'chat-bubble-user' : 'chat-bubble-agent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '11.5px', fontWeight: '700', color: isUser ? '#ffffff' : 'var(--text-secondary)' }}>
                    {isUser ? <User size={13} /> : <Bot size={13} color="var(--brand-blue)" />}
                    <span>{isUser ? 'You' : 'DocIntel Agent'}</span>
                  </div>

                  {isUser ? (
                    /* User bubbles: plain text is fine */
                    <div style={{ lineHeight: '1.6' }}>{msg.text}</div>
                  ) : (
                    /* Agent bubbles: render full markdown */
                    <div className="chat-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Grounded Source Citations Collapsible Accordion */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                        Source Citations [{msg.citations.length}]
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {msg.citations.map((c, cIdx) => (
                          <CitationAccordionItem key={cIdx} citation={c} index={cIdx} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="chat-bubble-agent" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RefreshCw size={16} className="animate-spin" color="var(--text-primary)" />
                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>Retrieving grounded context and generating response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Kokonut AI Prompt Input Bar */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <KokonutPromptInput
              onSubmit={handleSend}
              isLoading={loading}
              suggestions={kokonutSuggestions}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
              Answers are grounded in your indexed documents with verified citations.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
