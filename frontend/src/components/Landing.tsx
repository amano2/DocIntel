import React from 'react';
import { ChevronRight, ShieldCheck, Zap, Database, Lock, Search } from 'lucide-react';

export const Landing: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-[#090A0D] text-[#E5E5E5] font-sans selection:bg-[#00E5FF]/30 selection:text-white relative overflow-x-hidden">
      {/* Premium Radial Background Glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00E5FF]/10 via-[#090A0D] to-[#090A0D] z-0" aria-hidden="true" />
      
      {/* Navigation */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#141518] border border-[#2A2C31] flex items-center justify-center">
            <div className="w-3 h-3 bg-[#00E5FF]" style={{ boxShadow: '0 0 10px #00E5FF' }}></div>
          </div>
          <span className="font-serif italic font-medium text-lg tracking-wide text-white">DocIntel</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8E9097]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <button
          onClick={onGetStarted}
          className="px-5 py-2 text-sm font-medium bg-[#E5E5E5] text-[#090A0D] hover:bg-white transition-all rounded shadow-[0_0_15px_rgba(229,229,229,0.3)] hover:scale-105"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-32 pb-24 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 border border-[#2A2C31] bg-[#141518] rounded-full text-xs font-mono text-[#00E5FF] tracking-wider uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E5FF]"></span>
          </span>
          DocIntel Multimodal V3 is Live
        </div>
        <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white mb-6" style={{ lineHeight: 1.1 }}>
          The operating system for <br className="hidden md:block" />
          <span className="font-serif italic text-[#8E9097]">unstructured compliance.</span>
        </h1>
        <p className="text-lg md:text-xl text-[#8E9097] max-w-2xl mb-12 font-light">
          Ingest, audit, and interrogate contracts and invoices with a fully autonomous multimodal AI engine. Stop manual reviews. Start shipping.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[#00E5FF] text-[#090A0D] text-sm font-medium rounded hover:bg-[#00c9e0] transition-colors shadow-[0_0_30px_rgba(0,229,255,0.2)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)]"
          >
            Deploy Your Agent <ChevronRight className="w-4 h-4" />
          </button>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[#141518] border border-[#2A2C31] text-white text-sm font-medium rounded hover:bg-[#1c1d21] transition-colors">
            Read the Specs
          </button>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[#141518] border border-[#2A2C31] p-8 rounded flex flex-col justify-between group hover:border-[#4A4C52] transition-colors overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 mb-24">
              <Zap className="w-6 h-6 text-[#00E5FF] mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Multimodal Vision Engine</h3>
              <p className="text-[#8E9097] max-w-md text-sm leading-relaxed">
                Seamlessly parse rasterized scans and text-layer PDFs in the same pipeline. OpenRouter multimodal integration ensures pixel-perfect extraction.
              </p>
            </div>
            <div className="relative z-10 border-t border-[#2A2C31] pt-6 flex justify-between items-center text-xs font-mono text-[#8E9097]">
              <span>Powered by Gemini Pro Vision</span>
              <span className="text-[#00E5FF]">98.5% Accuracy</span>
            </div>
          </div>
          
          <div className="bg-[#141518] border border-[#2A2C31] p-8 rounded flex flex-col justify-between group hover:border-[#4A4C52] transition-colors">
            <div className="mb-24">
              <Database className="w-6 h-6 text-[#C5B358] mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Supabase pgvector</h3>
              <p className="text-[#8E9097] text-sm leading-relaxed">
                Massive-scale enterprise RAG backed by Postgres vector search and multi-tenant isolated schemas.
              </p>
            </div>
            <div className="border-t border-[#2A2C31] pt-6 text-xs font-mono text-[#8E9097]">
              Sub-50ms Query Latency
            </div>
          </div>

          <div className="bg-[#141518] border border-[#2A2C31] p-8 rounded flex flex-col justify-between group hover:border-[#4A4C52] transition-colors">
            <div className="mb-24">
              <ShieldCheck className="w-6 h-6 text-[#E5E5E5] mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Deterministic Audit</h3>
              <p className="text-[#8E9097] text-sm leading-relaxed">
                Arithmetic invariant checks run post-extraction. Flag math discrepancies instantly.
              </p>
            </div>
            <div className="border-t border-[#2A2C31] pt-6 text-xs font-mono text-[#8E9097]">
              SOC 2 Ready Architecture
            </div>
          </div>
          
          <div className="md:col-span-2 bg-[#141518] border border-[#2A2C31] p-8 rounded flex flex-col justify-between group hover:border-[#4A4C52] transition-colors overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay pointer-events-none" />
            <div className="relative z-10 mb-24">
              <Search className="w-6 h-6 text-[#00E5FF] mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Grounded RAG Studio</h3>
              <p className="text-[#8E9097] max-w-md text-sm leading-relaxed">
                Interrogate your entire compliance corpus using natural language. Citations map directly back to the original page snippet.
              </p>
            </div>
            <div className="relative z-10 border-t border-[#2A2C31] pt-6 flex justify-between items-center text-xs font-mono text-[#8E9097]">
              <span>"What is the total vendor spend across Q3?"</span>
              <span className="text-[#00E5FF]">Aggregate SQL + RAG</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#2A2C31] bg-[#090A0D] py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#141518] border border-[#2A2C31] flex items-center justify-center">
              <div className="w-2 h-2 bg-[#00E5FF]"></div>
            </div>
            <span className="font-serif italic text-sm text-white">DocIntel Inc.</span>
          </div>
          <div className="flex gap-6 text-xs font-mono text-[#8E9097]">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">System Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
