/**
 * Simple in memory cache to reduce API calls
 * Helps prevent rate limiting by storing frequently requested data
 */

// Simple in-memory cache storage
const cache = new Map();

// Cache configuration
const CACHE_CONFIG = {
  countryImages: {
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 100
  },
  geocoding: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 500
  },
  weather: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 200
  },
  countryInfo: {
    ttl: 12 * 60 * 60 * 1000, // 12 hours
    maxSize: 100
  }
};

/**
 * Generate cache key from multiple parameters
 * @param {string} prefix - Cache prefix
 * @param {...any} params - Parameters to include in key
 * @returns {string} Cache key
 */
const generateCacheKey = (prefix, ...params) => {
  return `${prefix}:${params.map(p => String(p).toLowerCase()).join(':')}`;
};

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null if not found/expired
 */
const get = (key) => {
  const item = cache.get(key);
  
  if (!item) return null;
  
  // Check if expired
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  
  // Update access time for LRU
  item.accessed = Date.now();
  
  return item.data;
};

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {string} type - Cache type for TTL configuration
 */
const set = (key, data, type = 'default') => {
  const config = CACHE_CONFIG[type] || { ttl: 60 * 60 * 1000, maxSize: 100 };
  
  // Clean up expired items before adding new one
  cleanup();
  
  // Check if we need to remove oldest items
  if (cache.size >= config.maxSize) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].accessed - b[1].accessed);
    
    // Remove oldest 
    const toRemove = Math.ceil(config.maxSize * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      cache.delete(entries[i][0]);
    }
  }
  
  const item = {
    data,
    expires: Date.now() + config.ttl,
    accessed: Date.now(),
    created: Date.now()
  };
  
  cache.set(key, item);
};

/**
 * Remove expired items from cache
 */
const cleanup = () => {
  const now = Date.now();
  const toDelete = [];
  
  for (const [key, item] of cache.entries()) {
    if (now > item.expires) {
      toDelete.push(key);
    }
  }
  
  toDelete.forEach(key => cache.delete(key));
};

/**
 * Clear all cache
 */
const clear = () => {
  cache.clear();
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const getStats = () => {
  const now = Date.now();
  let expired = 0;
  let valid = 0;
  
  for (const [key, item] of cache.entries()) {
    if (now > item.expires) {
      expired++;
    } else {
      valid++;
    }
  }
  
  return {
    totalItems: cache.size,
    validItems: valid,
    expiredItems: expired,
    memoryUsage: JSON.stringify([...cache.entries()]).length
  };
};

/**
 * Express middleware to add cache helper to request
 */
const cacheMiddleware = (req, res, next) => {
  req.cache = {
    get,
    set,
    generateKey: generateCacheKey,
    clear,
    stats: getStats
  };
  next();
};

// Cleanup expired items every 10 minutes
setInterval(cleanup, 10 * 60 * 1000);

module.exports = {
  get,
  set,
  clear,
  generateCacheKey,
  getStats,
  cacheMiddleware,
  cleanup
};