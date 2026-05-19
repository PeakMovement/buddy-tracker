import { useState, useEffect } from 'react';
import { getLoggedInPractitionerId } from '../hooks/usePractitioner';
import { getPractitioner, getPractitioners, getWebhookSettings, saveWebhookSettings } from '../lib/store';
import type { Practitioner } from '../types/database';
import { Link, ExternalLink } from 'lucide-react';

export default function AdminSettingsPage() {
  const practitionerId = getLoggedInPractitionerId()!;
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [contactWebhookUrl, setContactWebhookUrl] = useState('');
  const [contactWebhookEnabled, setContactWebhookEnabled] = useState(true);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookError, setWebhookError] = useState('');
  const [practitionerWebhooks, setPractitionerWebhooks] = useState<Record<string, { contactUrl: string; contactEnabled: boolean }>>({});
  const [practitionerSaving, setPractitionerSaving] = useState<Record<string, boolean>>({});
  const [practitionerSaved, setPractitionerSaved] = useState<Record<string, boolean>>({});
  const [expandedPractitioner, setExpandedPractitioner] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getPractitioner(practitionerId);
      setPractitioner(p);
      if (p?.is_admin) {
        const list = await getPractitioners();
        setPractitioners(list);
      }
      const ws = await getWebhookSettings(practitionerId);
      if (ws) {
        setWebhookUrl(ws.webhook_url);
        setWebhookEnabled(ws.enabled);
        setContactWebhookUrl(ws.contact_webhook_url);
        setContactWebhookEnabled(ws.contact_webhook_enabled);
      }
      setLoading(false);
    })();
  }, [practitionerId]);

  async function loadPractitionerWebhook(pid: string) {
    const ws = await getWebhookSettings(pid);
    setPractitionerWebhooks((prev) => ({
      ...prev,
      [pid]: ws
        ? { contactUrl: ws.contact_webhook_url ?? '', contactEnabled: ws.contact_webhook_enabled ?? true }
        : { contactUrl: '', contactEnabled: true },
    }));
  }

  async function savePractitionerWebhook(pid: string) {
    const current = practitionerWebhooks[pid] ?? { contactUrl: '', contactEnabled: true };
    setPractitionerSaving((prev) => ({ ...prev, [pid]: true }));
    try {
      await saveWebhookSettings(pid, '', true, current.contactUrl, current.contactEnabled);
      setPractitionerSaved((prev) => ({ ...prev, [pid]: true }));
      setTimeout(() => setPractitionerSaved((prev) => ({ ...prev, [pid]: false })), 3000);
    } finally {
      setPractitionerSaving((prev) => ({ ...prev, [pid]: false }));
    }
  }

  async function handleSaveWebhook() {
    setSavingWebhook(true);
    setWebhookError('');
    setWebhookSaved(false);
    try {
      await saveWebhookSettings(
        practitionerId,
        webhookUrl.trim(),
        webhookEnabled,
        contactWebhookUrl.trim(),
        contactWebhookEnabled
      );
      const ws = await getWebhookSettings(practitionerId);
      if (ws) {
        setWebhookUrl(ws.webhook_url);
        setWebhookEnabled(ws.enabled);
        setContactWebhookUrl(ws.contact_webhook_url);
        setContactWebhookEnabled(ws.contact_webhook_enabled);
      }
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 3000);
    } catch {
      setWebhookError('Failed to save webhook settings. Please try again.');
    } finally {
      setSavingWebhook(false);
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Your Account</h3>
        <div style={{ fontSize: '14px', display: 'grid', gap: '8px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Name: </span><strong>{practitioner?.full_name || practitioner?.name}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Login Code: </span><strong>{practitioner?.login_code}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Role: </span><strong>{practitioner?.is_admin ? 'Admin' : 'Practitioner'}</strong></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link size={14} /> Alert Webhook
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Paste a Make.com or Zapier webhook URL to receive instant notifications when clients trigger red-flag alerts.
        </p>

        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label>Webhook URL</label>
          <input
            className="login-input"
            style={{ marginBottom: 0 }}
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hook.eu2.make.com/... or https://hooks.zapier.com/..."
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button
            onClick={() => setWebhookEnabled(!webhookEnabled)}
            style={{
              width: '36px', height: '20px', borderRadius: '10px',
              background: webhookEnabled ? 'var(--primary)' : 'var(--border)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: '2px', left: webhookEnabled ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {webhookEnabled ? 'Enabled — alerts will be sent' : 'Disabled — no alerts will be sent'}
          </span>
        </div>

        {webhookError && <p className="login-error">{webhookError}</p>}
        {webhookSaved && <p style={{ fontSize: '13px', color: 'var(--success)', marginBottom: '10px' }}>Webhook settings saved.</p>}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSaveWebhook} disabled={savingWebhook}>
            {savingWebhook ? 'Saving...' : 'Save Webhook'}
          </button>
          <a href="https://www.make.com/en/register" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <ExternalLink size={12} /> Get a Make.com webhook
          </a>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link size={14} /> Contact Professional Webhook
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Paste a Make.com or Zapier webhook URL to receive a notification when a client taps “Contact My Professional” on the symptom query page.
        </p>

        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label>Webhook URL</label>
          <input
            className="login-input"
            style={{ marginBottom: 0 }}
            value={contactWebhookUrl}
            onChange={(e) => setContactWebhookUrl(e.target.value)}
            placeholder="https://hook.eu2.make.com/... or https://hooks.zapier.com/..."
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button
            onClick={() => setContactWebhookEnabled(!contactWebhookEnabled)}
            style={{
              width: '36px', height: '20px', borderRadius: '10px',
              background: contactWebhookEnabled ? 'var(--primary)' : 'var(--border)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute', top: '2px', left: contactWebhookEnabled ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {contactWebhookEnabled ? 'Enabled — notifications will be sent' : 'Disabled — no notifications will be sent'}
          </span>
        </div>

        {webhookError && <p className="login-error">{webhookError}</p>}
        {webhookSaved && <p style={{ fontSize: '13px', color: 'var(--success)', marginBottom: '10px' }}>Webhook settings saved.</p>}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSaveWebhook} disabled={savingWebhook}>
            {savingWebhook ? 'Saving...' : 'Save Webhook'}
          </button>
          <a href="https://www.make.com/en/register" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <ExternalLink size={12} /> Get a Make.com webhook
          </a>
        </div>
      </div>

      {practitioner?.is_admin && practitioners.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Practitioner Webhooks</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Configure a unique contact webhook for each practitioner. When a client taps “Contact” for that practitioner, only their webhook will fire.
          </p>
          {practitioners.filter((p) => p.id !== practitionerId).map((p) => {
            const isExpanded = expandedPractitioner === p.id;
            const pwh = practitionerWebhooks[p.id];
            const hasUrl = !!pwh?.contactUrl;
            return (
              <div key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  onClick={() => {
                    const next = isExpanded ? null : p.id;
                    setExpandedPractitioner(next);
                    if (next && !practitionerWebhooks[next]) loadPractitionerWebhook(next);
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{p.full_name || p.name}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>· Code: {p.login_code}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: hasUrl ? '#f0fdf4' : '#f3f4f6', color: hasUrl ? '#16a34a' : '#6b7280', fontWeight: 500 }}>
                      {hasUrl ? 'Configured' : 'Not set'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ paddingBottom: '14px' }}>
                    {!pwh ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading...</p>
                    ) : (
                      <>
                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <label>Contact Webhook URL</label>
                          <input
                            className="login-input"
                            style={{ marginBottom: 0 }}
                            value={pwh.contactUrl}
                            onChange={(e) => setPractitionerWebhooks((prev) => ({ ...prev, [p.id]: { ...prev[p.id], contactUrl: e.target.value } }))}
                            placeholder="https://hook.eu2.make.com/... or https://hooks.zapier.com/..."
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                          <button
                            onClick={() => setPractitionerWebhooks((prev) => ({ ...prev, [p.id]: { ...prev[p.id], contactEnabled: !prev[p.id].contactEnabled } }))}
                            style={{ width: '36px', height: '20px', borderRadius: '10px', background: pwh.contactEnabled ? 'var(--primary)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                          >
                            <span style={{ position: 'absolute', top: '2px', left: pwh.contactEnabled ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                          </button>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {pwh.contactEnabled ? 'Enabled — notifications will be sent' : 'Disabled — no notifications will be sent'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button className="btn btn-primary btn-sm" onClick={() => savePractitionerWebhook(p.id)} disabled={practitionerSaving[p.id]}>
                            {practitionerSaving[p.id] ? 'Saving...' : 'Save'}
                          </button>
                          {practitionerSaved[p.id] && <span style={{ fontSize: '13px', color: 'var(--success)' }}>Saved</span>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
