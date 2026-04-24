import { useState, useEffect } from 'react';
import { useClientContext } from '../context/ClientContext';
import { getCheckIns, getSymptoms, getSymptomEntriesBySymptom, generateReport } from '../lib/store';
import type { CheckIn, Symptom, FollowUpReport } from '../types/database';
import MiniChart from '../components/MiniChart';
import { trendLabel, trendColor, painColor } from '../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Moon,
  Brain,
  Award,
  AlertTriangle,
} from 'lucide-react';

function ComplianceBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'var(--success)' : value >= 40 ? '#f59e0b' : 'var(--danger)';
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function ClientProgressPage() {
  const { client } = useClientContext();
  const [report, setReport] = useState<FollowUpReport | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomData, setSymptomData] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (client) {
      (async () => {
        const r = await generateReport(client.id, client);
        setReport(r);
        const cis = await getCheckIns(client.id);
        setCheckIns(cis);
        const syms = (await getSymptoms(client.id)).filter((s) => s.active);
        setSymptoms(syms);
        const data: Record<string, number[]> = {};
        for (const sym of syms) {
          const entries = await getSymptomEntriesBySymptom(sym.id);
          data[sym.id] = entries.map((e) => e.severity);
        }
        setSymptomData(data);
        setLoading(false);
      })();
    }
  }, [client]);

  if (!client || loading) return <div className="page-loading">Loading...</div>;

  if (!report || checkIns.length === 0) {
    return (
      <div className="progress-page">
        <div className="empty-state">
          <Award size={48} color="#94a3b8" />
          <h2>No progress yet</h2>
          <p>Complete your first daily check-in to start tracking your progress.</p>
        </div>
      </div>
    );
  }

  const s = report.summary;
  const m = report.compliance_metrics;
  const TrendIcon = s.overall_trend === 'improving' ? TrendingUp
    : s.overall_trend === 'declining' ? TrendingDown
    : Minus;

  return (
    <div className="progress-page">
      <div className="page-header">
        <h2>Your Progress</h2>
      </div>

      <div className="progress-trend-card card">
        <div className="trend-display">
          <div className="trend-icon-wrap" style={{ backgroundColor: trendColor(s.overall_trend) + '20', color: trendColor(s.overall_trend) }}>
            <TrendIcon size={24} />
          </div>
          <div>
            <span className="trend-label" style={{ color: trendColor(s.overall_trend) }}>
              {trendLabel(s.overall_trend)}
            </span>
            <span className="trend-subtext">Overall trend based on your check-ins</span>
          </div>
        </div>
      </div>

      <div className="report-stats">
        <div className="stat-card">
          <span className="stat-value">{report.total_check_ins}</span>
          <span className="stat-label">Check-ins</span>
        </div>
        <div className="stat-card">
          <span className="stat-value" style={{ color: painColor(s.avg_pain_level) }}>{s.avg_pain_level}</span>
          <span className="stat-label">Avg Pain</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{report.compliance_rate}%</span>
          <span className="stat-label">Consistency</span>
        </div>
      </div>

      <div className="card chart-card">
        <h3><Activity size={14} /> Pain Over Time</h3>
        <MiniChart data={s.pain_trend} label="Daily pain level" />
      </div>

      <div className="report-stats">
        <div className="stat-card">
          <Moon size={16} color="#2563eb" />
          <span className="stat-value">{s.avg_sleep_quality}/5</span>
          <span className="stat-label">Avg Sleep</span>
        </div>
        <div className="stat-card">
          <Brain size={16} color="#2563eb" />
          <span className="stat-value">{s.avg_stress_level}/5</span>
          <span className="stat-label">Avg Stress</span>
        </div>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Award size={14} /> Compliance Breakdown
        </h3>
        <ComplianceBar label="Frequency" value={m.frequency} />
        <ComplianceBar label="Engagement" value={m.engagement} />
        <ComplianceBar label="Consistency" value={m.variability} />
        <ComplianceBar label="Recency" value={m.recency} />
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Overall Score</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: report.compliance_rate >= 70 ? 'var(--success)' : report.compliance_rate >= 40 ? '#f59e0b' : 'var(--danger)' }}>
            {report.compliance_rate}%
          </span>
        </div>
      </div>

      {symptoms.length > 0 && (
        <div className="card chart-card">
          <h3>Symptom Trends</h3>
          {symptoms.map((sym) => {
            const data = symptomData[sym.id] || [];
            if (data.length === 0) return null;
            return <MiniChart key={sym.id} data={data} label={sym.name} />;
          })}
        </div>
      )}

      {s.symptom_changes.length > 0 && (
        <div className="progress-symptoms card">
          <h3>Symptom Summary</h3>
          {s.symptom_changes.map((sc, i) => (
            <div key={i} className="symptom-change-row">
              <span className="sc-name">{sc.symptom_name}</span>
              <span className="sc-values">{sc.start_severity} → {sc.end_severity}</span>
              <span className="sc-trend" style={{ color: trendColor(sc.trend) }}>
                {trendLabel(sc.trend)}
              </span>
            </div>
          ))}
        </div>
      )}

      {s.recommendations.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> Notes
          </h3>
          <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {s.recommendations.map((rec, i) => (
              <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
