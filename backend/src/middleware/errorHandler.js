/**
 * 404 Not Found Middleware
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler Middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  const statusCode =
    err.statusCode ||
    err.status ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
