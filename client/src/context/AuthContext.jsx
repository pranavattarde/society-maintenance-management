import { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../api/index';

const AuthContext = createContext(null);

/**
 * AuthProvider — manages JWT token and user state.
 *
 * Token is persisted to localStorage so the session survives a page reload.
 * On mount, if a token exists, the /auth/me endpoint is called to restore
 * the user object. If the token is invalid or expired, the session is cleared.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  function login(newToken, userData) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  function updateUser(userData) {
    setUser(userData);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — consume the AuthContext.
 *
 * Throws if used outside of AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
