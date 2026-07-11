import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api/index';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

// ─── Client-side validation ───────────────────────────────────────────────────
// Mirrors the server rules to catch obvious mistakes before making a network call.
// The server re-validates everything, so this is a UX optimisation only.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email, password) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Login page — handles authentication for both RESIDENT and ADMIN users.
 *
 * Flow:
 *   1. If already authenticated, redirect to /dashboard immediately.
 *   2. User fills email + password.
 *   3. Client validates (prevents pointless network calls for empty fields).
 *   4. On success: AuthContext.login() stores token → navigate to /dashboard.
 *   5. On failure: API error message displayed in the alert banner.
 */
export default function Login() {
  const { user, loading: authLoading, login: setAuth } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors]   = useState({});
  const [apiError, setApiError]         = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // ── Early returns ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" aria-hidden="true" style={{ marginBottom: 'var(--space-2)' }}></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await authApi.login({ email, password });
      setAuth(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="auth-page">
      <div className="auth-card">

        <header className="auth-header">
          <span className="auth-logo" aria-hidden="true">🏢</span>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your society account</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>

          {apiError && (
            <div className="auth-api-error" role="alert">
              {apiError}
            </div>
          )}

          {/* Email --------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-input${fieldErrors.email ? ' is-error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={submitting}
            />
            {fieldErrors.email && (
              <p className="form-error">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password ------------------------------------------------------- */}
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input${fieldErrors.password ? ' is-error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="form-error">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit --------------------------------------------------------- */}
          <button
            type="submit"
            id="login-submit"
            className="btn btn-primary auth-submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>

        </form>

        <hr className="auth-divider" />
        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>

      </div>
    </div>
  );
}
