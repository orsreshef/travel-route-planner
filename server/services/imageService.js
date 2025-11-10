// Enhanced imageService.js with country representative images
const axios = require('axios');
const { makeRateLimitedRequest } = require('../middleware/rateLimiter');

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_BASE_URL = 'https://api.unsplash.com';

/**
 * Get a representative/iconic image for a country
 * @param {string} country - Country name
 * @returns {Promise<Object>} Image object with URL and metadata
 */
const getCountryRepresentativeImage = async (country) => {
  console.log('🏛️ Fetching representative image for country:', country);
  
  // Use Unsplash API for better quality images
  if (UNSPLASH_ACCESS_KEY) {
    try {
      // Use generic search terms for all countries
      const searchQuery = `${country} landmark iconic`;
      
      const response = await makeRateLimitedRequest('unsplash', () =>
        axios.get(`${UNSPLASH_BASE_URL}/search/photos`, {
          params: {
            query: searchQuery,
            page: 1,
            per_page: 5,
            orientation: 'landscape',
            order_by: 'relevant'
          },
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
          },
          timeout: 5000,
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
          })
        })
      );

      const photos = response.data.results;
      if (photos && photos.length > 0) {
        const selectedPhoto = photos[0];
        return {
          url: selectedPhoto.urls.regular,
          thumbnailUrl: selectedPhoto.urls.thumb,
          description: selectedPhoto.description || selectedPhoto.alt_description || `${country} landmark`,
          photographer: {
            name: selectedPhoto.user.name,
            username: selectedPhoto.user.username
          },
          source: 'Unsplash',
          imageType: 'representative'
        };
      }
    } catch (error) {
      console.warn('Unsplash API failed:', error.message);
      throw new Error(`Failed to fetch representative image for ${country}`);
    }
  }
  
  throw new Error(`No representative image found for ${country}`);
};


/**
 * Generate image attribution text
 * @param {Object} imageData - Image data object
 * @returns {string} Attribution text
 */
const generateAttribution = (imageData) => {
  if (imageData.source === 'Unsplash' && imageData.photographer) {
    return `Photo by ${imageData.photographer.name} on Unsplash`;

  }
  return `Image source: ${imageData.source}`;
};

/**
 * Get optimized image URL for different use cases
 * @param {Object} imageData - Image data object
 * @param {string} size - Size variant (thumb, small, regular, large)
 * @returns {string} Optimized image URL
 */
const getOptimizedImageUrl = (imageData, size = 'regular') => {
  if (imageData.source === 'Unsplash') {
    const sizeMap = {
      thumb: imageData.thumbnailUrl,
      small: imageData.smallUrl || imageData.url?.replace('w=800', 'w=600'),
      regular: imageData.url,
      large: imageData.url?.replace('w=800', 'w=1200')
    };
    
    return sizeMap[size] || imageData.url;
  }
  
  return imageData.url;
};

module.exports = {
  getCountryRepresentativeImage,
  generateAttribution,
  getOptimizedImageUrl
};