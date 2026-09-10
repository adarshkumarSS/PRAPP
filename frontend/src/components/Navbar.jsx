import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Sparkles, Shield, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';

export function Navbar({ onShowToast }) {
  const { user, logout } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      const res = await apiClient.post('/analytics/seed-demo', {});
      if (onShowToast) onShowToast(res.message || 'Demo data loaded successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#1e3a8a' }}>
          Placement Tracker
        </h2>
        <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>Architecture v2</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Demo Data Population Button */}
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="btn btn-secondary btn-sm"
          title="Seed sample batches, PRs, students, aliases, drives, and dual offers for testing"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Sparkles size={14} color="#2563eb" />
          {seeding ? 'Seeding...' : 'Load Demo Data'}
        </button>

        {/* User Role & Batch Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px',
          background: '#eff6ff', borderRadius: '9999px', border: '1px solid #bfdbfe'
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: user?.role === 'ADMIN' ? '#ede9fe' : '#dbeafe',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {user?.role === 'ADMIN'
              ? <Shield size={14} color="#7c3aed" />
              : <User size={14} color="#2563eb" />}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{user?.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '6px' }}>
              <span>{user?.role}</span>
              {user?.role === 'PR' && (
                <span style={{ color: user?.batch_year ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  • {user?.batch_year ? `Batch ${user.batch_year}` : 'Unassigned Batch'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout */}
        <button onClick={logout} className="btn-icon" title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
