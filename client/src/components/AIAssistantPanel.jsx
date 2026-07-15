/**
 * AIAssistantPanel.jsx
 *
 * Refined, Copilot-style inline panel that shows AI-powered suggestions
 * for a complaint being composed. Rendered below the description field
 * in CreateComplaint.jsx.
 *
 * States: idle (not rendered) | loading | error | result
 */

import { useState, useEffect } from 'react';
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
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: 'var(--color-danger)', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelHeader({ title = '🤖 AI Assistant', onDismiss }) {
  return (
    <div className="ai-panel-header">
      <div className="ai-panel-title">
        <SparkleIcon size={11} />
        {title}
      </div>
      <button
        type="button"
        className="ai-panel-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss AI assistant"
      >
        <XIcon size={10} />
        Dismiss
      </button>
    </div>
  );
}

function LoadingState() {
  const steps = [
    'Reading complaint',
    'Identifying category',
    'Assessing urgency',
    'Writing summary',
    'Generating recommendation'
  ];

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="ai-loading-body" role="status" aria-live="polite">
      <ul className="ai-loading-steps-list">
        {steps.map((step, idx) => {
          let statusClass = 'pending';
          let icon = '○';
          if (idx < currentStep) {
            statusClass = 'completed';
            icon = '✓';
          } else if (idx === currentStep) {
            statusClass = 'active';
            icon = '●';
          }
          return (
            <li key={step} className={`ai-loading-step ai-loading-step--${statusClass}`}>
              <span className="ai-loading-step-icon">{icon}</span>
              <span className="ai-loading-step-text">{step}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ErrorState({ onRetry, onContinueWithoutAI }) {
  return (
    <div className="ai-error-body" role="alert">
      <div className="ai-error-message-container">
        <AlertIcon />
        <div className="ai-error-text">
          <p className="ai-error-title">AI Assistant is currently unavailable.</p>
          <p className="ai-error-subtitle">You can continue submitting your complaint normally.</p>
        </div>
      </div>
      <div className="ai-error-actions">
        <button type="button" className="ai-retry-btn" onClick={onRetry}>
          Retry
        </button>
        <button type="button" className="ai-continue-without-ai-btn" onClick={onContinueWithoutAI}>
          Continue Without AI
        </button>
      </div>
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

function ConfidenceVisual({ confidence }) {
  const totalBlocks = 10;
  const filledBlocksCount = Math.round((confidence / 100) * totalBlocks);
  const filledBlocks = '█'.repeat(filledBlocksCount);
  const emptyBlocks = '░'.repeat(totalBlocks - filledBlocksCount);

  let rating = 'Low Confidence';
  let level = 'low';
  if (confidence >= 80) {
    rating = 'High Confidence';
    level = 'high';
  } else if (confidence >= 50) {
    rating = 'Medium Confidence';
    level = 'medium';
  }

  return (
    <div className="ai-confidence-box">
      <div className="ai-confidence-header">
        <span className="ai-confidence-title">AI Confidence</span>
        <span className={`ai-confidence-rating-badge ai-confidence-rating-badge--${level}`}>
          {rating}
        </span>
      </div>
      <div className="ai-confidence-visual-row">
        <span className={`ai-confidence-blocks ai-confidence-blocks--${level}`}>
          {filledBlocks}
          <span className="ai-confidence-blocks-empty">{emptyBlocks}</span>
        </span>
        <span className="ai-confidence-percentage">{confidence}%</span>
      </div>
    </div>
  );
}

function ResultState({ suggestions, onAccept, onDismiss }) {
  const { title, category, priority, refinedDescription, summary, reasoning, confidence } = suggestions;

  const categoryLabel = CATEGORY_LABELS[category] || category;
  const priorityLabel = PRIORITY_LABELS[priority]  || priority;

  return (
    <div className="ai-result-body">
      {/* Structured suggestions */}
      <div className="ai-suggestions-grid">
        <SuggestionRow label="Suggested Title"    value={title}         />
        {refinedDescription && (
          <SuggestionRow label="Refined Description" value={refinedDescription} variant="summary" />
        )}
        <SuggestionRow label="Suggested Category" value={categoryLabel} variant="mono" />
        <SuggestionRow label="Suggested Priority" value={priorityLabel} variant="mono" />
        <SuggestionRow label="Complaint Summary"  value={summary}       variant="summary" />
        <SuggestionRow label="Why this suggestion?" value={reasoning}     variant="reasoning" />
      </div>

      {/* Confidence Indicator */}
      <ConfidenceVisual confidence={confidence} />

      {/* Actions */}
      <div className="ai-actions">
        <button type="button" className="ai-accept-btn" onClick={onAccept}>
          <CheckIcon />
          Accept Suggestions
        </button>
        <button type="button" className="ai-discard-btn" onClick={onDismiss}>
          Edit Manually
        </button>
        <span className="ai-model-note">Powered by Groq</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
          <PanelHeader title="🤖 AI Assistant" onDismiss={onDismiss} />
          <LoadingState />
        </>
      ) : status === 'error' ? (
        <>
          <PanelHeader title="🤖 AI Assistant" onDismiss={onDismiss} />
          <ErrorState onRetry={onRetry} onContinueWithoutAI={onDismiss} />
        </>
      ) : status === 'result' && suggestions ? (
        <>
          <PanelHeader title="✨ AI Analysis" onDismiss={onDismiss} />
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
