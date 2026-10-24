import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessTokenInMemory, setLogoutCallback } from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to sync memory state
  const setAuthSession = useCallback((userData, token) => {
    setUser(userData);
    setAccessToken(token);
    setAccessTokenInMemory(token);
  }, []);

  const clearAuthSession = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setAccessTokenInMemory(null);
  }, []);

  // Silent session restore on application startup
  useEffect(() => {
    let isMounted = true;

    // Register callback for when refresh fails in Axios interceptor
    setLogoutCallback(() => {
      if (isMounted) {
        clearAuthSession();
      }
    });

    const restoreSession = async () => {
      try {
        const response = await api.post('/auth/refresh');
        if (isMounted && response?.data) {
          const { user: restoredUser, accessToken: restoredToken } = response.data;
          setAuthSession(restoredUser, restoredToken);
        }
      } catch (err) {
        // Normal on initial visit without cookie
        if (isMounted) {
          clearAuthSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [setAuthSession, clearAuthSession]);

  /**
   * Log in user with email & password
   */
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, accessToken: token } = response.data;
    setAuthSession(loggedInUser, token);
    return response.data;
  };

  /**
   * Register new customer account
   */
  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    const { user: registeredUser, accessToken: token } = response.data;
    setAuthSession(registeredUser, token);
    return response.data;
  };

  /**
   * Log out user
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout endpoint error:', err.message);
    } finally {
      clearAuthSession();
    }
  };

  const value = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: Boolean(user && accessToken),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
