const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Must be placed after all routes
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error(`[Error] ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
  });

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: true,
      message: 'File size exceeds the 10MB limit',
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: true,
      message: `File upload error: ${err.message}`,
    });
  }

  // MongoDB validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: messages,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: true,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({
      error: true,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(403).json({
      error: true,
      message: 'Token expired',
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
