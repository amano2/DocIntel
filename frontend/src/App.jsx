import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Review from './components/Review';
import Ask from './components/Ask';
import { fetchDashboardStats, getExportAllUrl } from './api';
import { useToast } from './components/ToastProvider';

export default function App() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('docintel_theme') || 'light');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [stats, setStats] = useState(null);
  const [anomalyFilterPreset, setAnomalyFilterPreset] = useState(null);

  // Apply theme to HTML root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('docintel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Global hotkeys (Ctrl/Cmd + K, Escape)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('ask');
        toast.info('Cross-document Q&A studio activated (⌘K)', 'Shortcut');
      } else if (e.key === 'Escape') {
        setAnomalyFilterPreset(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toast]);

  // Load dashboard statistics
  const loadStats = async () => {
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalUpload = () => {
    setActiveTab('review');
  };

  const handleGlobalExport = () => {
    toast.info('Compiling batch export archive (JSON manifests + CSV audit summary)...', 'Export Started');
    const exportUrl = getExportAllUrl();
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = `docintel_enterprise_export_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-app)' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        toggleTheme={toggleTheme}
        onUploadClick={handleGlobalUpload}
        onExportClick={handleGlobalExport}
      />

      <main style={{ flex: 1, paddingBottom: '32px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            onSelectDocument={setSelectedDocId}
            onSwitchTab={setActiveTab}
            onSetAnomalyFilter={setAnomalyFilterPreset}
          />
        )}

        {activeTab === 'review' && (
          <Review
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
            anomalyFilterPreset={anomalyFilterPreset}
          />
        )}

        {activeTab === 'ask' && (
          <Ask
            onSelectDocument={setSelectedDocId}
            onSwitchTab={setActiveTab}
          />
        )}
      </main>
    </div>
  );
}
