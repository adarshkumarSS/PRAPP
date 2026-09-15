import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/Modal';
import {
  Award,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Building2,
  DollarSign,
  Calendar
} from 'lucide-react';

export function Offers({ onShowToast }) {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToken, setStudentToken] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [packageValue, setPackageValue] = useState('');
  const [offerDate, setOfferDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFinal, setIsFinal] = useState(true);
  const [status, setStatus] = useState('ACCEPTED');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersRes, compRes] = await Promise.all([
        apiClient.get('/offers'),
        apiClient.get('/companies')
      ]);
      setOffers(offersRes);
      setCompanies(compRes);
      if (compRes.length > 0 && !companyId) {
        setCompanyId(compRes[0].id);
      }
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!studentToken.trim() || !companyId) return;

    try {
      setSubmitting(true);
      await apiClient.post('/offers', {
        student_reg_no: studentToken.trim(),
        company_id: companyId,
        package_value: packageValue ? parseFloat(packageValue) : null,
        offer_date: offerDate,
        is_final: isFinal,
        status: status
      });
      if (onShowToast) onShowToast('Offer recorded and student marked as PLACED!', 'success');
      setStudentToken('');
      setPackageValue('');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFinal = async (offer) => {
    try {
      await apiClient.put(`/offers/${offer.id}`, {
        is_final: !offer.is_final
      });
      if (onShowToast) onShowToast('Final accepted offer updated.', 'success');
      fetchData();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    }
  };

  const handleDeleteOffer = async (id, compName, regNo) => {
    if (!window.confirm(`Delete offer from ${compName} for ${regNo}?`)) return;
    try {
      await apiClient.delete(`/offers/${id}`);
      if (onShowToast) onShowToast('Offer removed.', 'info');
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
            Offers & Placements Management
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Log and manage student offers. Supports multiple offers per candidate with a designated <b>Final Accepted Offer</b> for placement math.
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={18} /> Record New Offer
        </button>
      </div>

      {/* Offers Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate Reg No</th>
                <th>Candidate Name</th>
                <th>Recruiter / Company</th>
                <th>Package (CTC)</th>
                <th>Offer Date</th>
                <th>Final Counted Offer</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading recorded offers...</td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    <Award size={40} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 600 }}>No placement offers recorded yet.</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click "Record New Offer" to register confirmed placements.</div>
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id}>
                    <td>
                      <span className="tag-mono" style={{ fontWeight: 700, color: '#0f172a', background: '#e2e8f0', borderColor: '#cbd5e1' }}>
                        {offer.student_reg_no}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{offer.student_name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="#2563eb" />
                        <span style={{ fontWeight: 600 }}>{offer.company_name}</span>
                      </div>
                    </td>
                    <td>
                      {offer.package_value ? (
                        <span style={{ fontWeight: 700, color: '#16a34a' }}>
                          {offer.package_value} LPA
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {offer.offer_date}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleFinal(offer)}
                        className={`badge ${offer.is_final ? 'badge-primary' : 'badge-secondary'}`}
                        style={{ cursor: 'pointer', border: offer.is_final ? '1px solid #16a34a' : '1px solid #e2e8f0' }}
                      >
                        {offer.is_final ? '★ Final / Accepted' : 'Secondary Offer'}
                      </button>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        {offer.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteOffer(offer.id, offer.company_name, offer.student_reg_no)}
                        className="btn-icon"
                        title="Delete Offer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Offer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Placement Offer"
      >
        <form onSubmit={handleCreateOffer}>
          <div className="form-group">
            <label className="form-label">Candidate Identifier (Any Alias or Reg No)</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. 23CS001 or H244201 or 917724420001"
              value={studentToken}
              onChange={(e) => setStudentToken(e.target.value)}
              autoFocus
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              The system automatically resolves any alias to the student's canonical record.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Recruiter / Company</label>
            <select
              className="form-select"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Annual CTC Package (in LPA)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="e.g. 8.50"
                value={packageValue}
                onChange={(e) => setPackageValue(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Offer Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={offerDate}
                onChange={(e) => setOfferDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Offer Decision</label>
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACCEPTED">ACCEPTED (Accepted Offer)</option>
              <option value="OFFERED">OFFERED (Pending / Dual Offer)</option>
              <option value="DECLINED">DECLINED</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', background: '#f0f9ff', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd' }}>
            <input
              type="checkbox"
              id="isFinalCheckbox"
              checked={isFinal}
              onChange={(e) => setIsFinal(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <label htmlFor="isFinalCheckbox" style={{ fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
              Set as <b>Final Accepted Placement</b> for this candidate
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Recording...' : 'Save Placement Offer'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
