const axios = require('axios');
const OPEN_CAGE_API_KEY = process.env.OPEN_CAGE_API_KEY;
const OPEN_CAGE_BASE_URL = 'https://api.opencagedata.com/geocode/v1/json';

/**
 * Geocode a location (country/city) to get its coordinates.
 * @param {string} country
 * @param {string} city (optional)
 * @returns {Promise<{lat: number, lng: number}|null>} Coordinates or null if not found
 */
const geocodeLocation = async (country, city = '') => {
  if (!OPEN_CAGE_API_KEY) {
    console.error('OPEN_CAGE_API_KEY is not defined in environment variables.');
    return null;
  }

  let query = country;
  if (city) {
    query = `${city}, ${country}`;
  }

  try {
    const response = await axios.get(OPEN_CAGE_BASE_URL, {
      params: {
        q: query,
        key: OPEN_CAGE_API_KEY,
        limit: 1, // Get only the first result
        pretty: 1, // this is for Human readable output
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      const { lat, lng } = response.data.results[0].geometry;
      return { lat, lng };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error geocoding location:', error.message);
    if (error.response) {
      console.error('OpenCage API Error Response:', error.response.data);
    }
    throw new Error('Failed to geocode location. Please check country/city name.');
  }
};

module.exports = {
  geocodeLocation,
};