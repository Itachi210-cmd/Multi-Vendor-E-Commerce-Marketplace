import {
  registerCustomer,
  login,
  refreshSession,
  logoutUser,
} from '../services/auth.service.js';
import {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
  getClearCookieOptions,
} from '../utils/token.utils.js';

/**
 * Register a new customer
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const { user, accessToken, refreshToken } = await registerCustomer({
      name,
      email,
      password,
    });

    // Set refresh token in secure httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      user,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const loginHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await login({ email, password });

    // Set refresh token in secure httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token & rotate refresh token
 * POST /api/auth/refresh
 */
export const refresh = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    const { user, accessToken, refreshToken: newRefreshToken } = await refreshSession(
      oldRefreshToken
    );

    // Set new rotated refresh token in cookie
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions());

    res.status(200).json({
      success: true,
      user,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    // Clear refresh cookie
    res.clearCookie(REFRESH_COOKIE_NAME, getClearCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};
