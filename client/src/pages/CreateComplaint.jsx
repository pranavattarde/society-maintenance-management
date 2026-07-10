import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { complaints as complaintsApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { PRIORITY, CATEGORY_LABELS, PRIORITY_LABELS } from '../utils/constants';
import './CreateComplaint.css';

// ─── Constants ────────────────────────────────────────────────────────────────
// Mirror the server's upload constraints so invalid files are caught before
// the network call (server re-validates regardless).
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const INITIAL_FORM = {
  title:       '',
  description: '',
  category:    '',
  priority:    PRIORITY.MEDIUM, // sensible default
};

// ─── Client-side validation ───────────────────────────────────────────────────

function validate(form, photo) {
  const errors = {};

  const title = form.title.trim();
  if (!title || title.length < 5) {
    errors.title = 'Title must be at least 5 characters';
  } else if (title.length > 100) {
    errors.title = 'Title must not exceed 100 characters';
  }

  const desc = form.description.trim();
  if (!desc || desc.length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  if (!form.category) {
    errors.category = 'Please select a category';
  }

  if (!form.priority) {
    errors.priority = 'Please select a priority';
  }

  if (photo) {
    if (!ACCEPTED_TYPES.includes(photo.type)) {
      errors.photo = 'Only JPEG, PNG, and WebP images are accepted';
    } else if (photo.size > MAX_SIZE_BYTES) {
      errors.photo = 'Image must be smaller than 5 MB';
    }
  }

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * CreateComplaint — resident complaint submission form.
 *
 * Submission uses FormData (multipart/form-data) because of the optional
 * photo attachment. The api/index.js request() function handles FormData
 * by omitting Content-Type and letting the browser set the boundary.
 *
 * On success, the page renders a confirmation state with the complaint ID
 * so the resident can note their reference number.
 */
export default function CreateComplaint() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]             = useState(INITIAL_FORM);
  const [photo, setPhoto]           = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0); // incremented to reset file input
  const [fieldErrors, setFieldErrors]   = useState({});
  const [apiError, setApiError]         = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(null); // holds created complaint

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error as soon as the user corrects the field
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0] || null;
    setPhoto(file);
    if (fieldErrors.photo) {
      setFieldErrors((prev) => ({ ...prev, photo: '' }));
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setFileInputKey((k) => k + 1); // unmount and remount the input to clear its value
    setFieldErrors((prev) => ({ ...prev, photo: '' }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setPhoto(null);
    setFileInputKey((k) => k + 1);
    setFieldErrors({});
    setApiError('');
    setSubmitted(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const errors = validate(form, photo);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Build FormData — browser sets the correct multipart Content-Type with boundary
    const formData = new FormData();
    formData.append('title',       form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('category',    form.category);
    formData.append('priority',    form.priority);
    if (photo) formData.append('photo', photo);

    setSubmitting(true);
    try {
      const data = await complaintsApi.create(formData, token);
      setSubmitted(data.complaint);
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        setApiError(err.errors.join(' · '));
      } else {
        setApiError(err.message || 'Failed to submit complaint. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success State ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="page">
        <div className="card complaint-success">
          <span className="complaint-success-icon" aria-hidden="true">✅</span>
          <h1 className="complaint-success-title">Complaint Submitted!</h1>
          <p className="complaint-success-ref">
            Reference: <code>{submitted.id}</code>
          </p>
          <p className="complaint-success-message">
            Your complaint has been logged. The admin team will review it and update you
            on the status.
          </p>
          <div className="complaint-success-actions">
            <button onClick={resetForm} className="btn btn-secondary">
              Submit Another
            </button>
            <Link to="/dashboard" className="btn btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="page">

      <div className="page-header">
        <h1>Submit a Complaint</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>

          {/* API Error Banner -------------------------------------------- */}
          {apiError && (
            <div className="alert alert-error" role="alert">
              {apiError}
            </div>
          )}

          {/* Title -------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="complaint-title" className="form-label">
              Title
            </label>
            <input
              id="complaint-title"
              name="title"
              type="text"
              className={`form-input${fieldErrors.title ? ' is-error' : ''}`}
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Water leaking from bathroom ceiling"
              maxLength={100}
              disabled={submitting}
            />
            {fieldErrors.title && (
              <p className="form-error">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description -------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="complaint-description" className="form-label">
              Description
            </label>
            <textarea
              id="complaint-description"
              name="description"
              className={`form-textarea${fieldErrors.description ? ' is-error' : ''}`}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the issue in detail — location, when it started, how severe it is..."
              rows={5}
              disabled={submitting}
            />
            {fieldErrors.description && (
              <p className="form-error">{fieldErrors.description}</p>
            )}
          </div>

          {/* Category + Priority — side by side on desktop --------------- */}
          <div className="complaint-form-row">

            <div className="form-group">
              <label htmlFor="complaint-category" className="form-label">
                Category
              </label>
              <select
                id="complaint-category"
                name="category"
                className={`form-select${fieldErrors.category ? ' is-error' : ''}`}
                value={form.category}
                onChange={handleChange}
                disabled={submitting}
              >
                <option value="">— Select category —</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {fieldErrors.category && (
                <p className="form-error">{fieldErrors.category}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="complaint-priority" className="form-label">
                Priority
              </label>
              <select
                id="complaint-priority"
                name="priority"
                className={`form-select${fieldErrors.priority ? ' is-error' : ''}`}
                value={form.priority}
                onChange={handleChange}
                disabled={submitting}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {fieldErrors.priority && (
                <p className="form-error">{fieldErrors.priority}</p>
              )}
            </div>

          </div>

          {/* Photo Upload ------------------------------------------------- */}
          <div className="form-group">
            <label className="form-label">
              Photo{' '}
              <span className="text-muted text-xs">
                (optional · JPEG, PNG, WebP · max 5 MB)
              </span>
            </label>

            {!photo ? (
              <label htmlFor="complaint-photo" className="file-upload-label">
                <span aria-hidden="true">📎</span>
                <span>Choose photo</span>
                <input
                  key={fileInputKey}
                  id="complaint-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="file-upload-input"
                  onChange={handlePhotoChange}
                  disabled={submitting}
                />
              </label>
            ) : (
              <div className="file-selected">
                <span className="file-selected-name" title={photo.name}>
                  📷 {photo.name}
                </span>
                <span className="file-selected-size">
                  ({(photo.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  className="file-clear-btn"
                  onClick={clearPhoto}
                  aria-label="Remove selected photo"
                  disabled={submitting}
                >
                  Remove
                </button>
              </div>
            )}

            {fieldErrors.photo && (
              <p className="form-error">{fieldErrors.photo}</p>
            )}
          </div>

          {/* Actions ------------------------------------------------------ */}
          <div className="complaint-form-actions">
            <Link to="/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              id="complaint-submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Complaint'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
