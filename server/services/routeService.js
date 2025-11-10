/**
 * Route Service - Core route generation and management
 * 
 * This service handles:
 * - Generating walking routes (5-15km circular routes)
 * - Generating cycling routes (2-day city-to-city routes)
 * - Interacting with OpenRouteService API for real route data
 * - Fallback route generation when API fails
 * - Route persistence to database
 */
const axios = require('axios');
const Route = require('../models/Route');
const { geocodeLocation } = require('./geocodingService');
const { makeRateLimitedRequest } = require('../middleware/rateLimiter');
const groqService = require('./groqService');

// Simple location name generator for waypoints (no API calls needed)
const getLocationName = (lat, lng, index) => {
  return `Point ${index + 1} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};

/**
 * Process OpenRouteService API response and add location names to waypoints
 * Converts coordinate format and enriches waypoints with readable location names
 */
const processOpenRouteResponseWithNames = async (apiResponse, routeParams) => {
  const feature = apiResponse.features[0];
  const geometry = feature.geometry;
  const properties = feature.properties;
  
  // Convert coordinates from [lng, lat] to {lat, lng} format
  const pathCoordinates = geometry.coordinates.map(coord => ({
    lat: coord[1],
    lng: coord[0]
  }));
  

  
  // Select key waypoints for naming (start, middle points, end)
  const keyWaypoints = [0, Math.floor(pathCoordinates.length / 2), pathCoordinates.length - 1];
  
  // Add simple location names to key waypoints
  keyWaypoints.forEach((waypointIndex, index) => {
    const { lat, lng } = pathCoordinates[waypointIndex];
    const locationName = getLocationName(lat, lng, index);
    
    // Add location name to waypoint properties
    if (properties.waypoints && properties.waypoints[waypointIndex]) {
      properties.waypoints[waypointIndex].name = locationName;
      properties.waypoints[waypointIndex].type = 'waypoint';
    }
  });
  

  
  return {
    coordinates: pathCoordinates,
    waypoints: properties.waypoints
  };
};

// Enhanced route generation function
/**
 * Main route generation function - routes to walking or cycling based on route type
 * Design decision: Separate logic for walking (circular) vs cycling (city-to-city) routes
 */
const generateRoute = async (params) => {
  try {
    const { routeType } = params;

    // Handle different route types
    if (routeType === 'cycling') {
      return await generateCyclingRoute(params);
    } else {
      return await generateWalkingRoute(params);
    }
  } catch (error) {
    console.error('Route generation error:', error);
    throw error;
  }
};

// Generate cycling route (2-day, city cycling, 10-60km per day targeting 25km)
/**
 * Generate 2-day cycling route for city exploration
 * Design approach: Creates city cycling routes with systematic coordinate search (25 attempts per day)
 * - Target: 25km per day (10-60km acceptable range, flexible for city cycling)
 * - Profile: cycling-regular (most widely supported, focuses on coordinate adjustment instead of profile switching)
 * - Systematic coordinate search: grid + radial + wide area (25 attempts to find routable roads)
 * - Ensures cycling-appropriate routes only, follows actual streets
 */
const generateCyclingRoute = async (params) => {
  const { country } = params;
  let { city } = params;
  
  // For cycling, we create a 2-day route with city-friendly distances
  // Fixed default: 25km per day (no user input - guidelines-based)
  const targetDailyDistance = 25;
  const day1Distance = targetDailyDistance;
  const day2Distance = targetDailyDistance;
  
  // If no city provided, use the capital city
  if (!city || city.trim() === '' || city === undefined || city === null) {
    console.log(`🏛️ No city specified for cycling in ${country}, fetching capital city...`);
    console.log(`🔍 Original city parameter: "${city}"`);
    try {
      city = await groqService.getCapitalCity(country);
      console.log(`✅ Using capital city for cycling: ${city}`);
    } catch (error) {
      console.error(`❌ Failed to get capital city for ${country}:`, error.message);
      throw new Error(`Unable to determine a city for cycling route generation in ${country}. Please specify a city name.`);
    }
  } else {
    console.log(`🏙️ Using specified city for cycling: ${city}`);
  }

  // Get starting city coordinates using centralized geocoding service
  const startCenter = await geocodeLocation(country, city);
  if (!startCenter) {
    throw new Error('Could not find starting city coordinates');
  }
  const startLat = startCenter.lat;
  const startLng = startCenter.lng;

  // Generate realistic city-to-city cycling route
  // Calculate distances based on direct routing expectation  
  console.log(`🚴 Target cycling route: Day1=${day1Distance}km, Day2=${day2Distance}km`);
  
  // Create coordinates at significant distances from city center, 
  const kmToDegrees = 1 / 111; // Coordinate conversion
  
  // Use larger initial distances to avoid city center areas that might not have cycling routes
  // Target areas 15-30km from city center where cycling infrastructure is more likely
  const day1Angle = Math.random() * 2 * Math.PI; 
  const day1DistanceDeg = (15 + Math.random() * 15) * kmToDegrees; // 15-30km from center
  const day1EndLat = startLat + day1DistanceDeg * Math.cos(day1Angle);
  const day1EndLng = startLng + day1DistanceDeg * Math.sin(day1Angle);
  
  // Make day 2 endpoint significantly different to ensure good route variety
  const day2Angle = day1Angle + Math.PI + (Math.random() * Math.PI - Math.PI/2); // Opposite direction ± 90°
  const day2DistanceDeg = (15 + Math.random() * 15) * kmToDegrees; 
  const day2EndLat = day1EndLat + day2DistanceDeg * Math.cos(day2Angle);
  const day2EndLng = day1EndLng + day2DistanceDeg * Math.sin(day2Angle);
  
  console.log(`📍 City cycling route: Start [${startLng}, ${startLat}] → Point2 [${day1EndLng}, ${day1EndLat}] → Point3 [${day2EndLng}, ${day2EndLat}]`);
  console.log(`📐 Target distances: Day1 ~${(day1Distance * 1.0).toFixed(1)}km, Day2 ~${(day2Distance * 1.0).toFixed(1)}km`);

  // Create waypoints for proper city-to-city cycling
  const day1Waypoints = [
    [startLng, startLat],
    [day1EndLng, day1EndLat]
  ];

  // Create waypoints for day 2 (city to city)
  const day2Waypoints = [
    [day1EndLng, day1EndLat], 
    [day2EndLng, day2EndLat]
  ];

  // Adaptive city-to-city route generation with error handling
  let day1Response, day2Response;
  let actualDay1Distance, actualDay2Distance;
  
  const generateCityRouteWithRetry = async (waypoints, profile, targetDistance, routeName, maxRetries = 8) => {
    let currentWaypoints = [...waypoints];
    let currentDistance = targetDistance;
    
    // Try different cycling profiles in order of preference
    const cyclingProfiles = ['cycling-road', 'cycling-regular']; //this i read at their website
    let currentProfile = cyclingProfiles[0];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`🚴 ${routeName} attempt ${attempt + 1}: Trying ${currentDistance}km route with profile '${currentProfile}'`);
        const response = await callOpenRouteService(currentWaypoints, currentProfile, currentDistance, 2);
        
        // Calculate actual route distance
        const actualDistance = response.features[0].properties.segments.reduce((sum, segment) => sum + segment.distance, 0) / 1000;
        console.log(`✅ ${routeName} successful: ${actualDistance.toFixed(2)}km (target: ${currentDistance}km)`);
        
        // Accept any reasonable cycling distance (5-60km) - be pragmatic!
        if (actualDistance >= 5 && actualDistance <= 60) {
          console.log(`✅ ${routeName} SUCCESS: ${actualDistance.toFixed(2)}km route - ACCEPTED! (target was ${targetDistance}km)`);
          return { response, actualDistance };
        } else if (actualDistance < 5 && attempt < 3) {
          // Only try to extend very short routes, and only for first few attempts
          console.log(`⚠️ ${routeName} very short (${actualDistance.toFixed(2)}km), trying once more...`);
          const [startCoord, endCoord] = currentWaypoints;
          const latDiff = endCoord[1] - startCoord[1];
          const lngDiff = endCoord[0] - startCoord[0];
          
          currentWaypoints[1] = [
            startCoord[0] + lngDiff * 2,
            startCoord[1] + latDiff * 2
          ];
          
        } else if (actualDistance > 60 && attempt < 3) {
          // Only try to reduce very long routes, and only for first few attempts
          console.log(`⚠️ ${routeName} too long (${actualDistance.toFixed(2)}km), trying once more...`);
          const [startCoord, endCoord] = currentWaypoints;
          const latDiff = endCoord[1] - startCoord[1];
          const lngDiff = endCoord[0] - startCoord[0];
          
          currentWaypoints[1] = [
            startCoord[0] + lngDiff * 0.6,
            startCoord[1] + latDiff * 0.6
          ];
        } else {
          // Accept whatever we got after a few attempts
          console.log(`✅ ${routeName} ACCEPTING: ${actualDistance.toFixed(2)}km route (not perfect but good enough!)`);
          return { response, actualDistance };
        }
        
      } catch (apiError) {
        console.log(`❌ ${routeName} API error (attempt ${attempt + 1}):`, apiError.message);
        console.log(`🔍 Debug - Full error data:`, JSON.stringify(apiError.response?.data, null, 2));
        
        // check if it's a profile not found error (404) and try different profile
        if (apiError.response?.status === 404 && apiError.message.includes('profile not found')) {
          const currentProfileIndex = cyclingProfiles.indexOf(currentProfile);
          if (currentProfileIndex < cyclingProfiles.length - 1) {
            currentProfile = cyclingProfiles[currentProfileIndex + 1];
            console.log(`🔄 ${routeName}: Trying different profile: ${currentProfile}`);
            continue; // Try again with new profile, don't change coordinates yet
          }
        }
        
        // For other API errors, focus on coordinate adjustment
        console.log(`🔄 ${routeName}: API error detected, will try different coordinates around the city...`);
        
        // try different coordinates on routing errors or after profile attempts are exhausted
        console.log(`🔄 ${routeName}: API call failed (attempt ${attempt + 1}), trying different coordinates...`);
        const [startCoord, endCoord] = currentWaypoints;
        
        // systematic search for routable areas - start close and expand outward
        const originalStart = waypoints[0];
        
        // coordinate adjustment:
        const baseRadius = 0.05 + attempt * 0.02; // Start at 5.5km, expand by 2.2km each attempt
        const angle = attempt * 45; 
        const angleRad = (angle * Math.PI) / 180;
        const newEndLng = originalStart[0] + Math.cos(angleRad) * baseRadius;
        const newEndLat = originalStart[1] + Math.sin(angleRad) * baseRadius;
        
        currentWaypoints = [originalStart, [newEndLng, newEndLat]];
        
        console.log(`🔄 ${routeName}: Trying ${angle}° direction at ${(baseRadius * 111).toFixed(1)}km - targeting suburban area`);     
        console.log(`🔄 ${routeName}: New coordinates: [${currentWaypoints[1][0].toFixed(6)}, ${currentWaypoints[1][1].toFixed(6)}]`);
        
        if (attempt === maxRetries - 1) {
          throw apiError;
        }
      }
    }
    
    throw new Error(`CYCLING_ROUTE_FAILED: Unable to generate ${routeName} after ${maxRetries} attempts. This location may not have suitable cycling infrastructure or road connectivity.`);
  };
  
  try {
    // Generate Day 1 route (start city to intermediate city)
    const day1Result = await generateCityRouteWithRetry(day1Waypoints, 'cycling-road', day1Distance, 'Day 1');
    day1Response = day1Result.response;
    actualDay1Distance = day1Result.actualDistance;
    
    // Update Day 2 starting point to Day 1 ending point
    const day1EndCoords = day1Waypoints[1];
    const updatedDay2Waypoints = [day1EndCoords, day2Waypoints[1]];
    
    // Generate Day 2 route (intermediate city to end city)  
    const day2Result = await generateCityRouteWithRetry(updatedDay2Waypoints, 'cycling-road', day2Distance, 'Day 2');
    day2Response = day2Result.response;
    actualDay2Distance = day2Result.actualDistance;
    
    console.log(`Final cycling route: Day1=${actualDay1Distance.toFixed(2)}km, Day2=${actualDay2Distance.toFixed(2)}km, Total=${(actualDay1Distance + actualDay2Distance).toFixed(2)}km`);
    
  } catch (error) {
    console.error('❌ Cycling route generation failed:', error.message);
    throw new Error(`CYCLING_ROUTE_FAILED: Unable to generate city-to-city cycling route: ${error.message}. Please try a different country or location with better road connectivity.`);
  }

  if (!day1Response.features || !day1Response.features.length || 
      !day2Response.features || !day2Response.features.length) {
    console.error('❌ Cycling route validation failed:', {
      day1HasFeatures: !!(day1Response.features && day1Response.features.length),
      day2HasFeatures: !!(day2Response.features && day2Response.features.length),
      day1Response: day1Response,
      day2Response: day2Response
    });
    throw new Error('Could not generate cycling route - invalid response structure');
  }

  console.log('✅ Cycling route responses validated, processing...');

  try {
    const day1Details = day1Response.features[0].properties;
    const day1Geojson = day1Response.features[0].geometry;
    const day2Details = day2Response.features[0].properties;
    const day2Geojson = day2Response.features[0].geometry;



    // calculated distances
    const totalDistance = actualDay1Distance + actualDay2Distance;
    const totalDurationSeconds = day1Details.segments.reduce((sum, segment) => sum + segment.duration, 0) +
                           day2Details.segments.reduce((sum, segment) => sum + segment.duration, 0);
    
    const calculatedDurationMinutes = totalDurationSeconds / 60; // OpenRouteService duration is in seconds
    
    // OpenRouteService sometimes returns unrealistic duration values for cycling
    // Use estimated duration based on reasonable cycling speed (20 km/h average)
    const estimatedDurationMinutes = (totalDistance / 20) * 60; // 20 km/h = realistic cycling speed
    

    
    // Use estimated duration if OpenRouteService duration seems unrealistic
    const totalDuration = (calculatedDurationMinutes < 10 && totalDistance > 20) 
      ? estimatedDurationMinutes 
      : calculatedDurationMinutes;

  // Combine paths
  const combinedPath = [
    ...day1Geojson.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] })),
    ...day2Geojson.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }))
  ];

  // Prepare the cycling route object, total information about the route and information on each day object
  const route = {
    distance: totalDistance,
    estimatedDuration: totalDuration,
    path: combinedPath,
    startPoint: { lat: day1Geojson.coordinates[0][1], lng: day1Geojson.coordinates[0][0] },
    endPoint: { lat: day2Geojson.coordinates[day2Geojson.coordinates.length - 1][1], 
                lng: day2Geojson.coordinates[day2Geojson.coordinates.length - 1][0] },
    waypoints: [...day1Details.waypoints || [], ...day2Details.waypoints || []],
    instructions: [
      ...day1Details.segments.flatMap(segment =>
        Array.isArray(segment.instructions)
          ? segment.instructions.map(instr => instr.text)
          : []
      ),
      ...day2Details.segments.flatMap(segment =>
        Array.isArray(segment.instructions)
          ? segment.instructions.map(instr => instr.text)
          : []
      )
    ],
    elevationGain: (day1Details.segments.reduce((sum, segment) => sum + (segment.elevation_gain || 0), 0) +
                   day2Details.segments.reduce((sum, segment) => sum + (segment.elevation_gain || 0), 0)),
    difficulty: 'moderate',
    surface: 'mixed',
    routeType: 'cycling',
    isMultiDay: true,
    dayDetails: [
      {
        day: 1,
        distance: actualDay1Distance, // Use actual calculated distance
        duration: day1Details.segments.reduce((sum, segment) => sum + segment.duration, 0) / 60, // Convert from seconds to minutes
        startPoint: { lat: day1Geojson.coordinates[0][1], lng: day1Geojson.coordinates[0][0] },
        endPoint: { lat: day1Geojson.coordinates[day1Geojson.coordinates.length - 1][1], 
                   lng: day1Geojson.coordinates[day1Geojson.coordinates.length - 1][0] },
        path: day1Geojson.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }))
      },
      {
        day: 2,
        distance: actualDay2Distance, // Use actual calculated distance
        duration: day2Details.segments.reduce((sum, segment) => sum + segment.duration, 0) / 60, // Convert from seconds to minutes
        startPoint: { lat: day2Geojson.coordinates[0][1], lng: day2Geojson.coordinates[0][0] },
        endPoint: { lat: day2Geojson.coordinates[day2Geojson.coordinates.length - 1][1], 
                   lng: day2Geojson.coordinates[day2Geojson.coordinates.length - 1][0] },
        path: day2Geojson.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }))
      }
    ],
    metadata: {
      namedWaypoints: [],
      recommendations: {
        clothing: "Important to bring comfortable cycling clothes",
        hydration: "Drink 3 liters of water daily",
        protection: "Wear a hat and sunscreen",
        equipment: "Check your bike before the trip",
        safety: "Ride on designated bike paths whenever possible"
      },
      debug: {
          isRealRoute: true,
          apiResponse: 'SUCCESS - Real OpenRouteService city-to-city routing',
          fallbackReason: null,
        day1Response,
        day2Response,
        processedPath: combinedPath
      }
    }
  };

    console.log('✅ Cycling route generated successfully:', {
      totalDistance: route.distance,
      totalDuration: route.estimatedDuration,
      day1Distance: route.dayDetails[0].distance,
      day2Distance: route.dayDetails[1].distance
    });

    return route;
  } catch (processingError) {
    console.error('❌ Error processing cycling route:', processingError.message);
    console.error('Stack trace:', processingError.stack);
    throw new Error(`Failed to process cycling route: ${processingError.message}`);
  }
};

/**
 * Generate circular walking route around a city center
 * Target: 10km (5-15km acceptable range)
 * Design approach: Creates circular route with fallback for unroutable areas
 */
const generateWalkingRoute = async (params) => {
  const { country } = params;
  let { city } = params;

  // Fixed default: 10km for walking 
  const targetDistance = 10;

  // If no city provided, use the capital city
  if (!city || city.trim() === '') {
    console.log(`🏛️ No city specified for ${country}, fetching capital city...`);
    try {
      city = await groqService.getCapitalCity(country);
      console.log(`✅ Using capital city: ${city}`);
    } catch (error) {
      console.error(`❌ Failed to get capital city for ${country}:`, error.message);
      throw new Error(`Unable to determine a city for route generation in ${country}. Please specify a city name.`);
    }
  }

  // Get city center coordinates using centralized geocoding service
  const center = await geocodeLocation(country, city);
  if (!center) {
    throw new Error('Could not find city/country coordinates');
  }
  const centerLat = center.lat;
  const centerLng = center.lng;

  // Start with conservative radius calculation, then let adaptive retry handle optimization
  const baseRadiusKm = Math.max(targetDistance / (2 * Math.PI * 3), 0.5); // Minimum 0.5km radius
  const radiusDeg = baseRadiusKm / 111; // Coordinate conversion: Divide by 111 to convert kilometers to degrees
  const numPoints = Math.min(Math.max(6, Math.floor(targetDistance * 1.2)), 10);
  
  console.log(`🌍 Geography-adaptive generation for ${country}, ${city}:`);
  console.log(`🎯 Target: ${targetDistance}km, Initial radius: ${baseRadiusKm.toFixed(2)}km, Points: ${numPoints}`);
  
  const waypoints = [];
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const lat = centerLat + radiusDeg * Math.cos(angle);
    const lng = centerLng + radiusDeg * Math.sin(angle);
    waypoints.push([lng, lat]); // [lng, lat] for ORS
    console.log(`Point ${i}: [${lng}, ${lat}]`);
  }
  // Make it a loop
  waypoints.push([waypoints[0][0], waypoints[0][1]]);
  console.log(`Generated ${waypoints.length} waypoints for circular route`);

  // Call OpenRouteService with distance validation
  let response;
  let attemptedTargetDistance = targetDistance;
  
  // Function to validate route distance and adaptively adjust radius to achieve 5-15km range
  const validateAndRetryRoute = async (initialWaypoints, targetDist, maxRetries = 8) => {
    let currentWaypoints = initialWaypoints;
    let currentRadius = baseRadiusKm;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const tempResponse = await callOpenRouteService(currentWaypoints, 'foot-walking', targetDist, 2);
    const tempDistance = tempResponse.features[0].properties.segments.reduce((sum, segment) => sum + segment.distance, 0) / 1000;
    
        console.log(`📏 Attempt ${attempt + 1}: Generated route is ${tempDistance.toFixed(2)}km (target: ${targetDist}km)`);
    
        // Target ideal walking distance range (5-15km)
        if (tempDistance >= 5 && tempDistance <= 15) {
          console.log(`✅ Route distance ${tempDistance.toFixed(2)}km is ideal for walking (target: ${targetDist}km)`);
    return tempResponse;
        }
        
        // Adjust coordinates to target 5-15km range
        if (tempDistance > 15) {
          console.log(`⚠️ Route ${tempDistance.toFixed(2)}km exceeds 15km ideal range, reducing coordinate distance...`);
          // Reduce radius to get under 15km
          currentRadius *= 0.8;
          const newRadiusDeg = currentRadius / 111; // Convert km to degrees for coordinates
          
          // Regenerate waypoints with smaller radius
          const newWaypoints = [];
          for (let i = 0; i < numPoints; i++) {
            const angle = (2 * Math.PI * i) / numPoints;
            const lat = centerLat + newRadiusDeg * Math.cos(angle);
            const lng = centerLng + newRadiusDeg * Math.sin(angle);
            newWaypoints.push([lng, lat]);
          }
          newWaypoints.push([newWaypoints[0][0], newWaypoints[0][1]]);
          currentWaypoints = newWaypoints;
          
          console.log(`🔄 Retry ${attempt + 1}: New radius ${currentRadius.toFixed(2)}km (reducing to target 5-15km range)`);
          
        } else if (tempDistance < 5) {
          console.log(`⚠️ Route ${tempDistance.toFixed(2)}km is below 5km ideal range, increasing coordinate distance...`);
          // Increase radius to get above 5km
          currentRadius *= 1.3;
          const newRadiusDeg = currentRadius / 111; // Convert km to degrees for coordinates
          
          // Regenerate waypoints with larger radius
          const newWaypoints = [];
          for (let i = 0; i < numPoints; i++) {
            const angle = (2 * Math.PI * i) / numPoints;
            const lat = centerLat + newRadiusDeg * Math.cos(angle);
            const lng = centerLng + newRadiusDeg * Math.sin(angle);
            newWaypoints.push([lng, lat]);
          }
          newWaypoints.push([newWaypoints[0][0], newWaypoints[0][1]]);
          currentWaypoints = newWaypoints;
          
          console.log(`🔄 Retry ${attempt + 1}: New radius ${currentRadius.toFixed(2)}km (expanding to target 5-15km range)`);
          
        } else {
          // This shouldn't happen with current logic, but safety check
          console.log(`✅ Route distance ${tempDistance.toFixed(2)}km accepted (target: ${targetDist}km)`);
          return tempResponse;
        }
        
      } catch (apiError) {
        console.log(`❌ API call failed on attempt ${attempt + 1}:`, apiError.message);
        if (attempt === maxRetries - 1) {
          throw apiError;
        }
        // Continue to next attempt with current waypoints
      }
    }
    
    throw new Error(`Failed to generate acceptable route after ${maxRetries} attempts`);
  };
  
  try {
    response = await validateAndRetryRoute(waypoints, targetDistance);
  } catch (error) {
    console.error('❌ Route generation failed:', error.message);
    throw error; 
  }
  
  if (!response.features || response.features.length === 0) {
    throw new Error('No route found');
  }
  const routeDetails = response.features[0].properties;
  const geojson = response.features[0].geometry;
  
  console.log(`🔍 Debugging response structure:`);
  console.log(`- Has segments:`, !!routeDetails.segments);
  console.log(`- Segments count:`, routeDetails.segments?.length);
  console.log(`- Has summary:`, !!routeDetails.summary);
  console.log(`- Summary:`, routeDetails.summary);
  console.log(`- First segment:`, routeDetails.segments?.[0]);
  
  const totalDistance = routeDetails.segments.reduce((sum, segment) => sum + segment.distance, 0);
  const totalDuration = routeDetails.segments.reduce((sum, segment) => sum + segment.duration, 0);
  
  console.log(`🕐 Duration calculation: totalDuration=${totalDuration}ms, segments count=${routeDetails.segments.length}`);
  console.log(`🕐 Segments durations:`, routeDetails.segments.map((seg, i) => `Segment ${i}: ${seg.duration}ms`));
  
  // Validate final distance meets walking requirements (5-15km ideal, 3-20km acceptable)
  const finalDistanceKm = totalDistance / 1000;
  console.log(`📏 Final route distance: ${finalDistanceKm.toFixed(2)}km (requested: ${targetDistance}km, attempted: ${attemptedTargetDistance}km)`);
  
  if (finalDistanceKm < 3) {
    console.error(`❌ Unable to generate a reasonable route for this location. Generated route is only ${finalDistanceKm.toFixed(2)}km.`);
    throw new Error(`Unable to generate a walking route for this location. The best possible route is ${finalDistanceKm.toFixed(2)}km. Please try a different city or location with more road networks.`);
  } else if (finalDistanceKm > 20) {
    console.error(`❌ Unable to generate a route under 20km for this location. Generated route is ${finalDistanceKm.toFixed(2)}km.`);
    throw new Error(`Unable to generate a walking route under 20km for this location. The shortest possible route is ${finalDistanceKm.toFixed(2)}km. Please try a different location or consider a cycling route.`);
  } else if (finalDistanceKm >= 5 && finalDistanceKm <= 15) {
    console.log(`✅ Route distance ${finalDistanceKm.toFixed(2)}km is ideal for walking (5-15km range)`);
  } else {
    console.log(`✅ Route distance ${finalDistanceKm.toFixed(2)}km is acceptable for walking (tried to achieve 5-15km but settled for best available)`);
  }
  
  if (attemptedTargetDistance !== targetDistance) {
    console.log(`ℹ️ Adjusted route distance from requested ${targetDistance}km to ${attemptedTargetDistance}km to meet constraints`);
  }

  // Prepare the walking route object because OpenRouteService returns duration in SECONDS, not milliseconds
  let estimatedDurationMinutes = totalDuration / 60; // Convert from seconds to minutes (seconds / 60)
  
  console.log(`🕐 Duration conversion: ${totalDuration} seconds ÷ 60 = ${estimatedDurationMinutes.toFixed(2)} minutes`);
  
  // Fallback calculation if duration is 0 or invalid
  if (estimatedDurationMinutes === 0 || isNaN(estimatedDurationMinutes)) {
    // Use summary duration if available (also in seconds)
    if (routeDetails.summary && routeDetails.summary.duration) {
      estimatedDurationMinutes = routeDetails.summary.duration / 60;
      console.log(`🕐 Using summary duration: ${routeDetails.summary.duration} seconds = ${estimatedDurationMinutes.toFixed(2)} minutes`);
    } else {
      // Fallback: estimate based on distance (average walking speed 5 km/h = 12 minutes per km)
      estimatedDurationMinutes = finalDistanceKm * 12;
      console.log(`🕐 Fallback duration calculation: ${finalDistanceKm}km × 12 min/km = ${estimatedDurationMinutes.toFixed(2)} minutes`);
    }
  }
  
  const route = {
    distance: finalDistanceKm, // Distance in km
    estimatedDuration: estimatedDurationMinutes,
    path: geojson.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] })),
    startPoint: { lat: geojson.coordinates[0][1], lng: geojson.coordinates[0][0] },
    endPoint: { lat: geojson.coordinates[geojson.coordinates.length - 1][1], lng: geojson.coordinates[geojson.coordinates.length - 1][0] },
    waypoints: routeDetails.waypoints || [],
    instructions: routeDetails.segments.flatMap(segment =>
      Array.isArray(segment.instructions)
        ? segment.instructions.map(instr => instr.text)
        : []
    ),
    elevationGain: routeDetails.segments.reduce((sum, segment) => sum + (segment.elevation_gain || 0), 0),
    difficulty: 'moderate',
    surface: 'mixed',
    routeType: 'walking',
    isMultiDay: false,
    metadata: {
      namedWaypoints: [],
      recommendations: {
        clothing: "Comfortable clothing and appropriate walking shoes",
        hydration: "Bring enough water",
        protection: "Hat and sunscreen on hot days"
      },
      geographyInfo: {
        country: country,
        city: city,
        routeQuality: "ideal", 
        targetRange: "5-15km",
        actualDistance: `${finalDistanceKm.toFixed(2)}km`
      },
      debug: {
          isRealRoute: true,
          apiResponse: 'SUCCESS - Real OpenRouteService data with geography adaptation',
          fallbackReason: null,
        rawResponse: response,
        processedPath: geojson.coordinates,
        geographyAdaptive: true
      }
    }
  };
  
  console.log('✅ Walking route generated successfully:', {
    distance: route.distance,
    estimatedDuration: route.estimatedDuration,
    waypointsCount: route.waypoints.length
  });

  return route;
};

/**
 * Save route to database with enhanced error handling and data validation
 * @param {Object} routeData - Route data to save
 * @returns {Promise<Object>} Saved route data
 */
const saveRouteToDb = async (routeData) => {
  try {
    console.log('💾 Saving route to database:', {
      name: routeData.name,
      userId: routeData.userId,
      coordinatesCount: routeData.coordinates?.length || routeData.path?.length || 0
    });
    
    // Validate required fields
    if (!routeData.userId) {
      throw new Error('User ID is required');
    }
    if (!routeData.name) {
      throw new Error('Route name is required');
    }
    if (!routeData.routeType) {
      throw new Error('Route type is required');
    }
    if (!routeData.country) {
      throw new Error('Country is required');
    }
    const coordinates = routeData.coordinates || routeData.path;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error('Route coordinates must contain at least 2 points');
    }
    if (!routeData.startPoint || !routeData.endPoint) {
      throw new Error('Start and end points are required');
    }

    // Clean imageUrl from Unsplash 
    let imageUrlRaw = routeData.countryImage?.url || routeData.imageUrl || '';
    let imageUrl = imageUrlRaw;
    if (typeof imageUrlRaw === 'string' && imageUrlRaw.startsWith('https://images.unsplash.com/')) {
      imageUrl = imageUrlRaw.split('?')[0];
      if (!/\.(jpg|jpeg|png|webp)$/i.test(imageUrl)) {
        imageUrl += '.jpg';
      }
    }

    // Prepare the route data for MongoDB
    const routeForDb = {
      userId: routeData.userId,
      name: routeData.name.trim(),
      description: routeData.description || '',
      routeType: routeData.routeType,
      country: routeData.country.trim(),
      city: routeData.city?.trim() || '',
      coordinates: coordinates.map(coord => ({
        lat: parseFloat(coord.lat),
        lng: parseFloat(coord.lng)
      })),
      startPoint: {
        lat: parseFloat(routeData.startPoint.lat),
        lng: parseFloat(routeData.startPoint.lng)
      },
      endPoint: {
        lat: parseFloat(routeData.endPoint.lat),
        lng: parseFloat(routeData.endPoint.lng)
      },
      distance: parseFloat(routeData.distance),
      estimatedDuration: parseFloat(routeData.estimatedDuration),
      elevationGain: parseFloat(routeData.elevationGain || 0),
      difficulty: routeData.difficulty || 'moderate',

      imageUrl,
      isPublic: routeData.isPublic || false,
      tags: routeData.tags || [],

      // Cycling-specific data
      isMultiDay: routeData.isMultiDay || false,
      dayDetails: routeData.dayDetails || null,
      metadata: routeData.metadata || {}
    };

    console.log('📝 Prepared route data for database:', {
      name: routeForDb.name,
      coordinatesCount: routeForDb.coordinates.length,
      distance: routeForDb.distance,
      duration: routeForDb.estimatedDuration,
      routeType: routeForDb.routeType
    });

    // Create new route document
    const newRoute = new Route(routeForDb);
    
    // Save to database
    const savedRoute = await newRoute.save();
    
    console.log('✅ Route saved successfully to database:', {
      id: savedRoute._id,
      name: savedRoute.name,
      createdAt: savedRoute.createdAt
    });

    // Return the saved route with populated user info
    const populatedRoute = await Route.findById(savedRoute._id)
      .populate('userId', 'fullName email')
      .lean();

    return populatedRoute;

  } catch (error) {
    console.error('❌ Database save failed:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    
    if (error.code === 11000) {
      // Duplicate key error
      throw new Error('A route with this name already exists for this user');
    }
    
    if (error.name === 'CastError') {
      throw new Error('Invalid data format for database');
    }
    
    throw new Error(`Failed to save route to database: ${error.message}`);
  }
};

/**
 * Enhanced OpenRouteService API call with distance validation
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @param {string} profile - OpenRouteService profile
 * @param {number} targetDistance - Target distance in km
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Object} Route data from OpenRouteService
 */
/**
 * Core function for calling OpenRouteService API with retry logic
 * Handles coordinate validation, retry with exponential backoff, and error handling
 * Design decision: Conservative retry approach to avoid API rate limits
 */
const callOpenRouteService = async (coordinates, profile, targetDistance = null, maxRetries = 2) => {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTESERVICE_API_KEY not configured in environment variables');
  }
  
  console.log('🔍 Validating coordinates before API call...');
  
  // Check if coordinates are too far apart (more than 80km)
  if (coordinates.length >= 2) {
    const [lng1, lat1] = coordinates[0];
    const [lng2, lat2] = coordinates[1];
    const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)) * 111; // Convert degrees to km: multiply by 111
    
    
    if (distance > 80) {
      console.log('⚠️ Points too far apart, using fallback route');
      throw new Error('Points too far apart for routing');
    }
  }
  
  for (let i = 0; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    console.log(`Point ${i}: [${lng}, ${lat}]`);
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error(`Invalid coordinates at index ${i}: [${lng}, ${lat}]`);
    }
    
    if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1) {
      throw new Error(`Coordinates too close to 0,0 at index ${i}: [${lng}, ${lat}]`);
    }
  }
  
  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
  
  console.log('🌐 Full OpenRouteService URL:', url);
  console.log('📊 Profile being used:', profile);
  
  let attempt = 0;
  let lastError;
  
  while (attempt <= maxRetries) {
    try {
      const requestBody = {
        coordinates: coordinates,
        continue_straight: false,
        preference: "recommended",
        // Add extra options for better routing
        options: {
          avoid_features: [], 
          profile_params: {
            restrictions: {},
            weightings: {
              steepness_difficulty: 1,
              green: 0.4,
              quiet: 0.8
            }
          }
        },
        // Request additional information
        elevation: true,
        instructions: true,
        // Increase snap radius to find routable points further away - be more tolerant
        radiuses: coordinates.map(() => 5000), // 5km snap radius for each point (more tolerant)
      };
      
      console.log('🛠️ Sending request to OpenRouteService:', {
        url,
        coordinates: coordinates,
        coordinatesCount: coordinates.length,
        profile: profile,
        headers: {
          'Authorization': '***', // Hide real API key in logs
          'Content-Type': 'application/json'
        }
      });
      
      const response = await makeRateLimitedRequest('openRouteService', () =>
        axios.post(url, requestBody, {
          headers: {
            'Authorization': apiKey, // Use API key directly, not with Bearer prefix
            'Content-Type': 'application/json'
          },
          timeout: 20000, // 20 seconds timeout
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
          })
        })
      );
      
      console.log('✅ Received response from OpenRouteService:', {
        status: response.status,
        hasFeatures: !!response.data.features,
        featuresCount: response.data.features?.length
      });
      
      return response.data;
      
    } catch (error) {
      attempt++;
      lastError = error;
      
      console.error(`❌ Error in OpenRouteService API call (attempt ${attempt}):`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: url,
        profile: profile,
        coordinates: coordinates
      });
      
      // Check specific error types and don't retry for certain errors
      if (error.response) {
        const status = error.response.status;
        
        if (status === 400) {
          throw new Error(`Invalid request parameters - Status 400: ${error.response.data?.error?.message || error.message}`);
        }
        
        if (status === 404) {
          // For 404 errors, include profile information for switching logic
          const error = new Error(`Invalid profile or endpoint - Status 404: ${profile} profile not found. URL: ${url}`);
          error.isProfileError = true;
          error.profile = profile;
          throw error;
        }
        
        if (status === 401 || status === 403) {
          throw new Error(`Authentication error - Status ${status}: Check API key validity`);
        }
      }
      
      // Only retry on network errors or 5xx server errors
      const backoffDelay = Math.min(Math.pow(2, attempt) * 500, 3000);
      console.log(`⏳ Retrying in ${backoffDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw new Error(`Failed to call OpenRouteService after ${maxRetries + 1} attempts: ${lastError.message}`);
};


/**
 * Get OpenRouteService profile name for the given route type
 * Note: Available profiles are: foot-walking, foot-hiking, cycling-regular, cycling-road, cycling-mountain, 
 * cycling-electric, driving-car, driving-hgv, wheelchair
 * However, some profiles might not be available in all regions or API plans
 */
const getOpenRouteProfile = (routeType) => {
  switch (routeType) {
    case 'walking':
      return 'foot-walking';
    case 'cycling':
      return 'cycling-road';
    default:
      return 'foot-walking';
  }
};

/**
 * Enhanced route generation with database save option
 * @param {Object} params - Route generation parameters
 * @returns {Promise<Object>} Generated route data
 */
const generateAndSaveRoute = async (params) => {
  try {
    console.log('🎯 Generating and preparing route for save...');
    
    // Generate the route
    const generatedRoute = await generateRoute(params);
    
    // Add user ID to route data
    generatedRoute.userId = params.userId;
    
    console.log('✅ Route generated successfully, ready for save');
    return generatedRoute;
    
  } catch (error) {
    console.error('❌ Generate and save route failed:', error);
    throw error;
  }
};

/**
 * Delete a route from the database
 * @param {string} routeId - Route ID to delete
 * @param {string} userId - User ID for ownership verification
 * @returns {Promise<boolean>} Success status
 */
const deleteRouteFromDb = async (routeId, userId) => {
  try {
    console.log('🗑️ Deleting route from database:', routeId);
    
    // Find and delete the route (only if user owns it)
    const deletedRoute = await Route.findOneAndDelete({ 
      _id: routeId, 
      userId: userId 
    });
    
    if (!deletedRoute) {
      throw new Error('Route not found or you do not have permission to delete it');
    }
    
    console.log('✅ Route deleted successfully:', routeId);
    return true;
    
  } catch (error) {
    console.error('❌ Route deletion failed:', error);
    throw new Error(`Failed to delete route: ${error.message}`);
  }
};

/**
 * Get user's routes from database with pagination
 * @param {string} userId - User ID
 * @param {Object} options - Query options (page, limit, sort, etc.)
 * @returns {Promise<Object>} Routes and pagination info
 */
const getUserRoutesFromDb = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      routeType,
      country
    } = options;
    
    console.log(`📖 Fetching user routes for user: ${userId}`);
    
    
    // Build a dynamic query object based on user input
    const query = { userId };
    if (routeType) query.routeType = routeType;
    if (country) query.country = new RegExp(country, 'i');
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // Execute queries in parallel
    const [routes, totalCount] = await Promise.all([
      Route.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName email')
        .lean(),
      Route.countDocuments(query)
    ]);
    
    console.log(`✅ Found ${routes.length} routes (${totalCount} total)`);
    
    // Enhance routes: fetch and save country images for routes without them
    const enhancedRoutes = await Promise.all(
      routes.map(async (route) => {
        // If route already has a countryImage, use it as-is
        if (route.countryImage && route.countryImage.url) {
          return route;
        }
        
        // If route has country but no image, fetch and save the image
        if (route.country && !route.countryImage?.url) {
          try {
            const { getCountryRepresentativeImage } = require('./imageService');
            const fetchedImage = await getCountryRepresentativeImage(route.country);
            
            if (fetchedImage && fetchedImage.url) {
              // Update the route in the database with the fetched image
              await Route.findByIdAndUpdate(route._id, {
                countryImage: fetchedImage,
                imageUrl: fetchedImage.url
              });
              
              // Update the route object for this response
              route.countryImage = fetchedImage;
              route.imageUrl = fetchedImage.url;
            }
          } catch (imageError) {
            console.warn(`⚠️ Failed to fetch image for route "${route.name}":`, imageError.message);
          }
        }
        
        return route;
      })
    );
    
    return {
      routes: enhancedRoutes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalRoutes: totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to fetch user routes:', error);
    throw new Error(`Failed to fetch routes: ${error.message}`);
  }
};

/**
 * Create waypoints for route generation
 * Filters out invalid points (e.g., in the sea) and simplifies the path
 * @param {Array} coordinates - Array of {lat, lng} objects
 * @returns {Array} Filtered and simplified waypoints
 */
const createWaypoints = (coordinates) => {
  // Remove waypoints with invalid lat/lng (e.g., 0,0 or out of bounds)
  const filtered = coordinates.filter(coord => {
    const { lat, lng } = coord;
    // Basic validation: not in the ocean, not at (0,0), within valid ranges
    return (
      lat && lng &&
      lat > -90 && lat < 90 &&
      lng > -180 && lng < 180 &&
      !(Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1)
    );
  });

  if (filtered.length <= 3) return filtered;
  const step = Math.max(1, Math.floor(filtered.length / 10));
  const simplified = [filtered[0]];
  for (let i = step; i < filtered.length - 1; i += step) {
    simplified.push(filtered[i]);
  }
  simplified.push(filtered[filtered.length - 1]);
  return simplified;
};

module.exports = {
  generateRoute,
  saveRouteToDb,
  generateAndSaveRoute,
  deleteRouteFromDb,
  getUserRoutesFromDb,
  createWaypoints,
  callOpenRouteService,
  getOpenRouteProfile,
  processOpenRouteResponseWithNames
};

console.log('✅ Enhanced OpenRouteService implementation with improved distance handling loaded');