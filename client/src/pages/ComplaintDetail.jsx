import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { complaints as complaintsApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { ROLES, STATUS_LABELS, CATEGORY_LABELS, ALLOWED_STATUS_TRANSITIONS } from '../utils/constants';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/helpers';
import './ComplaintDetail.css';

/**
 * ComplaintDetail page redesign (V2) - 70/30 workspace layout
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
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function fetchComplaint() {
      setLoading(true);
      setError('');
      try {
        const data = await complaintsApi.getById(id, token);
        setComplaint(data.complaint);
        // Reset inputs on fresh load
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

  async function handleStatusUpdate(e) {
    e.preventDefault();
    if (!newStatus) return;

    setUpdateError('');
    setSuccessMsg('');
    setUpdating(true);
    try {
      await complaintsApi.updateStatus(
        id,
        { status: newStatus, remark: remark.trim() || null },
        token
      );
      setSuccessMsg('Status updated.');
      setRefetchTrigger((t) => t + 1); // trigger local refresh
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page complaint-detail-workspace animate-fade-in">
        <div className="back-navigation-container">
          <div className="skeleton" style={{ width: '120px', height: '14px' }} />
        </div>
        <header className="page-header">
          <div className="page-header-title">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div className="skeleton skeleton-badge" />
              <div className="skeleton skeleton-badge" />
            </div>
            <div className="skeleton skeleton-title" style={{ width: '60%' }} />
          </div>
        </header>

        <div className="complaint-detail-layout">
          <main className="complaint-detail-main">
            <div className="workspace-panel">
              <div className="skeleton" style={{ width: '100px', height: '18px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton skeleton-text-sm" />
                <div className="skeleton skeleton-text-sm" />
                <div className="skeleton skeleton-text-sm" style={{ width: '80%' }} />
              </div>
            </div>
          </main>
          <aside className="complaint-detail-sidebar">
            <div className="workspace-panel">
              <div className="skeleton" style={{ width: '120px', height: '18px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="skeleton skeleton-text-xs" />
                <div className="skeleton skeleton-text-xs" />
                <div className="skeleton skeleton-text-xs" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-error" role="alert">{error}</div>
      </div>
    );
  }

  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[complaint.status] || [];
  const canUpdateStatus    = isAdmin && allowedTransitions.length > 0;

  return (
    <div className="page complaint-detail-workspace">

      {/* Back navigation */}
      <div className="back-navigation-container">
        <Link to="/complaints" className="complaint-back-link">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Issues
        </Link>
      </div>

      {/* Header section with statuses and ID */}
      <header className="page-header">
        <div className="page-header-title">
          <div className="flex gap-2 items-center flex-wrap" style={{ marginBottom: 'var(--space-2)' }}>
            <span className="complaint-id-mono">#{complaint.id.slice(-6)}</span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            {complaint.isOverdue && (
              <span className="badge badge-danger">Overdue</span>
            )}
          </div>
          <h1>{complaint.title}</h1>
        </div>
      </header>

      {/* ── Main 70/30 Split Layout ── */}
      <div className="complaint-detail-layout">
        
        {/* Left Side (70%) - Description, Photo, History Timeline */}
        <main className="complaint-detail-main">
          {successMsg && (
            <div className="alert alert-success" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
              {successMsg}
            </div>
          )}
          
          {/* Description */}
          <section className="workspace-panel">
            <h2 className="panel-title">Description</h2>
            <p className="complaint-detail-text">{complaint.description}</p>
          </section>

          {/* Attached image file */}
          {complaint.photoUrl && (
            <section className="workspace-panel">
              <h2 className="panel-title">Attached Evidence</h2>
              <div className="photo-gallery-frame">
                <img
                  src={complaint.photoUrl}
                  alt={`Proof artifact for complaint #${complaint.id.slice(-6)}`}
                  className="complaint-detail-photo"
                />
              </div>
            </section>
          )}

          {/* Timeline audit trail */}
          {complaint.history && complaint.history.length > 0 && (
            <section className="workspace-panel">
              <h2 className="panel-title">Lifecycle History Logs</h2>
              <div className="complaint-history-timeline">
                {complaint.history.map((entry) => (
                  <div key={entry.id} className="complaint-history-item">
                    <div className="complaint-history-dot" aria-hidden="true" />
                    <div className="complaint-history-content">
                      <div className="complaint-history-transition">
                        <StatusBadge status={entry.fromStatus} />
                        <svg className="complaint-history-arrow-svg" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                        <StatusBadge status={entry.toStatus} />
                      </div>
                      <span className="complaint-history-meta">
                        Changed by <strong>{entry.changedBy.name}</strong> · {formatDateTime(entry.createdAt)}
                      </span>
                      {entry.remark && (
                        <blockquote className="complaint-history-note">{entry.remark}</blockquote>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </main>

        {/* Right Side (30%) - Metadata Panel, Actions Panel */}
        <aside className="complaint-detail-sidebar">
          
          {/* Properties Panel */}
          <div className="workspace-panel">
            <h2 className="panel-title">Issue Properties</h2>
            
            <div className="metadata-list">
              <div className="metadata-item">
                <span className="metadata-label">Category</span>
                <span className="metadata-value">
                  {CATEGORY_LABELS[complaint.category] || complaint.category}
                </span>
              </div>
              {complaint.resident && (
                <div className="metadata-item">
                  <span className="metadata-label">Reporter</span>
                  <span className="metadata-value">
                    {complaint.resident.name} (Flat {complaint.resident.flatNumber})
                  </span>
                </div>
              )}
              <div className="metadata-item">
                <span className="metadata-label">Logged</span>
                <span className="metadata-value">
                  {formatDateTime(complaint.createdAt)}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Modified</span>
                <span className="metadata-value">
                  {formatDateTime(complaint.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Admin status state machine transition */}
          {canUpdateStatus && (
            <div className="workspace-panel">
              <h2 className="panel-title">State Transitions</h2>
              
              <form
                onSubmit={handleStatusUpdate}
                className="complaint-update-form"
                noValidate
              >
                {updateError && (
                  <div className="alert alert-error" role="alert" style={{ fontSize: '11px', padding: 'var(--space-2)' }}>
                    {updateError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="new-status" className="form-label">
                    Next State Transition
                  </label>
                  <select
                    id="new-status"
                    className="form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={updating}
                  >
                    <option value="">— Select state —</option>
                    {allowedTransitions.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="remark" className="form-label">
                    Activity Comment <span className="text-muted">(optional)</span>
                  </label>
                  <textarea
                    id="remark"
                    className="form-textarea"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Enter audit trailing comments…"
                    rows={3}
                    disabled={updating}
                  />
                </div>

                <button
                  type="submit"
                  id="update-status-submit"
                  className="btn btn-primary btn-lg"
                  disabled={updating || !newStatus}
                >
                  {updating ? 'Updating…' : 'Apply state change'}
                </button>
              </form>
            </div>
          )}

        </aside>

      </div>

    </div>
  );
}
