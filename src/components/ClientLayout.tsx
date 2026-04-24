import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, MessageCircle, BarChart3, TrendingUp,
  LogOut, UserCheck, ChevronDown, Check, Menu, X
} from 'lucide-react';
import { getLoggedInClientId, logoutClient } from '../hooks/useClient';
import { ClientContextProvider, useClientContext, getPractitionerDisplayName } from '../context/ClientContext';
import { recordDeviceVisit } from '../lib/store';

const CLIENT_NAV = [
  { to: '/app/checkin', icon: ClipboardCheck, label: 'Check-in' },
  { to: '/app/query', icon: MessageCircle, label: 'Query' },
  { to: '/app/timeline', icon: BarChart3, label: 'Timeline' },
  { to: '/app/progress', icon: TrendingUp, label: 'Progress' },
];

function PractitionerBanner() {
  const { client, practitioners, assignedPractitioner, selectPractitioner } = useClientContext();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!client) return null;

  async function handleSelect(id: string) {
    setSaving(true);
    await selectPractitioner(id);
    setSaving(false);
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        className="practitioner-banner-btn"
      >
        <UserCheck size={13} style={{ flexShrink: 0 }} />
        <span className="practitioner-banner-label">
          {assignedPractitioner
            ? getPractitionerDisplayName(assignedPractitioner)
            : 'Assign professional'}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div className="practitioner-dropdown">
            <div className="practitioner-dropdown-header">Your Professional</div>
            {practitioners.length === 0 ? (
              <div className="practitioner-dropdown-empty">No professionals found</div>
            ) : (
              practitioners.map((p) => {
                const isSelected = client.practitioner_id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    disabled={saving}
                    className={`practitioner-dropdown-item${isSelected ? ' selected' : ''}`}
                  >
                    {getPractitionerDisplayName(p)}
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClientLayoutInner() {
  const clientId = getLoggedInClientId();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (clientId) {
      recordDeviceVisit(clientId, location.pathname);
    }
  }, [clientId, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.altKey) {
      if (e.key === '1') { e.preventDefault(); navigate('/app/checkin'); }
      if (e.key === '2') { e.preventDefault(); navigate('/app/query'); }
      if (e.key === '3') { e.preventDefault(); navigate('/app/timeline'); }
      if (e.key === '4') { e.preventDefault(); navigate('/app/progress'); }
    }
    if (e.key === 'Escape') setMenuOpen(false);
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!clientId) {
    return <Navigate to="/app/login" replace />;
  }

  function handleLogout() {
    logoutClient();
    window.location.href = '/';
  }

  const currentPage = CLIENT_NAV.find(n => location.pathname.startsWith(n.to))?.label ?? '';
  const pathParts = location.pathname.split('/').filter(Boolean);

  return (
    <div className="app-layout client-layout">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">B</div>
          <div>
            <h1>Buddy</h1>
            <span className="brand-tagline">Your symptom companion</span>
          </div>
        </div>

        {/* Tablet/Desktop: horizontal primary nav */}
        <nav className="header-nav-tabs" aria-label="Primary navigation">
          {CLIENT_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `header-nav-tab${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <PractitionerBanner />
          {/* Hamburger: mobile secondary menu */}
          <button
            className="btn btn-ghost btn-sm hamburger-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <button className="btn btn-ghost btn-sm logout-btn" onClick={handleLogout} title="Log out (Alt+L)">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Breadcrumb — tablet/desktop only */}
      {pathParts.length > 1 && (
        <div className="breadcrumb-bar" aria-label="Breadcrumb">
          <span className="breadcrumb-item">Buddy</span>
          {currentPage && (
            <>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-item active">{currentPage}</span>
            </>
          )}
        </div>
      )}

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-label="Menu">
          <div className="mobile-menu-inner">
            <div className="mobile-menu-section">
              <PractitionerBanner />
            </div>
            <button
              className="mobile-menu-item"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Log out
            </button>
            <div className="mobile-menu-shortcuts">
              <p className="mobile-menu-hint">Quick navigation: Alt+1 through Alt+4</p>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="app-nav mobile-bottom-nav" aria-label="Tab bar">
        {CLIENT_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function ClientLayout() {
  return (
    <ClientContextProvider>
      <ClientLayoutInner />
    </ClientContextProvider>
  );
}
