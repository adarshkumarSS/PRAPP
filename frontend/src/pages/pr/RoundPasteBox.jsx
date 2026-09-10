import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Building2,
  Layers,
  HelpCircle
} from 'lucide-react';

export function RoundPasteBox({ preselectedCompanyId, preselectedRoundId, onShowToast }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(preselectedCompanyId || '');
  const [selectedRoundId, setSelectedRoundId] = useState(preselectedRoundId || '');
  
  const [rawText, setRawText] = useState('');
  const [resolving, setResolving] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [committing, setCommitting] = useState(false);

  // Fetch companies for dropdown
  const fetchCompanies = async () => {
    try {
      const res = await apiClient.get('/companies');
      setCompanies(res);
      if (res.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(res[0].id);
        if (res[0].rounds?.length > 0 && !selectedRoundId) {
          setSelectedRoundId(res[0].rounds[0].id);
        }
      }
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const availableRounds = selectedCompany?.rounds || [];

  const handleCompanyChange = (compId) => {
    setSelectedCompanyId(compId);
    const comp = companies.find(c => c.id === compId);
    if (comp?.rounds?.length > 0) {
      setSelectedRoundId(comp.rounds[0].id);
    } else {
      setSelectedRoundId('');
    }
    setDiffResult(null);
  };

  // Preview Diff via Alias Resolution Layer
  const handlePreviewDiff = async () => {
    if (!selectedRoundId) {
      if (onShowToast) onShowToast('Please select a company and round first.', 'error');
      return;
    }
    if (!rawText.trim()) {
      if (onShowToast) onShowToast('Please paste tokens or registration numbers.', 'error');
      return;
    }

    try {
      setResolving(true);
      const res = await apiClient.post(`/rounds/${selectedRoundId}/diff`, {
        raw_text: rawText
      });
      setDiffResult(res);
      if (onShowToast) {
        onShowToast(
          `Resolved: ${res.matched_count} candidates matched (${res.unrecognized_count} unrecognized).`,
          res.unrecognized_count > 0 ? 'info' : 'success'
        );
      }
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setResolving(false);
    }
  };

  // Commit results to Round
  const handleCommit = async () => {
    if (!diffResult || diffResult.diff_items.length === 0) return;

    try {
      setCommitting(true);
      const commitItems = diffResult.diff_items.map(item => ({
        student_reg_no: item.student_reg_no,
        status: item.new_status
      }));

      const res = await apiClient.post(`/rounds/${selectedRoundId}/commit`, {
        round_id: selectedRoundId,
        results: commitItems
      });

      if (onShowToast) onShowToast(res.message || 'Results committed successfully!', 'success');
      setRawText('');
      setDiffResult(null);
      fetchCompanies();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setCommitting(false);
    }
  };

  // Demo sample text populator
  const handleLoadSamplePaste = () => {
    // Paste mixed formats: Canonical, College RegNo (H2442**), Long Numeric (91772442****), Serial (1, 2)
    const sample = `H244201\n917724420002\n3\n23CS004\nH244205\nUNKNOWN999`;
    setRawText(sample);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Round Results Paste Box
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Paste candidate tokens in <b>any format</b> (College RegNo, Long Numeric, Serial, or Canonical). 
          The alias layer resolves identities with 100% precision before committing.
        </p>
      </div>

      {/* Target Drive & Round Selector */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Target Recruitment Drive</label>
            <select
              className="form-select"
              value={selectedCompanyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Batch {c.batch_year})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Target Selection Round</label>
            <select
              className="form-select"
              value={selectedRoundId}
              onChange={(e) => { setSelectedRoundId(e.target.value); setDiffResult(null); }}
              disabled={availableRounds.length === 0}
            >
              {availableRounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Cleared: {r.cleared_count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Paste Box */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
            Paste Raw Tokens / Registration Numbers
          </label>
          <button
            type="button"
            onClick={handleLoadSamplePaste}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            <Sparkles size={13} color="#2563eb" /> Fill Mixed-Format Sample
          </button>
        </div>

        <textarea
          rows={6}
          className="form-textarea"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
          placeholder="Paste tokens separated by newline, comma, tab, or space. Example:&#10;H244201&#10;917724420002&#10;3&#10;23CS004"
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setDiffResult(null); }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Tokens detected: <b>{rawText.trim() ? rawText.trim().split(/[\s,;\t]+/).length : 0}</b>
          </span>

          <button
            onClick={handlePreviewDiff}
            disabled={resolving || !rawText.trim() || !selectedRoundId}
            className="btn btn-primary"
          >
            <RefreshCw size={16} className={resolving ? 'animate-spin' : ''} />
            {resolving ? 'Resolving Aliases...' : 'Resolve & Preview Diff'}
          </button>
        </div>
      </div>

      {/* Diff & Resolution Preview Section */}
      {diffResult && (
        <div className="glass-card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Resolution Diff Preview: {diffResult.company_name} — {diffResult.round_name}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Review newly cleared vs previously cleared candidates before committing.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-primary">
                +{diffResult.newly_cleared_count} Newly Cleared
              </span>
              <span className="badge badge-accent">
                {diffResult.already_cleared_count} Already Cleared
              </span>
              {diffResult.unrecognized_count > 0 && (
                <span className="badge badge-warning">
                  {diffResult.unrecognized_count} Unrecognized
                </span>
              )}
            </div>
          </div>

          {/* Unrecognized Tokens Warning Box */}
          {diffResult.unrecognized_tokens.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                <AlertTriangle size={16} /> Unrecognized Tokens Captured ({diffResult.unrecognized_tokens.length})
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                These tokens did not match any declared alias or canonical registration number. They have been logged in the Alias Queue for administrative review.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {diffResult.unrecognized_tokens.map((tok, i) => (
                  <span key={i} className="tag-mono" style={{ color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a' }}>
                    {tok}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Diff Table */}
          <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Input Token</th>
                  <th>Resolved Format</th>
                  <th>Canonical Student (PK)</th>
                  <th>Candidate Name</th>
                  <th>Previous State</th>
                  <th>New State</th>
                </tr>
              </thead>
              <tbody>
                {diffResult.diff_items.map((item, idx) => (
                  <tr key={idx}>
                    <td><span className="tag-mono">{item.input_token}</span></td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {item.format_type}
                      </span>
                    </td>
                    <td>
                      <span className="tag-mono" style={{ fontWeight: 700, color: '#fff' }}>
                        {item.student_reg_no}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.student_name || '—'}</td>
                    <td>
                      {item.previous_status ? (
                        <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>
                          {item.previous_status}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        <CheckCircle2 size={12} /> CLEARED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Commit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => setDiffResult(null)}
              className="btn btn-secondary"
            >
              Discard Diff
            </button>

            <button
              onClick={handleCommit}
              disabled={committing || diffResult.diff_items.length === 0}
              className="btn btn-primary"
            >
              <CheckCircle2 size={18} />
              {committing ? 'Committing Results...' : `Confirm & Commit ${diffResult.diff_items.length} Cleared Results`}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
