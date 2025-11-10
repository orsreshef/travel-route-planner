/**
 * Route Details Page Component
 * Display detailed information about a specific route
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  MapIcon,
  GlobeAltIcon,
  CameraIcon,
  CalendarIcon,
  TagIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import MapContainer from '../../components/Map/MapContainer.js';
import WeatherWidget from '../../components/Weather/WeatherWidget.js';
import LoadingSpinner from '../../components/Layout/LoadingSpinner.js';
import CyclingDaysComponent from '../../components/Route/CyclingDaysComponent.js';

const RouteDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [countryInfo, setCountryInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showWeather, setShowWeather] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRouteDetails();
    }
  }, [id]);

  const fetchRouteDetails = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching route details for ID:', id);
      
      // Get authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }

      // Fetch actual route from API
      const response = await fetch(`/api/routes/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Route not found');
          navigate('/routes/history');
          return;
        } else if (response.status === 403) {
          toast.error('You do not have permission to view this route');
          navigate('/routes/history');
          return;
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('📊 Route data received:', data);

      // Extract route from response
      let routeData = null;
      if (data.status === 'success' && data.data) {
        routeData = data.data;
      } else if (data.data) {
        routeData = data.data;
      } else {
        routeData = data;
      }

      if (!routeData) {
        throw new Error('Invalid route data received from server');
      }

      // Transform the route data to match component expectations
      const transformedRoute = {
        id: routeData.id || routeData._id,
        name: routeData.name || 'Unnamed Route',
        description: routeData.description || 'No description available',
        type: routeData.routeType || routeData.type || 'walking',
        routeType: routeData.routeType || routeData.type || 'walking',
        distance: routeData.distance || 0,
        estimatedDuration: routeData.estimatedDuration || 0,
        difficulty: routeData.difficulty || 'moderate',
        country: routeData.country || '',
        city: routeData.city || '',
        elevationGain: routeData.elevationGain || 0,
        surface: routeData.surface || 'mixed',
        isCircular: routeData.isCircular || checkIfCircular(routeData.path || routeData.coordinates),
        createdAt: routeData.createdAt || new Date().toISOString(),
        lastUsed: routeData.lastUsed || routeData.updatedAt || routeData.createdAt || new Date().toISOString(),
        tags: Array.isArray(routeData.tags) ? routeData.tags : [],
        imageUrl: routeData.imageUrl || routeData.countryImage?.url || getDefaultRouteImage(),
        coordinates: transformCoordinates(routeData.path || routeData.coordinates || []),
        highlights: routeData.highlights || generateDefaultHighlights(routeData),
        recommendations: routeData.recommendations || generateDefaultRecommendations(routeData),
        isPublic: routeData.isPublic || false,
        coordinatesCount: routeData.coordinatesCount || 0,
        // Cycling-specific data
        isMultiDay: routeData.isMultiDay || false,
        dayDetails: routeData.dayDetails || null,
        metadata: routeData.metadata || {}
      };

      console.log('✅ Transformed route data:', transformedRoute);
      console.log('🔍 Cycling data check:', {
        routeType: transformedRoute.routeType,
        isMultiDay: transformedRoute.isMultiDay,
        dayDetails: transformedRoute.dayDetails,
        metadata: transformedRoute.metadata
      });
      setRoute(transformedRoute);
      
      // Fetch country info if country is available
      if (transformedRoute.country) {
        fetchCountryInfo(transformedRoute.country);
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch route details:', error);
      toast.error('Failed to load route details');
      navigate('/routes/history');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if route is circular
  const checkIfCircular = (coordinates) => {
    if (!coordinates || coordinates.length < 2) return false;
    
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    
    if (!first || !last) return false;
    
    const distance = Math.sqrt(
      Math.pow(first.lat - last.lat, 2) + Math.pow(first.lng - last.lng, 2)
    );
    
    return distance < 0.001; // Within ~100 meters
  };

  // Transform coordinates to ensure consistent format
  const transformCoordinates = (coords) => {
    if (!Array.isArray(coords)) return [];
    
    return coords.map(coord => {
      if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
        return { lat: coord.lat, lng: coord.lng };
      }
      return null;
    }).filter(Boolean);
  };

  // Generate default highlights based on route data
  const generateDefaultHighlights = (routeData) => {
    const highlights = [];
    
    if (routeData.country && routeData.city) {
      highlights.push(`Scenic route through ${routeData.city}, ${routeData.country}`);
    }
    
    if (routeData.routeType === 'walking') {
      highlights.push('Perfect for walking and nature observation');
    } else if (routeData.routeType === 'cycling') {
      highlights.push('Great cycling route with varied terrain');
    }
    
    if (routeData.distance > 10) {
      highlights.push('Challenging long-distance route');
    } else if (routeData.distance > 5) {
      highlights.push('Moderate distance perfect for half-day adventure');
    } else {
      highlights.push('Short and accessible route');
    }
    
    return highlights;
  };

  // Generate default recommendations
  const generateDefaultRecommendations = (routeData) => {
    const recommendations = {
      gear: ['Comfortable shoes', 'Water bottle', 'Snacks'],
      safety: ['Stay hydrated', 'Inform someone of your plans', 'Check weather conditions'],
      tips: ['Start early to avoid crowds', 'Bring a camera for scenic views'],
      bestTime: 'Early morning or late afternoon for best experience'
    };

    // Customize based on route type
    if (routeData.routeType === 'cycling') {
      recommendations.gear = ['Helmet', 'Bike repair kit', 'Water bottle', 'Energy bars'];
      recommendations.safety.push('Check bike condition before departure');
    } else {
      recommendations.gear.push('Hiking boots or comfortable walking shoes');
    }

    // Customize based on distance
    if (routeData.distance > 10) {
      recommendations.gear.push('First aid kit', 'Emergency whistle', 'Extra food');
      recommendations.safety.push('Carry emergency supplies');
    }

    return recommendations;
  };

  // Get default route image
  const getDefaultRouteImage = () => {
    const images = [
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=400&fit=crop'
    ];
    return images[Math.floor(Math.random() * images.length)];
  };

  const fetchCountryInfo = async (country) => {
    try {
      // Use Groq API for comprehensive country metadata
      const response = await fetch(`/api/routes/countries/metadata/${encodeURIComponent(country)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data) {
          const countryData = data.data;
          
          const transformedCountryInfo = {
            name: countryData.name || country,
            capital: countryData.capital || 'N/A',
            population: countryData.population || 'N/A',
            language: countryData.language || 'N/A',
            currency: countryData.currency || 'N/A',
            religion: countryData.religion || 'N/A',
            continent: countryData.continent || 'N/A',
            timeZone: countryData.timeZone || 'N/A',
            emergencyNumber: countryData.emergencyNumber || '112',
            drivingSide: countryData.drivingSide || 'N/A',
            internetTLD: countryData.internetTLD || 'N/A',
            callingCode: countryData.callingCode || 'N/A'
          };
          
          setCountryInfo(transformedCountryInfo);
          return;
        }
      }
      
      // No country info available
      setCountryInfo(null);
    } catch (error) {
      console.error('Error fetching country info:', error);
      // Set basic fallback data
      setCountryInfo({
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
        callingCode: 'N/A'
      });
    }
  };



  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRouteTypeIcon = (type) => {
    return type === 'cycling' ? '🚴‍♀️' : '🚶‍♀️';
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDuration = (minutes) => {
    const mins = Math.round(Number(minutes) || 0);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;
  };



  const toggleWeather = () => {
    setShowWeather(!showWeather);
    if (!showWeather) {
      setWeatherLoading(true);
      setTimeout(() => setWeatherLoading(false), 1000);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading route details..." />;
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Route Not Found</h1>
          <Link
            to="/routes/history"
            className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Routes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/routes/history')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Routes
          </button>
          

        </div>

        {/* Route Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-green-100 mb-8">
          <div className="relative h-64 md:h-80">
            <img
              src={route.imageUrl}
              alt={route.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = getDefaultRouteImage();
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-30"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-4xl bg-white bg-opacity-20 p-2 rounded-lg">
                  {getRouteTypeIcon(route.type)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(route.difficulty)} bg-white`}>
                  {route.difficulty}
                </span>
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-medium">
                  {route.isCircular ? 'Circular Route' : 'Point-to-Point'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{route.name}</h1>
              <p className="text-lg text-white text-opacity-90">
                {route.city && route.country ? `${route.city}, ${route.country}` : route.country || 'Location not specified'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Route Map */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Route Map</h2>
                <button
                  onClick={toggleWeather}
                  className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  {showWeather ? 'Hide' : 'Show'} Weather
                </button>
              </div>
              
              {/* Map Component */}
              {route.coordinates && route.coordinates.length > 0 ? (
                <MapContainer
                  center={[route.coordinates[0].lat, route.coordinates[0].lng]}
                  zoom={13}
                  height={400}
                  routes={[route]}
                  markers={[
                    { lat: route.coordinates[0].lat, lng: route.coordinates[0].lng, type: 'start', popup: 'Start Point' },
                    { lat: route.coordinates[route.coordinates.length - 1].lat, lng: route.coordinates[route.coordinates.length - 1].lng, type: 'end', popup: 'End Point' }
                  ]}
                  className="mb-4"
                />
              ) : (
                <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center text-gray-500">
                    <MapIcon className="h-12 w-12 mx-auto mb-2" />
                    <p>Map data not available for this route</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-600">{Number(route.distance).toFixed(3)} km</p>
                  <p className="text-sm text-gray-600">Distance</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-semibold text-blue-600">{formatDuration(route.estimatedDuration)}</p>
                  <p className="text-sm text-gray-600">Duration</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-lg font-semibold text-purple-600">{route.elevationGain}m</p>
                  <p className="text-sm text-gray-600">Elevation</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-lg font-semibold text-amber-600 capitalize">{route.surface}</p>
                  <p className="text-sm text-gray-600">Surface</p>
                </div>
              </div>

              {/* Cycling Days Component */}
              {route.routeType === 'cycling' && route.dayDetails && route.dayDetails.length > 0 && (
                <CyclingDaysComponent route={route} />
              )}

              {/* Cycling Recommendations */}
              {route.routeType === 'cycling' && route.metadata?.recommendations && (
                <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">🚴‍♀️ Cycling Recommendations</h3>
                  <div className="space-y-3">
                    {Object.entries(route.metadata.recommendations).map(([key, recommendation]) => (
                      <div key={key} className="flex items-start">
                        <span className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></span>
                        <span className="text-green-800 text-right-to-left">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Weather Widget */}
            {showWeather && route.coordinates && route.coordinates.length > 0 && (
              <div className="animate-fade-in">
                {weatherLoading ? (
                  <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
                    <LoadingSpinner size="medium" message="Loading weather data..." />
                  </div>
                ) : (
                  <WeatherWidget
                    coordinates={route.coordinates[0]}
                    location={`${route.city}, ${route.country}`}
                    days={3}
                  />
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Route</h2>
              <p className="text-gray-700 leading-relaxed mb-6">{route.description}</p>
              
              {route.tags && route.tags.length > 0 && (
                <div>
                  <div className="flex items-center mb-3">
                    <TagIcon className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="font-medium text-gray-900">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {route.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Highlights */}
            {route.highlights && route.highlights.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
                <div className="flex items-center mb-4">
                  <CameraIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Route Highlights</h2>
                </div>
                <ul className="space-y-3">
                  {route.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></span>
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {route.recommendations && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
                <div className="flex items-center mb-4">
                  <InformationCircleIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Recommendations</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {route.recommendations.gear && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Recommended Gear</h3>
                      <ul className="space-y-1">
                        {route.recommendations.gear.map((item, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {route.recommendations.safety && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Safety Tips</h3>
                      <ul className="space-y-1">
                        {route.recommendations.safety.map((tip, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-600">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {route.recommendations.bestTime && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-1">Best Time to Visit</h3>
                    <p className="text-blue-800 text-sm">{route.recommendations.bestTime}</p>
                  </div>
                )}
                
                {route.recommendations.tips && route.recommendations.tips.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Additional Tips</h3>
                    <ul className="space-y-1">
                      {route.recommendations.tips.map((tip, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}


          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Route Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(route.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Used:</span>
                  <span className="font-medium">{formatDate(route.lastUsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{route.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty:</span>
                  <span className={`font-medium capitalize ${
                    route.difficulty === 'easy' ? 'text-green-600' :
                    route.difficulty === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {route.difficulty}
                  </span>
                </div>

              </div>
              

            </div>

            {/* Country Information */}
            {countryInfo && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
                <div className="flex items-center mb-4">
                  <GlobeAltIcon className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Country Info</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capital:</span>
                    <span className="font-medium">{countryInfo.capital}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Population:</span>
                    <span className="font-medium">{countryInfo.population}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Language:</span>
                    <span className="font-medium">{countryInfo.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Currency:</span>
                    <span className="font-medium">{countryInfo.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Religion:</span>
                    <span className="font-medium">{countryInfo.religion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Continent:</span>
                    <span className="font-medium">{countryInfo.continent}</span>
                  </div>

                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteDetailsPage;