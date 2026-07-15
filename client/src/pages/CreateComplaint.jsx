import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { complaints as complaintsApi, ai as aiApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { PRIORITY, CATEGORY_LABELS, PRIORITY_LABELS } from '../utils/constants';
import AIAssistantPanel from '../components/AIAssistantPanel';
import DuplicateDetector from '../components/DuplicateDetector';
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

  // ── AI Assistant state ──────────────────────────────────────────────────────
  // 'idle' | 'loading' | 'result' | 'error'
  const [aiStatus,      setAiStatus]      = useState('idle');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiError,       setAiError]       = useState(null);
  const [aiDismissed,   setAiDismissed]   = useState(false); // user explicitly dismissed
  const aiDebounceRef = useRef(null);
  const AI_MIN_CHARS  = 30;  // minimum chars in description before triggering
  const AI_DELAY_MS   = 1500; // debounce delay

  // ── Duplicate Detection state ───────────────────────────────────────────────
  // 'idle' | 'checking' | 'found'
  const [dupStatus,  setDupStatus]  = useState('idle');
  const [dupMatches, setDupMatches] = useState([]);
  const [dupChecked, setDupChecked] = useState(false);

  // ── AI Review state ─────────────────────────────────────────────────────────
  const [showSubmitReview, setShowSubmitReview] = useState(false);

  // ── Success Notification state ──────────────────────────────────────────────
  const [successBanner, setSuccessBanner] = useState('');

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error as soon as the user corrects the field
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  // ── AI debounce trigger — watches description field ─────────────────────────
  useEffect(() => {
    const description = form.description.trim();

    // Only trigger if not dismissed and description is long enough
    if (aiDismissed || description.length < AI_MIN_CHARS) {
      // If description shrinks back below threshold, reset to idle
      if (aiStatus === 'result' || aiStatus === 'error') {
        // keep visible once shown — user must manually dismiss
      } else if (description.length < AI_MIN_CHARS) {
        setAiStatus('idle');
        clearTimeout(aiDebounceRef.current);
      }
      return;
    }

    // Debounce: wait for user to stop typing
    clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(() => {
      // Only auto-trigger once (idle → loading). After that user controls it.
      if (aiStatus === 'idle') {
        runAiAnalysis(description);
      }
    }, AI_DELAY_MS);

    return () => clearTimeout(aiDebounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description]);

  // ── AI handler functions ────────────────────────────────────────────────────

  async function runAiAnalysis(text) {
    setAiStatus('loading');
    setAiError(null);
    setAiSuggestions(null);
    try {
      const response = await aiApi.analyze(text || form.description.trim(), token);
      setAiSuggestions(response.data);
      setAiStatus('result');
    } catch (err) {
      setAiError(err.message || 'Analysis failed. Please retry.');
      setAiStatus('error');
    }
  }

  function handleAcceptSuggestions() {
    if (!aiSuggestions) return;
    setForm((prev) => ({
      ...prev,
      title:    aiSuggestions.title    || prev.title,
      category: aiSuggestions.category || prev.category,
      priority: aiSuggestions.priority || prev.priority,
    }));
    // Clear any validation errors that were showing for these fields
    setFieldErrors((prev) => ({ ...prev, title: '', category: '', priority: '' }));
    setAiStatus('idle');
    setAiSuggestions(null);
    setAiDismissed(true);
    setSuccessBanner('AI suggestions applied.');
    setTimeout(() => setSuccessBanner(''), 4000);
  }

  function handleDismissAI() {
    setAiStatus('idle');
    setAiSuggestions(null);
    setAiError(null);
    setAiDismissed(true);
  }

  function handleRetryAI() {
    setAiDismissed(false);
    runAiAnalysis(form.description.trim());
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
    // Reset AI panel so it can trigger fresh on the next complaint
    setAiStatus('idle');
    setAiSuggestions(null);
    setAiError(null);
    setAiDismissed(false);
    // Reset duplicate detector
    setDupStatus('idle');
    setDupMatches([]);
    setDupChecked(false);
    // Reset review screen
    setShowSubmitReview(false);
    // Reset success banner
    setSuccessBanner('');
  }

  // ── Duplicate Detection handlers ────────────────────────────────────────────

  /**
   * Builds FormData and calls the complaints API.
   * Extracted from handleSubmit so it can be called both from the normal
   * flow (no duplicates) and from the "Continue Anyway" action.
   */
  async function performSubmit() {
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

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const errors = validate(form, photo);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (dupChecked) {
      setShowSubmitReview(true);
      return;
    }

    setDupStatus('checking');
    setDupMatches([]);
    const combinedText = `${form.title} ${form.description}`.trim();

    try {
      const response = await aiApi.detectDuplicates(combinedText, token);
      const matches  = response.data || [];

      if (matches.length > 0) {
        setDupMatches(matches);
        setDupStatus('found');
        // Pause here — user must click "Continue Anyway" or "Edit my complaint"
        return;
      }

      // No duplicates — proceed straight to submission
      setDupStatus('idle');
      await performSubmit();
    } catch (err) {
      // AI failure is non-blocking: log and proceed with submission
      console.warn('[duplicate-check] Skipped:', err.message);
      setDupStatus('idle');
      await performSubmit();
    }
  }

  async function handleContinueAnyway() {
    setDupStatus('idle');
    setDupMatches([]);
    await performSubmit();
  }

  // Back to form editor or dismiss duplicate state
  function handleEditComplaint() {
    setDupStatus('idle');
    setDupMatches([]);
    setShowSubmitReview(false);
  }

  // ── AI Review Screen ───────────────────────────────────────────────────────

  if (showSubmitReview) {
    return (
      <div className="page create-complaint-page">
        <div className="back-navigation-container" style={{ marginBottom: 'var(--space-4)' }}>
          <button
            type="button"
            onClick={() => setShowSubmitReview(false)}
            className="complaint-back-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Form Editor
          </button>
        </div>

        <div className="card ai-review-card">
          <header className="ai-review-header">
            <h1 className="ai-review-title">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              AI Review
            </h1>
            <p className="ai-review-subtitle">Verify the details generated by the AI Assistant</p>
          </header>

          <div className="ai-review-body">
            <ul className="ai-review-checklist">
              <li className="ai-review-item">
                <span className="ai-review-check-icon">✓</span>
                <span className="ai-review-item-text">Complaint title generated</span>
              </li>
              <li className="ai-review-item">
                <span className="ai-review-check-icon">✓</span>
                <span className="ai-review-item-text">Category identified</span>
              </li>
              <li className="ai-review-item">
                <span className="ai-review-check-icon">✓</span>
                <span className="ai-review-item-text">Priority assessed</span>
              </li>
              <li className="ai-review-item">
                <span className="ai-review-check-icon">✓</span>
                <span className="ai-review-item-text">Summary generated</span>
              </li>
            </ul>

            <div className="ai-review-resolution-box">
              <div className="ai-review-resolution-label">Estimated Resolution</div>
              <div className="ai-review-resolution-value">2–3 Working Days</div>
            </div>
          </div>

          <div className="ai-review-actions">
            <button
              type="button"
              onClick={() => setShowSubmitReview(false)}
              className="btn btn-secondary"
              disabled={submitting}
            >
              Edit Complaint
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting ticket…' : 'Submit Complaint'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success State ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="page animate-fade-in">
        <div className="card complaint-success">
          <div className="complaint-success-icon-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="complaint-success-title">Your issue has been successfully reported.</h1>
          <p className="complaint-success-ref">
            Reference ID: <code>{submitted.id}</code>
          </p>
          <p className="complaint-success-message">
            Your maintenance assistance ticket has been successfully logged. The operations team will review it and coordinate the resolution timeline.
          </p>
          <div className="complaint-success-actions">
            <button onClick={resetForm} className="btn btn-secondary">
              Report Another Issue
            </button>
            <Link to="/dashboard" className="btn btn-primary">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <div className="page create-complaint-page">

      <div className="back-navigation-container" style={{ marginBottom: 'var(--space-4)' }}>
        <Link to="/complaints" className="complaint-back-link">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Issues
        </Link>
      </div>

      <header className="page-header">
        <div className="page-header-title">
          <h1>Report Issue</h1>
          <p className="page-header-subtitle">Log a new maintenance request for your residence unit</p>
        </div>
      </header>

      <div className="card create-complaint-card">
        <form onSubmit={handleSubmit} noValidate>

          {/* Success Notification --------------------------------------- */}
          {successBanner && (
            <div className="alert alert-success" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              {successBanner}
            </div>
          )}

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
              placeholder="Describe the issue in detail — location, when it started, severity..."
              rows={5}
              disabled={submitting}
            />
            {fieldErrors.description && (
              <p className="form-error">{fieldErrors.description}</p>
            )}
          </div>

          {/* ✨ Analyze with AI manual click trigger button */}
          {aiStatus === 'idle' && (
            <div style={{ marginTop: '-4px', marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const description = form.description.trim();
                  if (description.length < AI_MIN_CHARS) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      description: `Please enter at least ${AI_MIN_CHARS} characters to use the AI Assistant.`,
                    }));
                  } else {
                    runAiAnalysis(description);
                  }
                }}
                disabled={submitting}
              >
                ✨ Analyze with AI
              </button>
            </div>
          )}

          {/* ✨ AI Assistant Panel — appears after 30 chars + 1.5s pause ---- */}
          <AIAssistantPanel
            status={aiStatus}
            suggestions={aiSuggestions}
            error={aiError}
            onAccept={handleAcceptSuggestions}
            onDismiss={handleDismissAI}
            onRetry={handleRetryAI}
          />

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
          <div className="form-group" style={{ marginTop: 'var(--space-2)' }}>
            <label className="form-label">
              Photo Attachment <span className="text-muted text-xs">(optional · JPEG, PNG, WebP · max 5 MB)</span>
            </label>

            {!photo ? (
              <label htmlFor="complaint-photo" className="file-upload-label">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>Select file attachment</span>
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
                <div className="flex items-center gap-2 min-width: 0" style={{ flex: 1 }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-success)', flexShrink: 0 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="file-selected-name" title={photo.name}>
                    {photo.name}
                  </span>
                  <span className="file-selected-size">
                    ({(photo.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
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

          {/* 🔍 Duplicate Detector — appears on submit if similar complaints found */}
          <DuplicateDetector
            status={dupStatus}
            matches={dupMatches}
            onContinue={handleContinueAnyway}
            onEdit={handleEditComplaint}
          />

          {/* Actions ------------------------------------------------------ */}
          <div className="complaint-form-actions">
            <Link to="/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
            {/* Hide native submit when DuplicateDetector is showing its own actions */}
            {dupStatus !== 'found' && (
              <button
                type="submit"
                id="complaint-submit"
                className="btn btn-primary"
                disabled={submitting || dupStatus === 'checking'}
              >
                {submitting        ? 'Reporting issue…'
                 : dupStatus === 'checking' ? 'Checking for duplicates…'
                 : 'Report Issue'}
              </button>
            )}
          </div>

        </form>
      </div>

    </div>
  );
}
