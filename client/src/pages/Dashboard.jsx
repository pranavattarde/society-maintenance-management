import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboard as dashboardApi, complaints as complaintsApi, notices as noticesApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { ROLES, STATUS_LABELS, CATEGORY_LABELS } from '../utils/constants';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/helpers';
import './Dashboard.css';

/**
 * Modern Operational Workspace Dashboard (V2)
 */
export default function Dashboard() {
  const { user, token } = useAuth();

  const [stats, setStats] = useState(null);
  const [activeComplaints, setActiveComplaints] = useState([]);
  const [latestNotices, setLatestNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError('');
      try {
        const [statsData, complaintsData, noticesData] = await Promise.all([
          dashboardApi.get(token),
          complaintsApi.list({}, token),
          noticesApi.list(token)
        ]);

        setStats(statsData);

        // Filter active/unresolved complaints (OPEN or IN_PROGRESS)
        const unresolved = (complaintsData.complaints || [])
          .filter((c) => c.status !== 'RESOLVED')
          .slice(0, 5);
        setActiveComplaints(unresolved);

        // Top 3 recent notices
        const noticesList = (noticesData.notices || []).slice(0, 3);
        setLatestNotices(noticesList);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard workspace');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [token]);

  // Human-readable date formatted for enterprise headers
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="spinner" aria-hidden="true" style={{ marginBottom: 'var(--space-4)' }}></div>
          <p>Initializing workspace…</p>
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

  return (
    <div className="page dashboard-workspace">
      
      {/* ── 1. Top Welcome Header ────────────────────────────────────────────── */}
      <header className="page-header">
        <div className="page-header-title">
          <h1>{isAdmin ? 'Admin Console' : 'Resident Portal'}</h1>
          <p className="page-header-subtitle">Welcome back. Operational status for {todayStr}</p>
        </div>
        <div className="workspace-actions">
          {isAdmin ? (
            <Link to="/notices/new" className="btn btn-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
              </svg>
              Post Announcement
            </Link>
          ) : (
            <Link to="/complaints/new" className="btn btn-primary">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              File Complaint
            </Link>
          )}
        </div>
      </header>

      {isAdmin && stats?.overdueCount > 0 && (
        <div className="alert alert-error overdue-alert" role="alert">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>There are <strong>{stats.overdueCount}</strong> overdue complaints requiring immediate attention.</span>
        </div>
      )}

      {/* ── 2. KPI Metrics Grid ─────────────────────────────────────────────── */}
      <section className="workspace-kpis">
        <div className="stat-card stat-card--primary">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Volume</span>
            <svg className="stat-card-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <line x1="15" y1="3" x2="15" y2="21" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
          </div>
          <span className="stat-card-value">{stats?.totalComplaints ?? 0}</span>
          <span className="stat-card-subtext">All-time logged issues</span>
        </div>
        
        <div className="stat-card stat-card--open">
          <div className="stat-card-header">
            <span className="stat-card-label">{STATUS_LABELS.OPEN}</span>
            <svg className="stat-card-icon color-open" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span className="stat-card-value">{stats?.byStatus.OPEN ?? 0}</span>
          <span className="stat-card-subtext">Awaiting admin triage</span>
        </div>
        
        <div className="stat-card stat-card--in-progress">
          <div className="stat-card-header">
            <span className="stat-card-label">{STATUS_LABELS.IN_PROGRESS}</span>
            <svg className="stat-card-icon color-progress" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6" />
              <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
          <span className="stat-card-value">{stats?.byStatus.IN_PROGRESS ?? 0}</span>
          <span className="stat-card-subtext">Currently under repair</span>
        </div>
        
        <div className="stat-card stat-card--resolved">
          <div className="stat-card-header">
            <span className="stat-card-label">{STATUS_LABELS.RESOLVED}</span>
            <svg className="stat-card-icon color-resolved" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <span className="stat-card-value">{stats?.byStatus.RESOLVED ?? 0}</span>
          <span className="stat-card-subtext">Successfully completed</span>
        </div>

        {isAdmin && (
          <div className={`stat-card ${stats?.overdueCount > 0 ? 'stat-card--danger' : 'stat-card--resolved'}`}>
            <div className="stat-card-header">
              <span className="stat-card-label">Overdue Threshold</span>
              <svg className="stat-card-icon color-danger" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span className="stat-card-value">{stats?.overdueCount ?? 0}</span>
            <span className="stat-card-subtext">Past target resolution SLA</span>
          </div>
        )}
      </section>

      {/* ── 3. Primary Grid Workspace Layout ─────────────────────────────────── */}
      <div className="workspace-layout">
        
        {/* Left Primary Column: Active Complaints queue */}
        <main className="workspace-main">
          <div className="workspace-panel">
            <div className="panel-header">
              <h2 className="panel-title">Active Attention Items</h2>
              <span className="panel-subtitle">Unresolved maintenance requests requiring action</span>
            </div>

            {activeComplaints.length === 0 ? (
              <div className="panel-empty-state">
                <div className="panel-empty-icon-box">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3>Workspace Cleared</h3>
                <p>All active complaints have been successfully resolved.</p>
              </div>
            ) : (
              <div className="dashboard-list">
                {activeComplaints.map((item) => (
                  <Link to={`/complaints/${item.id}`} key={item.id} className="dashboard-list-row">
                    <div className="row-main">
                      <span className="row-id">#{item.id.slice(-6)}</span>
                      <div className="row-text">
                        <span className="row-title">{item.title}</span>
                        <span className="row-sub">{CATEGORY_LABELS[item.category] || item.category}</span>
                      </div>
                    </div>
                    <div className="row-meta">
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                      <svg className="row-chevron" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                ))}
                <div className="panel-footer-actions">
                  <Link to="/complaints" className="btn btn-secondary btn-sm">
                    View Complete Backlog
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Secondary Sidebar: Bulletins + Secondary stats */}
        <aside className="workspace-sidebar">
          
          {/* Important Notices Announcement block */}
          <div className="workspace-panel">
            <div className="panel-header">
              <h2 className="panel-title">Recent Bulletins</h2>
              <span className="panel-subtitle">Official pinned society announcements</span>
            </div>
            {latestNotices.length === 0 ? (
              <div className="panel-empty-state" style={{ padding: 'var(--space-6) 0', border: 'none' }}>
                <p style={{ margin: 0, fontSize: '12px' }}>No announcements posted yet.</p>
              </div>
            ) : (
              <div className="bulletin-list">
                {latestNotices.map((notice) => (
                  <div key={notice.id} className="bulletin-row">
                    <div className="bulletin-header">
                      <span className="bulletin-title">
                        {notice.isPinned && (
                          <svg className="bulletin-pin-svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none" aria-hidden="true">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6l.8 1 .8-1v-6H18v-2l-2-2z" />
                          </svg>
                        )}
                        {notice.title}
                      </span>
                      <span className="bulletin-date">{formatDateTime(notice.createdAt)}</span>
                    </div>
                    <p className="bulletin-summary">{notice.content.slice(0, 80)}{notice.content.length > 80 && '...'}</p>
                  </div>
                ))}
                <div className="panel-footer-actions">
                  <Link to="/notices" className="btn btn-secondary btn-sm">
                    Read Bulletin Board
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Secondary stats: Category breakdown */}
          <div className="workspace-panel">
            <div className="panel-header">
              <h2 className="panel-title">Volume by Category</h2>
              <span className="panel-subtitle">Distribution breakdown of logged incidents</span>
            </div>
            <div className="category-list">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const count = stats?.byCategory[key] ?? 0;
                const total = stats?.totalComplaints ?? 1; // prevent division by zero
                const percent = Math.min(100, Math.round((count / (total || 1)) * 100));
                return (
                  <div key={key} className="category-row-v2">
                    <div className="category-row-info">
                      <span className="category-label">{label}</span>
                      <span className="category-badge">{count}</span>
                    </div>
                    <div className="category-progress-track" aria-hidden="true">
                      <div className="category-progress-bar" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
