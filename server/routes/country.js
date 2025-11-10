/**
 * Country Information Routes
 * Handles country data retrieval for route locations
 */

const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { getCountryInfo, searchCountries } = require('../services/countryService');

const router = express.Router();

/**
 * @route   GET /api/country/info
 * @desc    Get country information by name
 * @access  Private
 */
router.get('/info', [
  authenticateToken,
  query('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country name must be between 2-100 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name } = req.query;

    // Get country information
    const countryInfo = await getCountryInfo(name);

    if (!countryInfo) {
      return res.status(404).json({
        status: 'error',
        message: 'Country not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Country information retrieved successfully',
      data: {
        country: countryInfo,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Country info error:', error);

    if (error.message.includes('Country service unavailable')) {
      return res.status(503).json({
        status: 'error',
        message: 'Country information service is temporarily unavailable'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch country information',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   GET /api/country/search
 * @desc    Search countries by name
 * @access  Private
 */
router.get('/search', [
  authenticateToken,
  query('query')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2-100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { query: searchQuery, limit = 10 } = req.query;

    // Search countries
    const countries = await searchCountries(searchQuery, parseInt(limit));

    res.status(200).json({
      status: 'success',
      message: 'Countries search completed successfully',
      data: {
        countries,
        searchQuery,
        resultCount: countries.length,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Country search error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search countries',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   GET /api/country/list
 * @desc    Get list of all available countries
 * @access  Private
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    // Get all countries with basic info
    const countries = await searchCountries('', 250); // Get all countries

    // Sort countries alphabetically
    const sortedCountries = countries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(country => ({
        name: country.name,
        code: country.code,
        flag: country.flag
      }));

    res.status(200).json({
      status: 'success',
      message: 'Countries list retrieved successfully',
      data: {
        countries: sortedCountries,
        totalCount: sortedCountries.length,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Countries list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch countries list',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

module.exports = router;