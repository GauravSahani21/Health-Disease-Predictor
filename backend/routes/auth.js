const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '3600'; // seconds

/**
 * POST /api/auth/register
 * User registration endpoint
 */
router.post(
  '/register',
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: errors.array(),
        });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          error: true,
          message: 'User with this email already exists',
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await User.create({
        name,
        email,
        passwordHash,
      });

      // Generate JWT
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: parseInt(JWT_EXPIRES_IN) }
      );

      res.status(201).json({
        message: 'User registered successfully',
        userId: user._id,
        token,
        expiresIn: parseInt(JWT_EXPIRES_IN),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      res.status(500).json({
        error: true,
        message: 'Registration failed',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          error: true,
          message: 'No account found with this email. Please register first.',
          code: 'USER_NOT_FOUND',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({
          error: true,
          message: 'Your account has been deactivated. Please contact support.',
          code: 'ACCOUNT_INACTIVE',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: true,
          message: 'Incorrect password. Please try again.',
          code: 'WRONG_PASSWORD',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: parseInt(JWT_EXPIRES_IN) }
      );

      res.json({
        message: 'Login successful',
        token,
        expiresIn: parseInt(JWT_EXPIRES_IN),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('[Auth] Login error:', error);
      res.status(500).json({
        error: true,
        message: 'Login failed',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('[Auth] Get profile error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve profile',
    });
  }
});

module.exports = router;
