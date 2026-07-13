import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { complaints as complaintsApi, ai as aiApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { ROLES, STATUS_LABELS, CATEGORY_LABELS } from '../utils/constants';
import ComplaintCard from '../components/ComplaintCard';
import './Complaints.css';

/**
 * Complaints board page redesign (V2)
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
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchFilter, setSearchFilter]     = useState('');
  const [dateFilter, setDateFilter]         = useState('');

  // AI Search intent state
  const [aiQuery, setAiQuery]               = useState('');
  const [aiLoading, setAiLoading]           = useState(false);
  const [aiError, setAiError]               = useState('');

  const hasActiveFilters = Boolean(statusFilter || categoryFilter || priorityFilter || searchFilter || dateFilter);

  useEffect(() => {
    async function fetchComplaints() {
      setLoading(true);
      setError('');
      try {
        const params = {};
        if (statusFilter)              params.status   = statusFilter;
        if (categoryFilter)            params.category = categoryFilter;
        if (priorityFilter)            params.priority = priorityFilter;
        if (searchFilter)              params.search   = searchFilter;
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
  }, [statusFilter, categoryFilter, priorityFilter, searchFilter, dateFilter, token, isAdmin]);

  function clearFilters() {
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setSearchFilter('');
    setDateFilter('');
    setAiQuery('');
    setAiError('');
  }

  async function handleAiSearch(e) {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    setAiError('');
    try {
      const response = await aiApi.parseSearch(aiQuery.trim(), token);
      const parsed = response.data;
      if (parsed) {
        setStatusFilter(parsed.status || '');
        setCategoryFilter(parsed.category || '');
        setPriorityFilter(parsed.priority || '');
        setSearchFilter(parsed.search || '');
        if (parsed.date) setDateFilter(parsed.date);
      }
    } catch (err) {
      setAiError(err.message || 'Could not parse AI search request.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="page complaints-board">

      {/* Page Header */}
      <header className="page-header">
        <div className="page-header-title">
          <h1>Reported Issues Board</h1>
          <p className="page-header-subtitle">Track, filter, and review maintenance activity backlog</p>
        </div>
        <div className="workspace-actions">
          {!isAdmin && (
            <Link to="/complaints/new" className="btn btn-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Report Issue
            </Link>
          )}
        </div>
      </header>

      {/* 🔮 Natural Language AI Search Bar (Admin Only) */}
      {isAdmin && (
        <form onSubmit={handleAiSearch} className="ai-search-bar-container">
          <div className="ai-search-input-wrapper">
            <span className="ai-search-sparkle-icon">✨</span>
            <input
              type="text"
              className="form-input ai-search-input"
              placeholder="Search with AI: 'Show unresolved lift complaints from Tower B' or 'Show high priority plumbing issues yesterday'..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              disabled={aiLoading}
              aria-label="Natural Language AI Search Bar"
            />
            {aiQuery && (
              <button
                type="button"
                className="ai-search-clear-btn"
                onClick={() => { setAiQuery(''); setAiError(''); }}
                aria-label="Clear AI query text"
              >
                ×
              </button>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary ai-search-submit-btn"
            disabled={aiLoading || !aiQuery.trim()}
          >
            {aiLoading ? 'Parsing...' : 'Search'}
          </button>
        </form>
      )}
      {aiError && (
        <div className="alert alert-error ai-search-error-alert" role="alert" style={{ marginTop: '-12px' }}>
          {aiError}
        </div>
      )}

      {/* Inline Filters Toolbar */}
      <div className="complaints-filters">
        <div className="filters-group-row">
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

          <div className="complaints-filter-group">
            <label className="complaints-filter-label">Priority</label>
            <select
              className="form-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="complaints-filter-group">
            <label className="complaints-filter-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Keywords, flats..."
              style={{ width: '150px' }}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              aria-label="Keyword text search"
            />
          </div>

          {isAdmin && (
            <div className="complaints-filter-group">
              <label className="complaints-filter-label">Created From</label>
              <input
                type="date"
                className="form-input"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="Filter by creation date"
              />
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn btn-secondary btn-sm complaints-filter-clear"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="complaints-count">
        Showing {complaints.length} complaint{complaints.length !== 1 ? 's' : ''}
      </div>

      {/* Main Backlog Output */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="complaint-list-row-item" style={{ border: '1px solid var(--color-gray-200)', background: '#fff' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '50px', height: '16px' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton" style={{ width: '40%', height: '16px' }} />
                  <div className="skeleton" style={{ width: '25%', height: '12px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '10px' }} />
                <div className="skeleton" style={{ width: '70px', height: '20px', borderRadius: '10px' }} />
                <div className="skeleton" style={{ width: '80px', height: '14px' }} />
              </div>
            </div>
          ))}
        </div>

      ) : error ? (
        <div className="alert alert-error" role="alert">{error}</div>

      ) : complaints.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-gray-400)', marginBottom: 'var(--space-2)' }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <h3>Everything looks good 🎉</h3>
          <p>
            {hasActiveFilters
              ? 'Try widening your filter selectors to expand search scope.'
              : isAdmin
              ? 'There are currently no unresolved complaints.'
              : 'You have not filed any maintenance complaints yet.'}
          </p>
          {!hasActiveFilters && !isAdmin && (
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Report a new issue if something requires attention.</p>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'var(--space-4)' }}
            >
              Clear Filter Selections
            </button>
          )}
        </div>

      ) : (
        <div className="complaints-list-container">
          {complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}

    </div>
  );
}
