/**
 * Travel Planner Server
 * Main entry point for the Express.js backend
 * Author: Or Reshef S
 */
require('dotenv').config();
console.log('🔑 Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- OPENROUTESERVICE_API_KEY exists:', !!process.env.OPENROUTESERVICE_API_KEY);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
//require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const routeRoutes = require('./routes/routes');
const weatherRoutes = require('./routes/weather');
const countryRoutes = require('./routes/country');

// Import middleware
const { cacheMiddleware } = require('./middleware/cache');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cache middleware
app.use(cacheMiddleware);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-planner', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/country', countryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Travel Planner Server is running',
    timestamp: new Date().toISOString()
  });
});

// Development endpoint to reset rate limits
if (process.env.NODE_ENV === 'development') {
  app.post('/api/dev/reset-rate-limits', (req, res) => {
    try {
      // Reset express-rate-limit stores if possible
      const store = req.app.locals.rateLimitStore;
      if (store && typeof store.resetAll === 'function') {
        store.resetAll();
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Rate limits reset successfully (development only)'
      });
    } catch (error) {
      console.error('Rate limit reset error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reset rate limits'
      });
    }
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(error.status || 500).json({
    status: 'error',
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close().then(() => {
    console.log('Database connection closed.');
    process.exit(0);
  }).catch((err) => {
    console.error('Error closing database connection:', err);
    process.exit(1);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});