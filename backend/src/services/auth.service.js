import User from '../models/user.model.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValidInRedis,
} from '../utils/token.utils.js';

/**
 * Register a new customer
 * Role is strictly forced to 'customer'
 */
export const registerCustomer = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password using bcrypt (cost 12)
  const passwordHash = await User.hashPassword(password);

  // Enforce customer role - never allow self-registering as vendor or admin
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'customer',
  });

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const { token: refreshToken } = await generateRefreshToken(user);

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
  };
};

/**
 * Authenticate existing user
 */
export const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user and explicitly select passwordHash
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  // Generic error message for both wrong email and wrong password
  const genericAuthError = new Error('Invalid email or password');
  genericAuthError.statusCode = 401;

  if (!user) {
    throw genericAuthError;
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw genericAuthError;
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const { token: refreshToken } = await generateRefreshToken(user);

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken,
  };
};

/**
 * Rotate refresh token and issue a fresh access token
 */
export const refreshSession = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (err) {
    const error = new Error('Refresh token is invalid or has expired');
    error.statusCode = 401;
    throw error;
  }

  const { id: userId, tokenId } = decoded;

  // Validate that this tokenId exists in Redis
  const isValidInRedis = await isRefreshTokenValidInRedis(userId, tokenId);
  if (!isValidInRedis) {
    const error = new Error('Refresh token has expired or has been revoked');
    error.statusCode = 401;
    throw error;
  }

  // Rotate token: invalidate the old token immediately
  await revokeRefreshToken(userId, tokenId);

  // Ensure user still exists in database
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User account no longer exists');
    error.statusCode = 401;
    throw error;
  }

  // Issue fresh token pair
  const newAccessToken = generateAccessToken(user);
  const { token: newRefreshToken } = await generateRefreshToken(user);

  return {
    user: user.toJSON(),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Invalidate refresh token in Redis
 */
export const logoutUser = async (refreshToken) => {
  if (!refreshToken) return;

  try {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded?.id && decoded?.tokenId) {
      await revokeRefreshToken(decoded.id, decoded.tokenId);
    }
  } catch (err) {
    // If the token is already expired or malformed, no further Redis action needed
  }
};
