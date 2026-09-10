import React from 'react';

export function FunnelChart({ rounds = [], eligibleCount = 0, finalOffersCount = 0, companyName = '' }) {
  // Construct funnel stages: 1. Total Eligible -> 2. Each Round Cleared -> 3. Final Offers
  const stages = [
    { label: 'Eligible Pool', count: eligibleCount, color: '#2563eb' },
    ...rounds.map((r, idx) => ({
      label: r.name,
      count: r.cleared_count || 0,
      color: idx === 0 ? '#0284c7' : idx === 1 ? '#0369a1' : '#16a34a'
    })),
    { label: 'Offers Given', count: finalOffersCount, color: '#16a34a' }
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {stages.map((stage, idx) => {
        const pct = eligibleCount > 0 ? Math.round((stage.count / eligibleCount) * 100) : 0;
        const widthPct = Math.max(12, Math.round((stage.count / maxCount) * 100));

        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stage.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: stage.color }}>{stage.count} students</span>
                <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{pct}%</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${widthPct}%`,
                  background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}99 100%)`,
                  borderRadius: '6px',
                  transition: 'width 0.5s ease-out'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
