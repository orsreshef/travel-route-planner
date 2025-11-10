/**
 * Rate Limiting Middleware
 * Implements request throttling and delays to prevent API rate limiting
 */

const axios = require('axios');

// Rate limiting configuration for different APIs
const API_RATE_LIMITS = {
  openRouteService: {
    maxRequests: 40, //for free tier
    windowMs: 60 * 1000, // 1 minute
    delayMs: 1500, // 1.5 second delay between requests
    requests: [],
    lastRequest: 0
  },
  openCage: {
    maxRequests: 200, //per day
    windowMs: 60 * 60 * 1000, // 1 hour
    delayMs: 500, // 0.5 second delay
    requests: [],
    lastRequest: 0
  },
  unsplash: {
    maxRequests: 50, // per hour for free tier
    windowMs: 60 * 60 * 1000, // 1 hour
    delayMs: 800, // 0.8 second delay
    requests: [],
    lastRequest: 0
  },
  openWeather: {
    maxRequests: 60, // per minute for free tier
    windowMs: 60 * 1000, // 1 minute
    delayMs: 1000, // 1 second delay
    requests: [],
    lastRequest: 0
  },
  restCountries: {
    maxRequests: 30, // this is the conservative limit for free API
    windowMs: 60 * 1000, // 1 minute
    delayMs: 200, // 0.2 second delay
    requests: [],
    lastRequest: 0
  }
};

/**
 * Check if we can make a request to a specific API
 * @param {string} apiName - Name of the API
 * @returns {boolean} Whether the request can be made
 */
const canMakeRequest = (apiName) => {
  const config = API_RATE_LIMITS[apiName];
  if (!config) return true;

  const now = Date.now();
  
  // clean old requests outside the window
  config.requests = config.requests.filter(timestamp => 
    now - timestamp < config.windowMs
  );
  
  // Check if under the limit
  return config.requests.length < config.maxRequests;
};

/**
 * Add delay before making request to respect rate limits
 * @param {string} apiName - Name of the API
 * @returns {Promise} Promise that resolves after appropriate delay
 */
const addRequestDelay = async (apiName) => {
  const config = API_RATE_LIMITS[apiName];
  if (!config) return;

  const now = Date.now();
  const timeSinceLastRequest = now - config.lastRequest;
  
  if (timeSinceLastRequest < config.delayMs) {
    const delayNeeded = config.delayMs - timeSinceLastRequest;
    console.log(`⏱️ Rate limiting: Waiting ${delayNeeded}ms for ${apiName} API`);
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  
  config.lastRequest = Date.now();
  config.requests.push(config.lastRequest);
};

/**
 * Wait for rate limit window to reset
 * @param {string} apiName - Name of the API
 * @returns {Promise} Promise that resolves when we can make requests again
 */
const waitForRateLimit = async (apiName) => {
  const config = API_RATE_LIMITS[apiName];
  if (!config) return;

  while (!canMakeRequest(apiName)) {
    const oldestRequest = Math.min(...config.requests);
    const waitTime = config.windowMs - (Date.now() - oldestRequest);
    
    if (waitTime > 0) {
      console.log(`🔴 Rate limit exceeded for ${apiName}. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000))); // Max 5s wait
      
      // Clean old requests
      const now = Date.now();
      config.requests = config.requests.filter(timestamp => 
        now - timestamp < config.windowMs
      );
    } else {
      break;
    }
  }
};

/**
 * Enhanced axios request with automatic rate limiting
 * @param {string} apiName - Name of the API
 * @param {function} requestFn - Function that returns axios request
 * @returns {Promise} Promise that resolves with the response
 */
const makeRateLimitedRequest = async (apiName, requestFn) => {
  // Wait if we're at the rate limit
  await waitForRateLimit(apiName);
  
  // Add appropriate delay
  await addRequestDelay(apiName);
  
  try {
    const result = await requestFn();
    return result;
  } catch (error) {
    // If we get a 429 (Too Many Requests), wait and retry once
    if (error.response?.status === 429) {
      console.log(`⚠️ Got 429 from ${apiName}, waiting 30 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Clear recent requests to reset our internal counter
      const config = API_RATE_LIMITS[apiName];
      if (config) {
        config.requests = [];
        config.lastRequest = 0;
      }   
      await addRequestDelay(apiName);
      return await requestFn();
    }
    
    throw error;
  }
};

/**
 * Express middleware for rate limiting route generation endpoint
 */
const routeGenerationLimiter = (req, res, next) => {
  const userRequests = req.session?.routeRequests || [];
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 3; // Max 3 route generations per 5 minutes per user
  
  // Clean old requests
  const recentRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      status: 'error',
      message: 'Too many route generation requests. Please wait 5 minutes before trying again.',
      retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
    });
  }
  
  // Add current request
  recentRequests.push(now);
  
  // Update session
  if (!req.session) req.session = {};
  req.session.routeRequests = recentRequests;
  
  next();
};

module.exports = {
  makeRateLimitedRequest,
  canMakeRequest,
  addRequestDelay,
  waitForRateLimit,
  routeGenerationLimiter,
  API_RATE_LIMITS
};