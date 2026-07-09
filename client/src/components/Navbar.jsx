import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import './Navbar.css';

/**
 * Navbar — persistent top navigation for authenticated users.
 *
 * Shows role-appropriate navigation links.
 * Admin-only links (Create Notice) are hidden for residents.
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) => `navbar-link${isActive ? ' active' : ''}`;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo" aria-hidden="true">🏢</span>
        <span className="navbar-title">Society Maintenance</span>
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className={linkClass}>
          Dashboard
        </NavLink>
        <NavLink to="/complaints" className={linkClass}>
          Complaints
        </NavLink>
        <NavLink to="/notices" className={linkClass}>
          Notices
        </NavLink>
      </div>

      <div className="navbar-user">
        {user && (
          <div className="navbar-user-info">
            <span className="navbar-user-name">{user.name}</span>
            <span className="navbar-user-flat text-xs text-muted">{user.flatNumber}</span>
          </div>
        )}
        <button onClick={handleLogout} className="btn btn-secondary btn-sm">
          Logout
        </button>
      </div>
    </nav>
  );
}
