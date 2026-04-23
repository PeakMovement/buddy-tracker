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
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookError, setWebhookError] = useState('');

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
      }
      setLoading(false);
    })();
  }, [practitionerId]);

  async function handleSaveWebhook() {
    setSavingWebhook(true);
    setWebhookError('');
    setWebhookSaved(false);
    try {
      await saveWebhookSettings(practitionerId, webhookUrl.trim(), webhookEnabled);
      setWebhookSaved(true);
      setTimeout(() => setWebhookSaved(false), 3000);
    } catch {
      setWebhookError('Failed to save webhook settings.');
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
            placeholder="https://hook.make.com/... or https://hooks.zapier.com/..."
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <button
            onClick={() => setWebhookEnabled(!webhookEnabled)}
            style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              background: webhookEnabled ? 'var(--primary)' : 'var(--border)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: '2px',
              left: webhookEnabled ? '18px' : '2px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {webhookEnabled ? 'Enabled — alerts will be sent' : 'Disabled — no alerts will be sent'}
          </span>
        </div>

        {webhookError && <p className="login-error">{webhookError}</p>}
        {webhookSaved && (
          <p style={{ fontSize: '13px', color: 'var(--success)', marginBottom: '10px' }}>Webhook settings saved.</p>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSaveWebhook} disabled={savingWebhook}>
            {savingWebhook ? 'Saving...' : 'Save Webhook'}
          </button>
          <a
            href="https://www.make.com/en/register"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <ExternalLink size={12} /> Get a Make.com webhook
          </a>
        </div>
      </div>

      {practitioner?.is_admin && practitioners.length > 0 && (
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>All Practitioners</h3>
          {practitioners.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                fontSize: '14px',
              }}
            >
              <div>
                <strong>{p.full_name || p.name}</strong>
                {p.is_admin && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', background: '#eff6ff', color: '#2563eb', padding: '2px 6px', borderRadius: '4px' }}>
                    Admin
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Code: {p.login_code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
