import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './utils/constants';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Complaints from './pages/Complaints';
import ComplaintDetail from './pages/ComplaintDetail';
import CreateComplaint from './pages/CreateComplaint';
import Notices from './pages/Notices';
import CreateNotice from './pages/CreateNotice';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated routes — all roles */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/complaints/:id" element={<ComplaintDetail />} />
          <Route path="/notices" element={<Notices />} />
        </Route>

        {/* Authenticated routes — resident only */}
        <Route element={<ProtectedRoute requiredRole={ROLES.RESIDENT} />}>
          <Route path="/complaints/new" element={<CreateComplaint />} />
        </Route>

        {/* Authenticated routes — admin only */}
        <Route element={<ProtectedRoute requiredRole={ROLES.ADMIN} />}>
          <Route path="/notices/new" element={<CreateNotice />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
