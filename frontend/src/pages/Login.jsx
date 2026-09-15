import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, LogIn } from 'lucide-react';

export function Login({ onShowToast }) {
  const { login } = useAuth();
  const [roleTab, setRoleTab] = useState('ADMIN');
  const [email, setEmail] = useState('admin@tce.edu');
  const [password, setPassword] = useState('Admin@TCE2027');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSwitchTab = (tab) => {
    setRoleTab(tab);
    setError(null);
    if (tab === 'ADMIN') {
      setEmail('admin@tce.edu');
      setPassword('Admin@TCE2027');
    } else {
      setEmail('pr.arun@tce.edu');
      setPassword('PR@TCE2027');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@tce.edu')) {
      setError('Access restricted: Only official @tce.edu email addresses are permitted.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(cleanEmail, password, roleTab);
      if (onShowToast) onShowToast(`Welcome back! Logged in as ${roleTab}.`, 'success');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #e0e7ff 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: '-80px', left: '-80px',
        width: '320px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', right: '-60px',
        width: '280px', height: '280px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%', maxWidth: '440px', padding: '36px',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(15,23,42,0.12), 0 4px 16px rgba(37,99,235,0.08)',
        border: '1px solid #dbeafe',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '1.5rem', marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)'
          }}>
            PT
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px', color: '#0f172a' }}>
            Placement Tracker
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Architecture v2 — Batch-Based Intelligence
          </p>
        </div>

        {/* Role Tab Selector */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
          background: '#f0f4ff', padding: '6px', borderRadius: '12px',
          marginBottom: '24px', border: '1px solid #dbeafe'
        }}>
          <button
            type="button"
            onClick={() => handleSwitchTab('ADMIN')}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: roleTab === 'ADMIN' ? '#ffffff' : 'transparent',
              color: roleTab === 'ADMIN' ? '#1d4ed8' : '#64748b',
              fontWeight: roleTab === 'ADMIN' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s ease',
              border: roleTab === 'ADMIN' ? '1px solid #bfdbfe' : '1px solid transparent',
              boxShadow: roleTab === 'ADMIN' ? '0 2px 8px rgba(37,99,235,0.12)' : 'none',
              fontFamily: 'inherit'
            }}
          >
            <Shield size={15} /> Admin Portal
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('PR')}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: roleTab === 'PR' ? '#ffffff' : 'transparent',
              color: roleTab === 'PR' ? '#7c3aed' : '#64748b',
              fontWeight: roleTab === 'PR' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s ease',
              border: roleTab === 'PR' ? '1px solid #ddd6fe' : '1px solid transparent',
              boxShadow: roleTab === 'PR' ? '0 2px 8px rgba(124,58,237,0.12)' : 'none',
              fontFamily: 'inherit'
            }}
          >
            <Users size={15} /> PR Console
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address (@tce.edu)</label>
            <input
              type="email"
              required
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. pr.arun@tce.edu"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '13px' }}
          >
            <LogIn size={18} /> {loading ? 'Authenticating...' : `Log In as ${roleTab}`}
          </button>
        </form>

        {/* Quick Login Preset Buttons */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginBottom: '10px', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Credentials — Ready to Test
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={() => { setRoleTab('ADMIN'); setEmail('admin@tce.edu'); setPassword('Admin@TCE2027'); }}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', fontSize: '0.78rem', padding: '9px 12px' }}
            >
              <span>👑 Admin: <b>admin@tce.edu</b></span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>Admin@TCE2027</span>
            </button>
            <button
              type="button"
              onClick={() => { setRoleTab('PR'); setEmail('pr.arun@tce.edu'); setPassword('PR@TCE2027'); }}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'space-between', fontSize: '0.78rem', padding: '9px 12px' }}
            >
              <span>🎓 PR (2027): <b>pr.arun@tce.edu</b></span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>PR@TCE2027</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
