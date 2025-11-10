/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and authenticate user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID from token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'travel-planner',
      audience: 'travel-planner-users'
    }
  );
};

/**
 * Generate refresh token (longer expiration)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: '30d',
      issuer: 'travel-planner',
      audience: 'travel-planner-users'
    }
  );
};

/**
 * Middleware to check if user owns a resource
 */
const checkResourceOwnership = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    try {
      const resourceUserId = req.body[resourceUserField] || 
                           req.params[resourceUserField] || 
                           req.query[resourceUserField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          status: 'error',
          message: 'Resource user ID is required'
        });
      }

      // Check if the authenticated user owns the resource
      if (req.user._id.toString() !== resourceUserId.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You can only access your own resources'
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Rate limiting for authentication routes
 * More reasonable limits for development and normal usage
 */
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 20, // 50 for dev, 20 for production
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000) // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain IPs in development
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') {
      const devIPs = ['127.0.0.1', '::1', 'localhost'];
      return devIPs.includes(req.ip) || req.ip?.startsWith('192.168.');
    }
    return false;
  }
});

module.exports = {
  authenticateToken,
  generateToken,
  generateRefreshToken,
  checkResourceOwnership,
  authRateLimit
};