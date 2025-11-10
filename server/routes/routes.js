/**
 * Fixed Routes Management Routes
 * Handles route creation, saving, retrieval, and management
 */
const axios = require('axios');
const mongoose = require('mongoose');
const { geocodeLocation } = require('../services/geocodingService.js');
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Route = require('../models/Route');
const { authenticateToken } = require('../middleware/auth');
const { generateRoute, saveRouteToDb, getOpenRouteProfile, getUserRoutesFromDb } = require('../services/routeService'); 
const groqService = require('../services/groqService'); 

const { makeRateLimitedRequest, routeGenerationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Middleware to validate ObjectId
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid ${paramName} format`
      });
    }
    next();
  };
};


// GET functions for ROUTES: 
/**
 * @route   GET /api/routes/countries/search
 * @desc    Search countries using Groq AI
 * @access  Public
 */
router.get('/countries/search', async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({
        status: 'error',
        message: 'Search term is required'
      });
    }

    const groqService = require('../services/groqService');
    const countries = await groqService.searchCountries(searchTerm);
    
    res.status(200).json({
      status: 'success',
      data: countries
    });
  } catch (error) {
    console.error('Error searching countries with Groq:', error.message);
    
    // Fallback to REST Countries API if Groq fails
    try {
      console.log('🔄 Falling back to REST Countries API for search');
      const response = await axios.get('https://restcountries.com/v3.1/all?fields=name', {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });

      if (response.data) {
        const { q: searchTerm } = req.query;
        const filteredCountries = [...new Set(response.data
          .map(country => country.name.common)
          .filter(country => country.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort())]
          .slice(0, 10);
        
        return res.status(200).json({
          status: 'success',
          data: filteredCountries,
          fallback: true
        });
      }
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError.message);
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to search countries'
    });
  }
});

/**
 * @route   POST /api/routes/countries/validate
 * @desc    Validate if a country exists using Groq AI
 * @access  Public
 */
router.post('/countries/validate', async (req, res) => {
  try {
    const { country } = req.body;
    
    if (!country) {
      return res.status(400).json({
        status: 'error',
        message: 'Country name is required'
      });
    }

    const groqService = require('../services/groqService');
    const validation = await groqService.validateCountry(country);
    
    res.status(200).json({
      status: 'success',
      data: validation
    });
  } catch (error) {
    console.error('Error validating country with Groq:', error.message);
    
    // Simple fallback validation using REST Countries API
    try {
      const { country } = req.body;
      console.log('🔄 Falling back to REST Countries API for validation');
      
      const response = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=name`, {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });
      
      if (response.data && response.data.length > 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            isValid: true,
            countryName: response.data[0].name.common,
            reason: null,
            fallback: true
          }
        });
      } else {
        return res.status(200).json({
          status: 'success',
          data: {
            isValid: false,
            countryName: null,
            reason: 'Country not found in database',
            fallback: true
          }
        });
      }
    } catch (fallbackError) {
      console.error('Fallback validation also failed:', fallbackError.message);
      // Return a basic validation response
      return res.status(200).json({
        status: 'success',
        data: {
          isValid: false,
          countryName: null,
          reason: 'Unable to validate country due to service error',
          fallback: true
        }
      });
    }
  }
});

/**
 * @route   GET /api/routes/countries/metadata/:country
 * @desc    Get country metadata using Groq AI
 * @access  Public
 */
router.get('/countries/metadata/:country', async (req, res) => {
  try {
    const { country } = req.params;
    
    if (!country) {
      return res.status(400).json({
        status: 'error',
        message: 'Country name is required'
      });
    }

    const groqService = require('../services/groqService');
    const metadata = await groqService.getCountryMetadata(country);
    
    res.status(200).json({
      status: 'success',
      data: metadata
    });
  } catch (error) {
    console.error('Error fetching country metadata with Groq:', error.message);
    
    // Fallback to REST Countries API for basic metadata
    try {
      const { country } = req.params;
      console.log('🔄 Falling back to REST Countries API for metadata');
      
      const response = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=name,capital,population,languages,currencies,timezones,continents`, {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      });
      
      if (response.data && response.data.length > 0) {
        const countryData = response.data[0];
        
        const fallbackMetadata = {
          name: countryData.name.common,
          capital: countryData.capital?.[0] || 'N/A',
          population: countryData.population ? (countryData.population / 1000000).toFixed(1) + ' million' : 'N/A',
          language: countryData.languages ? Object.values(countryData.languages).join(', ') : 'N/A',
          currency: countryData.currencies ? Object.values(countryData.currencies).map(c => c.name).join(', ') : 'N/A',
          religion: 'N/A', // Not available in REST Countries
          continent: countryData.continents?.[0] || 'N/A',
          timeZone: countryData.timezones?.[0] || 'N/A',
          emergencyNumber: 'N/A',
          drivingSide: 'N/A', 
          internetTLD: 'N/A', 
          callingCode: 'N/A', 
          fallback: true
        };
        
        return res.status(200).json({
          status: 'success',
          data: fallbackMetadata
        });
      }
    } catch (fallbackError) {
      console.error('Fallback metadata fetch also failed:', fallbackError.message);
    }
    
    // Final fallback with minimal data
    const { country } = req.params;
    res.status(200).json({
      status: 'success',
      data: {
        name: country,
        capital: 'N/A',
        population: 'N/A',
        language: 'N/A',
        currency: 'N/A',
        religion: 'N/A',
        continent: 'N/A',
        timeZone: 'N/A',
        emergencyNumber: '112',
        drivingSide: 'N/A',
        internetTLD: 'N/A',
        callingCode: 'N/A',
        fallback: true
      }
    });
  }
});

/**
 * @route   GET /api/routes/countries
 * @desc    Get list of all countries (fallback to REST Countries API)
 * @access  Public
 */
router.get('/countries', async (req, res) => {
  try {
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name', {
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    if (response.data) {
      const countryNames = response.data
        .map(country => country.name.common)
        .sort();
      return res.status(200).json({ 
        status: 'success', 
        data: countryNames 
      });
    }
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch countries.' 
    });
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch countries.' 
    });
  }
});

/**
 * @route   GET /api/routes/my-routes
 * @desc    Get all routes for the authenticated user with enhanced filtering
 * @access  Private
 */
router.get('/my-routes', authenticateToken, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .toInt()
    .withMessage('Limit must be between 1 and 50'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'distance', 'name', 'estimatedDuration'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('routeType')
    .optional()
    .isIn(['walking', 'cycling'])
    .withMessage('Invalid route type'),
  query('country')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country filter must be between 1-100 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return res.status(400).json({
      status: 'error',
      message: 'Invalid query parameters',
      errors: errors.array()
    });
  }

  try {
    // Verify authentication
    if (!req.user || !req.user._id) {
      console.error('❌ User not properly authenticated');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const userId = req.user._id;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      routeType,
      country
    } = req.query;

    // Convert query parameters to proper types
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(50, parseInt(limit) || 10);

    // for call the service function with defensive error handling
    let result;
    try {
      result = await getUserRoutesFromDb(userId, {
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder,
        routeType,
        country
      });
    } catch (serviceError) {
      console.error('Service function error:', serviceError);
      // return empty result on service error
      result = {
        routes: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalRoutes: 0,
          limit: limitNum,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 0,
          endIndex: 0
        }
      };
    }

    // Validate result structure
    if (!result || typeof result !== 'object') {
      console.error('Invalid result from service function:', result);
      result = {
        routes: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalRoutes: 0,
          limit: limitNum,
          hasNextPage: false,
          hasPrevPage: false,
          startIndex: 0,
          endIndex: 0
        }
      };
    }

    // Ensure routes is always an array
    if (!Array.isArray(result.routes)) {
      console.warn('Routes is not an array, converting:', typeof result.routes);
      result.routes = [];
    }

    // Ensure pagination exists
    if (!result.pagination || typeof result.pagination !== 'object') {
      console.warn('Invalid pagination object, creating default');
      result.pagination = {
        currentPage: pageNum,
        totalPages: 0,
        totalRoutes: 0,
        limit: limitNum,
        hasNextPage: false,
        hasPrevPage: false,
        startIndex: 0,
        endIndex: 0
      };
    }

    res.status(200).json({
      status: 'success',
      message: 'User routes retrieved successfully',
      data: {
        routes: result.routes,
        pagination: result.pagination
      },
      ...(result.error && process.env.NODE_ENV === 'development' && {
        debug: {
          serviceError: result.error
        }
      })
    });

  } catch (error) {
    console.error('Error fetching user routes:', error);
    
    let statusCode = 500;
    let message = 'Failed to fetch user routes';
    
    if (error.message.includes('Invalid')) {
      statusCode = 400;
      message = error.message;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      message = error.message;
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      statusCode = 403;
      message = 'Access denied';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid user ID format';
    }
    
    res.status(statusCode).json({
      status: 'error',
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        debug: {
          originalError: error.message,
          errorType: error.constructor.name,
          stack: error.stack
        }
      })
    });
  }
});

/**
 * @route   GET /api/routes/country-representative-image/:countryName
 * @desc    Get representative/iconic image for a country
 * @access  Public
 */
router.get('/country-representative-image/:countryName', async (req, res) => {
  try {
    const { countryName } = req.params;
    console.log(`🏛️ Fetching representative image for: ${countryName}`);
    
    const { getCountryRepresentativeImage } = require('../services/imageService');
    const imageData = await getCountryRepresentativeImage(countryName);
    
    console.log(`✅ Retrieved representative image for ${countryName}:`, imageData.url);
    
    res.status(200).json({ 
      status: 'success', 
      message: `Representative image for ${countryName} retrieved successfully`,
      data: { 
        image: imageData,
        country: countryName,
        requestedAt: new Date().toISOString()
      } 
    });
  } catch (error) {
    console.error('Error fetching country representative image:', error);
    res.status(error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch country representative image'
    });
  }
});





// POST functions for ROUTES: 

/**
 * @route   POST /api/routes/generate
 * @desc    Generate a new route using AI and OpenRouteService
 * @access  Private
 */
router.post('/generate', authenticateToken, routeGenerationLimiter, async (req, res) => {
  try {
    const userId = req.user._id;
    const { country, city, routeType } = req.body;

    // Validate required fields
    if (!country || !routeType) {
      return res.status(400).json({
        status: 'error',
        message: 'Country and route type are required'
      });
    }

    // Validate route type
    if (!['walking', 'cycling'].includes(routeType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Route type must be either walking or cycling'
      });
    }

    // Geographic validation: Ensure the specified city is actually located in the specified country
    // This prevents users from creating routes with invalid geography (e.g., "Paris, Japan")
    if (city && country) {
      try {
        console.log(`🔍 Validating that "${city}" is in "${country}"...`);
        const validation = await groqService.validateCityInCountry(city, country);
        
        if (!validation.isValid) {
          return res.status(400).json({
            status: 'error',
            message: `Geographic validation failed: ${validation.reason}`,
            data: {
              city: validation.cityName,
              country: validation.countryName,
              reason: validation.reason,
              confidence: validation.confidence
            }
          });
        }
        
        console.log(`✅ Geographic validation passed: ${city} is in ${country} (confidence: ${validation.confidence}%)`);
        
      } catch (validationError) {
        console.error('Geographic validation error:', validationError.message);
        // Continue with route generation if validation service fails (avoid blocking legitimate requests)
        console.log('⚠️ Continuing with route generation despite validation service error');
      }
    }

    // Get starting coordinates
    let startPoint = null;
    if (city && country) {
      try {
        const geoResponse = await makeRateLimitedRequest('openCage', () =>
          axios.get('https://api.opencagedata.com/geocode/v1/json', {
            params: {
              q: `${city}, ${country}`,
              key: process.env.OPEN_CAGE_API_KEY,
              limit: 1,
              no_annotations: 1
            },
            timeout: 5000,
            httpsAgent: new (require('https').Agent)({
              rejectUnauthorized: false
            })
          })
        );

        if (geoResponse.data?.results?.[0]?.geometry) {
          startPoint = geoResponse.data.results[0].geometry;
        }
      } catch (error) {
        console.warn('Geocoding failed:', error.message);
      }
    }

    if (!startPoint) {
      // Use default coordinates (Central Europe - generic starting point)
      startPoint = { lat: 50.0755, lng: 14.4378 }; // Prague, Czech Republic - central location
    }

    // Generate route using the service
    console.log('🎯 Generating route with params:', { country, city, routeType });
    const routeData = await generateRoute({
      country,
      city: city || '',
      routeType,
      startPoint
    });

    if (!routeData) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate route'
      });
    }

    console.log('✅ Sending route response to client:', {
      hasRouteData: !!routeData,
      routeDataKeys: routeData ? Object.keys(routeData) : [],
      hasPath: !!routeData?.path,
      pathLength: routeData?.path?.length,
      routeType: routeData?.routeType || 'unknown'
    });

    res.status(200).json({
      status: 'success',
      message: 'Route generated successfully',
      data: routeData
    });

  } catch (error) {
    console.error('❌ Route generation error:', error.message);
    console.error('Full error stack:', error.stack);
    
    // Return more specific error message
    const errorMessage = error.message.includes('exceed') 
      ? error.message 
      : error.message.includes('Unable to generate')
      ? error.message
      : 'Failed to generate route. Please try a different location or route type.';
      
    res.status(500).json({
      status: 'error',
      message: errorMessage
    });
  }
});


/**
 * @route   POST /api/routes/save
 * @desc    Save a generated route to the database with enhanced validation
 * @access  Private
 */
router.post('/save', [
  authenticateToken,
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Route name is required and must be between 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('routeType')
    .isIn(['walking', 'cycling'])
    .withMessage('Route type must be either walking or cycling'),
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  body('path')
    .isArray({ min: 2 })
    .withMessage('Route path is required and must contain at least 2 coordinates'),
  body('path.*.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('All path coordinates must have valid latitude'),
  body('path.*.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('All path coordinates must have valid longitude'),
  body('startPoint.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Start point latitude is required and must be valid'),
  body('startPoint.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Start point longitude is required and must be valid'),
  body('endPoint.lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('End point latitude is required and must be valid'),
  body('endPoint.lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('End point longitude is required and must be valid'),
  body('distance')
    .isFloat({ min: 0.1 })
    .withMessage('Distance is required and must be a positive number'),
  body('estimatedDuration')
    .isFloat({ min: 1 })
    .withMessage('Estimated duration is required and must be at least 1 minute'),
  body('elevationGain')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Elevation gain must be a non-negative number'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  try {
    const {
      name,
      description = '',
      routeType,
      country,
      city = '',
      path,
      startPoint,
      endPoint,
      distance,
      estimatedDuration,
      elevationGain = 0,
      difficulty = 'moderate',
      namedWaypoints = [],
      recommendations = {},
      weatherInfo = null,
      countryImage = null,
      isPublic = false,
      tags = []
    } = req.body;

    const userId = req.user._id;

    // Additional business logic validation
    if (routeType === 'walking' && (distance < 5 || distance > 15)) {
      return res.status(400).json({
        status: 'error',
        message: 'Walking routes must be between 5-15 km'
      });
    }

    if (routeType === 'cycling') {
      // For cycling routes each day should be max 60km, but total can be higher
      const dayDetails = req.body.dayDetails;
      if (dayDetails && Array.isArray(dayDetails)) {
        for (const day of dayDetails) {
          if (day.distance > 60) {
            return res.status(400).json({
              status: 'error',
              message: `Cycling routes cannot exceed 60 km per day. Day ${day.day} is ${day.distance.toFixed(1)} km`
            });
          }
        }
      } else if (distance > 60) {
        // Fallback to total distance check if dayDetails not available
        return res.status(400).json({
          status: 'error',
          message: 'Cycling routes cannot exceed 60 km per day'
        });
      }
    }

    // Check for circular route requirement for walking
    if (routeType === 'walking') {
      const startLat = parseFloat(startPoint.lat);
      const startLng = parseFloat(startPoint.lng);
      const endLat = parseFloat(endPoint.lat);
      const endLng = parseFloat(endPoint.lng);
      
      const threshold = 0.001; // ~100 meters tolerance
      const isCircular = Math.abs(startLat - endLat) < threshold && 
                        Math.abs(startLng - endLng) < threshold;
      
      if (!isCircular) {
        return res.status(400).json({
          status: 'error',
          message: 'Walking routes must be circular (start and end at the same point)'
        });
      }
    }

    // Validate path coordinates
    const validPath = path.filter(coord => 
      coord && 
      typeof coord.lat === 'number' && 
      typeof coord.lng === 'number' &&
      !isNaN(coord.lat) && 
      !isNaN(coord.lng)
    );

    if (validPath.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Route must have at least 2 valid coordinates'
      });
    }

    // Check if user already has a route with this name
    const existingRoute = await Route.findOne({ 
      userId: userId, 
      name: name.trim() 
    });

    if (existingRoute) {
      return res.status(409).json({
        status: 'error',
        message: 'You already have a route with this name. Please choose a different name.'
      });
    }

    // Use provided countryImage or fetch a new one
    let countryImageUrl = '';
    let countryImageData = null;
    
    if (countryImage && countryImage.url) {
      // Use the countryImage provided from the frontend (preserves the image from route creation)
      countryImageUrl = countryImage.url;
      countryImageData = countryImage;
    } else if (countryImage && typeof countryImage === 'string') {
      // Handle case where countryImage is just a URL string
      countryImageUrl = countryImage;
      countryImageData = { url: countryImage };
    } else {
      // Fetch a new country image if none provided
      try {
        const { getCountryRepresentativeImage } = require('../services/imageService');
        const fetchedImage = await getCountryRepresentativeImage(country);
        countryImageUrl = fetchedImage?.url;
        countryImageData = fetchedImage;
      } catch (imageError) {
        console.warn('Failed to get country image:', imageError.message);
        countryImageUrl = null;
        countryImageData = null;
      }
    }

    // Prepare route data for saving
    const routeDataForSave = {
      userId,
      name: name.trim(),
      description: description.trim(),
      routeType,
      country: country.trim(),
      city: city.trim(),
      coordinates: validPath,
      startPoint,
      endPoint,
      distance: parseFloat(distance),
      estimatedDuration: parseFloat(estimatedDuration),
      elevationGain: parseFloat(elevationGain),
      difficulty,
      namedWaypoints,
      recommendations,
      weatherInfo,
      countryImage: countryImageData,
      imageUrl: countryImageUrl,
      isPublic,
      tags: tags.filter(tag => tag && tag.trim().length > 0),
      // Cycling-specific fields
      isMultiDay: routeType === 'cycling' ? true : false,
      dayDetails: req.body.dayDetails || null,
      metadata: req.body.metadata || {}
    };

    // Use the enhanced save function
    const savedRoute = await saveRouteToDb(routeDataForSave);

    // Return success response with saved route data
    res.status(201).json({
      status: 'success',
      message: 'Route saved successfully',
      data: {
        route: {
          id: savedRoute._id,
          name: savedRoute.name,
          description: savedRoute.description,
          routeType: savedRoute.routeType,
          country: savedRoute.country,
          city: savedRoute.city,
          distance: savedRoute.distance,
          estimatedDuration: savedRoute.estimatedDuration,
          difficulty: savedRoute.difficulty,
          isPublic: savedRoute.isPublic,
          createdAt: savedRoute.createdAt,
          imageUrl: savedRoute.imageUrl,
          coordinatesCount: savedRoute.coordinates?.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Route save error:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to save route. Please try again.';

    // Handle specific error types
    if (error.message.includes('Validation failed')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('already exists')) {
      statusCode = 409;
      errorMessage = error.message;
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      statusCode = 403;
      errorMessage = 'You do not have permission to perform this action';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      errorMessage = 'Invalid data format provided';
    }

    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          originalError: error.message,
          errorType: error.constructor.name
        }
      })
    });
  }
});

// PARAMETERIZED ROUTES:
/**
 * @route   GET /api/routes/:id
 * @desc    Get a specific route by ID
 * @access  Private (owner) or Public (if route is public)
 */
router.get('/:id', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;
    const route = await Route.findById(id).populate('userId', 'fullName email');

    if (!route) {
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }

    if (!route.isPublic && (route.userId._id || route.userId).toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You do not have permission to view this route'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Route fetched successfully',
      data: route
    });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch route'
    });
  }
});

/**
 * @route   PUT /api/routes/:id
 * @desc    Update a route
 * @access  Private (owner only)
 */
router.put('/:id', authenticateToken, validateObjectId(), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Route name must be between 2-100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const updates = req.body;

    const route = await Route.findById(id);

    if (!route) {
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }

    if (route.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only update your own routes'
      });
    }

    Object.keys(updates).forEach(key => {
      route[key] = updates[key];
    });

    await route.save();

    res.status(200).json({
      status: 'success',
      message: 'Route updated successfully',
      data: route
    });

  } catch (error) {
    console.error('Route update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update route'
    });
  }
});

/**
 * @route   DELETE /api/routes/:id
 * @desc    Delete a route
 * @access  Private (owner only)
 */
router.delete('/:id', authenticateToken, validateObjectId(), async (req, res) => {
  try {
    const { id } = req.params;

    const route = await Route.findById(id);

    if (!route) {
      return res.status(404).json({
        status: 'error',
        message: 'Route not found'
      });
    }

    if (route.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only delete your own routes'
      });
    }

    await Route.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Route deleted successfully'
    });

  } catch (error) {
    console.error('Route deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete route'
    });
  }
});

module.exports = router;