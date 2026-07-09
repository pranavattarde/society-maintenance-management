import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';

/**
 * ProtectedRoute — guards all authenticated routes.
 *
 * Renders a loading state while the token is being validated.
 * Redirects to /login if unauthenticated.
 * Optionally enforces a specific role — redirects to /dashboard on mismatch.
 *
 * Usage (in App.jsx):
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 *   <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
 *     <Route path="/notices/new" element={<CreateNotice />} />
 *   </Route>
 *
 * @param {string} [requiredRole] - Optional role constraint ('ADMIN' | 'RESIDENT')
 */
export default function ProtectedRoute({ requiredRole }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout />;
}
