import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/Modal';
import { HelpCircle, CheckCircle2, Link2, Search, Sparkles } from 'lucide-react';

export function AliasQueue({ onShowToast }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Resolve Modal
  const [selectedToken, setSelectedToken] = useState(null);
  const [canonicalRegNo, setCanonicalRegNo] = useState('');
  const [formatType, setFormatType] = useState('COLLEGE_REGNO');
  const [submitting, setSubmitting] = useState(false);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/aliases/unrecognized?resolved=false');
      setTokens(res);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleOpenResolve = (tokenItem) => {
    setSelectedToken(tokenItem);
    setCanonicalRegNo('');
    setFormatType('COLLEGE_REGNO');
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!canonicalRegNo.trim()) return;
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/aliases/unrecognized/${selectedToken.id}/resolve`, {
        canonical_reg_no: canonicalRegNo.trim(),
        format_type: formatType
      });
      if (onShowToast) onShowToast(res.message || 'Token mapped successfully!', 'success');
      setSelectedToken(null);
      fetchTokens();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Alias Resolution Queue
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Unrecognized tokens captured during PR pastes. Map them once to canonical students to guarantee 100% future lookup accuracy.
          </p>
        </div>
        <button onClick={fetchTokens} className="btn btn-secondary btn-sm">
          Refresh Queue
        </button>
      </div>

      {/* Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unrecognized Token</th>
                <th>Context / Drive</th>
                <th>Batch</th>
                <th>Flagged By PR</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading queue...</td>
                </tr>
              ) : tokens.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    <CheckCircle2 size={36} color="#16a34a" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Queue Clean!</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>All tokens pasted across drives have been resolved to canonical students.</div>
                  </td>
                </tr>
              ) : (
                tokens.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="tag-mono" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}>
                        {t.token_value}
                      </span>
                    </td>
                    <td>{t.source_context || 'Paste Box'}</td>
                    <td>
                      {t.batch_year ? <span className="badge badge-primary">Batch {t.batch_year}</span> : '—'}
                    </td>
                    <td>{t.pr_name || 'Admin'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenResolve(t)}
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Link2 size={13} /> Link to Student
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={!!selectedToken}
        onClose={() => setSelectedToken(null)}
        title={`Map Token: "${selectedToken?.token_value}"`}
      >
        <form onSubmit={handleResolve}>
          <div style={{ background: '#fef3c7', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Raw Unrecognized Token</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#b45309', marginTop: '4px' }}>
              {selectedToken?.token_value}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Canonical Student Reg No (True PK)</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. 23CS001"
              value={canonicalRegNo}
              onChange={(e) => setCanonicalRegNo(e.target.value)}
              autoFocus
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Enter the primary canonical registration number this token maps to.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Alias Format Category</label>
            <select
              className="form-select"
              value={formatType}
              onChange={(e) => setFormatType(e.target.value)}
            >
              <option value="COLLEGE_REGNO">COLLEGE_REGNO (e.g. H2442**)</option>
              <option value="LONG_NUMERIC">LONG_NUMERIC (e.g. 91772442****)</option>
              <option value="SERIAL">SERIAL (e.g. 1, 2, 3...)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setSelectedToken(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Linking...' : 'Save Mapping'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
