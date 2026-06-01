import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoggedInPractitionerId } from '../hooks/usePractitioner';
import { getPractitioner, getClients, getPractitioners, getLastCheckInDates, getLastCheckInScores, fireCheckInWebhook } from '../lib/store';
import type { Client, Practitioner } from '../types/database';
import { formatDate, formatRelativeDate } from '../lib/utils';
import { ChevronRight, User, Search } from 'lucide-react';

const OVERDUE_DAYS: Record<string, number> = {
  daily: 1,
  every_2_days: 2,
  every_3_days: 3,
  weekly: 7,
};

function isOverdue(client: Client, lastCheckIn: string | undefined): boolean {
  if (!client.check_in_frequency) return false;
  const days = OVERDUE_DAYS[client.check_in_frequency];
  if (!days) return false;
  if (!lastCheckIn) return true;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = (Date.now() - new Date(lastCheckIn).getTime()) / msPerDay;
  return daysSince > days;
}

type CheckInFilter = 'all' | 'today' | 'last7' | 'over1week';

function getCheckInFilter(lastCheckIn: string | undefined): 'today' | 'last7' | 'over1week' | 'never' {
  if (!lastCheckIn) return 'never';
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSince = (Date.now() - new Date(lastCheckIn).getTime()) / msPerDay;
  if (daysSince < 1) return 'today';
  if (daysSince <= 7) return 'last7';
  return 'over1week';
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const practitionerId = getLoggedInPractitionerId()!;
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [lastCheckIns, setLastCheckIns] = useState<Record<string, string>>({});
  const [lastPainScores, setLastPainScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkInFilter, setCheckInFilter] = useState<CheckInFilter>('all');
  const [sentCheckIns, setSentCheckIns] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getPractitioner(practitionerId);
      setPractitioner(p);
      let list: Client[];
      if (p?.is_admin) {
        list = await getClients();
        const practitioners = await getPractitioners();
        const pMap: Record<string, string> = {};
        practitioners.forEach((pr) => { pMap[pr.id] = pr.full_name || pr.name; });
        (list as any[]).forEach((c) => { c._practitionerName = pMap[c.practitioner_id ?? ''] ?? '—'; });
      } else {
        list = await getClients(practitionerId);
      }
      setClients(list);
      const [dates, scores] = await Promise.all([
        getLastCheckInDates(list.map((c) => c.id)),
        getLastCheckInScores(list.map((c) => c.id)),
      ]);
      setLastCheckIns(dates);
      setLastPainScores(scores);
      setLoading(false);
    })();
  }, [practitionerId]);

  if (loading) return <div className="page-loading">Loading...</div>;

  const sorted = [...clients].sort((a, b) => {
    const aOverdue = isOverdue(a, lastCheckIns[a.id]);
    const bOverdue = isOverdue(b, lastCheckIns[b.id]);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    const aTime = lastCheckIns[a.id] ? new Date(lastCheckIns[a.id]).getTime() : 0;
    const bTime = lastCheckIns[b.id] ? new Date(lastCheckIns[b.id]).getTime() : 0;
    return bTime - aTime;
  });

  const searchTerm = search.trim().toLowerCase();

  const filtered = sorted.filter((c) => {
    if (searchTerm) {
      const matches =
        c.full_name.toLowerCase().includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm) ||
        c.primary_complaint.toLowerCase().includes(searchTerm);
      if (!matches) return false;
    }
    if (checkInFilter === 'all') return true;
    const bucket = getCheckInFilter(lastCheckIns[c.id]);
    if (checkInFilter === 'today') return bucket === 'today';
    if (checkInFilter === 'last7') return bucket === 'last7' || bucket === 'today';
    if (checkInFilter === 'over1week') return bucket === 'over1week' || bucket === 'never';
    return true;
  });

  const filterCounts = {
    today: sorted.filter((c) => getCheckInFilter(lastCheckIns[c.id]) === 'today').length,
    last7: sorted.filter((c) => { const b = getCheckInFilter(lastCheckIns[c.id]); return b === 'last7' || b === 'today'; }).length,
    over1week: sorted.filter((c) => { const b = getCheckInFilter(lastCheckIns[c.id]); return b === 'over1week' || b === 'never'; }).length,
  };

  const FILTERS: { key: CheckInFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: clients.length },
    { key: 'today', label: 'Today', count: filterCounts.today },
    { key: 'last7', label: 'Last 7 Days', count: filterCounts.last7 },
    { key: 'over1week', label: 'Over 1 Week', count: filterCounts.over1week },
  ];

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>{practitioner?.is_admin ? 'All Clients' : 'My Clients'}</h2>
        <p>{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
      </div>

      {clients.length > 0 && (
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by name, email or complaint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              fontSize: '13px',
              border: '1.5px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface)',
              color: 'var(--text)',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        </div>
      )}

      {clients.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setCheckInFilter(key)}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: checkInFilter === key ? '600' : '400',
                border: checkInFilter === key ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                background: checkInFilter === key ? 'var(--primary)' : 'var(--surface)',
                color: checkInFilter === key ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {label}
              <span style={{
                fontSize: '11px',
                fontWeight: '600',
                background: checkInFilter === key ? 'rgba(255,255,255,0.25)' : 'var(--bg)',
                borderRadius: '999px',
                padding: '0 6px',
                lineHeight: '18px',
                minWidth: '18px',
                textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {clients.length === 0 ? (
        <div className="empty-state">
          <p>No clients assigned yet.</p>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/admin/add-client')}>
            Add a Client
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>{searchTerm ? `No clients match "${search}".` : 'No clients checked in in this period.'}</p>
        </div>
      ) : (
        <div className="client-list">
          {filtered.map((client) => {
            const lastCheckIn = lastCheckIns[client.id];
            const painScore = lastPainScores[client.id];
            const overdue = isOverdue(client, lastCheckIn);
            return (
              <div
                key={client.id}
                className="client-card card"
                onClick={() => navigate(`/admin/client/${client.id}`)}
                style={{ cursor: 'pointer', ...(overdue ? { borderLeft: '3px solid #f59e0b' } : {}) }}
              >
                <div className="client-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                      <h3 className="client-name">{client.full_name}</h3>
                      {overdue && (
                        <span style={{
                          background: '#fffbeb',
                          color: '#92400e',
                          border: '1px solid #fde68a',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 7px',
                          marginLeft: '8px',
                        }}>
                          OVERDUE
                        </span>
                      )}
                    </div>
                    {(client as any)._practitionerName !== undefined && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '500',
                        ...((client as any)._practitionerName === '—'
                          ? { backgroundColor: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                          : { backgroundColor: '#e0f2fe', color: '#0369a1' }),
                      }}>
                        <User size={10} />
                        {(client as any)._practitionerName === '—' ? 'Unassigned' : (client as any)._practitionerName}
                      </span>
                    )}
                    <p className="client-complaint">{client.primary_complaint}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
                <div className="client-meta">
                  <span>Code: <strong>{client.login_code}</strong></span>
                  {client.next_appointment && (
                    <span>Next: {formatDate(client.next_appointment)}</span>
                  )}
                  <span style={{ color: lastCheckIn ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Last check-in: <strong>{lastCheckIn ? formatRelativeDate(lastCheckIn) : 'Never'}</strong>
                  </span>
                  {painScore != null && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                      ...(painScore <= 3
                        ? { background: '#dcfce7', color: '#16a34a' }
                        : painScore <= 6
                        ? { background: '#fef9c3', color: '#ca8a04' }
                        : { background: '#fee2e2', color: '#dc2626' }),
                    }}>
                      {painScore}/10
                    </span>
                  )}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await fireCheckInWebhook(practitionerId, client.full_name, client.email);
                      setSentCheckIns((prev) => ({ ...prev, [client.id]: true }));
                      setTimeout(() => setSentCheckIns((prev) => ({ ...prev, [client.id]: false })), 2000);
                    }}
                    style={{
                      padding: '5px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1.5px solid var(--primary)',
                      background: sentCheckIns[client.id] ? 'var(--primary)' : 'transparent',
                      color: sentCheckIns[client.id] ? '#fff' : 'var(--primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sentCheckIns[client.id] ? 'Sent' : 'Check In'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
