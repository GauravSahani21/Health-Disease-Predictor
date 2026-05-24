const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_production';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      error: true,
      message: 'Access token required',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('[Auth] Token verification failed:', err.message);
      return res.status(401).json({
        error: true,
        message: 'Invalid or expired token',
      });
    }

    // Attach user info to request
    req.user = user;
    next();
  });
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if token is missing
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuth,
};
