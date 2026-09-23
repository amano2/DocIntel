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
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Left Marketing Side */}
      <div className="flex-1 p-10 flex flex-col justify-center bg-gradient-to-br from-background to-secondary/30 relative overflow-hidden">
        <div className="z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">
            Intelligent Document Review for <span className="text-primary">Enterprise</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Automate manual review of invoices, contracts, and compliance PDFs. 
            Extract structured fields, flag anomalies, and query across your entire corpus instantly.
          </p>
          <ul className="space-y-4 text-sm font-medium">
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
              Process both text-layer and scanned PDFs
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
              Deterministic rules & LLM anomaly catching
            </li>
            <li className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">✓</div>
              Full RAG semantic search across documents
            </li>
          </ul>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/20 rounded-full blur-[80px] pointer-events-none" />
      </div>

      {/* Right Auth Side */}
      <div className="w-full md:w-[450px] p-8 flex items-center justify-center border-l border-border/50 bg-card/30 backdrop-blur-sm">
        <Card className="w-full border-none shadow-none bg-transparent">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl">{isLogin ? 'Welcome Back' : 'Create an Account'}</CardTitle>
            <CardDescription>
              {isLogin ? 'Sign in to access your dashboard' : 'Start automating your document workflow today'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="you@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="bg-background/50"
                />
              </div>
              
              {error && <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-md">{error}</div>}
              
              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <button 
                type="button" 
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
