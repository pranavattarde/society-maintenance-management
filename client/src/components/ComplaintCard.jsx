import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { CATEGORY_LABELS } from '../utils/constants';
import { formatDate, truncate } from '../utils/helpers';
import './ComplaintCard.css';

/**
 * ComplaintCard — summary view of a single complaint for list pages.
 *
 * Shows the flat number alongside the category so admins can identify
 * which unit submitted each complaint at a glance.
 *
 * @param {{ complaint: object }} props
 */
export default function ComplaintCard({ complaint }) {
  return (
    <article className="complaint-card card">

      {/* Badges + date */}
      <div className="complaint-card-header">
        <div className="flex gap-2 flex-wrap">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
        </div>
        <span className="text-xs text-muted">{formatDate(complaint.createdAt)}</span>
      </div>

      {/* Title */}
      <h3 className="complaint-card-title">{complaint.title}</h3>

      {/* Truncated description */}
      <p className="text-sm text-muted complaint-card-description">
        {truncate(complaint.description, 120)}
      </p>

      {/* Footer — category, flat number, detail link */}
      <div className="complaint-card-footer">
        <div className="complaint-card-meta">
          <span className="text-xs text-muted">
            {CATEGORY_LABELS[complaint.category] || complaint.category}
          </span>
          {complaint.resident && (
            <span className="text-xs text-muted">
              Flat {complaint.resident.flatNumber}
            </span>
          )}
        </div>
        <Link to={`/complaints/${complaint.id}`} className="btn btn-secondary btn-sm">
          View Details
        </Link>
      </div>

    </article>
  );
}
