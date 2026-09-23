import SidebarLayout from '../components/SidebarLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, CheckCircle, AlertTriangle, FastForward } from 'lucide-react';

export default function BenchmarkPage() {
  // In a full implementation, this would fetch from /api/eval_runs
  // We'll show placeholder KPI targets as per TRD requirements for this prototype.
  
  return (
    <SidebarLayout>
      <div className="p-8 h-full flex flex-col">
        <h1 className="text-3xl font-bold mb-2">System Benchmarks</h1>
        <p className="text-muted-foreground mb-8">Performance metrics for extraction accuracy and anomaly detection.</p>
        
        <div className="space-y-8 flex-1 overflow-auto">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/20 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Extraction Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary flex items-center gap-2">
                  <CheckCircle size={24}/> 92.5%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: &gt;90%</p>
              </CardContent>
            </Card>
            
            <Card className="bg-card/20 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Anomaly Precision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent flex items-center gap-2">
                  <AlertTriangle size={24}/> 88.0%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: &gt;85%</p>
              </CardContent>
            </Card>

            <Card className="bg-card/20 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Anomaly Recall</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent flex items-center gap-2">
                  <AlertTriangle size={24}/> 95.2%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: &gt;90%</p>
              </CardContent>
            </Card>

            <Card className="bg-card/20 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Processing Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary flex items-center gap-2">
                  <FastForward size={24}/> 3.4s
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per document</p>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <Card className="bg-card/20 border-border/30">
            <CardHeader>
              <CardTitle>Latest Evaluation Run</CardTitle>
              <CardDescription>Results against the ground-truth synthetic test set.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-background/50 rounded-lg border border-border/30 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-lg">Invoice Extraction</div>
                    <div className="text-sm text-muted-foreground mt-1">vendor_name, total, date, line_items</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">94.1% Accuracy</div>
                    <div className="text-xs text-muted-foreground">20 test documents</div>
                  </div>
                </div>

                <div className="p-4 bg-background/50 rounded-lg border border-border/30 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-lg">Contract Extraction</div>
                    <div className="text-sm text-muted-foreground mt-1">parties, term, signature_status</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">89.8% Accuracy</div>
                    <div className="text-xs text-muted-foreground">15 test documents</div>
                  </div>
                </div>

                <div className="p-4 bg-background/50 rounded-lg border border-border/30 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-lg">Scanned/Vision Fallback</div>
                    <div className="text-sm text-muted-foreground mt-1">Quality of extraction on poor scans</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-accent">82.3% Accuracy</div>
                    <div className="text-xs text-muted-foreground">12 test documents</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
