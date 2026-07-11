import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { complaints as complaintsApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { ROLES, STATUS_LABELS, CATEGORY_LABELS, ALLOWED_STATUS_TRANSITIONS } from '../utils/constants';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/helpers';
import './ComplaintDetail.css';

/**
 * ComplaintDetail page.
 *
 * Sections (in order):
 *   1. Info grid — category, resident, submitted/updated dates
 *   2. Description
 *   3. Attached photo (if any)
 *   4. Update Status form (admin only, hidden once RESOLVED)
 *   5. Status History timeline (both roles, rendered only when history exists)
 *
 * Re-fetch strategy:
 *   A `refetchTrigger` counter is incremented after a successful status update.
 *   The useEffect depends on it, so it re-runs and fetches fresh data including
 *   the new history entry — without duplicating the fetch function.
 */
export default function ComplaintDetail() {
  const { id }    = useParams();
  const { user, token } = useAuth();
  const isAdmin   = user?.role === ROLES.ADMIN;

  // ── Complaint state ────────────────────────────────────────────────────────
  const [complaint, setComplaint]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // ── Status update form state ───────────────────────────────────────────────
  const [newStatus, setNewStatus]   = useState('');
  const [remark, setRemark]         = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updating, setUpdating]     = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchComplaint() {
      setLoading(true);
      setError('');
      try {
        const data = await complaintsApi.getById(id, token);
        setComplaint(data.complaint);
        // Reset the update form whenever fresh data arrives
        setNewStatus('');
        setRemark('');
        setUpdateError('');
      } catch (err) {
        setError(err.message || 'Failed to load complaint');
      } finally {
        setLoading(false);
      }
    }

    fetchComplaint();
  }, [id, token, refetchTrigger]);

  // ── Status update handler ──────────────────────────────────────────────────

  async function handleStatusUpdate(e) {
    e.preventDefault();
    if (!newStatus) return;

    setUpdateError('');
    setUpdating(true);
    try {
      await complaintsApi.updateStatus(
        id,
        { status: newStatus, remark: remark.trim() || null },
        token
      );
      setRefetchTrigger((t) => t + 1); // triggers re-fetch with updated history
    } catch (err) {
      setUpdateError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Loading complaint…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="page">
        <Link to="/complaints" className="complaint-back-link">
          ← Back to Complaints
        </Link>
        <div className="alert alert-error" role="alert">{error}</div>
      </div>
    );
  }

  // ── Computed values ────────────────────────────────────────────────────────

  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[complaint.status] || [];
  const canUpdateStatus    = isAdmin && allowedTransitions.length > 0;

  // ── Detail view ────────────────────────────────────────────────────────────

  return (
    <div className="page">

      {/* Back navigation */}
      <Link to="/complaints" className="complaint-back-link">
        ← Back to Complaints
      </Link>

      {/* Title */}
      <div className="page-header">
        <h1>{complaint.title}</h1>
      </div>

      {/* Status + Priority badges */}
      <div className="complaint-detail-meta">
        <StatusBadge status={complaint.status} />
        <PriorityBadge priority={complaint.priority} />
        {complaint.isOverdue && (
          <span className="badge badge-danger">Overdue</span>
        )}
      </div>

      {/* 1. Info grid ──────────────────────────────────────────────────────── */}
      <div className="card complaint-detail-section">
        <div className="complaint-detail-info-grid">

          <div className="complaint-detail-info-item">
            <span className="complaint-detail-info-label">Category</span>
            <span className="complaint-detail-info-value">
              {CATEGORY_LABELS[complaint.category] || complaint.category}
            </span>
          </div>

          {complaint.resident && (
            <div className="complaint-detail-info-item">
              <span className="complaint-detail-info-label">Submitted By</span>
              <span className="complaint-detail-info-value">
                {complaint.resident.name} · Flat {complaint.resident.flatNumber}
              </span>
            </div>
          )}

          <div className="complaint-detail-info-item">
            <span className="complaint-detail-info-label">Submitted</span>
            <span className="complaint-detail-info-value">
              {formatDateTime(complaint.createdAt)}
            </span>
          </div>

          <div className="complaint-detail-info-item">
            <span className="complaint-detail-info-label">Last Updated</span>
            <span className="complaint-detail-info-value">
              {formatDateTime(complaint.updatedAt)}
            </span>
          </div>

        </div>
      </div>

      {/* 2. Description ────────────────────────────────────────────────────── */}
      <div className="card complaint-detail-section">
        <h2 className="complaint-detail-section-title">Description</h2>
        <p className="complaint-detail-text">{complaint.description}</p>
      </div>

      {/* 3. Attached photo ─────────────────────────────────────────────────── */}
      {complaint.photoUrl && (
        <div className="card complaint-detail-section">
          <h2 className="complaint-detail-section-title">Attached Photo</h2>
          <img
            src={complaint.photoUrl}
            alt={`Photo for: ${complaint.title}`}
            className="complaint-detail-photo"
          />
        </div>
      )}

      {/* 4. Admin: Update Status form ──────────────────────────────────────── */}
      {canUpdateStatus && (
        <div className="card complaint-detail-section">
          <h2 className="complaint-detail-section-title">Update Status</h2>

          <form
            onSubmit={handleStatusUpdate}
            className="complaint-update-form"
            noValidate
          >
            {updateError && (
              <div className="alert alert-error" role="alert">
                {updateError}
              </div>
            )}

            {/* Status select — only shows valid next states */}
            <div className="form-group">
              <label htmlFor="new-status" className="form-label">
                New Status
              </label>
              <select
                id="new-status"
                className="form-select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={updating}
              >
                <option value="">— Select new status —</option>
                {allowedTransitions.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {/* Optional remark */}
            <div className="form-group">
              <label htmlFor="remark" className="form-label">
                Remark{' '}
                <span className="text-muted text-xs">(optional)</span>
              </label>
              <textarea
                id="remark"
                className="form-textarea"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Add a note about this status change…"
                rows={3}
                disabled={updating}
              />
            </div>

            <div className="complaint-update-actions">
              <button
                type="submit"
                id="update-status-submit"
                className="btn btn-primary"
                disabled={updating || !newStatus}
              >
                {updating ? 'Updating…' : 'Update Status'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Status History timeline (both roles) ───────────────────────────── */}
      {complaint.history && complaint.history.length > 0 && (
        <div className="card complaint-detail-section">
          <h2 className="complaint-detail-section-title">Status History</h2>

          <div className="complaint-history-timeline">
            {complaint.history.map((entry) => (
              <div key={entry.id} className="complaint-history-item">
                <div className="complaint-history-dot" aria-hidden="true" />
                <div className="complaint-history-content">

                  {/* fromStatus → toStatus */}
                  <div className="complaint-history-transition">
                    <StatusBadge status={entry.fromStatus} />
                    <span className="complaint-history-arrow">→</span>
                    <StatusBadge status={entry.toStatus} />
                  </div>

                  {/* Who changed it and when */}
                  <span className="complaint-history-meta">
                    {entry.changedBy.name} · {formatDateTime(entry.createdAt)}
                  </span>

                  {/* Optional remark */}
                  {entry.remark && (
                    <p className="complaint-history-note">{entry.remark}</p>
                  )}

                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
