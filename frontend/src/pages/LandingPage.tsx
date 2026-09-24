import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-industrial-grid bg-vignette text-foreground">
      {/* Left Marketing Side */}
      <div className="flex-1 p-12 flex flex-col justify-center relative overflow-hidden content-z">
        <div className="z-10 max-w-2xl">
          <div className="inline-block px-3 py-1 mb-6 border-2 border-primary text-primary font-mono text-xs font-bold uppercase animate-reveal">
            DocIntel System V1.0
          </div>
          <h1 className="text-6xl md:text-7xl font-bold uppercase leading-none mb-6 animate-reveal delay-100">
            Intelligent <br/>
            <span className="text-primary border-b-4 border-primary pb-1">Document</span> <br/>
            Review.
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-lg font-sans font-light animate-reveal delay-200">
            Automate manual review of invoices, contracts, and compliance PDFs. 
            Extract structured fields, flag anomalies, and query across your entire corpus instantly.
          </p>
          <ul className="space-y-6 text-sm font-mono animate-reveal delay-300">
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 mt-0.5 bg-primary text-primary-foreground flex items-center justify-center font-bold">01</div>
              <span className="text-base text-secondary-foreground">Process both native text and scanned PDFs</span>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 mt-0.5 bg-primary text-primary-foreground flex items-center justify-center font-bold">02</div>
              <span className="text-base text-secondary-foreground">Deterministic rules & LLM anomaly catching</span>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-6 h-6 mt-0.5 bg-primary text-primary-foreground flex items-center justify-center font-bold">03</div>
              <span className="text-base text-secondary-foreground">Full RAG semantic search across documents</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right Auth Side */}
      <div className="w-full md:w-[500px] p-8 flex items-center justify-center content-z animate-reveal delay-400">
        <div className="w-full industrial-panel p-8">
          <div className="mb-8 border-b-2 border-border pb-4">
            <h2 className="text-3xl font-heading font-bold uppercase">{isLogin ? 'Initialize' : 'Create Access'}</h2>
            <p className="text-muted-foreground font-mono text-sm mt-2">
              {isLogin ? 'Provide credentials to proceed' : 'Establish new security clearance'}
            </p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">ID_EMAIL</label>
              <Input 
                type="email" 
                placeholder="operative@enterprise.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="bg-background/80 border-2 rounded-none h-12 focus-visible:ring-0 focus-visible:border-primary font-mono"
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
                className="bg-background/80 border-2 rounded-none h-12 focus-visible:ring-0 focus-visible:border-primary font-mono"
              />
            </div>
            
            {error && <div className="text-sm text-destructive font-mono border-l-4 border-destructive pl-3 py-2 bg-destructive/10">{error}</div>}
            
            <Button type="submit" className="w-full h-14 font-heading font-bold uppercase tracking-widest text-lg brutalist-button" disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Execute Login' : 'Register Identity')}
            </Button>
          </form>
          
          <div className="mt-8 pt-6 border-t-2 border-border text-center text-sm font-mono">
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              {isLogin ? ">> Switch to Registration" : ">> Switch to Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
