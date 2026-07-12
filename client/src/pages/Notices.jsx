import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { notices as noticesApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/constants';
import { formatDateTime } from '../utils/helpers';
import './Notices.css';

// ─── Client-side validation ───────────────────────────────────────────────────
// Mirrors validateNotice on the server — catches obvious errors before the call.

function validate(form) {
  const errors = {};
  const title   = form.title.trim();
  const content = form.content.trim();

  if (!title || title.length < 3)   errors.title   = 'Title must be at least 3 characters';
  else if (title.length > 150)       errors.title   = 'Title must not exceed 150 characters';
  if (!content || content.length < 10) errors.content = 'Content must be at least 10 characters';

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Notices board page.
 *
 * Resident UX:
 *   - Read-only list; pinned notices appear first with a visual accent
 *
 * Admin UX:
 *   - "New Notice" button → /notices/new
 *   - "Pin / Unpin" — toggle; re-sorts list locally (no full re-fetch)
 *   - "Edit"  — replaces the card with an inline form
 *   - "Delete" — window.confirm → removed from list
 *
 * Pin re-sort logic is applied in the frontend after a successful togglePin call
 * so the page feels instant without waiting for a full re-fetch.
 */
export default function Notices() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  // ── Fetch state ────────────────────────────────────────────────────────────
  const [notices, setNotices]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [actionError, setActionError] = useState(''); // for pin/delete failures
  const [successMsg, setSuccessMsg] = useState('');
  const location = useLocation();

  // ── Inline edit state ──────────────────────────────────────────────────────
  const [editingId, setEditingId]         = useState(null);
  const [editForm, setEditForm]           = useState({ title: '', content: '' });
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [editError, setEditError]         = useState('');
  const [editSaving, setEditSaving]       = useState(false);

  // ── Per-notice action loading indicators ───────────────────────────────────
  const [pinningId, setPinningId]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchNotices() {
      setLoading(true);
      setError('');
      try {
        const data = await noticesApi.list(token);
        setNotices(data.notices);
      } catch (err) {
        setError(err.message || 'Failed to load notices');
      } finally {
        setLoading(false);
      }
    }

    fetchNotices();
  }, [token]);

  // Check for redirected state success message
  useEffect(() => {
    if (location.state?.success) {
      setSuccessMsg(location.state.success);
      // Clean state so refreshing won't keep showing the toast
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setSuccessMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function startEdit(notice) {
    setEditingId(notice.id);
    setEditForm({ title: notice.title, content: notice.content });
    setEditFieldErrors({});
    setEditError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFieldErrors({});
    setEditError('');
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (editFieldErrors[name]) {
      setEditFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  async function handleEditSave(id) {
    const errors = validate(editForm);
    setEditFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditSaving(true);
    setEditError('');
    try {
      const data = await noticesApi.update(
        id,
        { title: editForm.title.trim(), content: editForm.content.trim() },
        token
      );
      setNotices((prev) => prev.map((n) => (n.id === id ? data.notice : n)));
      setEditingId(null);
      setSuccessMsg('Notice updated.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        setEditError(err.errors.join(' · '));
      } else {
        setEditError(err.message || 'Failed to save changes');
      }
    } finally {
      setEditSaving(false);
    }
  }

  // ── Pin / Unpin ────────────────────────────────────────────────────────────

  async function handleTogglePin(id) {
    setPinningId(id);
    setActionError('');
    try {
      const data = await noticesApi.togglePin(id, token);
      setNotices((prev) => {
        const updated = prev.map((n) => (n.id === id ? data.notice : n));
        // Re-sort locally: pinned first, then newest — matches backend ordering
        return [...updated].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      });
      setSuccessMsg(data.notice.isPinned ? 'Notice pinned.' : 'Notice unpinned.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to update pin status');
    } finally {
      setPinningId(null);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this notice? This cannot be undone.')) return;
    setDeletingId(id);
    setActionError('');
    try {
      await noticesApi.delete(id, token);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      setSuccessMsg('Notice deleted.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setActionError(err.message || 'Failed to delete notice');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page notices-board">

      {/* Page header */}
      <header className="page-header">
        <div className="page-header-title">
          <h1>Bulletin Board</h1>
          <p className="page-header-subtitle">Official society announcements and general bulletins</p>
        </div>
        <div className="workspace-actions">
          {isAdmin && (
            <Link to="/notices/new" className="btn btn-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Publish Notice
            </Link>
          )}
        </div>
      </header>

      {/* Success notification banner */}
      {successMsg && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          {successMsg}
        </div>
      )}

      {/* Action error (pin/delete failures) */}
      {actionError && (
        <div className="alert alert-error notices-action-error" role="alert">
          {actionError}
        </div>
      )}

      {/* Body ---------------------------------------------------------------- */}
      {loading ? (
        <div className="notices-list">
          {[1, 2, 3].map((i) => (
            <article key={i} className="notice-card card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ width: '50%', height: '18px' }} />
                <div className="skeleton" style={{ width: '80%', height: '14px' }} />
                <div className="skeleton" style={{ width: '90%', height: '14px' }} />
              </div>
            </article>
          ))}
        </div>

      ) : error ? (
        <div className="alert alert-error" role="alert">{error}</div>

      ) : notices.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--space-2)' }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <h3>Everything looks good 🎉</h3>
          <p>
            {isAdmin
              ? 'Publish your first announcement using the button above.'
              : 'There are currently no active announcements.'}
          </p>
        </div>

      ) : (
        <div className="notices-list">
          {notices.map((notice) => (
            <article
              key={notice.id}
              className={`notice-card card${notice.isPinned ? ' notice-card--pinned' : ''}`}
            >
              {/* ── Inline Edit Mode ───────────────────────────────────────── */}
              {editingId === notice.id ? (
                <div className="notice-inline-form">

                  {editError && (
                    <div className="alert alert-error" role="alert">{editError}</div>
                  )}

                  <div className="form-group">
                    <label
                      htmlFor={`edit-title-${notice.id}`}
                      className="form-label"
                    >
                      Title
                    </label>
                    <input
                      id={`edit-title-${notice.id}`}
                      name="title"
                      type="text"
                      className={`form-input${editFieldErrors.title ? ' is-error' : ''}`}
                      value={editForm.title}
                      onChange={handleEditChange}
                      maxLength={150}
                      disabled={editSaving}
                    />
                    {editFieldErrors.title && (
                      <p className="form-error">{editFieldErrors.title}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label
                      htmlFor={`edit-content-${notice.id}`}
                      className="form-label"
                    >
                      Content
                    </label>
                    <textarea
                      id={`edit-content-${notice.id}`}
                      name="content"
                      className={`form-textarea${editFieldErrors.content ? ' is-error' : ''}`}
                      value={editForm.content}
                      onChange={handleEditChange}
                      rows={5}
                      disabled={editSaving}
                    />
                    {editFieldErrors.content && (
                      <p className="form-error">{editFieldErrors.content}</p>
                    )}
                  </div>

                  <div className="notice-inline-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={cancelEdit}
                      disabled={editSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleEditSave(notice.id)}
                      disabled={editSaving}
                    >
                      {editSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>

                </div>

              ) : (
                /* ── Read View ────────────────────────────────────────────── */
                <>
                  {notice.isPinned && (
                    <span className="notice-pin-badge">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" stroke="none" aria-hidden="true" style={{ marginRight: '4px' }}>
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8 1 .8-1v-6H18v-2l-2-2z" />
                      </svg>
                      Pinned
                    </span>
                  )}

                  <h2 className="notice-card-title">{notice.title}</h2>
                  <p className="notice-card-content">{notice.content}</p>

                  <div className="notice-card-footer">
                    <span className="text-xs text-muted">
                      {notice.author.name} · {formatDateTime(notice.createdAt)}
                    </span>

                    {isAdmin && (
                      <div className="notice-card-actions">

                        {/* Pin / Unpin */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleTogglePin(notice.id)}
                          disabled={pinningId === notice.id}
                        >
                          {pinningId === notice.id
                            ? '…'
                            : notice.isPinned
                            ? 'Unpin'
                            : 'Pin'}
                        </button>

                        {/* Edit — opens inline form */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => startEdit(notice)}
                          disabled={pinningId === notice.id || deletingId === notice.id}
                        >
                          Edit
                        </button>

                        {/* Delete */}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(notice.id)}
                          disabled={deletingId === notice.id}
                        >
                          {deletingId === notice.id ? 'Deleting…' : 'Delete'}
                        </button>

                      </div>
                    )}
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}

    </div>
  );
}
