import { STATUS_LABELS, PRIORITY_LABELS } from '../utils/constants';
import { getStatusBadgeClass, getPriorityBadgeClass } from '../utils/helpers';

/**
 * StatusBadge — displays a complaint status as a colour-coded pill.
 *
 * @param {{ status: string }} props
 */
export function StatusBadge({ status }) {
  return (
    <span className={`badge ${getStatusBadgeClass(status)}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/**
 * PriorityBadge — displays a complaint priority as a colour-coded pill.
 *
 * @param {{ priority: string }} props
 */
export function PriorityBadge({ priority }) {
  return (
    <span className={`badge ${getPriorityBadgeClass(priority)}`}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}
