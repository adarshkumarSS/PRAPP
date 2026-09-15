import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/Modal';
import { Users, Plus, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export function PRAssignment({ onShowToast }) {
  const [prs, setPrs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prsRes, batchesRes] = await Promise.all([
        apiClient.get('/prs'),
        apiClient.get('/batches')
      ]);
      setPrs(prsRes);
      setBatches(batchesRes);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePR = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@tce.edu')) {
      if (onShowToast) onShowToast('Only official @tce.edu email addresses are permitted.', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post('/prs', {
        name: name.trim(),
        email: cleanEmail,
        password,
        batch_id: selectedBatchId || null
      });
      if (onShowToast) onShowToast(`PR account for '${name}' created successfully!`, 'success');
      setName('');
      setEmail('');
      setPassword('');
      setSelectedBatchId('');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignBatch = async (prId, newBatchId) => {
    try {
      const payload = { batch_id: newBatchId ? newBatchId : null };
      await apiClient.put(`/prs/${prId}/assign-batch`, payload);
      if (onShowToast) onShowToast('PR batch assignment updated and logged.', 'success');
      fetchData();
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
            PR Account & Batch Assignment
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Admin controls PR-to-batch mapping. PR coordinators cannot self-assign batches. All changes write to the audit trail.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Create PR Account
        </button>
      </div>

      {/* PR Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PR Coordinator</th>
                <th>Assigned Batch</th>
                <th>Assigned By & Date</th>
                <th>Candidates Added</th>
                <th>Placed & Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading PR accounts...</td>
                </tr>
              ) : prs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No PR accounts created yet.</td>
                </tr>
              ) : (
                prs.map((pr) => (
                  <tr key={pr.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{pr.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pr.email}</div>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '6px 10px', fontSize: '0.82rem', width: '160px' }}
                        value={pr.batch_id || ''}
                        onChange={(e) => handleAssignBatch(pr.id, e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            Batch {b.year_label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {pr.assigned_by_name ? (
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{pr.assigned_by_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {pr.assigned_at ? new Date(pr.assigned_at).toLocaleString() : '—'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Pending Assignment</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{pr.students_count}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>{pr.placed_count}</span>
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                          {pr.placement_pct}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {pr.batch_id ? (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          <Check size={12} /> Active
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>
                          <AlertCircle size={12} /> Needs Batch
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PR Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New PR Coordinator Account"
      >
        <form onSubmit={handleCreatePR}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Arun Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (@tce.edu)</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. pr.arun@tce.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Initial Batch (Optional)</label>
            <select
              className="form-select"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="">-- Leave Unassigned (Can assign later) --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  Batch {b.year_label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Creating...' : 'Create PR Account'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
