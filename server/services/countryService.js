/**
 * Country Information Service
 * Handles REST Countries API integration for country data
 */

const axios = require('axios');

const REST_COUNTRIES_BASE_URL = 'https://restcountries.com/v3.1';

/**
 * Get comprehensive country information by name
 * @param {string} countryName - Country name to search for
 * @returns {Promise<Object>} Country information
 */
const getCountryInfo = async (countryName) => {
  try {
    const response = await axios.get(`${REST_COUNTRIES_BASE_URL}/name/${encodeURIComponent(countryName)}`, {
      params: {
        fullText: false,
        fields: 'name,capital,population,area,region,subregion,languages,currencies,religions,flag,flags,cca2,cca3,timezones,borders,latlng'
      },
      timeout: 10000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    const countries = response.data;
    
    if (!countries || countries.length === 0) {
      return null;
    }

    // Take the most relevant result
    const country = countries[0];

    // Process and format the data
    const countryInfo = {
      name: {
        common: country.name.common,
        official: country.name.official,
        native: country.name.nativeName ? Object.values(country.name.nativeName)[0]?.common : null
      },
      codes: {
        alpha2: country.cca2,
        alpha3: country.cca3
      },
      capital: country.capital ? country.capital[0] : null,
      region: country.region,
      subregion: country.subregion,
      population: country.population,
      area: country.area, // in square kilometers
      coordinates: country.latlng ? {
        lat: country.latlng[0],
        lng: country.latlng[1]
      } : null,
      timezones: country.timezones,
      languages: country.languages ? Object.values(country.languages) : [],
      currencies: country.currencies ? formatCurrencies(country.currencies) : [],
      religions: country.religions || [], 
      flag: {
        emoji: country.flag,
        png: country.flags?.png,
        svg: country.flags?.svg
      },
      borders: country.borders || [],
      // Additional calculated fields
      populationDensity: country.population && country.area ? 
        Math.round(country.population / country.area * 100) / 100 : null,
      isLandlocked: !country.borders || country.borders.length === 0 ? false : true
    };
    return countryInfo;

  } catch (error) {
    console.error('Country info error:', error);
    
    if (error.response) {
      const status = error.response.status;
      
      if (status === 404) {
        return null; // Country not found
      } else if (status === 429) {
        throw new Error('Country service rate limit exceeded');
      }
      
      throw new Error('Country service error');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Country service timeout');
    }
    
    throw new Error('Country service unavailable');
  }
};

/**
 * Search countries by name
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of country results
 */
const searchCountries = async (query, limit = 10) => {
  try {
    let url = `${REST_COUNTRIES_BASE_URL}/all`;
    
    if (query && query.trim()) {
      url = `${REST_COUNTRIES_BASE_URL}/name/${encodeURIComponent(query.trim())}`;
    }

    const response = await axios.get(url, {
      params: {
        fields: 'name,capital,population,region,flag,flags,cca2,cca3'
      },
      timeout: 10000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    const countries = response.data || [];

    // Filter and sort results
    let filteredCountries = countries;
    
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      filteredCountries = countries.filter(country => 
        country.name.common.toLowerCase().includes(searchTerm) ||
        country.name.official.toLowerCase().includes(searchTerm) ||
        (country.capital && country.capital[0] && country.capital[0].toLowerCase().includes(searchTerm))
      );
    }

    // Sort by relevance (exact matches first, then alphabetical)
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      filteredCountries.sort((a, b) => {
        const aExact = a.name.common.toLowerCase() === searchTerm;
        const bExact = b.name.common.toLowerCase() === searchTerm;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.name.common.localeCompare(b.name.common);
      });
    } else {
      // Sort alphabetically for full list
      filteredCountries.sort((a, b) => a.name.common.localeCompare(b.name.common));
    }

    // Limit results
    const limitedCountries = filteredCountries.slice(0, limit);

    // Format results
    return limitedCountries.map(country => ({
      name: country.name.common,
      officialName: country.name.official,
      code: country.cca2,
      alpha3: country.cca3,
      capital: country.capital ? country.capital[0] : null,
      region: country.region,
      population: country.population,
      flag: country.flag,
      flagImage: country.flags?.png
    }));

  } catch (error) {
    console.error('Country search error:', error);
    
    if (error.response?.status === 404) {
      return []; // No countries found
    }
    
    throw new Error('Country search service unavailable');
  }
};

/**
 * Format currencies from REST Countries API response
 * @param {Object} currencies - Currencies object from API
 * @returns {Array} Formatted currencies array
 */
const formatCurrencies = (currencies) => {
  return Object.keys(currencies).map(code => ({
    code,
    name: currencies[code].name,
    symbol: currencies[code].symbol
  }));
};



module.exports = {
  getCountryInfo,
  searchCountries
};