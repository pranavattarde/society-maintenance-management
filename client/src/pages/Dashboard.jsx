import { useState, useEffect } from 'react';
import { dashboard as dashboardApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { ROLES, STATUS_LABELS, CATEGORY_LABELS } from '../utils/constants';
import './Dashboard.css';

// ─── StatCard ─────────────────────────────────────────────────────────────────

/**
 * A single metric card displaying a label and a large numeric value.
 *
 * @param {{ label: string, value: number, accent?: string }} props
 *   accent — one of: 'primary' | 'open' | 'in-progress' | 'resolved' | 'danger'
 */
function StatCard({ label, value, accent }) {
  return (
    <div className={`stat-card${accent ? ` stat-card--${accent}` : ''}`}>
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value ?? 0}</span>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Dashboard page — role-scoped.
 *
 * Resident:
 *   "My Complaints" section:
 *     Total | Open | In Progress | Resolved
 *
 * Admin:
 *   "Overview" section:
 *     Total | Open | In Progress | Resolved | Overdue
 *   "By Category" section:
 *     One card per complaint category
 *
 * No charts, no external libraries. Pure stat cards.
 */
export default function Dashboard() {
  const { token } = useAuth();

  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError('');
      try {
        const data = await dashboardApi.get(token);
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [token]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Loading dashboard…</p>
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

  const isAdmin = stats?.role === ROLES.ADMIN;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">

      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* ── Resident View ────────────────────────────────────────────────── */}
      {!isAdmin && stats && (
        <div className="dashboard-section">
          <p className="dashboard-section-title">My Complaints</p>
          <div className="dashboard-grid">
            <StatCard
              label="Total"
              value={stats.totalComplaints}
            />
            <StatCard
              label={STATUS_LABELS.OPEN}
              value={stats.byStatus.OPEN}
              accent="open"
            />
            <StatCard
              label={STATUS_LABELS.IN_PROGRESS}
              value={stats.byStatus.IN_PROGRESS}
              accent="in-progress"
            />
            <StatCard
              label={STATUS_LABELS.RESOLVED}
              value={stats.byStatus.RESOLVED}
              accent="resolved"
            />
          </div>
        </div>
      )}

      {/* ── Admin View ───────────────────────────────────────────────────── */}
      {isAdmin && stats && (
        <>
          {stats.overdueCount > 0 && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-6)' }}>
              <strong>Attention Required:</strong> There are <strong>{stats.overdueCount}</strong> unresolved complaints that have exceeded the overdue threshold.
            </div>
          )}

          {/* Overview — 5 summary cards */}
          <div className="dashboard-section">
            <p className="dashboard-section-title">Overview</p>
            <div className="dashboard-grid">
              <StatCard
                label="Total Complaints"
                value={stats.totalComplaints}
                accent="primary"
              />
              <StatCard
                label={STATUS_LABELS.OPEN}
                value={stats.byStatus.OPEN}
                accent="open"
              />
              <StatCard
                label={STATUS_LABELS.IN_PROGRESS}
                value={stats.byStatus.IN_PROGRESS}
                accent="in-progress"
              />
              <StatCard
                label={STATUS_LABELS.RESOLVED}
                value={stats.byStatus.RESOLVED}
                accent="resolved"
              />
              <StatCard
                label="Overdue"
                value={stats.overdueCount}
                accent={stats.overdueCount > 0 ? 'danger' : 'resolved'}
              />
            </div>
          </div>

          {/* By Category — one card per category */}
          <div className="dashboard-section">
            <p className="dashboard-section-title">By Category</p>
            <div className="dashboard-grid">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <StatCard
                  key={key}
                  label={label}
                  value={stats.byCategory[key] ?? 0}
                />
              ))}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
