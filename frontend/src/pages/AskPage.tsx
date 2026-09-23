import { useState, useRef, useEffect } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/AuthContext';
import { Send, User, Bot, FileText } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citedDocs?: string[];
}

export default function AskPage() {
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! Ask me anything about your uploaded documents. For example: 'Which invoices from vendor X are unpaid?'" }
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
        content: "Sorry, I encountered an error while trying to answer your question."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full bg-background/50 relative">
        <div className="p-6 border-b border-border/30 bg-card/20 backdrop-blur-md sticky top-0 z-10">
          <h1 className="text-2xl font-bold">Ask (RAG Q&A)</h1>
          <p className="text-sm text-muted-foreground mt-1">Search and chat across your entire document corpus.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}>
                  {msg.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                </div>
                
                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <Card className={`border-none ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card/40 glass-card'
                  }`}>
                    <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </CardContent>
                  </Card>
                  
                  {msg.citedDocs && msg.citedDocs.length > 0 && (
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Sources:</span>
                      {msg.citedDocs.map(docId => (
                        <span key={docId} className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded-full">
                          <FileText size={10}/> Doc ID: {docId.substring(0, 8)}...
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
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary text-secondary-foreground">
                  <Bot size={16}/>
                </div>
                <Card className="border-none bg-card/40 glass-card">
                  <CardContent className="p-4 flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-75"></span>
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce delay-150"></span>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-border/30 bg-card/20 backdrop-blur-md">
          <form onSubmit={handleSend} className="flex gap-4">
            <Input 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 bg-background/50 border-border/50 focus-visible:ring-primary"
              disabled={loading}
            />
            <Button type="submit" disabled={!query.trim() || loading} className="shrink-0">
              <Send size={18} className="mr-2"/> Send
            </Button>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}
