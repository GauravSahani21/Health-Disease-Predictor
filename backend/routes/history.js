const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/history
 * Get user's prediction history
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, severity, limit = 20, skip = 0 } = req.query;

    // Build query filter
    const filter = { userId: req.user.id };
    if (type && ['text', 'image', 'face-acne', 'brain-mri'].includes(type)) {
      filter.type = type;
    }
    if (severity && ['minor', 'moderate', 'severe'].includes(severity)) {
      filter.severity = severity;
    }

    // Get queries with pagination
    const queries = await Query.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-__v');

    // Get total count for pagination
    const total = await Query.countDocuments(filter);

    res.json({
      queries,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit),
      },
    });
  } catch (error) {
    console.error('[History] Get history error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve history',
    });
  }
});

/**
 * GET /api/history/stats
 * Get user's query statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await Query.getUserStats(req.user.id);

    res.json(stats);
  } catch (error) {
    console.error('[History] Get stats error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve statistics',
    });
  }
});

/**
 * GET /api/history/:id
 * Get detailed query by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const query = await Query.findOne({
      _id: req.params.id,
      userId: req.user.id, // Ensure user can only access their own queries
    }).select('-__v');

    if (!query) {
      return res.status(404).json({
        error: true,
        message: 'Query not found',
      });
    }

    res.json({
      query,
    });
  } catch (error) {
    console.error('[History] Get query error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to retrieve query',
    });
  }
});

/**
 * DELETE /api/history/:id
 * Delete a query (right-to-be-forgotten)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const query = await Query.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!query) {
      return res.status(404).json({
        error: true,
        message: 'Query not found',
      });
    }

    // TODO: Also delete associated files from S3 if needed
    // if (query.resources?.imageUrl) { ... }

    res.json({
      message: 'Query deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    console.error('[History] Delete query error:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete query',
    });
  }
});

module.exports = router;
