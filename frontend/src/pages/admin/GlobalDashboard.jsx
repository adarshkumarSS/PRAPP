import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { MetricCard } from '../../components/MetricCard';
import { FunnelChart } from '../../components/FunnelChart';
import {
  Users,
  GraduationCap,
  Award,
  Layers,
  Building2,
  TrendingUp,
  Briefcase,
  Sparkles,
  Trophy
} from 'lucide-react';

export function GlobalDashboard({ onShowToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/analytics/dashboard?scope=GLOBAL');
      setData(res);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Global Analytics...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Global Placement Intelligence
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Cross-Batch Rollup • Dual-Offer Statistics • PR Performance Leaderboard
          </p>
        </div>
        <button onClick={fetchDashboard} className="btn btn-secondary btn-sm">
          Refresh Real-time
        </button>
      </div>

      {/* KPI Headline Metrics */}
      <div className="grid-metrics">
        <MetricCard
          title="Unique Students Placed"
          value={data?.unique_placed ?? 0}
          subtitle={`Out of ${data?.total_students ?? 0} registered candidates`}
          icon={GraduationCap}
          badge={`${data?.placement_pct ?? 0}% Rate`}
          color="primary"
          progress={data?.placement_pct}
        />

        <MetricCard
          title="Total Offers Secured"
          value={data?.total_offers ?? 0}
          subtitle={`${data?.multi_offer_students ?? 0} candidates hold multiple offers`}
          icon={Award}
          badge={data?.total_offers > data?.unique_placed ? 'Multi-Offers' : 'Active'}
          color="accent"
        />

        <MetricCard
          title="Active Batches"
          value={data?.total_batches ?? 0}
          subtitle={`${data?.total_prs ?? 0} PR coordinators assigned`}
          icon={Layers}
          color="info"
        />

        <MetricCard
          title="Campus Drives Run"
          value={data?.total_companies ?? 0}
          subtitle={data?.avg_package ? `Avg CTC: ${data.avg_package} LPA` : 'Drives in progress'}
          icon={Building2}
          badge={data?.highest_package ? `Max: ${data.highest_package} LPA` : undefined}
          color="warning"
        />
      </div>

      {/* Batches Side-by-Side Comparison */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Batch-Wise Placement Rollup</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comparative placement metrics across graduation years</p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch Year</th>
                <th>Total Students</th>
                <th>Unique Placed</th>
                <th>Total Offers</th>
                <th>Multi-Offer Students</th>
                <th>Placement %</th>
                <th>Avg / Max CTC</th>
              </tr>
            </thead>
            <tbody>
              {data?.batches_summary?.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No batches created yet.</td>
                </tr>
              ) : (
                data?.batches_summary?.map((b) => (
                  <tr key={b.batch_id}>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.82rem' }}>
                        Batch {b.year_label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{b.total_students}</td>
                    <td style={{ color: '#16a34a', fontWeight: 700 }}>{b.unique_placed}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{b.total_offers}</span>
                    </td>
                    <td>
                      {b.multi_offer_students > 0 ? (
                        <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                          {b.multi_offer_students} students
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '80px', height: '6px', background: '#dbeafe', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${b.placement_pct}%`, background: '#2563eb' }} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>{b.placement_pct}%</span>
                      </div>
                    </td>
                    <td>
                      {b.avg_package ? `${b.avg_package} LPA / ${b.max_package} LPA` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: PR Performance Leaderboard + Company Clear Rates */}
      <div className="grid-cols-2">
        
        {/* PR Leaderboard */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Trophy size={20} color="#fbbf24" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>PR Performance Leaderboard</h3>
          </div>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Coordinator</th>
                  <th>Assigned Batch</th>
                  <th>Students</th>
                  <th>Placed</th>
                  <th>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {data?.pr_leaderboard?.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No PR coordinators registered.</td>
                  </tr>
                ) : (
                  data?.pr_leaderboard?.map((p, idx) => (
                    <tr key={p.pr_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.pr_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.pr_email}</div>
                      </td>
                      <td>
                        {p.batch_year ? (
                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Batch {p.batch_year}</span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Unassigned</span>
                        )}
                      </td>
                      <td>{p.total_students_added}</td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>{p.unique_placed}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: p.placement_pct > 50 ? '#16a34a' : '#d97706' }}>
                          {p.placement_pct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Company Round-1 Clear Rates */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Briefcase size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Drive Clear & Conversion Rates</h3>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Batch</th>
                  <th>Eligible</th>
                  <th>R1 Clear %</th>
                  <th>Offers</th>
                </tr>
              </thead>
              <tbody>
                {data?.company_clear_rates?.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No campus drives conducted yet.</td>
                  </tr>
                ) : (
                  data?.company_clear_rates?.map((c) => (
                    <tr key={c.company_id}>
                      <td style={{ fontWeight: 600 }}>{c.company_name}</td>
                      <td><span className="tag-mono">{c.batch_year || '—'}</span></td>
                      <td>{c.eligible_count}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                          {c.round_1_cleared} ({c.round_1_clear_pct}%)
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                          {c.final_offers_count} ({c.conversion_pct}%)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
