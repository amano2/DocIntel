import { useEffect, useState } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="p-8 h-full flex flex-col">
        <h1 className="text-3xl font-bold mb-8">Executive Overview</h1>
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">Loading dashboard...</div>
        ) : (
          <div className="space-y-8 flex-1 overflow-auto">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card border-none bg-primary/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Documents Processed</CardTitle>
                  <FileText className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{stats.documents_processed}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-none bg-destructive/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Anomalies Caught</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-destructive">{stats.anomalies_flagged}</div>
                </CardContent>
              </Card>
              
              <Card className="glass-card border-none bg-accent/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Time Saved (Hours)</CardTitle>
                  <Clock className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-accent">{stats.est_time_saved_hours.toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Documents */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Documents</h2>
              <Card className="glass-card border-border/30 bg-card/20">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead>Filename</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDocs.slice(0, 5).map((doc) => (
                      <TableRow key={doc.doc_id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell className="font-medium">{doc.filename}</TableCell>
                        <TableCell className="capitalize">{doc.doc_type || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            doc.status === 'completed' ? 'bg-primary/20 text-primary' :
                            doc.status === 'processing' ? 'bg-accent/20 text-accent' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {doc.status}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(doc.upload_time).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {recentDocs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No documents uploaded yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
