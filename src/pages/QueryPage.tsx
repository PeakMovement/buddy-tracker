import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Send, UserCheck, ChevronRight, Check, Phone, X } from 'lucide-react';
import { storeSymptomQuery, createContactRequest, getPractitionerDisplayName, getCheckIns, fireContactProfessionalWebhook } from '../lib/store';
import { analyzeSymptomLocal, analyzeSymptomRealTime, buildClientRiskContext } from '../lib/symptomAnalysis';
import type { ClientRiskContext } from '../lib/symptomAnalysis';
import { getLoggedInClientId } from '../hooks/useClient';
import { useClientContext } from '../context/ClientContext';

const EXAMPLE_PROMPTS = [
  'I have sharp pain in my lower back when I bend forward',
  'My neck feels stiff and painful after sleeping',
  'I experience tingling in my hands during the day',
  'My shoulder hurts when I lift my arm overhead',
  'I have constant dull ache in my right knee',
];

export default function QueryPage() {
  const clientId = getLoggedInClientId();
  const { client, practitioners, assignedPractitioner, selectPractitioner } = useClientContext();
  const [prompt, setPrompt] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
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
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!clientId) return;
    getCheckIns(clientId).then((cis) => setClientRiskContext(buildClientRiskContext(cis)));
  }, [clientId]);

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
        true
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
    setContacting(true);
    setError('');
    try {
      await createContactRequest(
        clientId,
        client.practitioner_id,
        prompt,
        result.matched_score || 0,
        client.full_name,
        result.red_flag_detected
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
    try {
      const analysisResult = analyzeSymptomLocal(prompt, clientRiskContext);
      storeSymptomQuery(clientId, prompt, analysisResult.red_flag_detected, analysisResult.confidence_score);
      setResult(analysisResult);
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
    return (
      <div className="checkin-page">
        <div className="checkin-card">
          <div className="step-content">
            {result.red_flag_detected ? (
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                alignItems: 'flex-start',
              }}>
                <AlertCircle size={24} style={{ color: '#c2410c', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ color: '#c2410c', marginBottom: '4px', fontSize: '16px', fontWeight: '600' }}>
                    Medical Referral Recommended
                  </h3>
                  <p style={{ color: '#92400e', fontSize: '14px', lineHeight: '1.5', marginBottom: '8px' }}>
                    {result.suggested_next_step}
                  </p>
                  {result.matched_symptom && (
                    <p style={{ color: '#92400e', fontSize: '12px' }}>
                      <strong>Matched:</strong> {result.matched_symptom} (Score: {result.matched_score}/10)
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
              }}>
                <div>
                  <h3 style={{ color: '#166534', marginBottom: '4px', fontSize: '16px', fontWeight: '600' }}>
                    Monitoring Recommended
                  </h3>
                  <p style={{ color: '#166534', fontSize: '14px', lineHeight: '1.5', marginBottom: '8px' }}>
                    {result.suggested_next_step}
                  </p>
                  {result.matched_symptom && (
                    <p style={{ color: '#166534', fontSize: '12px' }}>
                      <strong>Matched:</strong> {result.matched_symptom} (Score: {result.matched_score}/10)
                    </p>
                  )}
                </div>
              </div>
            )}

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
              {result.matched_score >= 5 && !contacted && (
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
                        backgroundColor: result.matched_score >= 9 ? '#b91c1c' : result.matched_score >= 7 ? '#c2410c' : '#1d4ed8',
                      }}
                      onClick={handleContactProfessional}
                      disabled={contacting}
                    >
                      <Send size={16} />
                      {contacting
                        ? 'Sending...'
                        : result.matched_score >= 7
                        ? `Contact ${assignedName ?? 'My Professional'} — urgent review needed`
                        : `Contact ${assignedName ?? 'My Professional'} — symptoms noted`}
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
          <h2>What symptoms are you feeling?</h2>
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
            placeholder="Type your symptoms here..."
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

          <div className="step-actions">
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleSubmit}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : redFlags.urgency === 'emergency' || redFlags.urgency === 'urgent' ? 'Get Urgent Guidance' : 'Submit'}
            </button>
          </div>
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
              The symptoms you have described may require immediate attention. Please take action now.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="tel:999"
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
                Call 999
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
