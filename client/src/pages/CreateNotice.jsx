import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notices as noticesApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import './CreateNotice.css';

// ─── Client-side validation ───────────────────────────────────────────────────

function validate(form) {
  const errors = {};
  const title   = form.title.trim();
  const content = form.content.trim();

  if (!title || title.length < 3)     errors.title   = 'Title must be at least 3 characters';
  else if (title.length > 150)         errors.title   = 'Title must not exceed 150 characters';
  if (!content || content.length < 10) errors.content = 'Content must be at least 10 characters';

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * CreateNotice — admin-only form to publish a new notice.
 *
 * On successful submission, navigates to /notices so the admin immediately
 * sees the newly published notice at the top of the list.
 *
 * No isPinned field on the create form — pinning is done from the board itself.
 */
export default function CreateNotice() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]             = useState({ title: '', content: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await noticesApi.create(
        { title: form.title.trim(), content: form.content.trim() },
        token
      );
      navigate('/notices', { state: { success: 'Notice published.' } });
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        setApiError(err.errors.join(' · '));
      } else {
        setApiError(err.message || 'Failed to publish notice. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">

      <div className="back-navigation-container" style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/notices" className="complaint-back-link">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Bulletin Board
        </Link>
      </div>

      <header className="page-header">
        <div className="page-header-title">
          <h1>Publish Notice</h1>
          <p className="page-header-subtitle">Broadcast a new official announcement to the community bulletin board</p>
        </div>
      </header>

      <div className="card create-notice-card">
        <form onSubmit={handleSubmit} noValidate>

          {apiError && (
            <div className="alert alert-error" role="alert">{apiError}</div>
          )}

          {/* Title --------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="notice-title" className="form-label">Title</label>
            <input
              id="notice-title"
              name="title"
              type="text"
              className={`form-input${fieldErrors.title ? ' is-error' : ''}`}
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Water supply interruption on Saturday"
              maxLength={150}
              disabled={submitting}
            />
            {fieldErrors.title && (
              <p className="form-error">{fieldErrors.title}</p>
            )}
          </div>

          {/* Content ------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="notice-content" className="form-label">Content</label>
            <textarea
              id="notice-content"
              name="content"
              className={`form-textarea${fieldErrors.content ? ' is-error' : ''}`}
              value={form.content}
              onChange={handleChange}
              placeholder="Write the full notice here…"
              rows={8}
              disabled={submitting}
            />
            {fieldErrors.content && (
              <p className="form-error">{fieldErrors.content}</p>
            )}
          </div>

          {/* Actions ------------------------------------------------------- */}
          <div className="notice-form-actions">
            <Link to="/notices" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              id="notice-submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Publishing…' : 'Publish Notice'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
