import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';

// Auth Page
import { Login } from './pages/Login';

// Admin Pages
import { GlobalDashboard } from './pages/admin/GlobalDashboard';
import { BatchManagement } from './pages/admin/BatchManagement';
import { PRAssignment } from './pages/admin/PRAssignment';
import { AliasQueue } from './pages/admin/AliasQueue';
import { AuditLogs } from './pages/admin/AuditLogs';

// PR Pages
import { PRDashboard } from './pages/pr/PRDashboard';
import { MyStudents } from './pages/pr/MyStudents';
import { Companies } from './pages/pr/Companies';
import { RoundPasteBox } from './pages/pr/RoundPasteBox';
import { Offers } from './pages/pr/Offers';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState(user?.role === 'ADMIN' ? 'global_dashboard' : 'pr_dashboard');
  const [toasts, setToasts] = useState([]);
  
  // Navigation State between tabs
  const [preselectedCompanyId, setPreselectedCompanyId] = useState(null);
  const [preselectedRoundId, setPreselectedRoundId] = useState(null);

  const showToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync default tab if role changes
  React.useEffect(() => {
    if (user?.role === 'ADMIN') {
      setCurrentTab('global_dashboard');
    } else if (user?.role === 'PR') {
      setCurrentTab('pr_dashboard');
    }
  }, [user?.role]);

  const handleSelectCompanyForPaste = (compId, roundId) => {
    setPreselectedCompanyId(compId);
    setPreselectedRoundId(roundId);
    setCurrentTab('paste_box');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Initializing Placement Intelligence Platform...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onShowToast={showToast} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <div className="main-layout">
        <Navbar onShowToast={showToast} />

        <main className="content-area">
          {/* Admin Views */}
          {user.role === 'ADMIN' && (
            <>
              {currentTab === 'global_dashboard' && <GlobalDashboard onShowToast={showToast} />}
              {currentTab === 'batches' && <BatchManagement onShowToast={showToast} />}
              {currentTab === 'prs' && <PRAssignment onShowToast={showToast} />}
              {currentTab === 'alias_queue' && <AliasQueue onShowToast={showToast} />}
              {currentTab === 'audit_logs' && <AuditLogs onShowToast={showToast} />}
            </>
          )}

          {/* PR Views */}
          {user.role === 'PR' && (
            <>
              {currentTab === 'pr_dashboard' && <PRDashboard onShowToast={showToast} />}
              {currentTab === 'my_students' && <MyStudents onShowToast={showToast} />}
              {currentTab === 'companies' && <Companies onSelectCompanyForPaste={handleSelectCompanyForPaste} onShowToast={showToast} />}
              {currentTab === 'paste_box' && (
                <RoundPasteBox
                  preselectedCompanyId={preselectedCompanyId}
                  preselectedRoundId={preselectedRoundId}
                  onShowToast={showToast}
                />
              )}
              {currentTab === 'offers' && <Offers onShowToast={showToast} />}
              {currentTab === 'alias_queue' && <AliasQueue onShowToast={showToast} />}
            </>
          )}
        </main>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
