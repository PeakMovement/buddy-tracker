import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Check } from 'lucide-react';
import { getLoggedInPractitionerId } from '../hooks/usePractitioner';
import { getPractitioner, getPractitioners, createClient, sendClientInvitation } from '../lib/store';
import type { Practitioner } from '../types/database';

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export default function AddClientPage() {
  const navigate = useNavigate();
  const practitionerId = getLoggedInPractitionerId()!;
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);

  const [invite, setInvite] = useState({ name: '', email: '' });
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [inviteError, setInviteError] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    primary_complaint: '',
    notes: '',
    next_appointment: '',
    tracking_duration_weeks: '',
    login_code: generateCode(),
    assigned_practitioner_id: practitionerId,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getPractitioner(practitionerId);
      setPractitioner(p);
      if (p?.is_admin) {
        const list = await getPractitioners();
        setPractitioners(list);
      }
    })();
  }, [practitionerId]);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function setInviteField(field: string, value: string) {
    setInvite((prev) => ({ ...prev, [field]: value }));
    if (inviteStatus === 'error') {
      setInviteStatus('idle');
      setInviteError('');
    }
  }

  async function handleSendInvite() {
    const emailTrimmed = invite.email.trim();
    const nameTrimmed = invite.name.trim();
    if (!emailTrimmed) {
      setInviteError('Email address is required.');
      setInviteStatus('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setInviteError('Please enter a valid email address.');
      setInviteStatus('error');
      return;
    }

    setInviteStatus('sending');
    setInviteError('');

    const result = await sendClientInvitation(emailTrimmed, nameTrimmed, practitionerId);

    if (result.success) {
      setInviteStatus('sent');
      if (nameTrimmed && !form.full_name) {
        setField('full_name', nameTrimmed);
      }
      if (emailTrimmed && !form.email) {
        setField('email', emailTrimmed);
      }
    } else {
      setInviteStatus('error');
      setInviteError(result.error ?? 'Something went wrong.');
    }
  }

  async function handleSubmit() {
    if (!form.full_name.trim() || !form.primary_complaint.trim()) {
      setError('Name and primary complaint are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const weeks = form.tracking_duration_weeks ? parseInt(form.tracking_duration_weeks) : undefined;
      let trackingEndDate: string | undefined;
      if (weeks) {
        const d = new Date();
        d.setDate(d.getDate() + weeks * 7);
        trackingEndDate = d.toISOString();
      }
      const client = await createClient({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        practitioner_id: form.assigned_practitioner_id,
        login_code: form.login_code.trim(),
        primary_complaint: form.primary_complaint.trim(),
        notes: form.notes.trim() || undefined,
        next_appointment: form.next_appointment || undefined,
        tracking_duration_weeks: weeks,
        tracking_end_date: trackingEndDate,
      });
      if (client) {
        navigate('/admin/dashboard');
      } else {
        setError('Failed to create client. The code may already be in use.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Add New Client</h2>
      </div>

      <div className="form-card card" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
            Send Platform Invitation
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Notify the client by email before creating their profile.
          </p>
        </div>

        <div className="form-group">
          <label>Name</label>
          <input
            className="login-input"
            value={invite.name}
            onChange={(e) => setInviteField('name', e.target.value)}
            placeholder="Client's name"
            disabled={inviteStatus === 'sent'}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Email Address *</label>
          <input
            className="login-input"
            type="email"
            value={invite.email}
            onChange={(e) => setInviteField('email', e.target.value)}
            placeholder="client@example.com"
            disabled={inviteStatus === 'sent'}
            style={{ marginBottom: 0 }}
          />
        </div>

        {inviteStatus === 'error' && inviteError && (
          <p className="login-error" style={{ marginTop: 8, marginBottom: 0 }}>{inviteError}</p>
        )}

        {inviteStatus === 'sent' && (
          <div style={{
            marginTop: 10,
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--success)',
          }}>
            <Check size={15} />
            Invitation sent to {invite.email}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSendInvite}
            disabled={inviteStatus === 'sending' || inviteStatus === 'sent'}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {inviteStatus === 'sending' ? (
              'Sending...'
            ) : inviteStatus === 'sent' ? (
              <><Check size={14} /> Sent</>
            ) : (
              <><Send size={14} /> Send Invitation</>
            )}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        color: 'var(--text-muted)',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        Client Profile
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div className="form-card card">
        <div className="form-group">
          <label>Full Name *</label>
          <input className="login-input" value={form.full_name} onChange={(e) => setField('full_name', e.target.value)} placeholder="Client's full name" />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input className="login-input" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="Email address" />
        </div>

        <div className="form-group">
          <label>Primary Complaint *</label>
          <input className="login-input" value={form.primary_complaint} onChange={(e) => setField('primary_complaint', e.target.value)} placeholder="e.g. Lower back pain" />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea className="notes-input" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Clinical notes..." rows={3} />
        </div>

        <div className="form-group">
          <label>Next Appointment</label>
          <input className="login-input" type="datetime-local" value={form.next_appointment} onChange={(e) => setField('next_appointment', e.target.value)} />
        </div>

        <div className="form-group">
          <label>Tracking Duration (weeks)</label>
          <input className="login-input" type="number" min="1" max="52" value={form.tracking_duration_weeks} onChange={(e) => setField('tracking_duration_weeks', e.target.value)} placeholder="e.g. 6" />
        </div>

        {practitioner?.is_admin && practitioners.length > 0 && (
          <div className="form-group">
            <label>Assign to Practitioner</label>
            <select
              className="login-input"
              value={form.assigned_practitioner_id}
              onChange={(e) => setField('assigned_practitioner_id', e.target.value)}
            >
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Login Code</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="login-input" style={{ flex: 1, marginBottom: 0 }} value={form.login_code} onChange={(e) => setField('login_code', e.target.value)} />
            <button className="btn btn-ghost" onClick={() => setField('login_code', generateCode())}>
              Regenerate
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Share this code with the client so they can log in.
          </p>
        </div>

        {error && <p className="login-error">{error}</p>}

        <div className="step-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/admin/dashboard')}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
}
