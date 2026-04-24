import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient, getCheckIns, generateReport } from '../lib/store';
import type { Client, CheckIn, FollowUpReport } from '../types/database';
import { formatDate, timeAgo, feelingEmoji, painColor, changeLabel, changeColor, trendColor } from '../lib/utils';
import { ChevronLeft, AlertTriangle, Pill, MessageSquare, Pencil, Award } from 'lucide-react';
import MiniChart from '../components/MiniChart';

function ComplianceBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'var(--success)' : value >= 40 ? '#f59e0b' : 'var(--danger)';
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: '5px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

export default function AdminClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [report, setReport] = useState<FollowUpReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [c, cis] = await Promise.all([getClient(clientId), getCheckIns(clientId)]);
      setClient(c);
      setCheckIns(cis);
      if (c) {
        const r = await generateReport(clientId, c);
        setReport(r);
      }
      setLoading(false);
    })();
  }, [clientId]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!client) return <div className="page-loading">Client not found.</div>;

  const painData = [...checkIns].reverse().map((c) => c.pain_level);

  return (
    <div className="admin-page">
      <div className="page-header" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')}>
            <ChevronLeft size={16} /> Back
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/client/${clientId}/edit`)}>
            <Pencil size={14} /> Edit
          </button>
        </div>
        <h2>{client.full_name}</h2>
        <p>{client.primary_complaint}</p>
      </div>

      <div className="card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Login code</span><br /><strong>{client.login_code}</strong></div>
          {client.next_appointment && (
            <div><span style={{ color: 'var(--text-muted)' }}>Next appt</span><br /><strong>{formatDate(client.next_appointment)}</strong></div>
          )}
          {client.tracking_duration_weeks && (
            <div><span style={{ color: 'var(--text-muted)' }}>Tracking</span><br /><strong>{client.tracking_duration_weeks} weeks</strong></div>
          )}
          {client.email && (
            <div><span style={{ color: 'var(--text-muted)' }}>Email</span><br /><strong>{client.email}</strong></div>
          )}
        </div>
        {client.notes && (
          <p style={{ fontSize: '13px', marginTop: '10px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
            {client.notes}
          </p>
        )}
      </div>

      {painData.length > 1 && (
        <div className="card chart-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>Pain Trend</h3>
          <MiniChart data={painData} label="" />
        </div>
      )}

      {report && report.compliance_metrics && (
        <div className="card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={13} /> Compliance Rating
          </h3>
          <ComplianceBar label="Frequency" value={report.compliance_metrics.frequency} />
          <ComplianceBar label="Engagement" value={report.compliance_metrics.engagement} />
          <ComplianceBar label="Consistency" value={report.compliance_metrics.variability} />
          <ComplianceBar label="Recency" value={report.compliance_metrics.recency} />
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Overall</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: trendColor(report.compliance_rate >= 70 ? 'improving' : report.compliance_rate >= 40 ? 'stable' : 'declining') }}>
              {report.compliance_rate}%
            </span>
          </div>
          {report.summary.recommendations.length > 0 && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommendations</p>
              <ul style={{ paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {report.summary.recommendations.map((rec, i) => (
                  <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="page-header">
        <h3 style={{ fontSize: '15px' }}>Check-ins ({checkIns.length})</h3>
      </div>

      <div className="timeline-list">
        {checkIns.length === 0 && (
          <div className="empty-state"><p>No check-ins yet.</p></div>
        )}
        {checkIns.map((ci) => {
          const expanded = expandedId === ci.id;
          return (
            <div
              key={ci.id}
              className={`timeline-entry ${ci.flagged ? 'flagged' : ''} ${expanded ? 'expanded' : ''}`}
              onClick={() => setExpandedId(expanded ? null : ci.id)}
            >
              <div className="timeline-entry-header">
                <div className="entry-date">
                  <strong>{formatDate(ci.created_at)}</strong>
                  <span className="entry-time">{timeAgo(ci.created_at)}</span>
                </div>
                <div className="entry-badges">
                  {ci.flagged && <AlertTriangle size={16} color="#f59e0b" />}
                  <span className="feeling-badge">{feelingEmoji(ci.overall_feeling)}</span>
                  <span className="change-badge" style={{ color: changeColor(ci.symptom_change) }}>
                    {changeLabel(ci.symptom_change)}
                  </span>
                </div>
              </div>
              <div className="entry-metrics">
                <div className="metric">
                  <span className="metric-label">Pain</span>
                  <span className="metric-value" style={{ color: painColor(ci.pain_level) }}>{ci.pain_level}/10</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Sleep</span>
                  <span className="metric-value">{ci.sleep_quality}/5</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Stress</span>
                  <span className="metric-value">{ci.stress_level}/5</span>
                </div>
              </div>
              {expanded && (
                <div className="entry-details">
                  {ci.medication_taken && (
                    <div className="detail-row"><Pill size={14} /> Medication taken</div>
                  )}
                  {ci.notes && (
                    <div className="detail-row notes-row">
                      <MessageSquare size={14} /><span>{ci.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
