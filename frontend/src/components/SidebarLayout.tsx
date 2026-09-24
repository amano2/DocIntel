import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, FileText, Search, Activity, LogOut } from 'lucide-react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Review', path: '/review', icon: FileText },
    { name: 'Ask (RAG)', path: '/ask', icon: Search },
    { name: 'Benchmarks', path: '/benchmark', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-industrial-grid bg-vignette text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r-2 border-border bg-background flex flex-col m-0 shadow-none z-10">
        <div className="p-6 border-b-2 border-border">
          <div className="inline-block px-2 py-0.5 mb-2 border border-primary text-primary font-mono text-[10px] font-bold uppercase">
            SYS_ACTIVE
          </div>
          <h2 className="text-3xl font-heading font-extrabold uppercase tracking-widest text-primary">Doc<span className="text-foreground">Intel</span></h2>
          <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-widest">Enterprise Agent</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-4 mt-8">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `group flex items-center gap-4 px-3 py-3 transition-all border-l-4 ${
                  isActive 
                    ? 'border-primary bg-primary/10 text-primary font-bold' 
                    : 'border-transparent text-muted-foreground hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground font-medium'
                } font-mono uppercase text-sm tracking-wider`
              }
            >
              <item.icon size={18} className="group-hover:text-primary transition-colors" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t-2 border-border bg-background">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono truncate text-muted-foreground uppercase" title={session?.user.email}>
              USR: {session?.user.email?.split('@')[0]}
            </div>
            <button 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-primary p-2 border border-transparent hover:border-primary transition-all"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 content-z">
        <div className="h-full bg-background/95 border-2 border-border industrial-panel overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}
