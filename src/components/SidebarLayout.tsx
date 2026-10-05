import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  FileText, 
  Search, 
  Activity, 
  LogOut, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

const STORAGE_KEY = 'docintel_sidebar_collapsed';

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let globalCollapsed = getInitialCollapsed();
const listeners = new Set<(val: boolean) => void>();

function setGlobalCollapsed(val: boolean) {
  globalCollapsed = val;
  try {
    localStorage.setItem(STORAGE_KEY, String(val));
  } catch {}
  listeners.forEach((fn) => fn(val));
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(globalCollapsed);

  useEffect(() => {
    listeners.add(setCollapsed);
    return () => {
      listeners.delete(setCollapsed);
    };
  }, []);

  return [collapsed, setGlobalCollapsed] as const;
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useSidebarCollapsed();

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
      {/* Sidebar with smooth cubic-bezier width transition */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } border-r-2 border-border bg-background flex flex-col m-0 shadow-none z-10 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] relative will-change-[width]`}
      >
        <button 
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-8 bg-background border-2 border-border rounded-none p-1 text-muted-foreground hover:text-primary hover:border-primary z-20 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Header Branding with smooth cross-fade */}
        <div className={`p-6 border-b-2 border-border overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'px-3 items-center flex flex-col' : ''}`}>
          <div className="relative w-full min-h-[64px] flex items-center">
            {/* Expanded Brand View */}
            <div 
              className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isCollapsed 
                  ? 'opacity-0 -translate-x-4 pointer-events-none absolute' 
                  : 'opacity-100 translate-x-0 relative'
              }`}
            >
              <div className="inline-block px-2 py-0.5 mb-2 border border-primary text-primary font-mono text-[10px] font-bold uppercase">
                SYS_ACTIVE
              </div>
              <h2 className="text-3xl font-heading font-extrabold uppercase tracking-widest text-primary">
                Doc<span className="text-foreground">Intel</span>
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">
                Enterprise Agent
              </p>
            </div>
            
            {/* Collapsed Compact Brand View */}
            <div 
              className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col items-center justify-center w-full ${
                isCollapsed 
                  ? 'opacity-100 scale-100 relative' 
                  : 'opacity-0 scale-75 pointer-events-none absolute inset-0'
              }`}
            >
              <div className="w-8 h-8 flex items-center justify-center font-heading font-extrabold text-xl text-primary border-2 border-primary mb-1">
                D
              </div>
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-2 mt-6 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) => 
                `group flex items-center gap-3.5 py-3 px-3 transition-colors duration-200 border-l-4 ${
                  isActive 
                    ? 'border-primary bg-primary/10 text-primary font-bold' 
                    : 'border-transparent text-muted-foreground hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground font-medium'
                } font-mono uppercase text-sm tracking-wider whitespace-nowrap`
              }
            >
              <item.icon size={18} className="group-hover:text-primary transition-colors duration-200 shrink-0" />
              <span 
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
                  isCollapsed ? 'w-0 opacity-0 -translate-x-2' : 'w-auto opacity-100 translate-x-0'
                }`}
              >
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>
        
        {/* User Footer */}
        <div className="p-4 border-t-2 border-border bg-background transition-all duration-300">
          <div className="flex items-center justify-between overflow-hidden gap-2">
            <div 
              className={`text-[10px] font-mono truncate text-muted-foreground uppercase transition-all duration-300 ${
                isCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'
              }`} 
              title={session?.user.email}
            >
              USR: {session?.user.email?.split('@')[0]}
            </div>
            <button 
              type="button"
              onClick={handleLogout}
              className={`text-muted-foreground hover:text-primary p-2 border border-transparent hover:border-primary transition-all duration-200 shrink-0 cursor-pointer ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
          {!isCollapsed && (
            <div className="mt-3 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground tracking-wider lowercase">
              developed by <span className="text-primary font-bold">&lt;/aman.dev/&gt;</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden p-3 sm:p-5 lg:p-6 content-z flex flex-col">
        <div className="flex-1 min-w-0 min-h-0 bg-background/95 border-2 border-border industrial-panel overflow-hidden relative flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
