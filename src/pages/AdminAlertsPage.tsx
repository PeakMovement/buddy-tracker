import { useState, useEffect } from 'react';
import { getLoggedInPractitionerId } from '../hooks/usePractitioner';
import { getPractitioner, getContactRequests, getAllContactRequests, markContactRequestRead } from '../lib/store';
import type { ContactRequest, Practitioner } from '../types/database';
import { timeAgo } from '../lib/utils';
import { Bell, CheckCheck } from 'lucide-react';

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
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, is_read: true } : r));
  }

  if (loading) return <div className="page-loading">Loading...</div>;

  const unread = requests.filter((r) => !r.is_read);
  const read = requests.filter((r) => r.is_read);

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Alerts</h2>
        {unread.length > 0 && (
          <span className="badge badge-danger">{unread.length} new</span>
        )}
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
              {unread.map((req) => (
                <AlertCard key={req.id} req={req} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
          {read.length > 0 && (
            <div className="alerts-section">
              <h3 className="section-label">Resolved</h3>
              {read.map((req) => (
                <AlertCard key={req.id} req={req} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ req, onMarkRead }: { req: ContactRequest; onMarkRead: (id: string) => void }) {
  return (
    <div className={`alert-card card ${req.is_read ? 'read' : 'unread'}`}>
      <div className="alert-header">
        <div>
          <strong>{req.clients?.full_name ?? 'Client'}</strong>
          {req.clients?.primary_complaint && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              {req.clients.primary_complaint}
            </span>
          )}
        </div>
        <span className="alert-time">{timeAgo(req.created_at)}</span>
      </div>
      <p className="alert-description">{req.symptom_description}</p>
      {req.symptom_score > 0 && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Score: {req.symptom_score}/10
        </p>
      )}
      {!req.is_read && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginTop: '10px' }}
          onClick={() => onMarkRead(req.id)}
        >
          <CheckCheck size={14} /> Mark as resolved
        </button>
      )}
    </div>
  );
}
