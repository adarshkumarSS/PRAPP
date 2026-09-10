import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { MetricCard } from '../../components/MetricCard';
import { FunnelChart } from '../../components/FunnelChart';
import {
  GraduationCap,
  Award,
  Building2,
  AlertTriangle,
  Sparkles,
  Users,
  CheckCircle2
} from 'lucide-react';

export function PRDashboard({ onShowToast }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/analytics/dashboard');
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

  if (!user?.batch_id) {
    return (
      <div className="glass-card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--warning-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <AlertTriangle size={30} color="#d97706" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Batch Assignment Required</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '20px' }}>
          Your PR account has been registered, but you have not yet been assigned to an active graduation batch by an Administrator.
          Once assigned, you will be able to manage students, drives, paste round results, and log offers.
        </p>
        <button onClick={() => window.location.reload()} className="btn btn-secondary">
          Check Assignment Status
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Batch {user.batch_year} Dashboard
            </h1>
            <span className="badge badge-primary">Active PR Console</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Placement Funnel Analytics & Student Performance Tracking
          </p>
        </div>
        <button onClick={fetchDashboard} className="btn btn-secondary btn-sm">
          Refresh Metrics
        </button>
      </div>

      {/* Headline Metric Cards */}
      <div className="grid-metrics">
        <MetricCard
          title="Unique Placed Students"
          value={data?.unique_placed ?? 0}
          subtitle={`Out of ${data?.total_students ?? 0} total candidates in batch`}
          icon={GraduationCap}
          badge={`${data?.placement_pct ?? 0}%`}
          color="primary"
          progress={data?.placement_pct}
        />

        <MetricCard
          title="Total Offers Logged"
          value={data?.total_offers ?? 0}
          subtitle={`${data?.multi_offer_students ?? 0} students with multiple offers`}
          icon={Award}
          badge={data?.total_offers > data?.unique_placed ? 'Multi-Offers Active' : undefined}
          color="accent"
        />

        <MetricCard
          title="Campus Drives Active"
          value={data?.total_companies ?? 0}
          subtitle="Registered recruiters for this batch"
          icon={Building2}
          color="info"
        />

        <MetricCard
          title="Highest CTC Package"
          value={data?.highest_package ? `${data.highest_package} LPA` : '—'}
          subtitle={data?.avg_package ? `Avg Package: ${data.avg_package} LPA` : 'Pending offers'}
          icon={Sparkles}
          color="warning"
        />
      </div>

      {/* Company Clear Rates & Funnel Cards */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>Active Drive Clear & Conversion Rates</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Round 1 clear rates are weighted against the eligible candidate denominator.
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company / Drive</th>
                <th>Eligible Pool</th>
                <th>Round 1 Cleared</th>
                <th>Final Offers</th>
                <th>Conversion %</th>
              </tr>
            </thead>
            <tbody>
              {data?.company_clear_rates?.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No campus drives created for this batch yet.
                  </td>
                </tr>
              ) : (
                data?.company_clear_rates?.map((comp) => (
                  <tr key={comp.company_id}>
                    <td style={{ fontWeight: 600 }}>{comp.company_name}</td>
                    <td>{comp.eligible_count} candidates</td>
                    <td>
                      <span className="badge badge-info">
                        {comp.round_1_cleared} ({comp.round_1_clear_pct}%)
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-primary">
                        {comp.final_offers_count} offers
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#16a34a' }}>{comp.conversion_pct}%</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
