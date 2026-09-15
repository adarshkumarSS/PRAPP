import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/Modal';
import {
  GraduationCap,
  Upload,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Sparkles,
  Award,
  Layers
} from 'lucide-react';

export function MyStudents({ onShowToast }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Single Add Modal
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [singleForm, setSingleForm] = useState({
    reg_no: '',
    name: '',
    college_regno: '',
    long_numeric: '',
    serial: ''
  });
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Bulk Add Wizard Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const endpoint = search ? `/students?search=${encodeURIComponent(search)}` : '/students';
      const res = await apiClient.get(endpoint);
      setStudents(res);
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search]);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleForm.reg_no.trim()) {
      if (onShowToast) onShowToast('Canonical Reg No is required', 'error');
      return;
    }

    try {
      setSingleSubmitting(true);
      await apiClient.post('/students', singleForm);
      if (onShowToast) onShowToast(`Candidate ${singleForm.name || singleForm.reg_no} added successfully!`, 'success');
      setIsSingleModalOpen(false);
      setSingleForm({ reg_no: '', name: '', college_regno: '', long_numeric: '', serial: '' });
      fetchStudents();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSingleSubmitting(false);
    }
  };

  // Parse pasted TSV/CSV text into structured rows
  const handleParsePastedText = (text) => {
    setPasteText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/);
    const rows = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      // Split by tab, comma, or pipe
      const parts = line.split(/[\t,|]/).map(p => p.trim());
      
      // Expected order: Canonical RegNo, Name, College RegNo, Long Numeric, Serial
      // If fewer columns, map smartly
      if (parts.length >= 1) {
        rows.push({
          reg_no: parts[0] || '',
          name: parts[1] || '',
          college_regno: parts[2] || '',
          long_numeric: parts[3] || '',
          serial: parts[4] || ''
        });
      }
    });

    setParsedRows(rows);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (parsedRows.length === 0) return;

    try {
      setSubmitting(true);
      const res = await apiClient.post('/students/bulk', {
        students: parsedRows
      });
      if (onShowToast) {
        onShowToast(
          `Success: Added ${res.added_count} students with ${res.aliases_created_count} aliases.`,
          'success'
        );
      }
      setIsBulkModalOpen(false);
      setPasteText('');
      setParsedRows([]);
      fetchStudents();
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSamplePaste = () => {
    const sample = `23CS013\tManish V\tH244213\t917724420013\t13
23CS014\tNithya R\tH244214\t917724420014\t14
23CS015\tPranav S\tH244215\t917724420015\t15`;
    handleParsePastedText(sample);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Batch Candidates & Aliases
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Canonical Student Registry. Multi-format aliases resolve dynamically during round pastes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button 
            type="button"
            onClick={() => setIsSingleModalOpen(true)} 
            className="btn btn-secondary"
            style={{ whiteSpace: 'nowrap' }}
          >
            <Plus size={18} /> Add Candidate
          </button>
          <button 
            type="button"
            onClick={() => setIsBulkModalOpen(true)} 
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            <Upload size={18} /> Bulk Add Candidates
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '42px', width: '100%' }}
              placeholder="Search by student name, canonical reg no (e.g. 23CS001), or any alias (e.g. H244201, 917724420001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="badge badge-primary" style={{ height: '38px', display: 'flex', alignItems: 'center' }}>
            {students.length} Candidates
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="glass-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Canonical Reg No</th>
                <th>Candidate Name</th>
                <th>Aliases Mapped (Lookup Keys)</th>
                <th>Status</th>
                <th>Offers & Final CTC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    <GraduationCap size={40} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 600 }}>No candidates found in this batch.</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click "Bulk Add Candidates" to import your student roster with aliases.</div>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.reg_no}>
                    <td>
                      <span className="tag-mono" style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                        {s.reg_no}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{s.name || '—'}</span>
                        {user && s.name?.toLowerCase().trim() === user.name?.toLowerCase().trim() && (
                          <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>
                            You (PR)
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {s.aliases?.map((a) => (
                          <span
                            key={a.id}
                            className="tag-mono"
                            title={`Format: ${a.format_type}`}
                            style={{
                              fontSize: '0.72rem',
                              background: a.format_type === 'COLLEGE_REGNO' ? '#ede9fe' :
                                          a.format_type === 'LONG_NUMERIC' ? '#e0f2fe' : '#fef3c7',
                              color: a.format_type === 'COLLEGE_REGNO' ? '#6d28d9' :
                                     a.format_type === 'LONG_NUMERIC' ? '#0369a1' : '#b45309'
                            }}
                          >
                            {a.alias_value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.placement_status === 'PLACED' ? 'badge-primary' : 'badge-danger'}`}>
                        {s.placement_status}
                      </span>
                    </td>
                    <td>
                      {s.offers?.length > 0 ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>
                            {s.final_company_name ? `${s.final_company_name} (${s.final_package} LPA)` : `${s.offers.length} Offers`}
                          </div>
                          {s.offers.length > 1 && (
                            <span className="badge badge-accent" style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                              Dual/Multi Offer ({s.offers.length})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unplaced</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Candidate Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Add New Candidate"
        maxWidth="600px"
      >
        <form onSubmit={handleSingleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '16px', rowGap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Canonical Reg No *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. 23CS016"
                value={singleForm.reg_no}
                onChange={(e) => setSingleForm({ ...singleForm, reg_no: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Candidate Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Suresh M"
                value={singleForm.name}
                onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">College Reg No (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. H244216"
                value={singleForm.college_regno}
                onChange={(e) => setSingleForm({ ...singleForm, college_regno: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Long Numeric ID (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 917724420016"
                value={singleForm.long_numeric}
                onChange={(e) => setSingleForm({ ...singleForm, long_numeric: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Serial Number (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 16"
                value={singleForm.serial}
                onChange={(e) => setSingleForm({ ...singleForm, serial: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsSingleModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={singleSubmitting} className="btn btn-primary">
              {singleSubmitting ? 'Adding...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Add Wizard Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Multi-Format Candidate Import Wizard"
        maxWidth="780px"
      >
        <form onSubmit={handleBulkSubmit}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Paste columns from Excel/Google Sheets (Tab or comma separated).<br />
            <b>Expected Columns:</b> <code>Canonical RegNo</code> | <code>Name</code> | <code>College RegNo (H2442**)</code> | <code>Long Numeric (91772442****)</code> | <code>Serial (1, 2, 3...)</code>
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button type="button" onClick={handleLoadSamplePaste} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
              <Sparkles size={13} color="#2563eb" /> Fill Sample Multi-Format Data
            </button>
          </div>

          <div className="form-group">
            <textarea
              rows={5}
              className="form-textarea"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              placeholder={`23CS013\tManish V\tH244213\t917724420013\t13\n23CS014\tNithya R\tH244214\t917724420014\t14`}
              value={pasteText}
              onChange={(e) => handleParsePastedText(e.target.value)}
            />
          </div>

          {/* Live Preview Table */}
          {parsedRows.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>
                  ✓ {parsedRows.length} Candidates Parsed for Batch {user?.batch_year || ''}
                </span>
              </div>
              <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Canonical RegNo</th>
                      <th>Name</th>
                      <th>College RegNo</th>
                      <th>Long Numeric</th>
                      <th>Serial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, idx) => (
                      <tr key={idx}>
                        <td><span className="tag-mono">{r.reg_no}</span></td>
                        <td>{r.name}</td>
                        <td><span className="tag-mono" style={{ color: '#6d28d9' }}>{r.college_regno}</span></td>
                        <td><span className="tag-mono" style={{ color: '#0369a1' }}>{r.long_numeric}</span></td>
                        <td><span className="tag-mono" style={{ color: '#b45309' }}>{r.serial}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || parsedRows.length === 0}
              className="btn btn-primary"
            >
              {submitting ? 'Importing...' : `Import ${parsedRows.length} Candidates`}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
