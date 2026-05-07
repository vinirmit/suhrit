import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '../app/auth';
import { navigationItems } from '../constants/navigation';

function getRoleLabel(role: unknown): string {
  const normalizedRole = String(role ?? '').trim().toLowerCase();

  if (normalizedRole === 'dr') {
    return 'Doctor';
  }

  if (normalizedRole === 'fd') {
    return 'Front Desk';
  }

  return String(role ?? '-');
}

function SidebarIcon({ name }: { name: string }) {
  const commonProps = {
    className: 'sidebar__icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'queue':
      return (
        <svg {...commonProps}>
          <path d="M8 6h11" />
          <path d="M8 12h11" />
          <path d="M8 18h11" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      );
    case 'search':
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );
    case 'register':
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
          <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
        </svg>
      );
    case 'reports':
      return (
        <svg {...commonProps}>
          <path d="M7 18V10" />
          <path d="M12 18V6" />
          <path d="M17 18v-4" />
          <path d="M5 20.5h14" />
        </svg>
      );
    default:
      return null;
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand brand--stacked">
          <img src="/assets/images/logo-transparent-darktext.png" alt="Suhrit" className="brand__logo" />
          <div>
            {/* <h1 className="brand__title">Suhrit</h1> */}
          </div>
        </div>
        <nav className="sidebar__nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
              }
            >
              <SidebarIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <p className="muted">Role: {getRoleLabel(user?.role)}</p>
          <button className="button button--sidebar-logout button--full" onClick={signOut}>
            Log out
          </button>
        </div>
      </aside>
      <button
        className={isDrawerOpen ? 'mobile-drawer__backdrop mobile-drawer__backdrop--open' : 'mobile-drawer__backdrop'}
        aria-label="Close navigation menu"
        aria-hidden={!isDrawerOpen}
        onClick={() => setIsDrawerOpen(false)}
        type="button"
      />
      <aside
        id="mobile-navigation"
        className={isDrawerOpen ? 'mobile-drawer mobile-drawer--open' : 'mobile-drawer'}
      >
        <div className="mobile-drawer__header">
          <div className="brand">
            <img src="/assets/images/logo-transparent-darktext.png" alt="Suhrit" className="brand__logo" />
            <div>
              <h1 className="brand__title">Suhrit</h1>
            </div>
          </div>
          <button
            className="mobile-drawer__close"
            aria-label="Close navigation menu"
            onClick={() => setIsDrawerOpen(false)}
            type="button"
          >
            ×
          </button>
        </div>
        <nav className="sidebar__nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
              }
            >
              <SidebarIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <p className="muted">Role: {getRoleLabel(user?.role)}</p>
          <button className="button button--sidebar-logout button--full" onClick={signOut}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="topbar__content">
            <div>
              <p className="topbar__eyebrow">Suhrit</p>
              <h2 className="topbar__title">Ayurvedic Clinic Workspace</h2>
            </div>
            <button
              className="mobile-nav-toggle"
              aria-controls="mobile-navigation"
              aria-expanded={isDrawerOpen}
              aria-label="Open navigation menu"
              onClick={() => setIsDrawerOpen(true)}
              type="button"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </header>
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
