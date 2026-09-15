import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useToast } from './ToastProvider';

export const Auth: React.FC<{ onAuthSuccess: () => void, onBack: () => void }> = ({ onAuthSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { showToast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        showToast('success', 'Check your email', 'We sent a verification link to your email.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        showToast('success', 'Authenticated', 'Welcome back to DocIntel.');
        onAuthSuccess();
      }
    } catch (err: any) {
      showToast('error', 'Authentication Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090A0D] text-[#E5E5E5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#00E5FF]/30 selection:text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00E5FF]/5 via-[#090A0D] to-[#090A0D] z-0" aria-hidden="true" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <button 
          onClick={onBack}
          className="absolute -top-12 left-0 text-xs font-mono text-[#8E9097] hover:text-white transition-colors flex items-center gap-2"
        >
          ← Return
        </button>
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded bg-[#141518] border border-[#2A2C31] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.15)]">
            <ShieldCheck className="w-6 h-6 text-[#00E5FF]" />
          </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-light text-white tracking-tight">
          {isSignUp ? 'Initialize Workspace' : 'System Access'}
        </h2>
        <p className="mt-2 text-center text-sm text-[#8E9097]">
          Secure multi-tenant authentication via Supabase
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#141518] py-8 px-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[#2A2C31] rounded sm:px-10">
          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-xs font-mono tracking-wider text-[#8E9097] uppercase">
                Enterprise Email
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#4A4C52]" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 bg-[#0B0C0E] border border-[#2A2C31] rounded text-sm text-white placeholder-[#4A4C52] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] outline-none transition-colors py-2.5"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono tracking-wider text-[#8E9097] uppercase">
                Access Token (Password)
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#4A4C52]" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 bg-[#0B0C0E] border border-[#2A2C31] rounded text-sm text-white placeholder-[#4A4C52] focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] outline-none transition-colors py-2.5"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded shadow-sm text-sm font-medium text-[#090A0D] bg-[#E5E5E5] hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#090A0D] focus:ring-[#E5E5E5] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? 'Provision Instance' : 'Authenticate')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2A2C31]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#141518] text-[#8E9097] text-xs font-mono uppercase">Protocol Switching</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-medium text-[#00E5FF] hover:text-[#00c9e0] transition-colors"
              >
                {isSignUp ? 'Already have access? Authenticate instead.' : 'Request enterprise access? Provision here.'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
