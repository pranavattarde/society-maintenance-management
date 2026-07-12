/**
 * DuplicateDetector.jsx
 *
 * Pre-submission duplicate complaint detector panel.
 * Displayed between the photo upload area and the actions row in CreateComplaint.
 *
 * States:
 *   idle     — null render (zero DOM footprint)
 *   checking — animated dot strip while API call is in-flight
 *   found    — full panel with up to 3 match cards + Continue/Edit actions
 *
 * IMPORTANT: Submission is NEVER blocked automatically.
 * The resident always decides via "Continue Anyway" or "Edit my complaint".
 *
 * Props:
 *   status      — 'idle' | 'checking' | 'found'
 *   matches     — [{complaintId, title, category, status, createdAt, similarity, reason}]
 *   onContinue  — () => void — user chose to submit despite duplicates
 *   onEdit      — () => void — user wants to revise their complaint
 */

import { CATEGORY_LABELS, STATUS_LABELS } from '../utils/constants';
import './DuplicateDetector.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

/** Returns 'high' | 'medium' | 'low' based on similarity score */
function similarityLevel(pct) {
  if (pct >= 80) return 'high';
  if (pct >= 60) return 'medium';
  return 'low';
}

/** Returns a CSS class suffix for the status badge */
function statusClass(status) {
  if (status === 'IN_PROGRESS') return 'in-progress';
  return status.toLowerCase();
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function WarningIcon() {
  return (
    <svg
      className="dup-warning-icon"
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={10}
      height={10}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={12}
      height={12}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckingState() {
  return (
    <div className="dup-checking" role="status" aria-live="polite">
      <div className="dup-checking-dots" aria-hidden="true">
        <span /><span /><span />
      </div>
      <span className="dup-checking-label">Checking for similar complaints…</span>
    </div>
  );
}

function MatchCard({ match }) {
  const level        = similarityLevel(match.similarity);
  const categoryLabel = CATEGORY_LABELS[match.category] || match.category;
  const statusLabel   = STATUS_LABELS[match.status]    || match.status;

  return (
    <div className="dup-match-card">
      {/* Similarity score */}
      <div className="dup-similarity-badge">
        <span className={`dup-similarity-pct dup-similarity-pct--${level}`}>
          {match.similarity}%
        </span>
        <div className="dup-similarity-bar-track">
          <div
            className={`dup-similarity-bar-fill dup-similarity-bar-fill--${level}`}
            style={{ width: `${match.similarity}%` }}
          />
        </div>
      </div>

      {/* Complaint info */}
      <div className="dup-match-info">
        <span className="dup-match-title" title={match.title}>{match.title}</span>
        <div className="dup-match-meta">
          <span className="dup-tag dup-tag--category">{categoryLabel}</span>
          <span className={`dup-tag dup-tag--${statusClass(match.status)}`}>{statusLabel}</span>
          <span style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>
            {formatDate(match.createdAt)}
          </span>
        </div>
        {match.reason && (
          <span className="dup-match-reason" title={match.reason}>{match.reason}</span>
        )}
      </div>

      {/* View link — opens in new tab to preserve form state */}
      <a
        href={`/complaints/${match.complaintId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="dup-view-link"
        aria-label={`View existing complaint: ${match.title}`}
      >
        View <ExternalLinkIcon />
      </a>
    </div>
  );
}

function FoundState({ matches, onContinue, onEdit }) {
  return (
    <>
      {/* Header */}
      <div className="dup-panel-header">
        <div className="dup-panel-title">
          <WarningIcon />
          Possible Similar Complaints
          <span className="dup-count-badge">{matches.length}</span>
        </div>
      </div>

      {/* Match cards */}
      <div className="dup-match-list" role="list">
        {matches.map((m) => (
          <MatchCard key={m.complaintId} match={m} />
        ))}
      </div>

      {/* Actions */}
      <div className="dup-actions">
        <button
          type="button"
          className="dup-continue-btn"
          onClick={onContinue}
          aria-label="Ignore duplicates and submit complaint"
        >
          Continue Anyway <ArrowRightIcon />
        </button>
        <button
          type="button"
          className="dup-edit-btn"
          onClick={onEdit}
          aria-label="Go back and edit your complaint"
        >
          Edit my complaint
        </button>
        <span className="dup-disclaimer">You are not blocked — this is informational.</span>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DuplicateDetector({ status, matches = [], onContinue, onEdit }) {
  if (status === 'idle') return null;

  return (
    <div className="dup-panel" aria-label="Duplicate Complaint Detector">
      {status === 'checking' ? (
        <CheckingState />
      ) : status === 'found' && matches.length > 0 ? (
        <FoundState matches={matches} onContinue={onContinue} onEdit={onEdit} />
      ) : null}
    </div>
  );
}
