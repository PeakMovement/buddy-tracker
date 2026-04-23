import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getPractitionerByCode } from '../lib/store';
import { loginPractitioner } from '../hooks/usePractitioner';

export default function PractitionerLoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!code.trim()) {
      setError('Please enter your practitioner code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const practitioner = await getPractitionerByCode(code.trim());
      if (!practitioner) {
        setError('Invalid code. Please contact your administrator.');
        return;
      }
      loginPractitioner(practitioner.id);
      navigate('/admin/dashboard', { replace: true });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon-wrap">
          <Lock size={28} />
        </div>
        <h1>Practitioner Portal</h1>
        <p className="login-subtitle">Log in to access the admin dashboard.</p>

        <input
          className="login-input"
          type="text"
          placeholder="PRACTITIONER CODE"
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

        <a href="/app/login" className="login-switch-link">
          Back
        </a>
      </div>
    </div>
  );
}
