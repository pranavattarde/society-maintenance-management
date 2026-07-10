import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { complaints as complaintsApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { CATEGORY_LABELS } from '../utils/constants';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/helpers';
import './ComplaintDetail.css';

/**
 * ComplaintDetail page.
 *
 * Fetches the complaint by ID from the URL parameter.
 * The backend enforces access control:
 *   - Residents can only view their own complaints (403 otherwise)
 *   - Admins can view any complaint
 *
 * Photo is displayed only when photoUrl is present.
 * History is intentionally excluded in this phase (Phase 6).
 */
export default function ComplaintDetail() {
  const { id }      = useParams();
  const { token }   = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchComplaint() {
      setLoading(true);
      setError('');
      try {
        const data = await complaintsApi.getById(id, token);
        setComplaint(data.complaint);
      } catch (err) {
        setError(err.message || 'Failed to load complaint');
      } finally {
        setLoading(false);
      }
    }

    fetchComplaint();
  }, [id, token]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Loading complaint…</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

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
      </div>

      {/* Info grid — category, resident, dates */}
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

      {/* Description */}
      <div className="card complaint-detail-section">
        <h2 className="complaint-detail-section-title">Description</h2>
        <p className="complaint-detail-text">{complaint.description}</p>
      </div>

      {/* Attached photo — only rendered when present */}
      {complaint.photoUrl && (
        <div className="card complaint-detail-section">
          <h2 className="complaint-detail-section-title">Attached Photo</h2>
          <img
            src={complaint.photoUrl}
            alt={`Photo for complaint: ${complaint.title}`}
            className="complaint-detail-photo"
          />
        </div>
      )}

    </div>
  );
}
