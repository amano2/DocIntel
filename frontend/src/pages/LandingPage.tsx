import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { FileText, ShieldAlert, Cpu, Database, Search, CheckCircle, AlertTriangle, ArrowRight, Activity, Terminal } from 'lucide-react';

export default function LandingPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ROI Calculator State
  const [monthlyVolume, setMonthlyVolume] = useState(2000);
  const [reviewTimeMinutes, setReviewTimeMinutes] = useState(13.5);
  const [hourlyRate, setHourlyRate] = useState(42);

  // ROI Computed
  const hoursRecovered = (monthlyVolume * (reviewTimeMinutes / 60) * 12);
  const laborSaved = hoursRecovered * hourlyRate;
  const discrepanciesCaught = Math.floor(monthlyVolume * 12 * 0.038);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Check your email for the confirmation link');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const AuthForm = () => (
    <form onSubmit={handleAuth} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">ID_EMAIL</label>
        <Input 
          type="email" 
          placeholder="operative@enterprise.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required 
          className="bg-background border-2 border-border rounded-none h-12 focus-visible:ring-0 focus-visible:border-primary font-mono"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">AUTH_TOKEN</label>
        <Input 
          type="password" 
          placeholder="••••••••" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required 
          className="bg-background border-2 border-border rounded-none h-12 focus-visible:ring-0 focus-visible:border-primary font-mono"
        />
      </div>
      
      {error && <div className="text-sm text-destructive font-mono border-l-4 border-destructive pl-3 py-2 bg-destructive/10">{error}</div>}
      
      <Button type="submit" className="w-full h-14 font-heading font-bold uppercase tracking-widest text-lg brutalist-button" disabled={loading}>
        {loading ? 'Processing...' : (isLogin ? 'Execute Login' : 'Register Identity')}
      </Button>
      
      <div className="pt-4 border-t-2 border-border text-center text-sm font-mono">
        <button 
          type="button" 
          onClick={() => setIsLogin(!isLogin)}
          className="text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
        >
          {isLogin ? ">> Switch to Registration" : ">> Switch to Login"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-industrial-grid bg-vignette text-foreground overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
      
      {/* 1. Navigation Structure */}
      <nav className="border-b-2 border-border bg-background/95 sticky top-0 z-50 p-4 px-8 flex justify-between items-center content-z backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-primary animate-pulse"></div>
            <h1 className="text-xl font-heading font-extrabold uppercase tracking-widest text-primary">DocIntel_Agent</h1>
          </div>
          <div className="hidden md:flex gap-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <a href="#pipeline" className="hover:text-primary transition-colors">Pipeline</a>
            <a href="#roi" className="hover:text-primary transition-colors">ROI Calc</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#compliance" className="hover:text-primary transition-colors">Compliance</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hidden md:block font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Docs & API</a>
          <Dialog>
            <DialogTrigger asChild>
              <div role="button" tabIndex={0} className="brutalist-button font-mono uppercase tracking-widest text-xs h-10 px-6 rounded-none inline-flex items-center justify-center cursor-pointer">
                Launch Review Console
              </div>
            </DialogTrigger>
            <DialogContent className="industrial-panel border-2 border-primary rounded-none shadow-[8px_8px_0px_0px_var(--color-primary)]">
              <DialogHeader>
                <DialogTitle className="font-heading uppercase tracking-widest border-b-2 border-border pb-4 text-2xl">System Access</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <AuthForm />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="p-8 md:p-16 lg:p-24 border-b-2 border-border grid grid-cols-1 lg:grid-cols-2 gap-16 items-center content-z relative">
        <div className="z-10 relative">
          <div className="inline-block px-3 py-1 mb-8 border-2 border-primary text-primary font-mono text-xs font-bold uppercase animate-reveal bg-background">
            System Operational // V1.0.4
          </div>
          <h2 className="text-5xl md:text-7xl font-heading font-extrabold uppercase leading-[1.1] mb-8 animate-reveal delay-100">
            Automated <br/>
            <span className="text-primary underline decoration-4 underline-offset-8">Liability</span> <br/>
            Intercept.
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-lg font-sans font-light animate-reveal delay-200 leading-relaxed border-l-4 border-muted-foreground/30 pl-6">
            Manual back-office review of invoices and contracts is slow, error-prone, and exposes businesses to duplicate payments. 
            DocIntel provides multimodal ingestion, structured extraction with strict confidence scoring, deterministic anomaly interception, and full-corpus semantic retrieval.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-reveal delay-300 font-mono">
            <Dialog>
              <DialogTrigger asChild>
                <div role="button" tabIndex={0} className="brutalist-button uppercase tracking-widest h-14 px-8 text-sm inline-flex items-center justify-center cursor-pointer">
                  Sandbox Upload <ArrowRight size={16} className="ml-2"/>
                </div>
              </DialogTrigger>
              <DialogContent className="industrial-panel rounded-none border-2 border-primary">
                <DialogHeader><DialogTitle className="font-heading uppercase tracking-widest border-b-2 border-border pb-4">Auth Required</DialogTitle></DialogHeader>
                <AuthForm />
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="uppercase tracking-widest h-14 px-8 text-sm rounded-none border-2 border-border hover:border-primary hover:text-primary transition-all">
              View Audit Ledgers
            </Button>
          </div>
        </div>

        {/* Live Functional Demonstration Wireframe */}
        <div className="industrial-panel p-6 bg-secondary/10 border-l-4 border-l-primary animate-reveal delay-400 relative">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 font-mono text-[10px] font-bold uppercase">Live Wireframe</div>
          <div className="border-b-2 border-border pb-4 mb-6 mt-4 flex items-center justify-between">
            <div className="font-mono text-sm font-bold uppercase">Extraction output // invoice_scan_992.pdf</div>
            <div className="flex gap-2">
              <span className="w-3 h-3 border border-border bg-background"></span>
              <span className="w-3 h-3 border border-border bg-background"></span>
              <span className="w-3 h-3 border border-border bg-destructive animate-pulse"></span>
            </div>
          </div>

          <div className="space-y-4 font-mono text-xs mb-6">
            <div className="grid grid-cols-3 border-b border-border/50 pb-2 text-muted-foreground uppercase tracking-widest font-bold">
              <div>Field Name</div>
              <div>Value</div>
              <div>Confidence</div>
            </div>
            <div className="grid grid-cols-3 items-center">
              <div>Vendor_Name</div>
              <div className="font-bold">Acme Corp</div>
              <div className="text-primary flex items-center gap-1"><CheckCircle size={12}/> 98%</div>
            </div>
            <div className="grid grid-cols-3 items-center">
              <div>Total_Due</div>
              <div className="font-bold">$4,250.00</div>
              <div className="text-primary flex items-center gap-1"><CheckCircle size={12}/> 95%</div>
            </div>
            <div className="grid grid-cols-3 items-center bg-accent/10 border-l-2 border-accent p-2 -ml-2">
              <div>Tax_Amount</div>
              <div className="font-bold">$125.00</div>
              <div className="text-accent flex items-center gap-1"><AlertTriangle size={12}/> 62%</div>
            </div>
          </div>

          <div className="border-t-2 border-border pt-4">
            <div className="font-mono text-xs uppercase tracking-widest text-destructive mb-3 font-bold flex items-center gap-2">
              <ShieldAlert size={14}/> Anomaly Flag Block
            </div>
            <div className="bg-destructive/10 border-2 border-destructive p-3 font-sans text-sm">
              <span className="font-mono text-[10px] bg-destructive text-destructive-foreground px-1 uppercase font-bold mr-2">Severity: High</span>
              <strong>Arithmetic Discrepancy:</strong> Line items sum ($4,000.00) + Tax ($125.00) does not equal Stated Total ($4,250.00). Difference of $125.00 detected.
            </div>
          </div>
        </div>
      </section>

      {/* 3. Five-Stage Pipeline Architecture */}
      <section id="pipeline" className="p-8 md:p-16 lg:p-24 border-b-2 border-border content-z relative">
        <div className="mb-16">
          <div className="font-mono text-primary text-sm font-bold uppercase tracking-widest mb-4">Architecture Specification</div>
          <h2 className="text-4xl font-heading font-extrabold uppercase">Five-Stage Processing Pipeline</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border-2 border-border">
          {[
            { num: '01', icon: FileText, title: 'Multimodal Ingestion', desc: 'Primary text extraction via PDF parser for text-layer docs. Automatic rasterization fallback for scanned pages passed to vision reasoning.' },
            { num: '02', icon: Activity, title: 'Autonomous Classification', desc: 'Categorization into Invoice, Contract, Compliance Doc, or Other utilizing zero-shot contextual analysis.' },
            { num: '03', icon: Cpu, title: 'Structured Field Extraction', desc: 'Targeted prompt injection. Every field outputs { value, confidence, source_reference } for strict traceability.' },
            { num: '04', icon: ShieldAlert, title: 'Pre-Payment Guardrails', desc: 'Invariant checking: math sums, duplicate detection, signature dates, chronological consistency, and LLM logical review.' },
            { num: '05', icon: Database, title: 'Corpus Indexing & RAG', desc: 'Chunking, vector embedding, and local index storage for natural language queries across the entire document set.' }
          ].map((stage, i) => (
            <div key={i} className={`p-6 bg-background relative group hover:bg-secondary/20 transition-colors ${i !== 4 ? 'border-b-2 md:border-b-0 md:border-r-2' : ''} border-border`}>
              <div className="text-4xl font-heading font-extrabold text-muted-foreground/20 absolute top-4 right-4">{stage.num}</div>
              <stage.icon className="h-8 w-8 text-primary mb-6" />
              <h3 className="font-mono font-bold uppercase tracking-widest text-sm mb-3">{stage.title}</h3>
              <p className="text-muted-foreground text-sm font-sans">{stage.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. ROI & Business Impact Calculator */}
      <section id="roi" className="p-8 md:p-16 lg:p-24 border-b-2 border-border bg-secondary/10 content-z relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <div className="font-mono text-primary text-sm font-bold uppercase tracking-widest mb-4">Value Proposition</div>
            <h2 className="text-4xl font-heading font-extrabold uppercase mb-6">ROI & Impact Calculator</h2>
            <p className="text-muted-foreground font-sans mb-10 max-w-md">
              Adjust the operational parameters below to model the real-time financial impact of deploying the DocIntel Agent in your back-office environment.
            </p>

            <div className="space-y-8 max-w-md font-mono">
              <div>
                <div className="flex justify-between text-xs uppercase tracking-widest mb-4">
                  <span>Monthly Document Volume</span>
                  <span className="font-bold text-primary">{monthlyVolume.toLocaleString()} Docs</span>
                </div>
                <Slider defaultValue={[2000]} max={20000} min={200} step={100} onValueChange={(val) => setMonthlyVolume(val[0])} className="[&_[role=slider]]:border-primary [&_[role=slider]]:rounded-none [&_[role=slider]]:border-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-xs uppercase tracking-widest mb-4">
                  <span>Avg Manual Review Time</span>
                  <span className="font-bold text-primary">{reviewTimeMinutes} Min/Doc</span>
                </div>
                <Slider defaultValue={[13.5]} max={30} min={1} step={0.5} onValueChange={(val) => setReviewTimeMinutes(val[0])} className="[&_[role=slider]]:border-primary [&_[role=slider]]:rounded-none [&_[role=slider]]:border-2" />
              </div>

              <div>
                <div className="flex justify-between text-xs uppercase tracking-widest mb-4">
                  <span>Reviewer Hourly Rate</span>
                  <span className="font-bold text-primary">${hourlyRate}/hr</span>
                </div>
                <Slider defaultValue={[42]} max={150} min={15} step={1} onValueChange={(val) => setHourlyRate(val[0])} className="[&_[role=slider]]:border-primary [&_[role=slider]]:rounded-none [&_[role=slider]]:border-2" />
              </div>
            </div>
          </div>

          <div className="industrial-panel p-8 border-l-4 border-l-accent flex flex-col justify-center">
            <h3 className="font-mono font-bold uppercase tracking-widest border-b-2 border-border pb-4 mb-8 text-xl">Projected Annual Impact</h3>
            
            <div className="space-y-8">
              <div>
                <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Gross Labor Capital Saved</div>
                <div className="text-5xl font-heading font-extrabold text-primary">${laborSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-8">
                <div>
                  <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Hours Recovered</div>
                  <div className="text-3xl font-heading font-bold text-accent">{hoursRecovered.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>
                <div>
                  <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Discrepancies Intercepted</div>
                  <div className="text-3xl font-heading font-bold text-destructive">{discrepanciesCaught.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Monetization & Subscription Tiers */}
      <section id="pricing" className="p-8 md:p-16 lg:p-24 border-b-2 border-border content-z relative">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-heading font-extrabold uppercase">Procurement Tiers</h2>
          <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm mt-4">Structured for back-office and legal operations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { name: 'Starter', target: 'Small Practice', quota: '500 docs/mo', features: ['2 Seats', 'Basic Invoice Math Check', 'Duplicate Checking', '30-day Index Retention', 'CSV Audit Export'], price: '$499/mo' },
            { name: 'Professional', target: 'Operations (Core)', quota: '5,000 docs/mo', features: ['10 Seats', 'Full Multimodal Scanned-Vision', 'Contract Liability Detection', 'Full-Corpus RAG Q&A', 'Human-in-the-loop Editing'], price: '$1,299/mo', highlighted: true },
            { name: 'Enterprise', target: 'Accounting Back-Office', quota: '25,000+ docs/mo', features: ['Unlimited Seats', 'Custom Heuristic Rules', 'ERP System Webhooks', 'Dedicated Vector Indexes', 'SSO & Full Audit Defense'], price: 'Custom' }
          ].map((tier, i) => (
            <div key={i} className={`industrial-panel p-8 flex flex-col ${tier.highlighted ? 'border-primary border-2 shadow-[8px_8px_0px_0px_var(--color-primary)] relative transform md:-translate-y-4' : 'border-2 border-border'}`}>
              {tier.highlighted && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground font-mono text-[10px] font-bold uppercase px-3 py-1">Recommended</div>}
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">{tier.target}</div>
              <h3 className="text-3xl font-heading font-extrabold uppercase mb-4">{tier.name}</h3>
              <div className="text-2xl font-mono text-primary font-bold mb-6 pb-6 border-b-2 border-border">{tier.price}</div>
              
              <div className="font-mono text-sm font-bold uppercase mb-4 text-foreground/80">Quota: {tier.quota}</div>
              <ul className="space-y-4 font-mono text-xs flex-1 mb-8">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              
              <Button variant={tier.highlighted ? 'default' : 'outline'} className={`w-full rounded-none font-mono uppercase tracking-widest border-2 ${tier.highlighted ? 'brutalist-button' : 'border-border'}`}>
                Initialize Tier
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Audit Trail & Compliance */}
      <section id="compliance" className="p-8 md:p-16 lg:p-24 border-b-2 border-border bg-secondary/10 content-z relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 font-mono text-xs space-y-4">
            <div className="industrial-panel p-4 border-l-4 border-l-primary bg-background">
              <div className="text-primary font-bold uppercase mb-2 flex items-center gap-2"><Terminal size={14}/> Human-in-the-Loop Routing</div>
              <p className="text-muted-foreground">Fields extracted with &lt; 75% confidence are quarantined and automatically routed to the Review Console for manual verification.</p>
            </div>
            <div className="industrial-panel p-4 border-l-4 border-l-accent bg-background">
              <div className="text-accent font-bold uppercase mb-2 flex items-center gap-2"><Terminal size={14}/> Immutable Changelog</div>
              <p className="text-muted-foreground">Every manual override generates a cryptographic audit log: Editor ID, Prior Value, Corrected Value, and ISO-8601 Timestamp.</p>
            </div>
            <div className="industrial-panel p-4 border-l-4 border-l-muted-foreground bg-background">
              <div className="text-foreground font-bold uppercase mb-2 flex items-center gap-2"><Terminal size={14}/> Local Emdedding Privacy</div>
              <p className="text-muted-foreground">Zero model training on ingested business records. Local FAISS vector indexing ensures sensitive contract parameters never persist in third-party caches.</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="font-mono text-primary text-sm font-bold uppercase tracking-widest mb-4">Governance Specification</div>
            <h2 className="text-4xl font-heading font-extrabold uppercase mb-6">Audit Defense & Compliance Readiness</h2>
            <p className="text-muted-foreground font-sans text-lg">
              Designed for procurement and legal operations, DocIntel maintains strict provenance. 
              Every extracted integer can be traced back to its exact bounding box on the source document, providing full defensibility during internal or external audits.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-background border-t-8 border-primary p-12 md:px-24 content-z relative font-mono text-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 bg-primary"></div>
              <h2 className="text-lg font-heading font-extrabold uppercase tracking-widest text-primary">DocIntel</h2>
            </div>
            <p className="text-muted-foreground text-xs uppercase tracking-widest leading-loose">
              Multimodal Document Intelligence Agent for Enterprise Back-Office.
            </p>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-foreground mb-6">Product Navigation</h4>
            <ul className="space-y-3 text-muted-foreground uppercase text-xs tracking-widest">
              <li><a href="#" className="hover:text-primary transition-colors">Review Console</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Dashboard Telemetry</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Corpus Search</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Benchmarks</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-foreground mb-6">API & Systems</h4>
            <ul className="space-y-3 text-muted-foreground uppercase text-xs tracking-widest">
              <li><a href="#" className="hover:text-primary transition-colors">/upload Endpoint</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">/extract Endpoint</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">/query Endpoint</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Swagger Docs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-foreground mb-6">Compliance & Legal</h4>
            <ul className="space-y-3 text-muted-foreground uppercase text-xs tracking-widest">
              <li><a href="#" className="hover:text-primary transition-colors">Data Retention Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">SOC 2 Alignment</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Human Review Standards</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t-2 border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
          <div>&copy; 2026 DocIntel Systems Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div> API Status: Nominal</span>
            <span>Latency: 124ms</span>
            <span>Version: V1.0.4</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
