const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const predictRoutes = require('./routes/predict');
const historyRoutes = require('./routes/history');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for prediction endpoints
const predictionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 predictions per 15 minutes
  message: 'Prediction rate limit exceeded. Please try again later.',
});

const path = require('path');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/predict', predictionLimiter, predictRoutes);
app.use('/api/history', historyRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/dist');
  
  // Debug endpoint
  app.get('/api/debug-files', (req, res) => {
    const fs = require('fs');
    try {
      const files = fs.readdirSync(frontendBuildPath);
      const assets = fs.existsSync(path.join(frontendBuildPath, 'assets')) ? fs.readdirSync(path.join(frontendBuildPath, 'assets')) : [];
      res.json({ frontendBuildPath, files, assets });
    } catch (e) {
      res.json({ frontendBuildPath, error: e.message });
    }
  });

  app.use(express.static(frontendBuildPath));
  
  // Catch-all route to serve the React index.html for client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // Root endpoint (development only)
  app.get('/', (req, res) => {
    res.json({
      message: 'Health Disease Predictor & Advisor API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        predict: '/api/predict',
        history: '/api/history',
        health: '/health',
      },
    });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/health_predictor';

const connectWithRetry = () => {
  mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
      logger.info('Connected to MongoDB');
    })
    .catch((error) => {
      logger.error('MongoDB connection failed, retrying in 10s...', { message: error.message });
      setTimeout(connectWithRetry, 10000);
    });
};
connectWithRetry();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  try {
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    logger.error('Error closing MongoDB connection', { error: err.message });
    process.exit(1);
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
