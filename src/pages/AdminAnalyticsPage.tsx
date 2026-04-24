import { useState, useEffect } from 'react';
import { getDeviceVisits, getClients, type DeviceVisit } from '../lib/store';
import { getLoggedInPractitionerId } from '../hooks/usePractitioner';
import { getPractitioner } from '../lib/store';
import type { Client } from '../types/database';
import { formatDate } from '../lib/utils';
import { Monitor, Smartphone, Activity } from 'lucide-react';

interface DeviceStats {
  mobile: number;
  desktop: number;
  total: number;
  uniqueClients: number;
  pageBreakdown: Record<string, number>;
  recentVisits: DeviceVisit[];
  clientMap: Record<string, string>;
}

function computeStats(visits: DeviceVisit[], clientMap: Record<string, string>): DeviceStats {
  const mobile = visits.filter((v) => v.device_type === 'mobile').length;
  const desktop = visits.filter((v) => v.device_type !== 'mobile').length;
  const uniqueClients = new Set(visits.map((v) => v.client_id)).size;
  const pageBreakdown: Record<string, number> = {};
  for (const v of visits) {
    pageBreakdown[v.page] = (pageBreakdown[v.page] || 0) + 1;
  }
  return {
    mobile,
    desktop,
    total: visits.length,
    uniqueClients,
    pageBreakdown,
    recentVisits: visits.slice(0, 30),
    clientMap,
  };
}

function StatPill({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="stat-card" style={{ flex: 1 }}>
      {icon}
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const practitionerId = getLoggedInPractitionerId()!;
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    (async () => {
      const p = await getPractitioner(practitionerId);
      const allClients = p?.is_admin ? await getClients() : await getClients(practitionerId);
      setClients(allClients);
      const clientMap: Record<string, string> = {};
      allClients.forEach((c) => { clientMap[c.id] = c.full_name; });
      const visits = await getDeviceVisits();
      setStats(computeStats(visits, clientMap));
      setLoading(false);
    })();
  }, [practitionerId]);

  async function handleClientFilter(clientId: string) {
    setSelectedClient(clientId);
    setLoading(true);
    const visits = clientId === 'all' ? await getDeviceVisits() : await getDeviceVisits(clientId);
    const clientMap: Record<string, string> = {};
    clients.forEach((c) => { clientMap[c.id] = c.full_name; });
    setStats(computeStats(visits, clientMap));
    setLoading(false);
  }

  if (loading) return <div className="page-loading">Loading...</div>;

  const s = stats!;
  const mobilePercent = s.total > 0 ? Math.round((s.mobile / s.total) * 100) : 0;
  const desktopPercent = s.total > 0 ? Math.round((s.desktop / s.total) * 100) : 0;
  const sortedPages = Object.entries(s.pageBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Device Analytics</h2>
        <p>Client access patterns and device usage</p>
      </div>

      {clients.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <select
            className="login-input"
            style={{ marginBottom: 0 }}
            value={selectedClient}
            onChange={(e) => handleClientFilter(e.target.value)}
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        </div>
      )}

      {s.total === 0 ? (
        <div className="empty-state">
          <Activity size={40} color="#94a3b8" />
          <p style={{ marginTop: '12px' }}>No device visits recorded yet.</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Visits are tracked when clients use the app.
          </p>
        </div>
      ) : (
        <>
          <div className="report-stats" style={{ marginBottom: '12px' }}>
            <StatPill label="Total Visits" value={s.total} icon={<Activity size={16} color="#2563eb" />} />
            <StatPill label="Clients" value={s.uniqueClients} />
          </div>

          <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Device Breakdown</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Smartphone size={16} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{mobilePercent}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mobile ({s.mobile})</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Monitor size={16} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{desktopPercent}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Desktop ({s.desktop})</div>
                </div>
              </div>
            </div>
            <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${mobilePercent}%`, background: '#2563eb', transition: 'width 0.4s ease' }} />
              <div style={{ flex: 1, background: '#16a34a' }} />
            </div>
          </div>

          {sortedPages.length > 0 && (
            <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Page Visits</h3>
              {sortedPages.map(([page, count]) => {
                const pct = Math.round((count / s.total) * 100);
                return (
                  <div key={page} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{page}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Recent Visits</h3>
            {s.recentVisits.map((v) => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: '12px',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  {v.device_type === 'mobile' ? <Smartphone size={12} color="#2563eb" /> : <Monitor size={12} color="#16a34a" />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                    {s.clientMap[v.client_id] ?? 'Unknown'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>{v.page}</span>
                </div>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{formatDate(v.visited_at)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
