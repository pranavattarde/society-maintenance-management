import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notices as noticesApi, ai as aiApi } from '../api/index';
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
  const [isPinned, setIsPinned]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── AI Writing Assistant state ──────────────────────────────────────────────
  const [aiInstruction, setAiInstruction]     = useState('');
  const [aiLoading, setAiLoading]             = useState(false);
  const [aiError, setAiError]                 = useState('');
  const [aiResult, setAiResult]               = useState(null);
  const [showAiAssistant, setShowAiAssistant] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  async function handleAiGenerateNotice(e) {
    e.preventDefault();
    if (!aiInstruction.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const response = await aiApi.generateText('NOTICE', aiInstruction.trim(), token);
      setAiResult(response.data);
    } catch (err) {
      setAiError(err.message || 'Failed to generate notice. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  function handleAcceptNoticeSuggestions() {
    if (!aiResult) return;
    setForm({
      title: aiResult.title || '',
      content: aiResult.content || '',
    });
    setFieldErrors((prev) => ({ ...prev, title: '', content: '' }));
    setShowAiAssistant(false);
    setAiResult(null);
    setAiInstruction('');
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
        { title: form.title.trim(), content: form.content.trim(), isPinned },
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

          {/* AI Notice Assistant Toggle */}
          <div className="ai-notice-assistant-trigger">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAiAssistant((prev) => !prev)}
              style={{ width: '100%', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>✨</span> {showAiAssistant ? 'Hide AI Writing Assistant' : 'Use AI Notice Writer'}
            </button>
          </div>

          {showAiAssistant && (
            <div className="ai-notice-assistant-box" style={{ background: 'var(--color-gray-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-gray-200)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group" style={{ marginBottom: '0' }}>
                <label className="form-label" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✨</span> AI Instructions
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Water tank cleaning from Towers A to D this Sunday"
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    disabled={aiLoading}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAiGenerateNotice}
                    disabled={aiLoading || !aiInstruction.trim()}
                  >
                    {aiLoading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
                {aiError && (
                  <p className="form-error" style={{ marginTop: '4px' }}>{aiError}</p>
                )}
              </div>

              {aiResult && (
                <div className="ai-notice-suggestions-result" style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-gray-200)' }}>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: '700', marginBottom: '8px' }}>AI Suggestion:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-4)' }}>
                    <div>
                      <span className="text-muted text-xs" style={{ fontWeight: '600' }}>Suggested Title:</span>
                      <p style={{ fontWeight: '600', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-800)' }}>{aiResult.title}</p>
                    </div>
                    <div>
                      <span className="text-muted text-xs" style={{ fontWeight: '600' }}>Suggested Content:</span>
                      <p style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'pre-line', background: '#fff', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-gray-200)', color: 'var(--color-gray-700)', margin: '4px 0' }}>{aiResult.content}</p>
                    </div>
                    {aiResult.summary && (
                      <div>
                        <span className="text-muted text-xs" style={{ fontWeight: '600' }}>Summary:</span>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)' }}>{aiResult.summary}</p>
                      </div>
                    )}
                    {aiResult.tone && (
                      <div>
                        <span className="text-muted text-xs" style={{ fontWeight: '600' }}>Suggested Tone:</span>
                        <p style={{ fontSize: 'var(--font-size-xs)', fontStyle: 'italic', color: 'var(--color-gray-500)' }}>{aiResult.tone}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAcceptNoticeSuggestions}
                    >
                      Accept Suggestions
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAiResult(null)}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* Mark as Important -------------------------------------------- */}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)' }}>
            <input
              id="notice-important"
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              disabled={submitting}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="notice-important" style={{ fontWeight: '600', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
              Mark as Important (pins notice & emails residents immediately)
            </label>
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
