import { useEffect, useState, useRef } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, AlertTriangle, CheckCircle, FileText } from 'lucide-react';

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
      
      // Simple timeout to wait for initial ingest, then refresh list
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
      // Refresh doc details
      fetchDocDetails(selectedDocId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SidebarLayout>
      <div className="flex h-full">
        {/* Document List Panel */}
        <div className="w-1/3 border-r border-border/30 p-4 overflow-y-auto bg-card/10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Documents</h2>
            <div>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="application/pdf,image/*" />
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : <><Upload size={16} className="mr-2"/> Upload</>}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            {docs.map(doc => (
              <div 
                key={doc.doc_id}
                onClick={() => setSelectedDocId(doc.doc_id)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedDocId === doc.doc_id 
                    ? 'bg-primary/20 border border-primary/50' 
                    : 'bg-card/20 border border-border/30 hover:bg-card/40'
                }`}
              >
                <div className="font-medium truncate">{doc.filename}</div>
                <div className="text-xs text-muted-foreground flex justify-between mt-2">
                  <span className="capitalize">{doc.doc_type || 'Unknown'}</span>
                  <span className={
                    doc.status === 'completed' ? 'text-primary' :
                    doc.status === 'processing' ? 'text-accent' :
                    'text-destructive'
                  }>{doc.status}</span>
                </div>
              </div>
            ))}
            {docs.length === 0 && (
              <div className="text-center text-muted-foreground p-4">No documents yet</div>
            )}
          </div>
        </div>
        
        {/* Details Panel */}
        <div className="flex-1 p-6 overflow-y-auto relative">
          {!selectedDocId ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <FileText size={48} className="mb-4 opacity-20" />
              Select a document to review
            </div>
          ) : !docDetails ? (
            <div>Loading details...</div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">{docDetails.document.filename}</h1>
                  <p className="text-sm text-muted-foreground capitalize mt-1">
                    Type: {docDetails.document.doc_type} | Status: {docDetails.document.status}
                  </p>
                </div>
                {/* Check progress button or auto-poll could go here */}
              </div>

              {/* Anomalies Section */}
              {docDetails.anomalies && docDetails.anomalies.length > 0 && (
                <Card className="border-destructive bg-destructive/10">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle size={20}/> Detected Anomalies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {docDetails.anomalies.map((an: any) => (
                        <li key={an.id} className="p-3 bg-background/50 rounded border border-destructive/20">
                          <div className="font-semibold">{an.rule_name}</div>
                          <div className="text-sm mt-1">{an.description}</div>
                          <div className="text-xs mt-2 uppercase text-destructive font-medium">Severity: {an.severity}</div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Extracted Fields Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Extracted Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docDetails.fields.map((field: any) => {
                    const isLowConfidence = field.confidence < 0.70;
                    return (
                      <Card key={field.id} className={`bg-card/20 border-border/30 ${isLowConfidence && !field.corrected ? 'border-accent shadow-[0_0_10px_rgba(var(--color-accent),0.2)]' : ''}`}>
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                          <div>
                            <div className="text-xs text-muted-foreground uppercase font-semibold flex justify-between">
                              {field.field_name}
                              {field.corrected ? (
                                <span className="text-primary flex items-center gap-1"><CheckCircle size={12}/> Corrected</span>
                              ) : isLowConfidence ? (
                                <span className="text-accent flex items-center gap-1"><AlertTriangle size={12}/> Low Conf {(field.confidence*100).toFixed(0)}%</span>
                              ) : (
                                <span>{(field.confidence*100).toFixed(0)}%</span>
                              )}
                            </div>
                            <div className="mt-2 text-sm break-words whitespace-pre-wrap">
                              {field.field_value || <span className="text-muted-foreground italic">Not found</span>}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground/60 italic">
                              Source: {field.source}
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-border/20">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full">
                                  {field.corrected ? 'Edit Correction' : 'Correct Field'}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Correct {field.field_name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="text-sm bg-secondary/50 p-3 rounded">
                                    <strong>Original Extracted Value:</strong><br/>
                                    {field.field_value}
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">New Value</label>
                                    <Input 
                                      id={`edit-${field.id}`} 
                                      defaultValue={field.field_value} 
                                    />
                                  </div>
                                  <Button onClick={() => {
                                    const el = document.getElementById(`edit-${field.id}`) as HTMLInputElement;
                                    handleCorrectField(field.id, el.value);
                                  }}>Save Correction</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
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
