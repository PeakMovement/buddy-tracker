import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Send, UserCheck, ChevronRight, Check, Phone, X } from 'lucide-react';
import { storeSymptomQuery, createContactRequest, getPractitionerDisplayName, getCheckIns, fireContactProfessionalWebhook } from '../lib/store';
import { analyzeSymptomCombined, analyzeSymptomRealTime, buildClientRiskContext } from '../lib/symptomAnalysisAI';
import type { CombinedTriageResult, ClientRiskContext } from '../lib/symptomAnalysisAI';
import { getLoggedInClientId } from '../hooks/useClient';
import { useClientContext } from '../context/ClientContext';

const EXAMPLE_PROMPTS = [
  'I have sharp pain in my lower back when I bend forward',
  'My neck feels stiff and painful after sleeping',
  'I experience tingling in my hands during the day',
  'My shoulder hurts when I lift my arm overhead',
  'I have constant dull ache in my right knee',
];

const URGENCY_STYLES: Record<string, { bg: string; border: string; text: string; pillBg: string }> = {
  emergency: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', pillBg: '#b91c1c' },
  urgent:    { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', pillBg: '#c2410c' },
  soon:      { bg: '#fffbeb', border: '#fde68a', text: '#92400e', pillBg: '#92400e' },
  monitor:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', pillBg: '#1e40af' },
  routine:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', pillBg: '#166534' },
};

function getContactButtonColor(urgency: string): string {
  if (urgency === 'emergency') return '#b91c1c';
  if (urgency === 'urgent') return '#c2410c';
  return '#1d4ed8';
}

function getContactButtonLabel(urgency: string, assignedName: string | null): string {
  const name = assignedName ?? 'My Professional';
  if (urgency === 'emergency' || urgency === 'urgent') {
    return `Contact ${name} — urgent review needed`;
  }
  return `Contact ${name} — symptoms noted`;
}

const DAILY_QUERY_LIMIT = 3;
const QUERY_WINDOW_MS = 24 * 60 * 60 * 1000;

function getQueryWindow(clientId: string): { count: number; windowStart: number } {
  const key = `yves_queries_${clientId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.count === 'number' && typeof parsed.windowStart === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt data
  }
  return { count: 0, windowStart: 0 };
}

function getYvesQueryInfo(clientId: string): { count: number; resetsAt: number | null } {
  const { count, windowStart } = getQueryWindow(clientId);
  const now = Date.now();
  if (windowStart && now - windowStart < QUERY_WINDOW_MS) {
    return { count, resetsAt: windowStart + QUERY_WINDOW_MS };
  }
  return { count: 0, resetsAt: null };
}

function incrementYvesQueryCount(clientId: string): void {
  const key = `yves_queries_${clientId}`;
  const now = Date.now();
  const { count, windowStart } = getQueryWindow(clientId);
  const isWithinWindow = windowStart && now - windowStart < QUERY_WINDOW_MS;
  localStorage.setItem(key, JSON.stringify({
    count: isWithinWindow ? count + 1 : 1,
    windowStart: isWithinWindow ? windowStart : now,
  }));
}

function formatTimeRemaining(resetsAt: number): string {
  const ms = resetsAt - Date.now();
  if (ms <= 0) return '0 minutes';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

export default function QueryPage() {
  const clientId = getLoggedInClientId();
  const { client, practitioners, assignedPractitioner, selectPractitioner } = useClientContext();
  const [prompt, setPrompt] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CombinedTriageResult | null>(null);
  const [error, setError] = useState('');
  const [contacting, setContacting] = useState(false);
  const [contacted, setContacted] = useState(false);
  const [selectingPractitioner, setSelectingPractitioner] = useState(false);
  const [savingPractitioner, setSavingPractitioner] = useState(false);
  const [redFlags, setRedFlags] = useState({
    detected: false,
    severity: 0,
    urgency: 'routine' as 'emergency' | 'urgent' | 'soon' | 'monitor' | 'routine',
    keywords: [] as string[],
    showEmergencyModal: false,
  });
  const [rtContacting, setRtContacting] = useState(false);
  const [rtContacted, setRtContacted] = useState(false);
  const [clientRiskContext, setClientRiskContext] = useState<ClientRiskContext | undefined>(undefined);
  const [queryLimitInfo, setQueryLimitInfo] = useState<{ count: number; resetsAt: number | null }>({ count: 0, resetsAt: null });
  const [timeRemaining, setTimeRemaining] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!clientId) return;
    getCheckIns(clientId).then((cis) => setClientRiskContext(buildClientRiskContext(cis)));
    setQueryLimitInfo(getYvesQueryInfo(clientId));
  }, [clientId]);

  useEffect(() => {
    if (!queryLimitInfo.resetsAt) return;
    const update = () => setTimeRemaining(formatTimeRemaining(queryLimitInfo.resetsAt!));
    update();
    const interval = setInterval(() => {
      const info = clientId ? getYvesQueryInfo(clientId) : queryLimitInfo;
      if (info.resetsAt && Date.now() >= info.resetsAt) {
        setQueryLimitInfo({ count: 0, resetsAt: null });
        clearInterval(interval);
      } else {
        update();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [queryLimitInfo.resetsAt, clientId]);

  const debouncedAnalyze = useMemo(() => (text: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const analysis = analyzeSymptomRealTime(text, clientRiskContext);
      setRedFlags((prev) => ({
        detected: analysis.detected,
        severity: analysis.severity,
        urgency: analysis.urgency,
        keywords: analysis.matchedKeywords,
        showEmergencyModal: analysis.urgency === 'emergency' ? true : (prev.showEmergencyModal && analysis.severity >= 9),
      }));
    }, 300);
  }, [clientRiskContext]);

  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  async function handleRtContactProfessional() {
    if (!clientId || !client?.practitioner_id) {
      setError('No assigned professional found in your profile');
      return;
    }
    setRtContacting(true);
    setError('');
    try {
      await createContactRequest(
        clientId,
        client.practitioner_id,
        prompt,
        redFlags.severity,
        client.full_name,
        true,
        null,
        null,
        null,
        redFlags.urgency,
        'keyword_only',
      );
      await fireContactProfessionalWebhook(
        client.practitioner_id,
        client.full_name ?? '',
        prompt,
        redFlags.severity
      );
      setRtContacted(true);
      setRedFlags((prev) => ({ ...prev, showEmergencyModal: false }));
    } catch {
      setError('Failed to send notification. Please try again.');
    } finally {
      setRtContacting(false);
    }
  }

  async function handleSelectPractitioner(practitionerId: string) {
    setSavingPractitioner(true);
    setError('');
    try {
      await selectPractitioner(practitionerId);
      setTimeout(() => {
        setSelectingPractitioner(false);
        setSavingPractitioner(false);
      }, 800);
    } catch (err) {
      setError('Could not save your selection. Please try again.');
      setSavingPractitioner(false);
    }
  }

  async function handleContactProfessional() {
    if (!clientId) {
      setError('Unable to identify you. Please refresh and try again.');
      return;
    }
    if (!client) {
      setError('Loading your profile... please try again in a moment.');
      return;
    }
    if (!client.practitioner_id) {
      setError('No assigned professional found in your profile');
      return;
    }
    if (!result) return;
    setContacting(true);
    setError('');
    try {
      await createContactRequest(
        clientId,
        client.practitioner_id,
        prompt,
        result.matched_score || 0,
        client.full_name,
        result.red_flag_detected,
        result.ai_rationale,
        result.ai_red_flags,
        result.ai_categories,
        result.urgency,
        result.source,
      );
      await fireContactProfessionalWebhook(
        client.practitioner_id,
        client.full_name ?? '',
        prompt,
        result.matched_score || 0
      );
      setContacted(true);
    } catch (err) {
      setError('Failed to send notification. Please try again.');
    } finally {
      setContacting(false);
    }
  }

  async function handleSubmit() {
    if (!prompt.trim()) {
      setError('Please describe your symptoms');
      return;
    }
    if (!clientId) {
      setError('Unable to identify user');
      return;
    }
    setError('');
    setAnalyzing(true);
    const currentInfo = getYvesQueryInfo(clientId);
    if (currentInfo.count >= DAILY_QUERY_LIMIT) {
      setQueryLimitInfo(currentInfo);
      setAnalyzing(false);
      return;
    }
    try {
      const practitionerName = assignedPractitioner
        ? getPractitionerDisplayName(assignedPractitioner)
        : undefined;
      const triageResult = await analyzeSymptomCombined(prompt, clientRiskContext, practitionerName);
      const effectiveRedFlag =
        triageResult.red_flag_detected &&
        triageResult.negation_detected !== true &&
        triageResult.attribution_detected !== true;
      storeSymptomQuery(clientId, prompt, effectiveRedFlag, triageResult.confidence_score);
      incrementYvesQueryCount(clientId);
      setQueryLimitInfo(getYvesQueryInfo(clientId));
      setResult(triageResult);
    } catch (err) {
      setError('Failed to analyze symptoms. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  const assignedName = assignedPractitioner ? getPractitionerDisplayName(assignedPractitioner) : null;

  if (selectingPractitioner) {
    return (
      <div className="checkin-page">
        <div className="checkin-card">
          <div className="step-content">
            <h2 style={{ marginBottom: '6px' }}>Select Your Professional</h2>
            <p className="subtext" style={{ marginBottom: '24px' }}>
              Choose the practitioner who is managing your care
            </p>

            {practitioners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '14px' }}>
                No professionals found. Please contact your clinic.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {practitioners.map((p) => {
                  const isSelected = client?.practitioner_id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPractitioner(p.id)}
                      disabled={savingPractitioner}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: isSelected ? 'var(--primary)' : 'var(--surface)',
                        color: isSelected ? '#fff' : 'var(--text)',
                        border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: savingPractitioner ? 'default' : 'pointer',
                        fontSize: '15px',
                        fontWeight: isSelected ? '600' : '400',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                        opacity: savingPractitioner && !isSelected ? 0.5 : 1,
                        width: '100%',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserCheck size={18} style={{ flexShrink: 0, opacity: 0.7 }} />
                        {getPractitionerDisplayName(p)}
                      </span>
                      {isSelected ? (
                        <Check size={16} />
                      ) : (
                        <ChevronRight size={16} style={{ opacity: 0.4 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 'var(--radius-sm)',
                color: '#c2410c',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => { setSelectingPractitioner(false); setError(''); }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const urgencyStyle = URGENCY_STYLES[result.urgency] ?? URGENCY_STYLES.routine;
    const urgencyLabel = result.urgency.toUpperCase();

    return (
      <div className="checkin-page">
        <div className="checkin-card">
          <div className="step-content">
            <div style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              backgroundColor: urgencyStyle.bg,
              border: `1px solid ${urgencyStyle.border}`,
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              alignItems: 'flex-start',
            }}>
              <AlertCircle size={24} style={{ color: urgencyStyle.text, flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <h3 style={{ color: urgencyStyle.text, margin: 0, fontSize: '16px', fontWeight: '600' }}>
                    {result.urgency === 'emergency' || result.urgency === 'urgent'
                      ? 'Medical Referral Recommended'
                      : result.urgency === 'soon'
                      ? 'Follow-up Recommended'
                      : 'Monitoring Recommended'}
                  </h3>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    backgroundColor: urgencyStyle.pillBg,
                    color: '#fff',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '700',
                    letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}>
                    {urgencyLabel}
                  </span>
                </div>

                <p style={{ color: urgencyStyle.text, fontSize: '14px', lineHeight: '1.5', marginBottom: '6px' }}>
                  {result.suggested_next_step}
                </p>

                {result.ai_red_flags && result.ai_red_flags.length > 0 && (
                  <p style={{ color: urgencyStyle.text, fontSize: '12px', marginBottom: '4px', opacity: 0.85 }}>
                    <strong>Flagged:</strong> {result.ai_red_flags.join(', ')}
                  </p>
                )}

                {(result.negation_detected || result.attribution_detected) && (
                  <p style={{ color: urgencyStyle.text, fontSize: '12px', marginBottom: '4px', opacity: 0.7, fontStyle: 'italic' }}>
                    Symptoms appear to be negated/attributed to someone else — rephrase if this is incorrect.
                  </p>
                )}
              </div>
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              fontSize: '13px',
            }}>
              <p style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                <strong>Your symptoms:</strong>
              </p>
              <p style={{ color: 'var(--text)', fontStyle: 'italic' }}>{prompt}</p>
            </div>

            <div className="step-actions" style={{ flexDirection: 'column', gap: '12px' }}>
              {result.severity >= 5 && !contacted && (
                <>
                  {!client?.practitioner_id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#92400e', textAlign: 'center' }}>
                        No professional assigned yet. Select one to send a notification.
                      </p>
                      <button
                        className="btn btn-primary"
                        style={{ backgroundColor: '#c2410c' }}
                        onClick={() => setSelectingPractitioner(true)}
                      >
                        <UserCheck size={16} />
                        Select a Professional
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        backgroundColor: getContactButtonColor(result.urgency),
                      }}
                      onClick={handleContactProfessional}
                      disabled={contacting}
                    >
                      <Send size={16} />
                      {contacting ? 'Sending...' : getContactButtonLabel(result.urgency, assignedName)}
                    </button>
                  )}
                </>
              )}

              {contacted && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  color: '#166534',
                  fontSize: '13px',
                  fontWeight: '500',
                }}>
                  Notification sent to {assignedName ?? 'your professional'}
                </div>
              )}

              {error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 'var(--radius-sm)',
                  color: '#c2410c',
                  fontSize: '13px',
                }}>
                  {error}
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => { setResult(null); setPrompt(''); setContacted(false); setError(''); }}
              >
                Ask Another Question
              </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>Y</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Yves</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your clinical health monitor</div>
            </div>
          </div>

          <h2>Tell Yves what you're experiencing.</h2>
          <p className="subtext">Describe any pain, discomfort, or symptoms you're experiencing</p>

          {client && (
            <div
              onClick={() => setSelectingPractitioner(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                marginBottom: '16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '13px',
                color: client.practitioner_id ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={15} style={{ opacity: 0.6 }} />
                {client.practitioner_id
                  ? <>My professional: <strong style={{ marginLeft: '4px' }}>{assignedName ?? 'Loading...'}</strong></>
                  : 'No professional selected — tap to assign one'}
              </span>
              <ChevronRight size={14} style={{ opacity: 0.4 }} />
            </div>
          )}

          <textarea
            className="notes-input"
            placeholder="Describe what you're experiencing — Yves is listening."
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              debouncedAnalyze(e.target.value);
              if (!e.target.value.trim()) {
                setRedFlags({ detected: false, severity: 0, urgency: 'routine', keywords: [], showEmergencyModal: false });
                setRtContacted(false);
              }
            }}
            rows={6}
            style={{ marginBottom: redFlags.detected ? '8px' : '16px' }}
          />

          {redFlags.detected && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              ...(redFlags.urgency === 'emergency'
                ? { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }
                : redFlags.urgency === 'urgent'
                ? { backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }
                : redFlags.urgency === 'soon'
                ? { backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c' }
                : { backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af' }),
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontWeight: '500' }}>
                  {redFlags.urgency === 'emergency'
                    ? 'This may need emergency attention'
                    : redFlags.urgency === 'urgent'
                    ? 'This may need immediate attention — urgent review recommended'
                    : redFlags.urgency === 'soon'
                    ? 'Symptoms suggest a follow-up soon is advisable'
                    : 'Symptoms noted — your professional can help'}
                </span>
              </div>

              {redFlags.urgency !== 'routine' && client?.practitioner_id && !rtContacted && (
                <button
                  onClick={handleRtContactProfessional}
                  disabled={rtContacting}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: rtContacting ? 'default' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: redFlags.urgency === 'emergency' ? '#b91c1c' : redFlags.urgency === 'urgent' ? '#92400e' : '#1d4ed8',
                    color: '#fff',
                    opacity: rtContacting ? 0.7 : 1,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={12} />
                    {rtContacting
                      ? 'Sending...'
                      : redFlags.urgency === 'urgent' || redFlags.urgency === 'emergency'
                      ? `Contact ${assignedName ?? 'My Professional'} — urgent review needed`
                      : `Contact ${assignedName ?? 'My Professional'} — symptoms noted`}
                  </span>
                </button>
              )}

              {rtContacted && (
                <span style={{ fontSize: '12px', fontWeight: '500' }}>
                  Notification sent to {assignedName ?? 'your professional'}
                </span>
              )}
            </div>
          )}

          <div style={{
            padding: '12px',
            backgroundColor: 'var(--bg)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <em>{EXAMPLE_PROMPTS[exampleIndex]}</em>
          </div>

          {error && <p className="login-error" style={{ marginTop: '12px' }}>{error}</p>}

          {queryLimitInfo.count >= DAILY_QUERY_LIMIT ? (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: 'var(--radius-sm)',
              textAlign: 'center',
            }}>
              <p style={{ fontWeight: '600', fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>
                You've used all 3 questions for today
              </p>
              <p style={{ fontSize: '13px', color: '#92400e' }}>
                Your questions will reset in <strong>{timeRemaining || formatTimeRemaining(queryLimitInfo.resetsAt!)}</strong>. If something is urgent, contact your professional directly.
              </p>
            </div>
          ) : (
            <div className="step-actions">
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : redFlags.urgency === 'emergency' || redFlags.urgency === 'urgent' ? 'Get Urgent Guidance' : 'Submit'}
              </button>
              {queryLimitInfo.count > 0 && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px', width: '100%' }}>
                  {DAILY_QUERY_LIMIT - queryLimitInfo.count} question{DAILY_QUERY_LIMIT - queryLimitInfo.count !== 1 ? 's' : ''} remaining today
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {redFlags.showEmergencyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 'var(--radius)',
            padding: '28px 24px',
            maxWidth: '360px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative',
          }}>
            <button
              onClick={() => setRedFlags((prev) => ({ ...prev, showEmergencyModal: false }))}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <AlertCircle size={20} style={{ color: '#b91c1c' }} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#b91c1c', margin: 0 }}>
                Urgent Symptoms Detected
              </h3>
            </div>

            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', marginBottom: '20px' }}>
              Your lead practitioner is available for urgent clinical concerns. Call them directly now.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="tel:0827251107"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#b91c1c',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: '700',
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                <Phone size={16} />
                Call Lead Physiotherapist
              </a>

              {client?.practitioner_id && !rtContacted ? (
                <button
                  onClick={handleRtContactProfessional}
                  disabled={rtContacting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#fff',
                    color: '#b91c1c',
                    border: '2px solid #b91c1c',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: rtContacting ? 'default' : 'pointer',
                    opacity: rtContacting ? 0.7 : 1,
                  }}
                >
                  <Send size={15} />
                  {rtContacting ? 'Sending...' : `Contact ${assignedName ?? 'My Professional'}`}
                </button>
              ) : rtContacted ? (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  color: '#166534',
                  fontSize: '13px',
                  fontWeight: '500',
                }}>
                  Notification sent to {assignedName ?? 'your professional'}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
