import { useState, useEffect } from 'react';
import { useClientContext } from '../context/ClientContext';
import { createCheckIn, getSymptoms, createSymptomEntry, createSymptom, createContactRequest, fireContactProfessionalWebhook } from '../lib/store';
import { getLoggedInClientId } from '../hooks/useClient';
import { analyzeSymptomRealTime } from '../lib/symptomAnalysis';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';

type Step = 'feeling' | 'symptoms' | 'details' | 'done';

const FEELING_OPTIONS = [
  { value: 5, label: 'Great', emoji: '\uD83D\uDE04' },
  { value: 4, label: 'Good', emoji: '\uD83D\uDE42' },
  { value: 3, label: 'Okay', emoji: '\uD83D\uDE10' },
  { value: 2, label: 'Bad', emoji: '\uD83D\uDE15' },
  { value: 1, label: 'Terrible', emoji: '\uD83D\uDE14' },
];

const CHANGE_OPTIONS = [
  { value: 'better', label: 'Better' },
  { value: 'same', label: 'Same' },
  { value: 'worse', label: 'Worse' },
];

export default function CheckInPage() {
  const { client, refreshClient } = useClientContext();
  const clientId = getLoggedInClientId();

  const [step, setStep] = useState<Step>('feeling');
  const [feeling, setFeeling] = useState<number>(3);
  const [change, setChange] = useState<string>('same');
  const [painLevel, setPainLevel] = useState<number>(5);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [stressLevel, setStressLevel] = useState<number>(3);
  const [medicationTaken, setMedicationTaken] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [symptomSeverities, setSymptomSeverities] = useState<Record<string, number>>({});
  const [symptoms, setSymptoms] = useState<Array<{ id: string; name: string }>>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [addingSymptom, setAddingSymptom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (clientId) loadSymptoms(); }, [clientId]);

  async function loadSymptoms() {
    if (!clientId) return;
    const syms = await getSymptoms(clientId);
    const active = syms.filter((s) => s.active);
    setSymptoms(active);
    const initial: Record<string, number> = {};
    active.forEach((s) => { initial[s.id] = 0; });
    setSymptomSeverities(initial);
  }

  function goToSymptoms() {
    loadSymptoms();
    setStep('symptoms');
  }

  async function handleAddSymptom() {
    if (!newSymptom.trim() || !clientId) return;
    setAddingSymptom(true);
    const sym = await createSymptom({ client_id: clientId, name: newSymptom.trim(), body_area: 'General' });
    if (sym) {
      setSymptoms((prev) => [...prev, sym]);
      setSymptomSeverities((prev) => ({ ...prev, [sym.id]: 0 }));
    }
    setNewSymptom('');
    setAddingSymptom(false);
  }

  async function handleSubmit() {
    if (!clientId) return;
    setSubmitting(true);
    setError('');
    try {
      let flagged = painLevel >= 8 || change === 'worse';
      if (notes.trim()) {
        const rt = analyzeSymptomRealTime(notes.trim());
        if (rt.detected && rt.severity >= 6) flagged = true;
      }
      const checkIn = await createCheckIn({
        client_id: clientId,
        overall_feeling: feeling,
        symptom_change: change,
        pain_level: painLevel,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        medication_taken: medicationTaken,
        notes: notes.trim() || undefined,
        flagged,
      });
      if (checkIn) {
        for (const [symptomId, severity] of Object.entries(symptomSeverities)) {
          await createSymptomEntry({ check_in_id: checkIn.id, symptom_id: symptomId, severity });
        }
      }
      if (flagged && client?.practitioner_id) {
        try {
          const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from('contact_requests')
            .select('id')
            .eq('client_id', clientId)
            .eq('is_read', false)
            .gte('created_at', since24h)
            .limit(1)
            .maybeSingle();
          if (!existing) {
            const msg = painLevel >= 8
              ? `Pain level ${painLevel}/10 reported in check-in.`
              : notes.trim()
              ? `Red flag symptoms detected in check-in notes: "${notes.trim().substring(0, 100)}"`
              : `Check-in flagged: pain ${painLevel}/10, symptoms ${change}.`;
            await createContactRequest(
              clientId, client.practitioner_id, msg,
              painLevel, client.full_name, true,
              null, null, null, 'urgent', 'keyword_only'
            );
            await fireContactProfessionalWebhook(
              client.practitioner_id, client.full_name ?? '', msg, painLevel
            );
          }
        } catch { /* never block success */ }
      }
      await refreshClient();
      setStep('done');
    } catch {
      setError('Failed to save check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!client) return <div className="page-loading">Loading...</div>;

  if (step === 'done') {
    return (
      <div className="checkin-page">
        <div className="checkin-card">
          <div className="step-content" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>\u2705</div>
            <h2>Check-in saved!</h2>
            <p className="subtext">Your progress has been recorded.</p>
            <div className="step-actions" style={{ marginTop: '24px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep('feeling')}>New Check-in</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'feeling') {
    return (
      <div className="checkin-page">
        <div className="checkin-card">
          <div className="step-content">
            <h2>How are you feeling today?</h2>
            <p className="subtext">Rate your overall wellbeing</p>
            <div className="feeling-grid">
              {FEELING_OPTIONS.map((opt) => (
                <button key={opt.value} className={`feeling-btn ${feeling === opt.value ? 'selected' : ''}`} onClick={() => setFeeling(opt.value)}>
                  <span className="feeling-emoji">{opt.emoji}</span>
                  <span className="feeling-label">{opt.label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: '20px' }}>
              <p className="subtext" style={{ marginBottom: '8px' }}>How have your symptoms changed?</p>
              <div className="change-grid">
                {CHANGE_OPTIONS.map((opt) => (
                  <button key={opt.value} className={`change-btn ${change === opt.value ? 'selected' : ''}`} onClick={() => setChange(opt.value)}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="step-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={goToSymptoms}>Next</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'symptoms') {
    return (
      <div className="checkin-page">
        <div className="checkin-card">
          <div className="step-content">
            <h2>Rate your symptoms</h2>
            <p className="subtext">Severity from 1 (mild) to 10 (severe)</p>
            {symptoms.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>No tracked symptoms yet. Add one below.</p>}
            {symptoms.map((sym) => (
              <div key={sym.id} style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                  {sym.name}: <strong>{symptomSeverities[sym.id] ?? 0}</strong>/10
                </label>
                <input type="range" min={1} max={10} value={symptomSeverities[sym.id] ?? 0}
                  onChange={(e) => setSymptomSeverities((prev) => ({ ...prev, [sym.id]: Number(e.target.value) }))}
                  style={{ width: '100%' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input className="login-input" style={{ flex: 1, marginBottom: 0 }} placeholder="Add symptom..." value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSymptom()} />
              <button className="btn btn-ghost" onClick={handleAddSymptom} disabled={addingSymptom || !newSymptom.trim()}><Plus size={16} /></button>
            </div>
            {symptoms.length > 0 && Object.values(symptomSeverities).some(v => v === 0) && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>Slide each symptom to rate it before continuing</p>
            )}
            <div className="step-actions" style={{ marginTop: '20px' }}>
              <button className="btn btn-ghost" onClick={() => setStep('feeling')}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep('details')}
                disabled={symptoms.length > 0 && Object.values(symptomSeverities).some(v => v === 0)}>Next</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkin-page">
      <div className="checkin-card">
        <div className="step-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><h2>A little more detail</h2><p className="subtext">Pain, sleep, stress and notes</p></div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '130px', lineHeight: '1.4', marginTop: '4px', flexShrink: 0 }}>Optional — helps holistically track your wellbeing</p>
          </div>
          <label className="slider-label">Pain level: <strong>{painLevel}</strong>/10</label>
          <input type="range" min={0} max={10} value={painLevel} onChange={(e) => setPainLevel(Number(e.target.value))} style={{ width: '100%', marginBottom: '16px' }} />
          <label className="slider-label">Sleep quality: <strong>{sleepQuality}</strong>/5</label>
          <input type="range" min={1} max={5} value={sleepQuality} onChange={(e) => setSleepQuality(Number(e.target.value))} style={{ width: '100%', marginBottom: '16px' }} />
          <label className="slider-label">Stress level: <strong>{stressLevel}</strong>/5</label>
          <input type="range" min={1} max={5} value={stressLevel} onChange={(e) => setStressLevel(Number(e.target.value))} style={{ width: '100%', marginBottom: '16px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '16px', cursor: 'pointer' }}>
            <input type="checkbox" checked={medicationTaken} onChange={(e) => setMedicationTaken(e.target.checked)} />
            Medication taken today
          </label>
          <textarea className="notes-input" placeholder="Any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          {error && <p className="login-error">{error}</p>}
          <div className="step-actions">
            <button className="btn btn-ghost" onClick={() => setStep('symptoms')}>Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving...' : 'Save Check-in'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
