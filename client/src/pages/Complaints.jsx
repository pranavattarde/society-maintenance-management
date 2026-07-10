import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaints as complaintsApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { ROLES, STATUS_LABELS, CATEGORY_LABELS } from '../utils/constants';
import ComplaintCard from '../components/ComplaintCard';
import './Complaints.css';

/**
 * Complaints list page.
 *
 * Role behaviour:
 *   - Resident: sees only their own complaints; "New Complaint" button visible
 *   - Admin:    sees all complaints; date filter is available
 *
 * Filter behaviour:
 *   - All filter changes trigger a fresh API call via the useEffect dependency array
 *   - Invalid enum values are silently ignored by the backend
 *   - "Clear Filters" resets all filter state in one call
 */
export default function Complaints() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [complaints, setComplaints]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Filter state
  const [statusFilter, setStatusFilter]     = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter]         = useState('');

  const hasActiveFilters = Boolean(statusFilter || categoryFilter || dateFilter);

  // ── Data fetching ──────────────────────────────────────────────────────────
  // Defined inside the effect so it always closes over the latest filter values

  useEffect(() => {
    async function fetchComplaints() {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (statusFilter)              params.status   = statusFilter;
        if (categoryFilter)            params.category = categoryFilter;
        if (isAdmin && dateFilter)     params.date     = dateFilter;

        const data = await complaintsApi.list(params, token);
        setComplaints(data.complaints);
      } catch (err) {
        setError(err.message || 'Failed to load complaints');
      } finally {
        setLoading(false);
      }
    }

    fetchComplaints();
  }, [statusFilter, categoryFilter, dateFilter, token, isAdmin]);

  function clearFilters() {
    setStatusFilter('');
    setCategoryFilter('');
    setDateFilter('');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">

      {/* Page header */}
      <div className="page-header">
        <h1>Complaints</h1>
        {!isAdmin && (
          <Link to="/complaints/new" className="btn btn-primary">
            + New Complaint
          </Link>
        )}
      </div>

      {/* Filter Bar -------------------------------------------------------- */}
      <div className="complaints-filters">

        <div className="complaints-filter-group">
          <label className="complaints-filter-label">Status</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="complaints-filter-group">
          <label className="complaints-filter-label">Category</label>
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Date filter — admin only */}
        {isAdmin && (
          <div className="complaints-filter-group">
            <label className="complaints-filter-label">Created From</label>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date"
            />
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-secondary btn-sm complaints-filter-clear"
          >
            Clear Filters
          </button>
        )}

      </div>

      {/* Body -------------------------------------------------------------- */}
      {loading ? (
        <p className="complaints-count">Loading complaints…</p>

      ) : error ? (
        <div className="alert alert-error" role="alert">{error}</div>

      ) : complaints.length === 0 ? (
        <div className="empty-state">
          <h3 className="empty-state-title">
            {hasActiveFilters ? 'No matches found' : 'No complaints yet'}
          </h3>
          <p className="empty-state-body">
            {hasActiveFilters
              ? 'No complaints match your current filters.'
              : isAdmin
              ? 'No complaints have been submitted yet.'
              : 'Submit your first complaint using the button above.'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
          )}
        </div>

      ) : (
        <>
          <p className="complaints-count">
            {complaints.length} {complaints.length === 1 ? 'complaint' : 'complaints'} found
          </p>
          <div className="complaints-grid">
            {complaints.map((complaint) => (
              <ComplaintCard key={complaint.id} complaint={complaint} />
            ))}
          </div>
        </>
      )}

    </div>
  );
}
