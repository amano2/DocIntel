import { useEffect, useState } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../context/AuthContext';
import { FileText, AlertTriangle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DashboardPage() {
  const { session } = useAuth();
  const [stats, setStats] = useState({ documents_processed: 0, anomalies_flagged: 0, est_time_saved_hours: 0 });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
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
        setRecentDocs(docsData.documents || []);
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
          <div className="space-y-10 flex-1 overflow-auto pb-10">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Docs Processed */}
              <div className="industrial-panel p-6 border-l-4 border-l-primary animate-reveal delay-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Volume_Processed</h3>
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="text-5xl font-mono font-bold">{stats.documents_processed}</div>
                <div className="mt-2 text-[10px] font-mono text-muted-foreground uppercase">Target capacity: Nominal</div>
              </div>
              
              {/* Anomalies */}
              <div className="industrial-panel p-6 border-l-4 border-l-destructive animate-reveal delay-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Anomalies_Detected</h3>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="text-5xl font-mono font-bold text-destructive">{stats.anomalies_flagged}</div>
                <div className="mt-2 text-[10px] font-mono text-muted-foreground uppercase">Requires manual intervention</div>
              </div>
              
              {/* Time Saved */}
              <div className="industrial-panel p-6 border-l-4 border-l-accent animate-reveal delay-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">Est_Time_Saved [HRS]</h3>
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div className="text-5xl font-mono font-bold text-accent">{stats.est_time_saved_hours.toFixed(1)}</div>
                <div className="mt-2 text-[10px] font-mono text-muted-foreground uppercase">Efficiency gain recorded</div>
              </div>

            </div>
            
            {/* Recent Documents */}
            <div className="animate-reveal delay-400">
              <h2 className="text-xl font-heading font-bold uppercase mb-4 tracking-widest border-b-2 border-border pb-2">Recent Ingestions</h2>
              <div className="industrial-panel">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border hover:bg-transparent">
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground">ID_Filename</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Classification</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDocs.slice(0, 5).map((doc) => (
                      <TableRow key={doc.doc_id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <TableCell className="font-mono text-sm">{doc.filename}</TableCell>
                        <TableCell className="font-mono text-xs uppercase">{doc.doc_type || 'Unclassified'}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-0.5 border font-mono text-[10px] uppercase font-bold tracking-wider ${
                            doc.status === 'completed' ? 'border-primary text-primary bg-primary/10' :
                            doc.status === 'processing' ? 'border-accent text-accent bg-accent/10' :
                            'border-destructive text-destructive bg-destructive/10'
                          }`}>
                            {doc.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{new Date(doc.upload_time).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {recentDocs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center font-mono text-sm text-muted-foreground py-10 uppercase tracking-widest">
                          [ Data stream empty ]
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
