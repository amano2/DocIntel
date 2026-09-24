import { useEffect, useState, useRef } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, AlertTriangle, CheckCircle, FileText, Settings, ShieldAlert } from 'lucide-react';

export default function ReviewConsolePage() {
  const { session } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docDetails, setDocDetails] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setDocs(data.documents || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [session]);

  const fetchDocDetails = async (docId: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setDocDetails(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedDocId) {
      fetchDocDetails(selectedDocId);
    } else {
      setDocDetails(null);
    }
  }, [selectedDocId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !session) return;
    const file = e.target.files[0];
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });
      
      setTimeout(() => {
        fetchDocs();
        setUploading(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleCorrectField = async (fieldId: string, newValue: string) => {
    if (!session || !selectedDocId) return;
    try {
      await fetch(`/api/documents/${selectedDocId}/correct/${fieldId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ field_value: newValue })
      });
      fetchDocDetails(selectedDocId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex h-full bg-transparent z-10 relative animate-reveal">
        {/* Document List Panel */}
        <div className="w-[380px] border-r-2 border-border p-0 overflow-y-auto bg-background flex flex-col">
          <div className="p-6 border-b-2 border-border sticky top-0 bg-background/95 z-10 flex justify-between items-end">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Module // Queue</div>
              <h2 className="text-2xl font-heading font-extrabold uppercase tracking-tight text-primary">Ingestions</h2>
            </div>
            <div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="application/pdf,image/*" />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-none brutalist-button font-mono uppercase tracking-widest text-xs h-10 px-4">
                {uploading ? 'UPLOADING...' : <><Upload size={14} className="mr-2"/> Upload</>}
              </Button>
            </div>
          </div>
          
          <div className="flex-1">
            {docs.map(doc => (
              <div 
                key={doc.doc_id}
                onClick={() => setSelectedDocId(doc.doc_id)}
                className={`p-5 border-b-2 border-border cursor-pointer transition-all ${
                  selectedDocId === doc.doc_id 
                    ? 'bg-primary/10 border-l-4 border-l-primary' 
                    : 'bg-transparent border-l-4 border-l-transparent hover:bg-secondary/50'
                }`}
              >
                <div className="font-mono text-sm font-bold truncate mb-2">{doc.filename}</div>
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                  <span className="text-muted-foreground bg-secondary/50 px-2 py-1 border border-border">TYPE: {doc.doc_type || 'UNKNOWN'}</span>
                  <span className={`px-2 py-1 border font-bold ${
                    doc.status === 'completed' ? 'border-primary text-primary bg-primary/10' :
                    doc.status === 'processing' ? 'border-accent text-accent bg-accent/10' :
                    'border-destructive text-destructive bg-destructive/10'
                  }`}>{doc.status}</span>
                </div>
              </div>
            ))}
            {docs.length === 0 && (
              <div className="text-center text-muted-foreground p-10 font-mono text-sm uppercase tracking-widest">
                [ QUEUE EMPTY ]
              </div>
            )}
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1 p-8 overflow-y-auto relative">
          {!selectedDocId ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-reveal">
              <Settings size={64} className="mb-6 opacity-20 animate-spin-slow" />
              <div className="font-mono uppercase tracking-widest text-sm">Select item to initialize review console</div>
            </div>
          ) : !docDetails ? (
            <div className="h-full flex items-center justify-center font-mono uppercase text-sm tracking-widest animate-pulse">
              [ Fetching file parameters... ]
            </div>
          ) : (
            <div className="space-y-10 max-w-4xl mx-auto animate-reveal delay-100">
              <div className="pb-6 border-b-4 border-border">
                <div className="inline-block px-2 py-1 mb-4 border-2 border-primary text-primary font-mono text-[10px] font-bold uppercase tracking-widest">
                  Active Review // {docDetails.document.doc_type}
                </div>
                <h1 className="text-3xl font-heading font-extrabold uppercase break-words">{docDetails.document.filename}</h1>
                <div className="flex gap-4 mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  <span>ID: {docDetails.document.doc_id.substring(0,8)}</span>
                  <span>|</span>
                  <span>Status: <span className="text-primary font-bold">{docDetails.document.status}</span></span>
                </div>
              </div>

              {/* Anomalies Section */}
              {docDetails.anomalies && docDetails.anomalies.length > 0 && (
                <div className="industrial-panel p-6 border-l-4 border-l-destructive bg-destructive/5 animate-reveal delay-200">
                  <div className="flex items-center gap-3 text-destructive font-heading font-bold uppercase text-xl mb-6">
                    <ShieldAlert size={24}/> Critical Anomalies Detected
                  </div>
                  <div className="space-y-4">
                    {docDetails.anomalies.map((an: any) => (
                      <div key={an.id} className="p-4 bg-background border-2 border-destructive shadow-[4px_4px_0px_0px_var(--color-destructive)]">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-mono font-bold text-sm uppercase text-destructive">{an.rule_name}</div>
                          <div className="text-[10px] font-mono bg-destructive text-destructive-foreground px-2 py-0.5 uppercase font-bold tracking-widest">LVL: {an.severity}</div>
                        </div>
                        <div className="text-sm font-sans">{an.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Fields Section */}
              <div className="animate-reveal delay-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-heading font-bold uppercase tracking-widest border-b-2 border-border pb-2 inline-block">Data Extraction Matrix</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {docDetails.fields.map((field: any) => {
                    const isLowConfidence = field.confidence < 0.70;
                    return (
                      <div key={field.id} className={`industrial-panel p-5 flex flex-col justify-between border-2 transition-all ${
                        isLowConfidence && !field.corrected 
                          ? 'border-accent shadow-[4px_4px_0px_0px_var(--color-accent)]' 
                          : 'border-border shadow-[4px_4px_0px_0px_var(--color-border)] hover:border-primary'
                      }`}>
                        <div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-widest flex justify-between border-b-2 border-border/50 pb-2 mb-3">
                            {field.field_name}
                            {field.corrected ? (
                              <span className="text-primary flex items-center gap-1 bg-primary/10 px-1"><CheckCircle size={10}/> VERIFIED</span>
                            ) : isLowConfidence ? (
                              <span className="text-accent flex items-center gap-1 bg-accent/10 px-1 animate-pulse"><AlertTriangle size={10}/> WARNING: {(field.confidence*100).toFixed(0)}%</span>
                            ) : (
                              <span className="text-primary bg-primary/10 px-1">CONF: {(field.confidence*100).toFixed(0)}%</span>
                            )}
                          </div>
                          <div className="text-lg font-mono break-words whitespace-pre-wrap font-medium">
                            {field.field_value || <span className="text-muted-foreground opacity-50">[ NULL ]</span>}
                          </div>
                          <div className="mt-4 text-[10px] font-mono text-muted-foreground bg-secondary/30 p-2 border border-border/50">
                            SRC: {field.source}
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t-2 border-border/50">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full font-mono text-xs uppercase tracking-widest rounded-none border-2">
                                {field.corrected ? '> OVERRIDE CORRECTION' : '> INITIATE OVERRIDE'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="industrial-panel border-2 border-primary rounded-none shadow-[8px_8px_0px_0px_var(--color-primary)]">
                              <DialogHeader>
                                <DialogTitle className="font-heading uppercase tracking-widest border-b-2 border-border pb-4">Manual Override: {field.field_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6 pt-4 font-mono">
                                <div className="text-xs bg-secondary p-4 border-l-4 border-l-primary">
                                  <div className="uppercase tracking-widest text-muted-foreground mb-1 font-bold">System Extraction:</div>
                                  <div className="text-sm">{field.field_value}</div>
                                </div>
                                <div>
                                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-bold">New Value Input:</label>
                                  <Input 
                                    id={`edit-${field.id}`} 
                                    defaultValue={field.field_value} 
                                    className="rounded-none border-2 h-12 focus-visible:ring-0 focus-visible:border-primary"
                                  />
                                </div>
                                <Button onClick={() => {
                                  const el = document.getElementById(`edit-${field.id}`) as HTMLInputElement;
                                  handleCorrectField(field.id, el.value);
                                }} className="w-full h-12 brutalist-button rounded-none font-bold uppercase tracking-widest">Execute Override</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
