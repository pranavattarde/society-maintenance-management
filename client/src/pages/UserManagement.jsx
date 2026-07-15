import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { users as usersApi } from '../api/index';
import { Link } from 'react-router-dom';
import './UserManagement.css';

export default function UserManagement() {
  const { user: currentUser, token } = useAuth();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const response = await usersApi.list({ search }, token);
      setUsers(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load user list.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, newRole) {
    if (userId === currentUser.id) {
      setError('You cannot promote or demote yourself.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    setActioningId(userId);
    setError('');
    setSuccessMessage('');

    try {
      const response = await usersApi.updateRole(userId, newRole, token);
      setSuccessMessage(response.message || 'User role updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      // Update local state list
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="page user-management-page animate-fade-in">
      <header className="page-header">
        <div className="page-header-title">
          <h1>Settings</h1>
          <p className="page-header-subtitle">Manage administrative privileges and user roles</p>
        </div>
      </header>

      {/* Settings Navigation Tabs */}
      <div className="settings-tabs">
        <Link to="/settings" className="settings-tab">
          My Profile
        </Link>
        <Link to="/settings/users" className="settings-tab active">
          User Management
        </Link>
      </div>

      <div className="card user-management-card">
        <div className="user-management-actions-row">
          <h2 className="settings-section-title" style={{ border: 'none', margin: 0, padding: 0 }}>
            Society Users
          </h2>

          {/* Instant Search Bar */}
          <div className="search-bar-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, or flat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input search-input"
            />
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-success" role="alert" style={{ margin: 'var(--space-4) 0' }}>
            {successMessage}
          </div>
        )}

        {error && (
          <div className="alert alert-error" role="alert" style={{ margin: 'var(--space-4) 0' }}>
            {error}
          </div>
        )}

        {/* User Table */}
        <div className="table-responsive" style={{ marginTop: 'var(--space-4)' }}>
          {loading && users.length === 0 ? (
            <div className="loading-spinner-container">
              <div className="spinner"></div>
              <span>Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <p>No registered users found matching the search criteria.</p>
            </div>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Flat / Unit</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className={isSelf ? 'user-row-self' : ''}>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-avatar-cell">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="user-avatar-img" />
                            ) : (
                              u.name.trim().charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="user-name-email">
                            <span className="user-cell-name">
                              {u.name} {isSelf && <span className="self-tag">(You)</span>}
                            </span>
                            <span className="user-cell-email">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="user-cell-flat">{u.flatNumber}</span>
                      </td>
                      <td>
                        <span className="user-cell-phone">{u.phone || '—'}</span>
                      </td>
                      <td>
                        <span className={`role-badge role-badge--${u.role.toLowerCase()}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isSelf ? (
                          <span className="self-action-disclaimer" title="You cannot demote or modify your own role.">
                            Restricted
                          </span>
                        ) : u.role === 'ADMIN' ? (
                          <button
                            onClick={() => handleRoleChange(u.id, 'RESIDENT')}
                            className="btn btn-secondary btn-sm demote-btn"
                            disabled={actioningId === u.id}
                          >
                            {actioningId === u.id ? 'Demoting...' : 'Demote to Resident'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(u.id, 'ADMIN')}
                            className="btn btn-primary btn-sm promote-btn"
                            disabled={actioningId === u.id}
                          >
                            {actioningId === u.id ? 'Promoting...' : 'Promote to Admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
