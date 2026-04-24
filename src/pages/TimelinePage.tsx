import { useState, useEffect } from 'react';
import { useClientContext } from '../context/ClientContext';
import { getCheckIns, getSymptoms, getSymptomEntriesBySymptom } from '../lib/store';
import type { CheckIn, Symptom } from '../types/database';
import MiniChart from '../components/MiniChart';
import { formatDate, changeLabel, changeColor, feelingEmoji, painColor, timeAgo } from '../lib/utils';
import { AlertTriangle, Pill, MessageSquare } from 'lucide-react';

export default function TimelinePage() {
  const { client } = useClientContext();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomData, setSymptomData] = useState<Record<string, number[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      (async () => {
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
      })();
    }
  }, [client]);

  if (!client) return <div className="page-loading">Loading...</div>;

  const painData = [...checkIns].reverse().map((c) => c.pain_level);

  return (
    <div className="timeline-page">
      <div className="page-header">
        <h2>Your Timeline</h2>
        <p>{checkIns.length} check-in{checkIns.length !== 1 ? 's' : ''} recorded</p>
      </div>

      {painData.length > 1 && (
        <div className="card chart-card">
          <MiniChart data={painData} label="Pain trend over time" />
        </div>
      )}

      {symptoms.length > 0 && (
        <div className="card chart-card">
          <h3>Symptom Trends</h3>
          {symptoms.map((sym) => {
            const data = symptomData[sym.id] || [];
            if (data.length === 0) return null;
            return (
              <MiniChart
                key={sym.id}
                data={data}
                label={sym.name}
              />
            );
          })}
        </div>
      )}

      <div className="timeline-list">
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
                  <span
                    className="change-badge"
                    style={{ color: changeColor(ci.symptom_change) }}
                  >
                    {changeLabel(ci.symptom_change)}
                  </span>
                </div>
              </div>

              <div className="entry-metrics">
                <div className="metric">
                  <span className="metric-label">Pain</span>
                  <span className="metric-value" style={{ color: painColor(ci.pain_level) }}>
                    {ci.pain_level}/10
                  </span>
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
                    <div className="detail-row">
                      <Pill size={14} /> Medication taken
                    </div>
                  )}
                  {ci.notes && (
                    <div className="detail-row notes-row">
                      <MessageSquare size={14} />
                      <span>{ci.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {checkIns.length === 0 && (
          <div className="empty-state">
            <p>No check-ins yet. Complete your first daily check-in to start tracking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
