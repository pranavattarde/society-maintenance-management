import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { CATEGORY_LABELS } from '../utils/constants';
import { formatDate } from '../utils/helpers';
import './ComplaintCard.css';

/**
 * ComplaintCard — redesigned as a high-density, scannable issue row (V2)
 */
export default function ComplaintCard({ complaint }) {
  return (
    <Link to={`/complaints/${complaint.id}`} className="complaint-list-row-item">
      <div className="complaint-row-info">
        <span className="complaint-row-mono-id">#{complaint.id.slice(-6)}</span>
        <div className="complaint-row-text">
          <span className="complaint-row-title">{complaint.title}</span>
          <div className="complaint-row-subtitles">
            <span className="complaint-row-category">
              {CATEGORY_LABELS[complaint.category] || complaint.category}
            </span>
            {complaint.resident && (
              <>
                <span className="bullet-separator" aria-hidden="true">·</span>
                <span className="complaint-row-resident">
                  Flat {complaint.resident.flatNumber} · {complaint.resident.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="complaint-row-controls">
        <div className="complaint-row-badges">
          {complaint.isOverdue && (
            <span className="badge badge-danger">Overdue</span>
          )}
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
        <span className="complaint-row-date">{formatDate(complaint.createdAt)}</span>
        <svg className="complaint-row-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}
