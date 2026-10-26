import axios from 'axios';

/**
 * Pre-configured Axios instance
 * Base URL configured from VITE_API_URL environment variable
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Necessary to send/receive httpOnly cookies (refreshToken)
});

// In-memory access token storage (never written to localStorage)
let inMemoryAccessToken = null;
let logoutCallback = null;

// Registry of active AbortControllers to cancel in-flight requests on logout/switch
const activeAbortControllers = new Set();

export const abortAllRequests = () => {
  for (const controller of activeAbortControllers) {
    try {
      controller.abort();
    } catch (e) {
      // Ignore abort errors
    }
  }
  activeAbortControllers.clear();
};

export const setAccessTokenInMemory = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessTokenInMemory = () => {
  return inMemoryAccessToken;
};

export const setLogoutCallback = (cb) => {
  logoutCallback = cb;
};

// Queue handling for concurrent requests during token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Registry of callbacks triggered when auth session is cleared / user logged out
const logoutListeners = new Set();

export const registerLogoutListener = (callback) => {
  logoutListeners.add(callback);
  return () => {
    logoutListeners.delete(callback);
  };
};

export const notifyLogoutListeners = () => {
  logoutListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Error in logout listener:', err);
    }
  });
};

/**
 * Reset API auth state, purge queue, and cancel any in-flight requests
 */
export const clearApiAuthState = () => {
  inMemoryAccessToken = null;
  isRefreshing = false;
  processQueue({ isCanceled: true, message: 'Auth session reset' }, null);
  abortAllRequests();
  notifyLogoutListeners();
};

// Request interceptor: attach in-memory access token & AbortController tracking
api.interceptors.request.use(
  (config) => {
    // Attach AbortController if not already provided
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      config._abortController = controller;
      activeAbortControllers.add(controller);
    }

    if (inMemoryAccessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 and refresh token once
api.interceptors.response.use(
  (response) => {
    if (response.config?._abortController) {
      activeAbortControllers.delete(response.config._abortController);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest?._abortController) {
      activeAbortControllers.delete(originalRequest._abortController);
    }

    // If request was canceled/aborted, reject silently
    if (axios.isCancel(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
      return Promise.reject({ isCanceled: true, message: 'Request aborted' });
    }

    // Do not attempt refresh on login, register, or refresh endpoints themselves
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        const newToken = data.accessToken;

        setAccessTokenInMemory(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessTokenInMemory(null);
        if (logoutCallback) {
          logoutCallback();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const customError = {
      message: error.response?.data?.message || error.message || 'Network error occurred',
      status: error.response?.status,
      data: error.response?.data,
      response: error.response,
    };
    return Promise.reject(customError);
  }
);

export default api;
