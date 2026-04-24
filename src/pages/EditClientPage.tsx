import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLoggedInPractitionerId } from '../hooks/usePractitioner';
import { getPractitioner, getPractitioners, getClient, updateClient, deleteClient } from '../lib/store';
import type { Practitioner, Client } from '../types/database';
import { ChevronLeft, Trash2 } from 'lucide-react';

export default function EditClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const practitionerId = getLoggedInPractitionerId()!;
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    primary_complaint: '',
    notes: '',
    next_appointment: '',
    tracking_duration_weeks: '',
    login_code: '',
    assigned_practitioner_id: practitionerId,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [p, c] = await Promise.all([getPractitioner(practitionerId), getClient(clientId)]);
      setPractitioner(p);
      setClient(c);
      if (c) {
        setForm({
          full_name: c.full_name,
          email: c.email || '',
          primary_complaint: c.primary_complaint,
          notes: c.notes || '',
          next_appointment: c.next_appointment ? c.next_appointment.slice(0, 16) : '',
          tracking_duration_weeks: c.tracking_duration_weeks ? String(c.tracking_duration_weeks) : '',
          login_code: c.login_code,
          assigned_practitioner_id: c.practitioner_id || practitionerId,
        });
      }
      if (p?.is_admin) {
        const list = await getPractitioners();
        setPractitioners(list);
      }
      setLoading(false);
    })();
  }, [clientId, practitionerId]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.primary_complaint.trim()) {
      setError('Name and primary complaint are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const weeks = form.tracking_duration_weeks ? parseInt(form.tracking_duration_weeks) : null;
      let trackingEndDate: string | null = null;
      if (weeks && client) {
        const base = new Date(client.created_at);
        base.setDate(base.getDate() + weeks * 7);
        trackingEndDate = base.toISOString();
      }
      const updated = await updateClient(clientId!, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        practitioner_id: form.assigned_practitioner_id,
        login_code: form.login_code.trim(),
        primary_complaint: form.primary_complaint.trim(),
        notes: form.notes.trim() || null,
        next_appointment: form.next_appointment || null,
        tracking_duration_weeks: weeks,
        tracking_end_date: trackingEndDate,
      });
      if (updated) {
        navigate(`/admin/client/${clientId}`);
      } else {
        setError('Failed to update client. The code may already be in use.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteClient(clientId!);
      navigate('/admin/dashboard');
    } catch {
      setError('Failed to delete client.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!client) return <div className="page-loading">Client not found.</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: '8px' }} onClick={() => navigate(`/admin/client/${clientId}`)}>
          <ChevronLeft size={16} /> Back
        </button>
        <h2>Edit Client</h2>
      </div>

      <div className="form-card card">
        <div className="form-group">
          <label>Full Name *</label>
          <input className="login-input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Client's full name" />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input className="login-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email address" />
        </div>

        <div className="form-group">
          <label>Primary Complaint *</label>
          <input className="login-input" value={form.primary_complaint} onChange={(e) => set('primary_complaint', e.target.value)} placeholder="e.g. Lower back pain" />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea className="notes-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Clinical notes..." rows={3} />
        </div>

        <div className="form-group">
          <label>Next Appointment</label>
          <input className="login-input" type="datetime-local" value={form.next_appointment} onChange={(e) => set('next_appointment', e.target.value)} />
        </div>

        <div className="form-group">
          <label>Tracking Duration (weeks)</label>
          <input className="login-input" type="number" min="1" max="52" value={form.tracking_duration_weeks} onChange={(e) => set('tracking_duration_weeks', e.target.value)} placeholder="e.g. 6" />
        </div>

        {practitioner?.is_admin && practitioners.length > 0 && (
          <div className="form-group">
            <label>Assigned Practitioner</label>
            <select
              className="login-input"
              value={form.assigned_practitioner_id}
              onChange={(e) => set('assigned_practitioner_id', e.target.value)}
            >
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Login Code</label>
          <input className="login-input" value={form.login_code} onChange={(e) => set('login_code', e.target.value)} />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Changing this will require the client to use the new code.
          </p>
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="step-actions">
          <button className="btn btn-ghost" onClick={() => navigate(`/admin/client/${clientId}`)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px', padding: '16px', borderColor: '#fee2e2' }}>
        <h3 style={{ fontSize: '14px', color: 'var(--danger)', marginBottom: '8px' }}>Danger Zone</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Deleting a client is permanent and will remove all their check-ins and data.
        </p>
        {!showDeleteConfirm ? (
          <button className="btn btn-ghost" style={{ color: 'var(--danger)', borderColor: '#fee2e2' }} onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={15} /> Delete Client
          </button>
        ) : (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--danger)' }}>
              Are you sure? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
