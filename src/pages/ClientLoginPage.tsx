import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientByCode } from '../lib/store';
import { loginClient } from '../hooks/useClient';

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!code.trim()) {
      setError('Please enter your access code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const client = await getClientByCode(code.trim());
      if (!client) {
        setError('Invalid code. Please check with your practitioner.');
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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">B</div>
        <h1>Buddy</h1>
        <p className="login-subtitle">Your symptom companion</p>

        <input
          className="login-input"
          type="text"
          placeholder="ACCESS CODE"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          autoComplete="off"
        />

        {error && <p className="login-error">{error}</p>}

        <button
          className="btn btn-primary login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Log in'}
        </button>

        <a href="/app/register" className="login-switch-link" style={{ marginBottom: 4 }}>
          New client? Create an account
        </a>

        <a href="/admin/login" className="login-switch-link" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Practitioner? Log in here
        </a>
      </div>
    </div>
  );
}
