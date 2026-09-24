import { useState, useRef, useEffect } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/AuthContext';
import { Send, User, Bot, FileText, Terminal } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citedDocs?: string[];
}

export default function AskPage() {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "SYSTEM ONLINE. RAG ENGINE INITIALIZED.\n\nQuery corpus for intelligence. Ex: 'Which invoices from vendor X are unpaid?'" }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !session) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: userMessage.content })
      });
      
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        citedDocs: data.cited_doc_ids
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "ERR: Connection refused or processing failed."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full bg-transparent relative z-10 animate-reveal">
        <div className="p-6 border-b-2 border-border bg-background/95 sticky top-0 z-10 flex items-center justify-between">
          <div>
            <div className="inline-block px-2 py-1 mb-2 border-2 border-primary text-primary font-mono text-[10px] font-bold uppercase tracking-widest">
              Module // Interrogation
            </div>
            <h1 className="text-4xl font-heading font-extrabold uppercase tracking-tight">RAG <span className="text-primary">Console</span></h1>
          </div>
          <Terminal size={32} className="text-muted-foreground opacity-50" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 font-mono">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-reveal`}>
              <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 border-2 flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border'
                }`}>
                  {msg.role === 'user' ? <User size={20}/> : <Bot size={20}/>}
                </div>
                
                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 border-2 ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border shadow-[4px_4px_0px_0px_var(--color-primary)]'
                  }`}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                  
                  {msg.citedDocs && msg.citedDocs.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">
                      <span className="font-bold border-r border-border pr-2 py-1">Sources</span>
                      {msg.citedDocs.map(docId => (
                        <span key={docId} className="flex items-center gap-1 border border-border px-2 py-1 bg-secondary/50">
                          <FileText size={10}/> {docId.substring(0, 8)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-4 max-w-[80%]">
                <div className="w-10 h-10 border-2 bg-background border-border text-foreground flex items-center justify-center shrink-0">
                  <Bot size={20}/>
                </div>
                <div className="p-4 border-2 bg-background border-border shadow-[4px_4px_0px_0px_var(--color-primary)] flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary animate-ping"></span>
                  <span className="text-xs uppercase tracking-widest text-primary">Processing Query...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-6 border-t-2 border-border bg-background">
          <form onSubmit={handleSend} className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">{'>'}</div>
              <Input 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ENTER_COMMAND..."
                className="w-full pl-10 h-14 bg-transparent border-2 border-border focus-visible:ring-0 focus-visible:border-primary font-mono rounded-none uppercase text-sm tracking-wide"
                disabled={loading}
              />
            </div>
            <Button type="submit" disabled={!query.trim() || loading} className="shrink-0 h-14 px-8 font-mono font-bold uppercase tracking-widest brutalist-button rounded-none">
              <Send size={18} className="mr-2"/> Execute
            </Button>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}
