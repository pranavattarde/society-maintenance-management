/**
 * AIAssistantPanel.jsx
 *
 * Compact, Copilot-style inline panel that shows AI-powered suggestions
 * for a complaint being composed. Rendered below the description field
 * in CreateComplaint.jsx.
 *
 * States: idle (not rendered) | loading | error | result
 *
 * Props:
 *   status       — 'idle' | 'loading' | 'error' | 'result'
 *   suggestions  — { title, category, priority, summary, reasoning, confidence } | null
 *   error        — string | null
 *   onAccept     — () => void — called when user clicks "Accept Suggestions"
 *   onDismiss    — () => void — called when user clicks "Dismiss"
 *   onRetry      — () => void — called when user clicks "Retry" in error state
 */

import { CATEGORY_LABELS, PRIORITY_LABELS } from '../utils/constants';
import './AIAssistantPanel.css';

// ─── SVG Icon helpers ─────────────────────────────────────────────────────────

function SparkleIcon({ size = 12 }) {
  return (
    <svg
      className="ai-sparkle-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ size = 12 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelHeader({ onDismiss }) {
  return (
    <div className="ai-panel-header">
      <div className="ai-panel-title">
        <SparkleIcon size={11} />
        AI Assistant
      </div>
      <button
        type="button"
        className="ai-panel-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss AI suggestions"
      >
        <XIcon size={10} />
        Dismiss
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="ai-loading-body" role="status" aria-live="polite">
      <div className="ai-loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className="ai-loading-label">Analysing your complaint…</span>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="ai-error-body" role="alert">
      <span className="ai-error-message">
        <AlertIcon />
        {error || 'Analysis failed. Please try again.'}
      </span>
      <button type="button" className="ai-retry-btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function SuggestionRow({ label, value, variant }) {
  return (
    <div className="ai-suggestion-row">
      <span className="ai-suggestion-label">{label}</span>
      <span className={`ai-suggestion-value${variant ? ` ai-suggestion-value--${variant}` : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ResultState({ suggestions, onAccept, onDismiss }) {
  const { title, category, priority, summary, reasoning, confidence } = suggestions;

  const categoryLabel = CATEGORY_LABELS[category] || category;
  const priorityLabel = PRIORITY_LABELS[priority]  || priority;

  return (
    <div className="ai-result-body">
      {/* Structured suggestions */}
      <div className="ai-suggestions-grid">
        <SuggestionRow label="Title"    value={title}         />
        <SuggestionRow label="Category" value={categoryLabel} variant="mono" />
        <SuggestionRow label="Priority" value={priorityLabel} variant="mono" />
        <SuggestionRow label="Summary"  value={summary}       variant="summary" />
        <SuggestionRow label="Why"      value={reasoning}     variant="reasoning" />
      </div>

      {/* Confidence bar */}
      <div className="ai-confidence">
        <span className="ai-confidence-label">Confidence</span>
        <div className="ai-confidence-track" role="progressbar" aria-valuenow={confidence} aria-valuemin={0} aria-valuemax={100}>
          <div className="ai-confidence-fill" style={{ width: `${confidence}%` }} />
        </div>
        <span className="ai-confidence-pct">{confidence}%</span>
      </div>

      {/* Actions */}
      <div className="ai-actions">
        <button type="button" className="ai-accept-btn" onClick={onAccept}>
          <CheckIcon />
          Accept Suggestions
        </button>
        <button type="button" className="ai-discard-btn" onClick={onDismiss}>
          Keep mine
        </button>
        <span className="ai-model-note">Powered by Groq</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Renders the AI assistant panel in different states.
 * Returns null when status is 'idle' so it takes up zero space.
 */
export default function AIAssistantPanel({
  status,
  suggestions,
  error,
  onAccept,
  onDismiss,
  onRetry,
}) {
  if (status === 'idle') return null;

  return (
    <div className="ai-panel" aria-label="AI Complaint Assistant">
      {status === 'loading' ? (
        <>
          <PanelHeader onDismiss={onDismiss} />
          <LoadingState />
        </>
      ) : status === 'error' ? (
        <>
          <PanelHeader onDismiss={onDismiss} />
          <ErrorState error={error} onRetry={onRetry} />
        </>
      ) : status === 'result' && suggestions ? (
        <>
          <PanelHeader onDismiss={onDismiss} />
          <ResultState
            suggestions={suggestions}
            onAccept={onAccept}
            onDismiss={onDismiss}
          />
        </>
      ) : null}
    </div>
  );
}
