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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/30 flex flex-col glass-card m-4 rounded-xl shadow-lg">
        <div className="p-6">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Doc<span className="text-foreground">Intel</span></h2>
          <p className="text-xs text-muted-foreground mt-1">Enterprise Review Agent</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="text-xs truncate text-muted-foreground" title={session?.user.email}>
              {session?.user.email}
            </div>
            <button 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 pl-0">
        <div className="h-full bg-card/10 border border-border/30 rounded-xl overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}
