import React from 'react';

export function MetricCard({ title, value, subtitle, icon: Icon, badge, color = 'primary', progress }) {
  const colorMap = {
    primary: {
      bg: '#dbeafe',
      text: '#1d4ed8',
      bar: '#3b82f6',
      border: '#bfdbfe'
    },
    accent: {
      bg: '#ede9fe',
      text: '#6d28d9',
      bar: '#7c3aed',
      border: '#ddd6fe'
    },
    warning: {
      bg: '#fef3c7',
      text: '#b45309',
      bar: '#f59e0b',
      border: '#fde68a'
    },
    danger: {
      bg: '#fee2e2',
      text: '#b91c1c',
      bar: '#dc2626',
      border: '#fecaca'
    },
    info: {
      bg: '#e0f2fe',
      text: '#0369a1',
      bar: '#0284c7',
      border: '#bae6fd'
    }
  };

  const scheme = colorMap[color] || colorMap.primary;

  return (
    <div className="glass-card" style={{ position: 'relative', overflow: 'hidden', borderTop: `3px solid ${scheme.bar}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        {Icon && (
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: scheme.bg, border: `1px solid ${scheme.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={18} color={scheme.text} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>{value}</span>
        {badge && (
          <span className={`badge badge-${color}`} style={{ fontSize: '0.68rem' }}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          {subtitle}
        </div>
      )}

      {typeof progress === 'number' && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ height: '6px', width: '100%', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: `linear-gradient(90deg, ${scheme.bar} 0%, ${scheme.text} 100%)`,
                borderRadius: '999px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
