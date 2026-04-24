import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, UserCheck, Calendar, FileText, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { getPractitioners, getClientByCode, createClient } from '../lib/store';
import { loginClient } from '../hooks/useClient';
import type { Practitioner } from '../types/database';

type Step = 'name' | 'code' | 'practitioner' | 'frequency' | 'complaint';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Check in every day' },
  { value: 'every_2_days', label: 'Every 2 days', description: 'Check in every other day' },
  { value: 'every_3_days', label: 'Every 3 days', description: 'Check in every 3 days' },
  { value: 'weekly', label: 'Weekly', description: 'Check in once a week' },
];

const STEPS: Step[] = ['name', 'code', 'practitioner', 'frequency', 'complaint'];

function getStepIndex(step: Step) {
  return STEPS.indexOf(step);
}

export default function ClientRegisterPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('name');
  const [fullName, setFullName] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [practitionerId, setPractitionerId] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [complaint, setComplaint] = useState('');
  const [popiaAccepted, setPopiaAccepted] = useState(false);

  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loadingPractitioners, setLoadingPractitioners] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoadingPractitioners(true);
    getPractitioners()
      .then(setPractitioners)
      .finally(() => setLoadingPractitioners(false));
  }, []);

  function clearError() {
    setError('');
  }

  async function handleNext() {
    setError('');

    if (step === 'name') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      setStep('code');
      return;
    }

    if (step === 'code') {
      if (!/^\d{4}$/.test(loginCode)) {
        setError('Please enter exactly 4 digits.');
        return;
      }
      setLoading(true);
      try {
        const existing = await getClientByCode(loginCode);
        if (existing) {
          setError('That code is already taken. Please choose a different one.');
          return;
        }
      } catch {
        setError('Could not verify your code. Please try again.');
        return;
      } finally {
        setLoading(false);
      }
      setStep('practitioner');
      return;
    }

    if (step === 'practitioner') {
      if (!practitionerId) {
        setError('Please select your practitioner.');
        return;
      }
      setStep('frequency');
      return;
    }

    if (step === 'frequency') {
      setStep('complaint');
      return;
    }

    if (step === 'complaint') {
      if (!popiaAccepted) {
        setError('Please accept the POPIA consent statement to continue.');
        return;
      }
      await handleSubmit();
    }
  }

  function handleBack() {
    setError('');
    const idx = getStepIndex(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const client = await createClient({
        full_name: fullName.trim(),
        email: '',
        practitioner_id: practitionerId,
        login_code: loginCode,
        primary_complaint: complaint.trim(),
        check_in_frequency: frequency,
      });

      if (!client) {
        setError('Could not create your account. Please try again.');
        return;
      }

      loginClient(client.id);
      navigate('/app/checkin', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = getStepIndex(step);
  const totalSteps = STEPS.length;

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 400 }}>
        <div className="login-icon">B</div>
        <h1>Create Account</h1>
        <p className="login-subtitle">Set up your Buddy profile</p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= stepIndex ? 'var(--primary)' : 'var(--border)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {step === 'name' && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <User size={18} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Your full name</span>
            </div>
            <input
              className="login-input"
              type="text"
              placeholder="e.g. Jane Smith"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); clearError(); }}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              autoFocus
            />
          </div>
        )}

        {step === 'code' && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Lock size={18} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Choose a 4-digit login code</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              You will use this code every time you log in.
            </p>
            <input
              className="login-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="e.g. 4827"
              value={loginCode}
              onChange={(e) => { setLoginCode(e.target.value.replace(/\D/g, '')); clearError(); }}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              autoFocus
              style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }}
            />
          </div>
        )}

        {step === 'practitioner' && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <UserCheck size={18} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Select your practitioner</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Choose the professional who is treating you.
            </p>
            {loadingPractitioners ? (
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {practitioners.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPractitionerId(p.id); clearError(); }}
                    style={{
                      padding: '12px 16px',
                      border: `2px solid ${practitionerId === p.id ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: practitionerId === p.id ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>
                      {p.full_name || p.name}
                    </span>
                    {practitionerId === p.id && <Check size={16} color="var(--primary)" />}
                  </button>
                ))}
                {practitioners.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No practitioners available.</p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'frequency' && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Calendar size={18} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Check-in frequency</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              How often would you like to check in?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFrequency(opt.value)}
                  style={{
                    padding: '12px 16px',
                    border: `2px solid ${frequency === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    background: frequency === opt.value ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'complaint' && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FileText size={18} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>Current pain complaint</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Briefly describe what you are experiencing. <span style={{ fontStyle: 'italic' }}>Optional.</span>
            </p>
            <textarea
              className="notes-input"
              rows={3}
              placeholder="e.g. Lower back pain after long periods of sitting..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              style={{ marginBottom: 20 }}
            />

            <div
              style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 16px',
                marginBottom: 16,
                fontSize: 12,
                color: '#0c4a6e',
                lineHeight: 1.6,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>POPIA Compliance Notice</strong>
              By creating an account, you consent to Buddy collecting and storing your personal and health information,
              including your name, login code, practitioner details, check-in responses, and any symptom data you provide.
              This information is used solely to support your health monitoring and to share relevant data with your
              assigned practitioner. Your data is stored securely, will not be sold or disclosed to third parties, and
              you may request deletion at any time by contacting your practitioner. This application complies with the
              Protection of Personal Information Act (POPIA), Act 4 of 2013.
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <input
                type="checkbox"
                checked={popiaAccepted}
                onChange={(e) => { setPopiaAccepted(e.target.checked); clearError(); }}
                style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--primary)', width: 16, height: 16 }}
              />
              I have read and understood the POPIA notice above and consent to my personal information being processed
              as described.
            </label>
          </div>
        )}

        {error && (
          <p className="login-error" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {stepIndex > 0 && (
            <button
              className="btn btn-ghost"
              onClick={handleBack}
              disabled={loading}
              style={{ flex: 1 }}
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={loading}
            style={{ flex: 2 }}
          >
            {loading
              ? 'Please wait...'
              : step === 'complaint'
              ? 'Create Account'
              : (
                <>
                  Next
                  <ChevronRight size={16} />
                </>
              )}
          </button>
        </div>

        <a href="/app/login" className="login-switch-link">
          Already have an account? Log in
        </a>
      </div>
    </div>
  );
}
