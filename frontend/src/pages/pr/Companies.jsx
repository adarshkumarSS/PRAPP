import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/Modal';
import { FunnelChart } from '../../components/FunnelChart';
import {
  Building2,
  Plus,
  Trash2,
  ChevronRight,
  ClipboardCheck,
  Users,
  Award,
  Layers
} from 'lucide-react';

export function Companies({ onSelectCompanyForPaste, onShowToast }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Company Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [customRounds, setCustomRounds] = useState([
    { name: 'Round 1: Online Assessment', sequence: 1 },
    { name: 'Round 2: Technical Interview', sequence: 2 },
    { name: 'Round 3: HR & Management', sequence: 3 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Add Round to existing company modal
  const [selectedCompanyForNewRound, setSelectedCompanyForNewRound] = useState(null);
  const [newRoundName, setNewRoundName] = useState('');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/companies');
      setCompanies(res);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleAddRoundRow = () => {
    setCustomRounds([
      ...customRounds,
      { name: `Round ${customRounds.length + 1}: Custom Round`, sequence: customRounds.length + 1 }
    ]);
  };

  const handleRemoveRoundRow = (idx) => {
    const updated = customRounds.filter((_, i) => i !== idx);
    setCustomRounds(updated.map((r, i) => ({ ...r, sequence: i + 1 })));
  };

  const handleRoundNameChange = (idx, val) => {
    const updated = [...customRounds];
    updated[idx].name = val;
    setCustomRounds(updated);
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await apiClient.post('/companies', {
        name: name.trim(),
        rounds: customRounds
      });
      if (onShowToast) onShowToast(`Company drive '${name}' configured!`, 'success');
      setName('');
      setIsCreateModalOpen(false);
      fetchCompanies();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id, compName) => {
    if (!window.confirm(`Delete drive '${compName}' and all its round results?`)) return;
    try {
      await apiClient.delete(`/companies/${id}`);
      if (onShowToast) onShowToast(`Drive '${compName}' deleted.`, 'info');
      fetchCompanies();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Campus Recruitment Drives
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Batch {user?.batch_year || 'Current'} • Configure Dynamic Round Funnels • Track Conversion Rates
          </p>
        </div>

        <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Configure New Drive
        </button>
      </div>

      {/* Companies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading drives...</div>
        ) : companies.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
            <Building2 size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <h3>No Recruitment Drives Configured</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
              Create your first company drive to set up rounds and start pasting candidate results.
            </p>
          </div>
        ) : (
          companies.map((company) => (
            <div key={company.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={22} color="#2563eb" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{company.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <span>Batch {company.batch_year}</span>
                      <span>•</span>
                      <span>Eligible Candidates: <b>{company.eligible_count}</b></span>
                      <span>•</span>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>{company.offers_count} Final Offers</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDeleteCompany(company.id, company.name)}
                    className="btn-icon"
                    title="Delete Drive"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Dynamic Rounds Flow & Visual Funnel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {company.rounds.map((round) => (
                  <div
                    key={round.id}
                    style={{
                      background: '#f8faff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9' }}>
                        Sequence {round.sequence}
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                        {round.cleared_count} Cleared
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{round.name}</div>

                    <button
                      onClick={() => onSelectCompanyForPaste && onSelectCompanyForPaste(company.id, round.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '4px', fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}
                    >
                      <ClipboardCheck size={13} color="#2563eb" /> Paste Results
                    </button>
                  </div>
                ))}
              </div>

              {/* Conversion Funnel Progress */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <FunnelChart
                  rounds={company.rounds}
                  eligibleCount={company.eligible_count}
                  finalOffersCount={company.offers_count}
                  companyName={company.name}
                />
              </div>

            </div>
          ))
        )}
      </div>

      {/* Create Company Modal with Dynamic Round Builder */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Configure New Company Drive & Rounds"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateCompany}>
          <div className="form-group">
            <label className="form-label">Company / Recruiter Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Google, Microsoft, Zoho, TCS..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Rounds & Selection Stages</label>
              <button
                type="button"
                onClick={handleAddRoundRow}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                <Plus size={13} /> Add Stage
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {customRounds.map((r, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="tag-mono" style={{ width: '32px', textAlign: 'center' }}>{idx + 1}</span>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ flex: 1 }}
                    value={r.name}
                    onChange={(e) => handleRoundNameChange(idx, e.target.value)}
                  />
                  {customRounds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRoundRow(idx)}
                      className="btn-icon"
                      style={{ padding: '8px' }}
                    >
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Configuring...' : 'Launch Company Drive'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
