import { useEffect, useState } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../context/AuthContext';
import { FileText, AlertTriangle, Clock, ScanLine } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Mock data for anomaly distribution
const anomalyData = [
  { name: 'Mon', anomalies: 2, total: 15 },
  { name: 'Tue', anomalies: 5, total: 22 },
  { name: 'Wed', anomalies: 1, total: 10 },
  { name: 'Thu', anomalies: 4, total: 18 },
  { name: 'Fri', anomalies: 0, total: 12 },
  { name: 'Sat', anomalies: 1, total: 5 },
  { name: 'Sun', anomalies: 0, total: 2 },
];

function DocumentScanner() {
  return (
    <div className="industrial-panel p-6 border-l-4 border-l-primary relative overflow-hidden h-64 flex flex-col justify-between">
      <div className="absolute inset-0 bg-industrial-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_2px_var(--color-primary)] animate-[scan_3s_ease-in-out_infinite]" />
      
      <div className="relative z-10 flex justify-between items-start">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ScanLine size={16} /> Live Input Feed
        </h3>
        <div className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-1 font-bold animate-pulse">
          SCANNING_ACTIVE
        </div>
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-end">
        <div className="space-y-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="flex justify-between">
            <span>[SYS] Rasterizing invoice_8492.pdf</span>
            <span className="text-primary">64%</span>
          </div>
          <div className="w-full bg-background border border-border h-2">
            <div className="bg-primary h-full w-[64%]"></div>
          </div>
          <div className="mt-4 pt-2 border-t border-border/50 text-xs text-foreground">
            Awaiting optical character matrix...
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-10px); }
          50% { transform: translateY(240px); }
          100% { transform: translateY(-10px); }
        }
      `}} />
    </div>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState({ documents_processed: 0, anomalies_flagged: 0, est_time_saved_hours: 0 });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [insightDocs, setInsightDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!session) return;
      try {
        const token = session.access_token;
        
        // Fetch stats
        const statsRes = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const statsData = await statsRes.json();
        setStats(statsData);
        
        // Fetch recent docs
        const docsRes = await fetch('/api/documents', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const docsData = await docsRes.json();
        const topDocs = docsData.documents || [];
        setRecentDocs(topDocs);

        // Fetch fields for top 3 documents for Metadata Insight
        const insights = await Promise.all(
          topDocs.slice(0, 3).map(async (doc: any) => {
            try {
              const res = await fetch(`/api/documents/${doc.doc_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await res.json();
              return { ...doc, fields: data.fields || [] };
            } catch (e) {
              return { ...doc, fields: [] };
            }
          })
        );
        setInsightDocs(insights);
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [session]);

  return (
    <SidebarLayout>
      <div className="p-8 h-full flex flex-col relative z-10">
        <div className="mb-10 animate-reveal">
          <div className="inline-block px-2 py-1 mb-2 border-2 border-primary text-primary font-mono text-[10px] font-bold uppercase tracking-widest">
            Module // Overview
          </div>
          <h1 className="text-5xl font-heading font-extrabold uppercase tracking-tight">Executive <br/><span className="text-primary">Dashboard</span></h1>
        </div>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase tracking-widest">
            [Fetching telemetry...]
          </div>
        ) : (
          <div className="space-y-10 flex-1 overflow-auto pb-10 pr-2">
            
            {/* Top row: Scanner & KPI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-reveal delay-100">
              <DocumentScanner />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="industrial-panel p-6 border-l-4 border-l-primary flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Vol_Processed</h3>
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-5xl font-mono font-bold">{stats.documents_processed}</div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase pt-2 border-t border-border">Target capacity: Nominal</div>
                </div>
                
                <div className="industrial-panel p-6 border-l-4 border-l-accent flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Time_Saved [HRS]</h3>
                      <Clock className="h-5 w-5 text-accent" />
                    </div>
                    <div className="text-5xl font-mono font-bold text-accent">{stats.est_time_saved_hours.toFixed(1)}</div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground uppercase pt-2 border-t border-border">Efficiency gain recorded</div>
                </div>
              </div>
            </div>

            {/* Middle row: Chart */}
            <div className="industrial-panel p-6 animate-reveal delay-200">
              <h2 className="text-xl font-heading font-bold uppercase mb-6 tracking-widest border-b-2 border-border pb-2">Anomaly Distribution Analysis</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={anomalyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-background)', border: '2px solid var(--color-border)', borderRadius: '0px', fontFamily: 'JetBrains Mono' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    {/* Forensic Amber for total docs, Anomaly Crimson for anomalies */}
                    <Bar dataKey="total" fill="#ffc107" radius={[2, 2, 0, 0]} name="Total Documents" />
                    <Bar dataKey="anomalies" fill="var(--color-destructive)" radius={[2, 2, 0, 0]} name="Anomalies Detected" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-4 font-mono text-[10px] uppercase tracking-widest justify-end">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ffc107]"></div> Forensic Amber (Total)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-destructive"></div> Anomaly Crimson (Detected)</div>
              </div>
            </div>
            
            {/* Middle-lower row: Metadata Insights */}
            <div className="animate-reveal delay-300">
              <h2 className="text-xl font-heading font-bold uppercase mb-4 tracking-widest border-b-2 border-border pb-2">Metadata Insights</h2>
              {insightDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {insightDocs.map(doc => {
                    const getField = (name: string) => {
                      const field = doc.fields?.find((f: any) => f.field_name.toLowerCase().includes(name.toLowerCase()));
                      return field ? field.field_value : 'N/A';
                    };

                    return (
                      <div key={doc.doc_id} className="precision-card bg-background border-2 border-border p-5 transition-all hover:border-primary shadow-[4px_4px_0px_0px_var(--color-border)] hover:shadow-[4px_4px_0px_0px_var(--color-primary)]">
                        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2 flex justify-between">
                          <span className="truncate pr-2">{doc.filename}</span>
                          <span className="text-primary shrink-0">{doc.doc_type || 'DOC'}</span>
                        </div>
                        
                        <div className="space-y-3 font-mono text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground uppercase">Vendor</span>
                            <span className="font-bold">{getField('vendor')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground uppercase">Total Amount</span>
                            <span className="font-bold text-accent">{getField('total')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground uppercase">Due Date</span>
                            <span className="font-bold">{getField('date')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center font-mono text-sm text-muted-foreground py-6 uppercase tracking-widest border-2 border-dashed border-border">
                  [ No insight data available ]
                </div>
              )}
            </div>

            {/* Bottom row: Precision Cards */}
            <div className="animate-reveal delay-300">
              <h2 className="text-xl font-heading font-bold uppercase mb-4 tracking-widest border-b-2 border-border pb-2">Recent Ingestions</h2>
              
              <div className="grid grid-cols-1 gap-4">
                {recentDocs.slice(0, 5).map((doc) => {
                  const hasAnomaly = doc.status === 'error' || doc.status === 'flagged'; // Adjust based on actual anomaly logic, assuming error/flagged
                  
                  return (
                    <div key={doc.doc_id} className="precision-card bg-background border-2 border-border p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-primary shadow-[4px_4px_0px_0px_var(--color-border)] hover:shadow-[4px_4px_0px_0px_var(--color-primary)]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-secondary flex items-center justify-center border border-border">
                          <FileText size={20} className="text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-mono text-sm font-bold uppercase tracking-wider">{doc.filename}</div>
                          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                            {new Date(doc.upload_time).toLocaleString()} | TYPE: {doc.doc_type || 'UNKNOWN'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {hasAnomaly ? (
                          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-destructive border border-destructive bg-destructive/10 px-3 py-1">
                            <AlertTriangle size={14} /> Anomaly Detected
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-primary border border-primary bg-primary/10 px-3 py-1">
                            Status: Nominal
                          </div>
                        )}
                        <button className="brutalist-button font-mono text-[10px] font-bold uppercase px-4 py-2 border-2 border-border bg-background hover:bg-secondary">
                          Inspect
                        </button>
                      </div>
                    </div>
                  );
                })}
                {recentDocs.length === 0 && (
                  <div className="text-center font-mono text-sm text-muted-foreground py-10 uppercase tracking-widest border-2 border-dashed border-border">
                    [ Data stream empty ]
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
