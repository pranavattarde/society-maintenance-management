import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { CATEGORY_LABELS } from '../utils/constants';
import { formatDate, truncate } from '../utils/helpers';

/**
 * ComplaintCard — summary view of a single complaint for list pages.
 *
 * @param {{ complaint: object }} props
 */
export default function ComplaintCard({ complaint }) {
  return (
    <article className="complaint-card card">
      <div className="complaint-card-header">
        <div className="flex gap-2 flex-wrap">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
        </div>
        <span className="text-xs text-muted">{formatDate(complaint.createdAt)}</span>
      </div>

      <h3 className="complaint-card-title">{complaint.title}</h3>

      <p className="text-sm text-muted complaint-card-description">
        {truncate(complaint.description, 120)}
      </p>

      <div className="complaint-card-footer">
        <span className="text-xs text-muted">
          {CATEGORY_LABELS[complaint.category] || complaint.category}
        </span>
        <Link to={`/complaints/${complaint.id}`} className="btn btn-secondary btn-sm">
          View Details
        </Link>
      </div>
    </article>
  );
}
