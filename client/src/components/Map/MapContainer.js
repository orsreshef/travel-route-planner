/**
 * Enhanced Map Container Component
 * Main map component using Leaflet for route visualization with improved error handling
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinIcon, AdjustmentsHorizontalIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { isMapFullyReady, safeRemoveLayer, safeSetView, safeFitBounds, validateCoordinates, validateRoute } from '../../utils/helpers.js';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapContainer = ({
  center = [50.0755, 14.4378], // Default to Central Europe
  zoom = 10,
  height = 400,
  routes = [],
  markers = [],
  onMapClick = null,
  onMarkerClick = null,
  showControls = true,
  className = ''
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayersRef = useRef([]);
  const markersLayerRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      try {
        // Validate center coordinates
        const validCenter = validateCoordinates(center) ? center : [50.0755, 14.4378];
        
        // Create map instance with safe options
        mapInstanceRef.current = L.map(mapRef.current, {
          center: validCenter,
          zoom: zoom,
          zoomControl: showControls
        });

        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(mapInstanceRef.current);

        // Add click event listener
        if (onMapClick) {
          mapInstanceRef.current.on('click', (e) => {
            onMapClick(e.latlng);
          });
        }

        setMapLoaded(true);
        setMapError(null);

      } catch (error) {
        console.error('Map initialization failed:', error);
        setMapError('Failed to initialize map');
      }
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          // Remove all layers first
          routeLayersRef.current.forEach(layer => {
            try {
              if (mapInstanceRef.current.hasLayer && mapInstanceRef.current.hasLayer(layer)) {
                mapInstanceRef.current.removeLayer(layer);
              }
            } catch (error) {
              console.warn('Error removing route layer during cleanup:', error);
            }
          });
          
          markersLayerRef.current.forEach(marker => {
            try {
              if (mapInstanceRef.current.hasLayer && mapInstanceRef.current.hasLayer(marker)) {
                mapInstanceRef.current.removeLayer(marker);
              }
            } catch (error) {
              console.warn('Error removing marker during cleanup:', error);
            }
          });

          routeLayersRef.current = [];
          markersLayerRef.current = [];
          mapInstanceRef.current.remove();
        } catch (error) {
          console.warn('Error during map cleanup:', error);
        }
        mapInstanceRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [center, zoom, showControls, onMapClick]);

  // update map center and zoom
  useEffect(() => {
    if (isMapFullyReady(mapInstanceRef.current) && mapLoaded) {
      try {
        const validCenter = validateCoordinates(center) ? center : [50.0755, 14.4378];
        safeSetView(mapInstanceRef.current, validCenter, zoom);
      } catch (error) {
        console.error('Failed to update map view:', error);
      }
    }
  }, [center, zoom, mapLoaded]);

  // Render routes
  useEffect(() => {
    if (isMapFullyReady(mapInstanceRef.current) && mapLoaded) {
      
      // clear existing route layers
      routeLayersRef.current.forEach(layer => {
        safeRemoveLayer(mapInstanceRef.current, layer);
      });
      routeLayersRef.current = [];

      // to add new routes
      routes.forEach((route, index) => {
        try {

          if (!validateRoute(route)) {
            console.warn(`Skipping invalid route ${index}:`, route);
            return;
          }

          // Convert coordinates to Leaflet format [lat, lng]
          const latLngs = route.coordinates
            .filter(coord => 
              coord && 
              typeof coord.lat === 'number' && 
              typeof coord.lng === 'number' &&
              !isNaN(coord.lat) && 
              !isNaN(coord.lng)
            )
            .map(coord => [coord.lat, coord.lng]);

          if (latLngs.length < 2) {
            console.warn(`Route ${index} has insufficient valid coordinates after filtering`);
            return;
          }
          
          // Route styling based on type
          const routeStyle = {
            color: route.type === 'cycling' ? '#3B82F6' : '#10B981',
            weight: 4,
            opacity: 0.8,
            dashArray: route.type === 'walking' ? '5, 5' : null
          };

          const polyline = L.polyline(latLngs, routeStyle).addTo(mapInstanceRef.current);
          
          // Add popup with route info
          if (route.name) {
            const popupContent = `
              <div class="p-2">
                <h3 class="font-semibold text-gray-900">${route.name}</h3>
                <p class="text-sm text-gray-600">Type: ${route.type || 'Unknown'}</p>
                <p class="text-sm text-gray-600">Distance: ${route.distance ? Number(route.distance).toFixed(3) : 'N/A'} km</p>
                <p class="text-sm text-gray-600">Duration: ${route.estimatedDuration ? Math.round(route.estimatedDuration / 60) + 'h ' + (route.estimatedDuration % 60) + 'm' : 'N/A'}</p>
                <p class="text-xs text-gray-500">Points: ${latLngs.length}</p>
              </div>
            `;
            polyline.bindPopup(popupContent);
          }

          routeLayersRef.current.push(polyline);

          // Fit map to route bounds for single route
          if (routes.length === 1) {
            try {
              const bounds = polyline.getBounds();
              safeFitBounds(mapInstanceRef.current, bounds, { padding: [20, 20] });
            } catch (error) {
              console.warn('Failed to fit bounds for route:', error);
            }
          }

        } catch (error) {
          console.error(`Failed to render route ${index}:`, error);
        }
      });

    }
  }, [routes, mapLoaded]);

  // Render markers
  useEffect(() => {
    if (isMapFullyReady(mapInstanceRef.current) && mapLoaded) {
      
      // Clear existing markers
      markersLayerRef.current.forEach(marker => {
        safeRemoveLayer(mapInstanceRef.current, marker);
      });
      markersLayerRef.current = [];

      // Add new markers
      markers.forEach((markerData, index) => {
        try {
          // Validate marker coordinates
          if (!markerData || 
              typeof markerData.lat !== 'number' || 
              typeof markerData.lng !== 'number' ||
              isNaN(markerData.lat) || 
              isNaN(markerData.lng)) {
            console.warn(`Skipping invalid marker ${index}:`, markerData);
            return;
          }

          let markerIcon;
          
          if (markerData.type === 'start') {
            markerIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white">S</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
          } else if (markerData.type === 'end') {
            markerIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white">E</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
          } else if (markerData.type === 'waypoint') {
            markerIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `<div class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">W</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
          } else {
            // Default marker
            markerIcon = L.marker([markerData.lat, markerData.lng]).getIcon();
          }

          const marker = L.marker([markerData.lat, markerData.lng], { 
            icon: markerIcon 
          }).addTo(mapInstanceRef.current);

          // add popup if content provided
          if (markerData.popup) {
            marker.bindPopup(markerData.popup);
          }

          // add click event
          if (onMarkerClick) {
            marker.on('click', () => {
              onMarkerClick(markerData);
            });
          }

          markersLayerRef.current.push(marker);

        } catch (error) {
          console.error(`Failed to render marker ${index}:`, error);
        }
      });

    }
  }, [markers, mapLoaded, onMarkerClick]);

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        style={{ height: `${height}px` }}
        className="w-full rounded-lg shadow-lg border border-green-100 z-10"
      />
      
      {/* Loading overlay */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {mapError && (
        <div className="absolute inset-0 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-red-600">{mapError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-xs text-red-600 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      )}

      {/* Map controls overlay */}
      {showControls && mapLoaded && (
        <div className="absolute top-4 right-4 z-20 space-y-2">
          <button
            onClick={() => {
              if (isMapFullyReady(mapInstanceRef.current)) {
                try {
                  const validCenter = validateCoordinates(center) ? center : [50.0755, 14.4378];
                  safeSetView(mapInstanceRef.current, validCenter, zoom);
                } catch (error) {
                  console.error('Failed to reset map view:', error);
                }
              }
            }}
            className="bg-white hover:bg-gray-50 p-2 rounded-lg shadow-lg border border-gray-200 transition-colors"
            title="Reset view"
          >
            <MapPinIcon className="h-5 w-5 text-gray-600" />
          </button>
          
          <button
            onClick={() => {
              // Toggle between satellite and default view (future enhancement)
              console.log('Toggle map layer');
            }}
            className="bg-white hover:bg-gray-50 p-2 rounded-lg shadow-lg border border-gray-200 transition-colors"
            title="Map options"
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Route info overlay */}
      {routes.length > 0 && mapLoaded && (
        <div className="absolute bottom-4 left-4 z-20 bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-xs">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Route Info</h4>
          <div className="space-y-1 text-xs">
            {routes.map((route, index) => {
              const validCoords = route.coordinates?.filter(coord => 
                coord && 
                typeof coord.lat === 'number' && 
                typeof coord.lng === 'number'
              ).length || 0;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-1 rounded-full ${route.type === 'cycling' ? 'bg-blue-600' : 'bg-green-600'}`}></div>
                    <span className="text-gray-600 capitalize">{route.type || 'Route'}</span>
                  </div>
                  <span className="text-gray-500">{validCoords} pts</span>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-1 bg-green-600 rounded-full"></div>
                <span>Walking</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-1 bg-blue-600 rounded-full"></div>
                <span>Cycling</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && mapLoaded && (
        <div className="absolute top-4 left-4 z-20 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Routes: {routes.length}</div>
          <div>Markers: {markers.length}</div>
          <div>Rendered Routes: {routeLayersRef.current.length}</div>
          <div>Rendered Markers: {markersLayerRef.current.length}</div>
        </div>
      )}
    </div>
  );
};

export default MapContainer;