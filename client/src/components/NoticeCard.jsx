import { formatDate } from '../utils/helpers';

/**
 * NoticeCard — displays a single notice with optional admin action buttons.
 *
 * @param {{
 *   notice:       object,
 *   isAdmin:      boolean,
 *   onTogglePin?: (id: string) => void,
 *   onDelete?:    (id: string) => void,
 * }} props
 */
export default function NoticeCard({ notice, isAdmin, onTogglePin, onDelete }) {
  return (
    <article className={`notice-card card${notice.isPinned ? ' notice-card--pinned' : ''}`}>
      <div className="notice-card-header">
        <div className="flex items-center gap-2">
          {notice.isPinned && (
            <span className="notice-pin-icon" title="Pinned notice" aria-label="Pinned">
              📌
            </span>
          )}
          <h3 className="notice-card-title">{notice.title}</h3>
        </div>
        <span className="text-xs text-muted">{formatDate(notice.createdAt)}</span>
      </div>

      <p className="notice-card-content text-sm">{notice.content}</p>

      {isAdmin && (
        <div className="notice-card-actions">
          <button
            onClick={() => onTogglePin(notice.id)}
            className="btn btn-secondary btn-sm"
          >
            {notice.isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={() => onDelete(notice.id)}
            className="btn btn-danger btn-sm"
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
