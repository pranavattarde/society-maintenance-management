import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

/**
 * Navbar — persistent left sidebar on desktop/tablet, and top+bottom nav on mobile.
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <aside className="app-navigation">
      {/* Brand logo header */}
      <div className="nav-brand">
        <svg className="nav-logo-svg" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="9" y1="22" x2="9" y2="16" />
          <line x1="15" y1="22" x2="15" y2="16" />
          <line x1="9" y1="16" x2="15" y2="16" />
          <path d="M9 6h6" />
          <path d="M9 10h6" />
        </svg>
        <span className="nav-brand-text">Society Management</span>
      </div>

      {/* Nav Menu */}
      <nav className="nav-menu">
        <NavLink to="/dashboard" className={linkClass}>
          <svg className="nav-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
          <span className="nav-label">Dashboard</span>
        </NavLink>
        <NavLink to="/complaints" className={linkClass}>
          <svg className="nav-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="nav-label">Complaints</span>
        </NavLink>
        <NavLink to="/notices" className={linkClass}>
          <svg className="nav-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="nav-label">Notices</span>
        </NavLink>
      </nav>

      {/* User profile footer */}
      <div className="nav-user">
        {user && (
          <div className="nav-user-info">
            <div className="nav-user-avatar" aria-hidden="true">
              {user.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="nav-user-profile">
              <span className="nav-user-name">{user.name}</span>
              <span className="nav-user-flat">
                Flat {user.flatNumber} · <span className="nav-user-role">{user.role.toLowerCase()}</span>
              </span>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className="nav-logout-btn" aria-label="Logout">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
