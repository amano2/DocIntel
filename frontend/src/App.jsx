import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Review from './components/Review';
import Ask from './components/Ask';
import { fetchDashboardStats, uploadDocument } from './api';

export default function App() {
  // Default landing page is dashboard per user requirement
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('docintel_theme') || 'light');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [stats, setStats] = useState(null);

  // Apply theme to HTML root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('docintel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
    if (!stats) return;
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docintel_telemetry_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
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
          />
        )}

        {activeTab === 'review' && (
          <Review
            selectedDocId={selectedDocId}
            setSelectedDocId={setSelectedDocId}
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
