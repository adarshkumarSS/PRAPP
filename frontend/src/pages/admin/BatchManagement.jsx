import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/Modal';
import { Layers, Plus, Trash2, Users, GraduationCap, Calendar } from 'lucide-react';

export function BatchManagement({ onShowToast }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [yearLabel, setYearLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/batches');
      setBatches(res);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!yearLabel.trim()) return;
    try {
      setSubmitting(true);
      await apiClient.post('/batches', { year_label: yearLabel.trim() });
      if (onShowToast) onShowToast(`Batch ${yearLabel} created successfully!`, 'success');
      setYearLabel('');
      setIsModalOpen(false);
      fetchBatches();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId, label) => {
    if (!window.confirm(`Are you sure you want to delete Batch ${label}? This will cascade delete all students and drives in this batch.`)) {
      return;
    }
    try {
      await apiClient.delete(`/batches/${batchId}`);
      if (onShowToast) onShowToast(`Batch ${label} removed.`, 'info');
      fetchBatches();
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
            Batch Management
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Admin-controlled graduation year batches. PR accounts and drives inherit their batch association.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Create New Batch
        </button>
      </div>

      {/* Batches Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Loading batches...</div>
        ) : batches.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <Layers size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <h3>No Batches Configured</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
              Create your first batch (e.g. 2027) to begin adding PR coordinators and students.
            </p>
          </div>
        ) : (
          batches.map((batch) => (
            <div key={batch.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={20} color="#2563eb" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Batch {batch.year_label}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Created {new Date(batch.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteBatch(batch.id, batch.year_label)}
                  className="btn-icon"
                  title="Delete Batch"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Candidates</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{batch.student_count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assigned PRs</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#6d28d9' }}>{batch.pr_count}</div>
                </div>
              </div>

              {/* Placement Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Placed Candidates</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>
                    {batch.placed_student_count} / {batch.student_count} ({batch.placement_pct}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#dbeafe', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${batch.placement_pct}%`,
                      background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
                      borderRadius: '999px'
                    }}
                  />
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Create Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Graduation Batch"
      >
        <form onSubmit={handleCreateBatch}>
          <div className="form-group">
            <label className="form-label">Graduation Year Label</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. 2027 or 2028"
              value={yearLabel}
              onChange={(e) => setYearLabel(e.target.value)}
              autoFocus
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              PR coordinators assigned to this batch will automatically tag students and company drives with this year.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
