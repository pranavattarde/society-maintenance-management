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
 */

import { useState } from 'react';
import { CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '../utils/constants';
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

/** Maps priority to estimated resolution time */
function getResolutionTime(priority) {
  if (priority === 'HIGH') return '1 Working Day';
  if (priority === 'MEDIUM') return '2–3 Working Days';
  return '5–7 Working Days';
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

function MatchCard({ match, onViewSummary }) {
  const level        = similarityLevel(match.similarity);
  const categoryLabel = CATEGORY_LABELS[match.category] || match.category;
  const statusLabel   = STATUS_LABELS[match.status]    || match.status;

  return (
    <div className="dup-match-card">
      {/* Similarity score */}
      <div className="dup-similarity-badge">
        <span className={`dup-similarity-pct dup-similarity-pct--${level}`}>
          {match.similarity}% Similar
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
      </div>

      {/* View Summary button — opens a secure summary modal */}
      <button
        type="button"
        className="dup-view-summary-btn"
        onClick={() => onViewSummary(match)}
        aria-label={`View summary of complaint: ${match.title}`}
      >
        View Summary
      </button>
    </div>
  );
}

function FoundState({ matches, onContinue, onEdit, onViewSummary }) {
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
          <MatchCard key={m.complaintId} match={m} onViewSummary={onViewSummary} />
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

export default function DuplicateDetector({
  status,
  matches = [],
  onContinue,
  onEdit,
  currentUserId,
}) {
  const [selectedMatch, setSelectedMatch] = useState(null);

  if (status === 'idle') return null;

  return (
    <div className="dup-panel" aria-label="Duplicate Complaint Detector">
      {status === 'checking' ? (
        <CheckingState />
      ) : status === 'found' && matches.length > 0 ? (
        <FoundState
          matches={matches}
          onContinue={onContinue}
          onEdit={onEdit}
          onViewSummary={setSelectedMatch}
        />
      ) : null}

      {/* Privacy-Preserving Duplicate Details Modal */}
      {selectedMatch && (
        <div className="dup-modal-overlay" role="dialog" aria-modal="true">
          <div className="dup-modal-content">
            <header className="dup-modal-header">
              <h3 className="dup-modal-title">Similar Issue Details</h3>
              <button
                type="button"
                className="dup-modal-close"
                onClick={() => setSelectedMatch(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </header>

            <div className="dup-modal-body">
              <div className="dup-modal-grid">
                <div className="dup-modal-field">
                  <span className="dup-modal-label">Title</span>
                  <span className="dup-modal-value">{selectedMatch.title}</span>
                </div>

                <div className="dup-modal-field">
                  <span className="dup-modal-label">Category</span>
                  <span className="dup-modal-value">{CATEGORY_LABELS[selectedMatch.category] || selectedMatch.category}</span>
                </div>

                <div className="dup-modal-field">
                  <span className="dup-modal-label">Priority</span>
                  <span className="dup-modal-value">
                    <span className={`dup-modal-priority dup-modal-priority--${selectedMatch.priority.toLowerCase()}`}>
                      {PRIORITY_LABELS[selectedMatch.priority] || selectedMatch.priority}
                    </span>
                  </span>
                </div>

                <div className="dup-modal-field">
                  <span className="dup-modal-label">Status</span>
                  <span className="dup-modal-value">
                    <span className={`dup-tag dup-tag--${statusClass(selectedMatch.status)}`}>
                      {STATUS_LABELS[selectedMatch.status] || selectedMatch.status}
                    </span>
                  </span>
                </div>

                <div className="dup-modal-field">
                  <span className="dup-modal-label">Reported Date</span>
                  <span className="dup-modal-value">{formatDate(selectedMatch.createdAt)}</span>
                </div>

                <div className="dup-modal-field">
                  <span className="dup-modal-label">Est. Resolution Time</span>
                  <span className="dup-modal-value">{getResolutionTime(selectedMatch.priority)}</span>
                </div>
              </div>

              <div className="dup-modal-divider" />

              <div className="dup-modal-summary-section">
                <span className="dup-modal-label">Issue Description / Summary</span>
                <p className="dup-modal-summary-text">{selectedMatch.description}</p>
              </div>

              <div className="dup-modal-footer">
                {selectedMatch.residentId === currentUserId ? (
                  <div className="dup-ownership-badge dup-ownership-badge--own">
                    Submitted by You
                  </div>
                ) : (
                  <div className="dup-ownership-badge dup-ownership-badge--anonymous">
                    Resident Identity Protected
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedMatch(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
