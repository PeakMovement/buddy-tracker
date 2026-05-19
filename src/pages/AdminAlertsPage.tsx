import { useState, useEffect } from 'react';
import { getLoggedInPractitionerId } from '../hooks/usePractitioner';
import { getPractitioner, getContactRequests, getAllContactRequests, markContactRequestRead, resolveContactRequest } from '../lib/store';
import type { ContactRequest, Practitioner } from '../types/database';
import { timeAgo } from '../lib/utils';
import { Bell, CheckCheck } from 'lucide-react';

const URGENCY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  emergency: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  urgent:    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  soon:      { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  monitor:   { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  routine:   { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
};

export default function AdminAlertsPage() {
  const practitionerId = getLoggedInPractitionerId()!;
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const p = await getPractitioner(practitionerId);
    setPractitioner(p);
    const reqs = p?.is_admin
      ? await getAllContactRequests()
      : await getContactRequests(practitionerId);
    setRequests(reqs);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleMarkRead(id: string) {
    await markContactRequestRead(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <div className="page-loading">Loading...</div>;

  const unread = requests.filter((r) => !r.is_read);
  const read = requests.filter((r) => r.is_read);

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Alerts</h2>
        {unread.length > 0 && <span className="badge badge-danger">{unread.length} new</span>}
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <Bell size={40} color="#94a3b8" />
          <p>No contact requests yet.</p>
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <div className="alerts-section">
              <h3 className="section-label">New</h3>
              {unread.map((req) => <AlertCard key={req.id} req={req} onMarkRead={handleMarkRead} />)}
            </div>
          )}
          {read.length > 0 && (
            <div className="alerts-section">
              <h3 className="section-label">Resolved</h3>
              {read.map((req) => <AlertCard key={req.id} req={req} onMarkRead={handleMarkRead} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ req, onMarkRead }: { req: ContactRequest; onMarkRead: (id: string) => void }) {
  const [expanding, setExpanding] = useState(false);
  const [note, setNote] = useState('');
  const urgencyStyle = req.urgency ? URGENCY_STYLES[req.urgency] : null;

  async function handleResolve() {
    await resolveContactRequest(req.id, note);
    onMarkRead(req.id);
  }

  return (
    <div className={`alert-card card ${req.is_read ? 'read' : 'unread'}`}>
      <div className="alert-header">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
          <strong>{req.clients?.full_name ?? 'Client'}</strong>
          {urgencyStyle && (
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '4px', background: urgencyStyle.bg, color: urgencyStyle.color, border: `1px solid ${urgencyStyle.border}`, letterSpacing: '0.04em' }}>
              {req.urgency!.toUpperCase()}
            </span>
          )}
          {req.clients?.primary_complaint && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.clients.primary_complaint}</span>
          )}
        </div>
        <span className="alert-time">{timeAgo(req.created_at)}</span>
      </div>
      <p className="alert-description">{req.symptom_description}</p>
      {req.symptom_score > 0 && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Score: {req.symptom_score}/10</p>
      )}
      {req.ai_rationale && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '6px' }}>{req.ai_rationale}</p>
      )}
      {!req.is_read && (
        <>
          {!expanding ? (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: '10px' }} onClick={() => setExpanding(true)}>
              <CheckCheck size={14} /> Mark as resolved ›
            </button>
          ) : (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                className="notes-input"
                rows={3}
                placeholder="Add a clinical note — optional, e.g. Called patient, appointment booked"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setExpanding(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleResolve}>
                  <CheckCheck size={14} /> Resolve
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
