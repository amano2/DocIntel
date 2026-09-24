import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, FileText, Search, Activity, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} border-r-2 border-border bg-background flex flex-col m-0 shadow-none z-10 transition-all duration-300 ease-in-out relative`}
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-8 bg-background border-2 border-border rounded-none p-1 text-muted-foreground hover:text-primary hover:border-primary z-20 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b-2 border-border transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'px-2 items-center flex flex-col' : ''}`}>
          {!isCollapsed ? (
            <>
              <div className="inline-block px-2 py-0.5 mb-2 border border-primary text-primary font-mono text-[10px] font-bold uppercase">
                SYS_ACTIVE
              </div>
              <h2 className="text-3xl font-heading font-extrabold uppercase tracking-widest text-primary">Doc<span className="text-foreground">Intel</span></h2>
              <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-widest">Enterprise Agent</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 flex items-center justify-center font-heading font-extrabold text-xl text-primary border-2 border-primary mb-2">
                D
              </div>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-4 mt-8 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) => 
                `group flex items-center gap-4 py-3 transition-all border-l-4 ${
                  isCollapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive 
                    ? 'border-primary bg-primary/10 text-primary font-bold' 
                    : 'border-transparent text-muted-foreground hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground font-medium'
                } font-mono uppercase text-sm tracking-wider whitespace-nowrap`
              }
            >
              <item.icon size={18} className="group-hover:text-primary transition-colors shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>
        
        <div className={`p-4 border-t-2 border-border bg-background transition-all duration-300 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center justify-between overflow-hidden">
            {!isCollapsed && (
              <div className="text-[10px] font-mono truncate text-muted-foreground uppercase" title={session?.user.email}>
                USR: {session?.user.email?.split('@')[0]}
              </div>
            )}
            <button 
              onClick={handleLogout}
              className={`text-muted-foreground hover:text-primary p-2 border border-transparent hover:border-primary transition-all shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}
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
