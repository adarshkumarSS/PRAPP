import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  Users,
  GraduationCap,
  Building2,
  ClipboardCheck,
  Award,
  HelpCircle,
  FileText,
  Sparkles
} from 'lucide-react';

export function Sidebar({ currentTab, onSelectTab }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const adminNav = [
    { id: 'global_dashboard', label: 'Global Analytics', icon: LayoutDashboard },
    { id: 'batches', label: 'Batches', icon: Layers },
    { id: 'prs', label: 'PR Management', icon: Users },
    { id: 'alias_queue', label: 'Alias Resolution Queue', icon: HelpCircle },
    { id: 'audit_logs', label: 'Audit Trail', icon: FileText },
  ];

  const prNav = [
    { id: 'pr_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my_students', label: 'My Students', icon: GraduationCap },
    { id: 'companies', label: 'Companies & Drives', icon: Building2 },
    { id: 'paste_box', label: 'Round Results Box', icon: ClipboardCheck },
    { id: 'offers', label: 'Offers & Placements', icon: Award },
    { id: 'alias_queue', label: 'Unrecognized Queue', icon: HelpCircle },
  ];

  const navItems = isAdmin ? adminNav : prNav;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '1rem',
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
        }}>
          PT
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
            Placement Tracker
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>
            {isAdmin ? 'Administration Portal' : 'PR Drive Console'}
          </div>
        </div>
      </div>

      {/* Nav Section Label */}
      <nav className="sidebar-nav">
        <div style={{
          padding: '0 10px 8px 10px',
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.40)',
          fontWeight: 700
        }}>
          {isAdmin ? 'System Control' : 'Drive Operations'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* PR Batch Info Footer */}
      {!isAdmin && (
        <div style={{
          padding: '14px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255,255,255,0.15)',
          marginTop: 'auto'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: '6px' }}>
            Active Batch Context
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff' }}>
              {user?.batch_year ? `Batch ${user.batch_year}` : 'No Batch Assigned'}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px',
              borderRadius: '999px',
              background: user?.batch_year ? 'rgba(134, 239, 172, 0.2)' : 'rgba(252, 165, 165, 0.2)',
              color: user?.batch_year ? '#86efac' : '#fca5a5',
              border: `1px solid ${user?.batch_year ? 'rgba(134,239,172,0.35)' : 'rgba(252,165,165,0.35)'}`
            }}>
              {user?.batch_year ? 'Active' : 'Locked'}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
