import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Users, Bell, Settings, LogOut, UserPlus, BarChart2, Menu, X, ChevronRight } from 'lucide-react';
import { getLoggedInPractitionerId, logoutPractitioner } from '../hooks/usePractitioner';

const ADMIN_NAV = [
  { to: '/admin/dashboard', icon: Users, label: 'Clients', shortcut: '1' },
  { to: '/admin/alerts', icon: Bell, label: 'Alerts', shortcut: '2' },
  { to: '/admin/add-client', icon: UserPlus, label: 'Add Client', shortcut: '3' },
  { to: '/admin/analytics', icon: BarChart2, label: 'Analytics', shortcut: '4' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', shortcut: '5' },
];

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Clients',
  alerts: 'Alerts',
  'add-client': 'Add Client',
  analytics: 'Analytics',
  settings: 'Settings',
  client: 'Client Detail',
  edit: 'Edit Client',
};

function getBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; path?: string }[] = [{ label: 'Admin', path: '/admin/dashboard' }];
  if (parts[1]) {
    const label = BREADCRUMB_MAP[parts[1]] ?? parts[1];
    const isLeaf = parts.length === 2;
    crumbs.push({ label, path: isLeaf ? undefined : `/${parts.slice(0, 2).join('/')}` });
  }
  if (parts[2] && parts[1] === 'client') {
    crumbs.push({ label: 'Detail', path: parts[3] ? `/${parts.slice(0, 3).join('/')}` : undefined });
  }
  if (parts[3] === 'edit') {
    crumbs.push({ label: 'Edit' });
  }
  return crumbs;
}

export default function AdminLayout() {
  const practitionerId = getLoggedInPractitionerId();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.altKey) {
      const nav = ADMIN_NAV.find(n => n.shortcut === e.key);
      if (nav) { e.preventDefault(); navigate(nav.to); }
    }
    if (e.key === 'Escape') setSidebarOpen(false);
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!practitionerId) {
    return <Navigate to="/admin/login" replace />;
  }

  function handleLogout() {
    logoutPractitioner();
    window.location.href = '/admin/login';
  }

  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar-brand">
          <div className="brand-icon">B</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">Buddy Admin</span>
            <span className="sidebar-brand-sub">Practitioner Portal</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Admin sections">
          {ADMIN_NAV.map(({ to, icon: Icon, label, shortcut }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              title={`${label} (Alt+${shortcut})`}
            >
              <Icon size={18} />
              <span className="sidebar-nav-label">{label}</span>
              <span className="sidebar-shortcut">Alt+{shortcut}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="btn btn-ghost btn-sm hamburger-btn"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-brand-mobile">
              <div className="brand-icon" style={{ width: 28, height: 28, fontSize: 14 }}>B</div>
              <span className="topbar-brand-name">Buddy Admin</span>
            </div>
          </div>

          <nav className="admin-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="breadcrumb-trail">
                {i > 0 && <ChevronRight size={12} className="breadcrumb-chevron" />}
                {crumb.path ? (
                  <button className="breadcrumb-link" onClick={() => navigate(crumb.path!)}>
                    {crumb.label}
                  </button>
                ) : (
                  <span className="breadcrumb-current">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          <button className="btn btn-ghost btn-sm logout-btn topbar-logout" onClick={handleLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
