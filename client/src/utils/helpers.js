// Utility Functions for Travel Planner Application

/**
 * Enhanced map readiness check with container validation
 * @param {Object} mapInstance - The Leaflet map instance
 * @returns {boolean} - True if map is fully ready for operations
 */
export const isMapFullyReady = (mapInstance) => {
  return mapInstance && 
         typeof mapInstance === 'object' && 
         mapInstance._loaded && 
         mapInstance._mapPane && 
         mapInstance._container &&
         mapInstance._container.offsetWidth > 0 &&
         mapInstance._container.offsetHeight > 0;
};

/**
 * Safely execute a map operation with error handling
 * @param {Object} mapInstance - The Leaflet map instance
 * @param {Function} operation - The operation to execute
 * @param {*} fallback - Fallback value if operation fails
 * @returns {*} - Result of operation or fallback
 */
export const safeMapOperation = (mapInstance, operation, fallback = null) => {
  try {
    if (!isMapFullyReady(mapInstance)) {
      console.warn('Map not ready for operation');
      return fallback;
    }
    return operation(mapInstance);
  } catch (error) {
    console.warn('Map operation failed:', error);
    return fallback;
  }
};

/**
 * Safely remove a layer from the map
 * @param {Object} mapInstance - The Leaflet map instance
 * @param {Object} layer - The layer to remove
 */
export const safeRemoveLayer = (mapInstance, layer) => {
  try {
    if (isMapFullyReady(mapInstance) && layer && mapInstance.hasLayer) {
      if (mapInstance.hasLayer(layer)) {
        mapInstance.removeLayer(layer);
      }
    }
  } catch (error) {
    console.warn('Failed to remove layer:', error);
  }
};

/**
 * Safely set map view
 * @param {Object} mapInstance - The Leaflet map instance
 * @param {Array} center - Center coordinates [lat, lng]
 * @param {number} zoom - Zoom level
 */
export const safeSetView = (mapInstance, center, zoom) => {
  return safeMapOperation(
    mapInstance,
    (map) => map.setView(center, zoom, { animate: false }),
    null
  );
};

/**
 * Safely fit map bounds
 * @param {Object} mapInstance - The Leaflet map instance
 * @param {Object} bounds - The bounds to fit
 * @param {Object} options - Fit bounds options
 */
export const safeFitBounds = (mapInstance, bounds, options = {}) => {
  return safeMapOperation(
    mapInstance,
    (map) => {
      if (bounds && bounds.isValid && bounds.isValid()) {
        map.fitBounds(bounds, { ...options, animate: false });
      }
    },
    null
  );
};

/**
 * Enhanced map operation with zoom transition protection
 * @param {Object} mapInstance - The Leaflet map instance
 * @param {Function} operation - The operation to execute
 * @param {*} fallback - Fallback value if operation fails
 * @returns {*} - Result of operation or fallback
 */
export const safeMapOperationWithZoomProtection = (mapInstance, operation, fallback = null) => {
  try {
    if (!isMapFullyReady(mapInstance)) {
      console.warn('Map not ready for operation');
      return fallback;
    }

    // Check if map is currently in a zoom transition
    if (mapInstance._zoomTransitioning || mapInstance._moving) {
      console.warn('Map is currently transitioning, delaying operation');
      setTimeout(() => {
        safeMapOperationWithZoomProtection(mapInstance, operation, fallback);
      }, 100);
      return fallback;
    }

    return operation(mapInstance);
  } catch (error) {
    
    console.warn('Map operation failed:', error);
    return fallback;
  }
};



/**
 * Validate coordinates
 * @param {Array} coords - Coordinates [lat, lng]
 * @returns {boolean} - True if coordinates are valid
 */
export const validateCoordinates = (coords) => {
  if (!coords || coords.length !== 2) return false;
  const [lat, lng] = coords;
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    !isNaN(lat) && 
    !isNaN(lng) &&
    lat >= -90 && 
    lat <= 90 &&
    lng >= -180 && 
    lng <= 180
  );
};

/**
 * Validate route data
 * @param {Object} route - Route object to validate
 * @returns {boolean} - True if route is valid
 */
export const validateRoute = (route) => {
  if (!route || !route.coordinates || !Array.isArray(route.coordinates)) {
    console.warn('Route missing coordinates array:', route);
    return false;
  }

  const validCoords = route.coordinates.filter(coord => 
    coord && 
    typeof coord.lat === 'number' && 
    typeof coord.lng === 'number' &&
    !isNaN(coord.lat) && 
    !isNaN(coord.lng)
  );

  if (validCoords.length < 2) {
    console.warn('Route has insufficient valid coordinates:', route);
    return false;
  }

  return true;
};
