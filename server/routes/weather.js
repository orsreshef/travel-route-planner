/**
 * Weather API Routes
 * Handles weather data retrieval for route locations
 */

const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { getWeatherForecast, getCurrentWeather } = require('../services/weatherService');

const router = express.Router();

/**
 * @route   GET /api/weather/forecast
 * @desc    Get 3-day weather forecast for a location
 * @access  Private
 */
router.get('/forecast', [
  authenticateToken,
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City name must be between 1-100 characters'),
  query('country')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Country name must be between 1-100 characters')
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

    const { lat, lng, city, country } = req.query;

    // Get 3-day weather forecast
    const forecast = await getWeatherForecast({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      city,
      country
    });

    res.status(200).json({
      status: 'success',
      message: 'Weather forecast retrieved successfully',
      data: {
        forecast,
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          city,
          country
        },
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Weather forecast error:', error);

    if (error.message.includes('Weather service unavailable')) {
      return res.status(503).json({
        status: 'error',
        message: 'Weather service is temporarily unavailable'
      });
    }

    if (error.message.includes('Location not found')) {
      return res.status(404).json({
        status: 'error',
        message: 'Weather data not available for this location'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch weather forecast',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   GET /api/weather/current
 * @desc    Get current weather for a location
 * @access  Private
 */
router.get('/current', [
  authenticateToken,
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  query('city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City name must be between 1-100 characters')
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

    const { lat, lng, city } = req.query;

    // Get current weather
    const weather = await getCurrentWeather({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      city
    });

    res.status(200).json({
      status: 'success',
      message: 'Current weather retrieved successfully',
      data: {
        weather,
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          city
        },
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Current weather error:', error);

    if (error.message.includes('Weather service unavailable')) {
      return res.status(503).json({
        status: 'error',
        message: 'Weather service is temporarily unavailable'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch current weather',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   POST /api/weather/route-forecast
 * @desc    Get weather forecast for multiple points along a route
 * @access  Private
 */
router.post('/route-forecast', [
  authenticateToken,
  query('routeId')
    .optional()
    .isMongoId()
    .withMessage('Route ID must be a valid MongoDB ObjectId')
], async (req, res) => {
  try {
    const { coordinates, country } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Route coordinates are required'
      });
    }

    // Validate coordinates format
    for (let i = 0; i < coordinates.length; i++) {
      const coord = coordinates[i];
      if (!coord.lat || !coord.lng || 
          coord.lat < -90 || coord.lat > 90 ||
          coord.lng < -180 || coord.lng > 180) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid coordinate at index ${i}`
        });
      }
    }

    // Get weather for start point, middle point (if available), and end point
    const weatherPoints = [];
    
    // Start point
    weatherPoints.push(coordinates[0]);
    
    // Middle point (if route has more than 2 points)
    if (coordinates.length > 2) {
      const middleIndex = Math.floor(coordinates.length / 2);
      weatherPoints.push(coordinates[middleIndex]);
    }
    
    // End point 
    const lastPoint = coordinates[coordinates.length - 1];
    const firstPoint = coordinates[0];
    const isCircular = Math.abs(firstPoint.lat - lastPoint.lat) < 0.001 && 
                      Math.abs(firstPoint.lng - lastPoint.lng) < 0.001;
    
    if (!isCircular) {
      weatherPoints.push(lastPoint);
    }

    // Get weather forecasts for all points
    const forecasts = await Promise.all(
      weatherPoints.map(async (point, index) => {
        try {
          const forecast = await getWeatherForecast({
            lat: point.lat,
            lng: point.lng,
            country
          });
          
          return {
            pointIndex: index,
            coordinates: point,
            forecast,
            pointType: index === 0 ? 'start' : 
                      index === weatherPoints.length - 1 ? 'end' : 'middle'
          };
        } catch (error) {
          console.error(`Weather fetch failed for point ${index}:`, error);
          return {
            pointIndex: index,
            coordinates: point,
            forecast: null,
            error: 'Weather data unavailable for this location',
            pointType: index === 0 ? 'start' : 
                      index === weatherPoints.length - 1 ? 'end' : 'middle'
          };
        }
      })
    );

    res.status(200).json({
      status: 'success',
      message: 'Route weather forecast retrieved successfully',
      data: {
        forecasts,
        routeInfo: {
          totalPoints: coordinates.length,
          weatherPoints: weatherPoints.length,
          isCircular,
          country
        },
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Route weather forecast error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch route weather forecast',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

module.exports = router;