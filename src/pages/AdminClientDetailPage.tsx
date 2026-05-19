import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient, getCheckIns, generateReport } from '../lib/store';
import type { Client, CheckIn, FollowUpReport } from '../types/database';
import { formatDate, timeAgo, feelingEmoji, painColor, changeLabel, changeColor, trendColor } from '../lib/utils';
import { ChevronLeft, AlertTriangle, Pill, MessageSquare, Pencil, Award } from 'lucide-react';

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

function TrendChart({ checkIns, valueKey, color, maxY }: {
  checkIns: CheckIn[];
  valueKey: 'pain_level' | 'sleep_quality';
  color: string;
  maxY: number;
}) {
  const last14 = [...checkIns].slice(0, 14).reverse();
  if (last14.length < 2) return null;

  const W = 400, H = 120;
  const PAD = { top: 12, right: 12, bottom: 28, left: 24 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const n = last14.length;

  function xPos(i: number) { return PAD.left + (i / (n - 1)) * chartW; }
  function yPos(v: number) { return PAD.top + chartH - (v / maxY) * chartH; }

  const points = last14.map((ci, i) => {
    const raw = ci[valueKey] as number;
    const scaled = valueKey === 'sleep_quality' ? raw * 2 : raw;
    return { x: xPos(i), y: yPos(scaled), raw, date: ci.created_at };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const gridYs = [0.25, 0.5, 0.75, 1].map(f => PAD.top + chartH - f * chartH);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {gridYs.map((y, i) => <line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeOpacity={0.3} />)}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />)}
      {points.map((p, i) => i % 3 === 0 && (
        <text key={`lbl-${i}`} x={p.x} y={H - 4} fontSize={9} fill="#94a3b8" textAnchor="middle">
          {new Date(p.date).toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit' })}
        </text>
      ))}
    </svg>
  );
}

function ComplianceGauge({ rate }: { rate: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dashArray = (rate / 100) * circumference;
  const color = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} stroke="var(--border)" fill="none" strokeWidth={8} />
      <circle cx={50} cy={50} r={r} stroke={color} fill="none" strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${dashArray} ${circumference}`} strokeDashoffset={-62}
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      <text x={50} y={50} fontSize={18} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={color}>{rate}%</text>
    </svg>
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

  return (
    <div className="admin-page">
      <div className="page-header" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')}><ChevronLeft size={16} /> Back</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/client/${clientId}/edit`)}><Pencil size={14} /> Edit</button>
        </div>
        <h2>{client.full_name}</h2>
        <p>{client.primary_complaint}</p>
      </div>

      <div className="card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Login code</span><br /><strong>{client.login_code}</strong></div>
          {client.next_appointment && <div><span style={{ color: 'var(--text-muted)' }}>Next appt</span><br /><strong>{formatDate(client.next_appointment)}</strong></div>}
          {client.tracking_duration_weeks && <div><span style={{ color: 'var(--text-muted)' }}>Tracking</span><br /><strong>{client.tracking_duration_weeks} weeks</strong></div>}
          {client.email && <div><span style={{ color: 'var(--text-muted)' }}>Email</span><br /><strong>{client.email}</strong></div>}
        </div>
        {client.notes && <p style={{ fontSize: '13px', marginTop: '10px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>{client.notes}</p>}
      </div>

      {checkIns.length > 1 && (
        <div className="card chart-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>Pain Trend</h3>
          <TrendChart checkIns={checkIns} valueKey="pain_level" color="#3b82f6" maxY={10} />
        </div>
      )}

      {checkIns.length > 1 && (
        <div className="card chart-card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', marginBottom: '8px' }}>Sleep Quality</h3>
          <TrendChart checkIns={checkIns} valueKey="sleep_quality" color="#10b981" maxY={10} />
        </div>
      )}

      {report && report.compliance_metrics && (
        <div className="card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={13} /> Compliance Rating
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <ComplianceGauge rate={report.compliance_rate} />
          </div>
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
                {report.summary.recommendations.map((rec, i) => <li key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="page-header"><h3 style={{ fontSize: '15px' }}>Check-ins ({checkIns.length})</h3></div>

      <div className="timeline-list">
        {checkIns.length === 0 && <div className="empty-state"><p>No check-ins yet.</p></div>}
        {checkIns.map((ci) => {
          const expanded = expandedId === ci.id;
          return (
            <div key={ci.id} className={`timeline-entry ${ci.flagged ? 'flagged' : ''} ${expanded ? 'expanded' : ''}`} onClick={() => setExpandedId(expanded ? null : ci.id)}>
              <div className="timeline-entry-header">
                <div className="entry-date">
                  <strong>{formatDate(ci.created_at)}</strong>
                  <span className="entry-time">{timeAgo(ci.created_at)}</span>
                </div>
                <div className="entry-badges">
                  {ci.flagged && <AlertTriangle size={16} color="#f59e0b" />}
                  <span className="feeling-badge">{feelingEmoji(ci.overall_feeling)}</span>
                  <span className="change-badge" style={{ color: changeColor(ci.symptom_change) }}>{changeLabel(ci.symptom_change)}</span>
                </div>
              </div>
              <div className="entry-metrics">
                <div className="metric"><span className="metric-label">Pain</span><span className="metric-value" style={{ color: painColor(ci.pain_level) }}>{ci.pain_level}/10</span></div>
                <div className="metric"><span className="metric-label">Sleep</span><span className="metric-value">{ci.sleep_quality}/5</span></div>
                <div className="metric"><span className="metric-label">Stress</span><span className="metric-value">{ci.stress_level}/5</span></div>
              </div>
              {expanded && (
                <div className="entry-details">
                  {ci.medication_taken && <div className="detail-row"><Pill size={14} /> Medication taken</div>}
                  {ci.notes && <div className="detail-row notes-row"><MessageSquare size={14} /><span>{ci.notes}</span></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
