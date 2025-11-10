import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MapIcon, ArrowPathIcon, CheckCircleIcon, BookOpenIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import MapContainer from '../../components/Map/MapContainer.js';
import WeatherWidget from '../../components/Weather/WeatherWidget.js';
import CyclingDaysComponent from '../../components/Route/CyclingDaysComponent.js';
import { useAuth } from '../../contexts/AuthContext.js';
import api from '../../services/api.js';
 
const steps = ['Configure Route', 'View Generated Route', 'Review & Save'];

const RoutePlanningPage = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '', 
    description: '', 
    routeType: 'walking',
    country: '',
    city: '',
  });
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [countryImage, setCountryImage] = useState(null);
  const [weatherInfo, setWeatherInfo] = useState(null);
  const [showCyclingErrorModal, setShowCyclingErrorModal] = useState(false);
  
  // Country suggestions states
  const [countrySuggestions, setCountrySuggestions] = useState([]);
  const [countryValidation, setCountryValidation] = useState(null);
  const [countrySearchLoading, setCountrySearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setErrors((prevErrors) => ({ ...prevErrors, [name]: '' }));

    if (name === 'country') {
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Set new timeout for delayed search
      const timeout = setTimeout(() => {
        searchCountries(value);
        // Only validate if the country name looks complete (more than 2 chars and no partial typing)
        if (value.length > 2) {
          validateCountry(value);
        } else {
          setCountryValidation(null);
        }
      }, 800); // i did this to increased delay to 800ms to reduce API calls
      
      setSearchTimeout(timeout);
    }
  };

  // Delayed country search using Groq
  const searchCountries = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setCountrySuggestions([]);
      return;
    }

    setCountrySearchLoading(true);
    try {
      const response = await api.get(`/routes/countries/search?q=${encodeURIComponent(searchTerm)}`);
      if (response.data.status === 'success') {
        // Remove duplicates and limit results
        const uniqueCountries = [...new Set((response.data.data || []).map(country => country.trim()))];
        setCountrySuggestions(uniqueCountries.slice(0, 10));
      }
    } catch (error) {
      console.error('Error searching countries:', error);
      // Fallback to static list on error
      try {
        const fallbackResponse = await api.get('/routes/countries');
        if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
          const filteredSuggestions = [...new Set(fallbackResponse.data.filter(country =>
            country.toLowerCase().includes(searchTerm.toLowerCase())
          ))];
          setCountrySuggestions(filteredSuggestions.slice(0, 10));
        }
      } catch (fallbackError) {
        console.error('Fallback country search failed:', fallbackError);
      }
    } finally {
      setCountrySearchLoading(false);
    }
  };

  // Validate country using Groq
  const validateCountry = async (countryName) => {
    try {
      const response = await api.post('/routes/countries/validate', { country: countryName });
      if (response.data.status === 'success') {
        setCountryValidation(response.data.data);
      }
    } catch (error) {
      console.error('Error validating country:', error);
      setCountryValidation({
        isValid: false,
        reason: 'Unable to validate country'
      });
    }
  };

  // Fetch country image with timeout-based debouncing
  const fetchCountryImage = useCallback(async (countryName) => {
    // Don't fetch if we already have an image for this country
    if (countryImage && countryImage.country === countryName) {
      return;
    }
    
    try {
      console.log(`🖼️ Fetching image for: ${countryName}`);
      const response = await api.get(`/routes/country-representative-image/${encodeURIComponent(countryName)}`);
      
      if (response.data.status === 'success' && response.data.data?.image?.url) {
        setCountryImage({
          ...response.data.data.image,
          country: countryName // Add country name to prevent refetching
        });
      } else {
        setCountryImage(null);
      }
    } catch (error) {
      console.warn('Failed to fetch country image:', error.message);
      setCountryImage(null);
    }
  }, [countryImage]);

  // Fetch country image only when country validation is successful and user has stopped typing
  useEffect(() => {
    if (formData.country && countryValidation?.isValid === true && formData.country.length > 2) {
      // Delay the image fetching by 2 seconds
      const imageTimeout = setTimeout(() => {
        fetchCountryImage(formData.country);
      }, 2000); // Wait 2 seconds after validation to fetch image
      
      return () => clearTimeout(imageTimeout);
    }
  }, [formData.country, countryValidation?.isValid, fetchCountryImage]);

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.routeType) newErrors.routeType = 'Route type is required.';
    if (!formData.country.trim()) newErrors.country = 'Country is required.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Route name is required.'; 
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep1()) return;
      await generateRoute();
    } else if (step === 1) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  // Helper function to safely convert to number
  const safeToNumber = (value, fallback = 0) => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return !isNaN(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  // Helper function to safely format numbers
  const safeToFixed = (value, decimals = 2, fallback = 'N/A') => {
    const num = safeToNumber(value);
    return num > 0 ? num.toFixed(decimals) : fallback;
  };

  // Validate coordinates to prevent map crashes
  const validateCoordinates = (coords) => {
    return coords && 
           typeof coords.lat === 'number' && 
           typeof coords.lng === 'number' &&
           !isNaN(coords.lat) && 
           !isNaN(coords.lng) &&
           coords.lat !== 0 && 
           coords.lng !== 0;
  };

  // Create safe markers array for map
  const createSafeMarkers = (route) => {
    if (!route) return [];
    
    const markers = [];
    
    // Add start point marker if valid
    if (validateCoordinates(route.startPoint)) {
      markers.push({
        lat: route.startPoint.lat,
        lng: route.startPoint.lng,
        type: 'start',
        popup: `<div class="p-2">
          <h3 class="font-semibold">Start Point</h3>
          <p class="text-sm">Begin your ${formData.routeType} route here</p>
          <p class="text-xs text-gray-500">${route.startPoint.lat.toFixed(4)}, ${route.startPoint.lng.toFixed(4)}</p>
        </div>`
      });
    }
    
    // Add end point marker if valid and different from start
    if (validateCoordinates(route.endPoint) && 
        (route.endPoint.lat !== route.startPoint?.lat || 
         route.endPoint.lng !== route.startPoint?.lng)) {
      markers.push({
        lat: route.endPoint.lat,
        lng: route.endPoint.lng,
        type: 'end',
        popup: `<div class="p-2">
          <h3 class="font-semibold">End Point</h3>
          <p class="text-sm">Finish your ${formData.routeType} route here</p>
          <p class="text-xs text-gray-500">${route.endPoint.lat.toFixed(4)}, ${route.endPoint.lng.toFixed(4)}</p>
        </div>`
      });
    }
    
    // Add waypoint markers if they exist and are valid
    if (route.waypoints && Array.isArray(route.waypoints)) {
      route.waypoints
        .filter(waypoint => validateCoordinates(waypoint))
        .forEach((waypoint, index) => {
          markers.push({
            lat: waypoint.lat,
            lng: waypoint.lng,
            type: 'waypoint',
            popup: `<div class="p-2">
              <h3 class="font-semibold">${waypoint.name || `Waypoint ${index + 1}`}</h3>
              <p class="text-sm">${waypoint.description || 'Route waypoint'}</p>
              <p class="text-xs text-gray-500">${waypoint.lat.toFixed(4)}, ${waypoint.lng.toFixed(4)}</p>
            </div>`
          });
        });
    }
    
    return markers;
  };

  // Create safe routes array for map
  const createSafeRoutes = (route) => {
    if (!route || !route.path || !Array.isArray(route.path) || route.path.length === 0) {
      return [];
    }
    
    // Filter out invalid coordinates
    const validPath = route.path.filter(coord => validateCoordinates(coord));
    
    if (validPath.length < 2) {
      console.warn('Route has insufficient valid coordinates');
      return [];
    }
    
    return [{
      coordinates: validPath,
      type: route.routeType || formData.routeType,
      name: route.name || 'Generated Route',
      distance: safeToNumber(route.distance, 5),
      estimatedDuration: safeToNumber(route.estimatedDuration, 60)
    }];
  };

  // Enhanced route generation with better error handling
  const generateRoute = async () => {
    if (!validateStep1()) {
      toast.error('Please complete all required fields.');
      return;
    }
    
    setLoading(true);
    try {
      // Get starting coordinates
      let startPoint = null;
      
      if (formData.city && formData.country) {
        try {
          const response = await api.get(`/routes/geocode?city=${encodeURIComponent(formData.city)}&country=${encodeURIComponent(formData.country)}`);
          if (response.data.status === 'success' && response.data.data) {
            startPoint = response.data.data;
          }
        } catch (error) {
          console.warn('Geocoding failed, using default coordinates');
        }
      }
      
      if (!startPoint) {
        // use default coordinates. central Europe
        startPoint = { lat: 50.0755, lng: 14.4378 }; 
      }

      const requestData = {
        country: formData.country,
        city: formData.city || '',
        routeType: formData.routeType
      };

      console.log('🚀 Sending route generation request:', requestData);
      const response = await api.post('/routes/generate', requestData);
      console.log('📡 Received response:', {
        status: response.status,
        dataStatus: response.data?.status,
        hasData: !!response.data?.data,
        dataSize: JSON.stringify(response.data).length
      });
      
      if (response.data.status === 'success' && response.data.data) {
        const routeData = response.data.data;
        
        // Validate route data
        console.log('🔍 ROUTE VALIDATION - Received route data:', {
          hasPath: !!routeData.path,
          pathType: typeof routeData.path,
          pathLength: routeData.path?.length,
          routeKeys: Object.keys(routeData),
          routeType: routeData.routeType,
          distance: routeData.distance
        });
        console.log('🔍 ROUTE VALIDATION - Full route data:', routeData);
        
        if (!routeData.path || !Array.isArray(routeData.path) || routeData.path.length < 2) {
          console.error('❌ ROUTE VALIDATION FAILED:', {
            hasPath: !!routeData.path,
            pathType: typeof routeData.path,
            isArray: Array.isArray(routeData.path),
            pathLength: routeData.path?.length,
            routeKeys: Object.keys(routeData)
          });
          alert(`Route validation failed: hasPath=${!!routeData.path}, pathType=${typeof routeData.path}, pathLength=${routeData.path?.length}`);
          throw new Error('Invalid route data received');
        }
        
        setGeneratedRoute(routeData);
        setStep(1);
        
        // Fetch weather data
        if (routeData.startPoint) {
          try {
            const weatherResponse = await api.get(`/weather/forecast?lat=${routeData.startPoint.lat}&lng=${routeData.startPoint.lng}`);
            if (weatherResponse.data.status === 'success') {
              setWeatherInfo(weatherResponse.data.data);
            }
          } catch (error) {
            console.warn('Weather fetch failed:', error.message);
          }
        }
        
        toast.success('Route generated successfully!');
      } else {
        throw new Error('Failed to generate route');
      }
    } catch (error) {
      console.error('Route generation failed:', error);
      
      // Check for cycling route specific failure
      if (error.response?.data?.message?.includes('CYCLING_ROUTE_FAILED')) {
        // Show specific modal for cycling route failures
        setShowCyclingErrorModal(true);
      } else if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retryAfter || 300;
        toast.error(`Too many requests. Please wait ${Math.ceil(retryAfter / 60)} minutes before creating another route.`, {
          duration: 8000
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to generate route. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };



  const saveRoute = async () => {
    if (!validateStep3() || !generatedRoute) {
      toast.error('Please complete all required fields and generate a route first.');
      return;
    }
    
    setLoading(true);
    try {
      const routeToSave = {
        name: formData.name,
        description: formData.description,
        routeType: formData.routeType,
        country: formData.country,
        city: formData.city,
        startPoint: generatedRoute.startPoint,
        endPoint: generatedRoute.endPoint,
        path: generatedRoute.path,
        distance: safeToNumber(generatedRoute.distance, 5),
        estimatedDuration: safeToNumber(generatedRoute.estimatedDuration),
        elevationGain: safeToNumber(generatedRoute.elevationGain),
        weatherInfo: weatherInfo,
        countryImage: countryImage,
        isPublic: false,
        // Cycling-specific fields
        isMultiDay: generatedRoute.isMultiDay || false,
        dayDetails: generatedRoute.dayDetails || null,
        metadata: generatedRoute.metadata || {}
      };

      const response = await api.post('/routes/save', routeToSave);
      toast.success('Route saved successfully!');
      navigate('/routes/history');

    } catch (error) {
      console.error('Route save failed:', error);
      
      let errorMessage = 'Failed to save route. Please try again.';
      
      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map(err => err.msg).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center">
          <MapIcon className="mx-auto h-16 w-16 text-green-600" />
          <h2 className="mt-6 text-4xl font-extrabold text-gray-900">
            Create Your Adventure
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            AI-powered route planning for your perfect adventure.
          </p>
        </div>

        {/* Progress Stepper */}
        <div className="flex justify-center mb-8">
          {steps.map((label, index) => (
            <div key={index} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${step >= index ? 'bg-green-600' : 'bg-gray-300'}`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= index ? 'text-green-800' : 'text-gray-500'}`}>
                {label}
              </span>
              {index < steps.length - 1 && (
                <div className={`flex-1 w-20 h-0.5 mx-4 ${step > index ? 'bg-green-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
        
        {/* Form Content */}
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-inner">
          
          {/* Step 1: Configure Route */}
          {step === 0 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">1. Route Configuration</h3>
              
              {/* Route Type */}
              <div>
                <label htmlFor="routeType" className="block text-sm font-medium text-gray-700 mb-2">
                  Route Type
                </label>
                <select
                  id="routeType"
                  name="routeType"
                  value={formData.routeType}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 border ${errors.routeType ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                >
                  <option value="walking">Walking (5-15 km)</option>
                  <option value="cycling">Cycling (up to 60 km per day, 2 days)</option>
                </select>
                {errors.routeType && <p className="mt-1 text-sm text-red-600">{errors.routeType}</p>}
              </div>



              {/* Country Input */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                  {countrySearchLoading && (
                    <ArrowPathIcon className="h-4 w-4 ml-2 inline animate-spin text-gray-400" />
                  )}
                </label>
                <div className="mt-1 relative">
                  <input
                    type="text"
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                    list="country-suggestions"
                    className={`block w-full px-3 py-2 border ${
                      errors.country 
                        ? 'border-red-300' 
                        : countryValidation?.isValid === false
                        ? 'border-red-300'
                        : countryValidation?.isValid === true
                        ? 'border-green-300'
                        : 'border-gray-300'
                    } rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                    placeholder="Type to search countries..."
                  />
                  <datalist id="country-suggestions">
                    {countrySuggestions.map((country, index) => (
                      <option key={index} value={country} />
                    ))}
                  </datalist>
                  
                  {/* Validation indicator */}
                  {countryValidation && formData.country && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {countryValidation.isValid ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <InformationCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Country validation feedback */}
                {countryValidation && formData.country && (
                  <div className={`mt-1 text-sm ${countryValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {countryValidation.isValid ? (
                      <span>✓ Valid country: {countryValidation.countryName}</span>
                    ) : (
                      <span>⚠ {countryValidation.reason}</span>
                    )}
                  </div>
                )}
                
                {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
              </div>

              {/* City Input */}
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City (Optional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g., Tel aviv, New York, Paris"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  />
                </div>
              </div>





              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Generating Route...
                    </>
                  ) : (
                    <>
                      Generate Route
                      <span className="ml-2" aria-hidden="true">&rarr;</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: View Generated Route */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">2. Generated Route</h3>
              
              {!generatedRoute ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-800">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <InformationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm">
                        No route generated yet. Please go back and try again.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">


                  {/* Route Summary */}
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Route Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p className="font-medium capitalize">{generatedRoute.routeType || formData.routeType}</p>
                      </div>
                                             <div>
                         <p className="text-gray-600">Distance</p>
                         <p className="font-medium">{safeToFixed(generatedRoute.distance, 3)} km</p>
                       </div>
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="font-medium">{Math.round(safeToNumber(generatedRoute.estimatedDuration))} minutes</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Elevation</p>
                        <p className="font-medium">{safeToFixed(generatedRoute.elevationGain, 1)} m</p>
                      </div>
                    </div>
                  </div>

                  {/* Cycling Route Day Details */}
                  {generatedRoute.routeType === 'cycling' && generatedRoute.dayDetails && generatedRoute.dayDetails.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-blue-800">🚴‍♀️ 2-Day Cycling Route</h4>
                        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                          Regular Cycling
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generatedRoute.dayDetails.map((day, index) => (
                          <div key={index} className="bg-white p-3 rounded border border-blue-300">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-semibold text-blue-900">Day {day.day}</h5>
                                                             <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                 {safeToFixed(day.distance, 3)} km
                               </span>
                            </div>
                            <div className="space-y-1 text-sm text-blue-800">
                              <div className="flex justify-between">
                                <span>Duration:</span>
                                <span>{Math.round(safeToNumber(day.duration))} min</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Start:</span>
                                <span className="text-xs">{day.startPoint?.lat?.toFixed(4)}, {day.startPoint?.lng?.toFixed(4)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>End:</span>
                                <span className="text-xs">{day.endPoint?.lat?.toFixed(4)}, {day.endPoint?.lng?.toFixed(4)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cycling Recommendations */}
                  {generatedRoute.routeType === 'cycling' && generatedRoute.metadata?.recommendations && (
                    <div className="bg-green-50 p-4 rounded-md border border-green-200 mt-4">
                      <h4 className="text-lg font-semibold text-green-800 mb-3">🚴‍♀️ Cycling Recommendations</h4>
                      <div className="space-y-2">
                        {Object.entries(generatedRoute.metadata.recommendations).map(([key, recommendation]) => (
                          <div key={key} className="flex items-start">
                            <span className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></span>
                            <span className="text-green-800 text-right-to-left">{recommendation}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Map Display */}
                  <div className="relative h-96 w-full rounded-lg overflow-hidden border border-gray-300 shadow-md">
                    
                    <MapContainer
                      center={generatedRoute.startPoint 
                        ? [generatedRoute.startPoint.lat, generatedRoute.startPoint.lng] 
                        : [50.0755, 14.4378]
                      }
                      zoom={13}
                      height={384}
                      showControls={true}
                      
                      // Routes array for the map
                      routes={generatedRoute.path && generatedRoute.path.length > 0 ? [{
                        coordinates: generatedRoute.path,
                        type: generatedRoute.routeType || formData.routeType,
                        name: generatedRoute.name || 'Generated Route',
                        distance: safeToNumber(generatedRoute.distance, 5),
                        estimatedDuration: generatedRoute.estimatedDuration || 60
                      }] : []}
                      
                      // Markers for start/end points and waypoints
                      markers={[
                        // Start point marker
                        ...(generatedRoute.startPoint && 
                            typeof generatedRoute.startPoint.lat === 'number' && 
                            typeof generatedRoute.startPoint.lng === 'number' ? [{
                          lat: generatedRoute.startPoint.lat,
                          lng: generatedRoute.startPoint.lng,
                          type: 'start',
                          popup: `<div class="p-2">
                            <h3 class="font-semibold">Start Point</h3>
                            <p class="text-sm">Begin your ${formData.routeType} route here</p>
                            <p class="text-xs text-gray-500">${generatedRoute.startPoint.lat.toFixed(4)}, ${generatedRoute.startPoint.lng.toFixed(4)}</p>
                          </div>`
                        }] : []),
                        
                        // End point marker (if different from start)
                        ...(generatedRoute.endPoint && 
                            typeof generatedRoute.endPoint.lat === 'number' && 
                            typeof generatedRoute.endPoint.lng === 'number' &&
                            (generatedRoute.endPoint.lat !== generatedRoute.startPoint?.lat || 
                            generatedRoute.endPoint.lng !== generatedRoute.startPoint?.lng) ? [{
                          lat: generatedRoute.endPoint.lat,
                          lng: generatedRoute.endPoint.lng,
                          type: 'end',
                          popup: `<div class="p-2">
                            <h3 class="font-semibold">End Point</h3>
                            <p class="text-sm">Finish your ${formData.routeType} route here</p>
                            <p class="text-xs text-gray-500">${generatedRoute.endPoint.lat.toFixed(4)}, ${generatedRoute.endPoint.lng.toFixed(4)}</p>
                          </div>`
                        }] : []),
                        
                        // Waypoint markers
                        ...(generatedRoute.waypoints ? 
                            generatedRoute.waypoints
                              .filter(waypoint => 
                                waypoint && 
                                typeof waypoint.lat === 'number' && 
                                typeof waypoint.lng === 'number'
                              )
                              .map((waypoint, index) => ({
                                lat: waypoint.lat,
                                lng: waypoint.lng,
                                type: 'waypoint',
                                popup: `<div class="p-2">
                                  <h3 class="font-semibold">${waypoint.name || `Waypoint ${index + 1}`}</h3>
                                  <p class="text-sm">${waypoint.description || 'Route waypoint'}</p>
                                  <p class="text-xs text-gray-500">${waypoint.lat.toFixed(4)}, ${waypoint.lng.toFixed(4)}</p>
                                </div>`
                              })) : [])
                      ]}
                      
                      onMapClick={null}
                      onMarkerClick={(marker) => {
                        console.log('Marker clicked:', marker);
                      }}
                    />
                  </div>



                  {/* Route Description */}
                  {generatedRoute.description && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                      <h4 className="text-lg font-semibold text-blue-800 mb-2">Route Description</h4>
                      <p className="text-blue-700">{generatedRoute.description}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {generatedRoute.recommendations && Object.keys(generatedRoute.recommendations).length > 0 && (
                    <div className="bg-green-50 p-4 rounded-md border border-green-200">
                      <h4 className="text-lg font-semibold text-green-800 mb-2">Recommendations</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {generatedRoute.recommendations.gear && (
                          <div>
                            <p className="font-medium text-green-800">Recommended Gear:</p>
                            <ul className="list-disc list-inside text-green-700">
                              {generatedRoute.recommendations.gear.map((item, index) => (
                                <li key={index}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {generatedRoute.recommendations.bestTime && (
                          <div>
                            <p className="font-medium text-green-800">Best Time:</p>
                            <p className="text-green-700">{generatedRoute.recommendations.bestTime}</p>
                          </div>
                        )}
                        {generatedRoute.recommendations.safety && (
                          <div>
                            <p className="font-medium text-green-800">Safety Tips:</p>
                            <ul className="list-disc list-inside text-green-700">
                              {generatedRoute.recommendations.safety.map((tip, index) => (
                                <li key={index}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {generatedRoute.recommendations.highlights && (
                          <div>
                            <p className="font-medium text-green-800">Highlights:</p>
                            <ul className="list-disc list-inside text-green-700">
                              {generatedRoute.recommendations.highlights.map((highlight, index) => (
                                <li key={index}>{highlight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <span className="mr-2" aria-hidden="true">&larr;</span>
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                    !generatedRoute
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
                  disabled={!generatedRoute}
                >
                  Next Step
                  <span className="ml-2" aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Save */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-6">3. Review & Save Your Route</h3>
              {!generatedRoute ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-800">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <InformationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm">
                        No route generated yet. Please go back and generate a route first.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Route Name Input */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Route Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Give your route a memorable name"
                      className={`block w-full px-3 py-2 border ${errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm`}
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  {/* Route Description Input */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows="3"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Add notes about your route, highlights, or tips..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                  </div>

                  {/* Generated Route Summary */}
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Route Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Type:</strong> {generatedRoute.routeType || formData.routeType}</p>
                        <p><strong>Country:</strong> {formData.country}</p>
                        {formData.city && <p><strong>City:</strong> {formData.city}</p>}
                      </div>
                      <div>
                                                 <p><strong>Distance:</strong> {safeToFixed(generatedRoute.distance, 3)} km</p>
                        <p><strong>Duration:</strong> {Math.round(safeToNumber(generatedRoute.estimatedDuration))} minutes</p>
                        <p><strong>Elevation:</strong> {safeToFixed(generatedRoute.elevationGain, 1)} meters</p>
                      </div>
                    </div>
                    {generatedRoute.description && (
                      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800 font-medium">AI Description:</p>
                        <p className="text-sm text-blue-700 mt-1">{generatedRoute.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Weather and Country Image Display */}
                  <div className="space-y-6">
                    {/* Weather Widget */}
                    {generatedRoute.startPoint && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Weather Forecast</h4>
                        <WeatherWidget 
                          coordinates={generatedRoute.startPoint}
                          location={`${formData.city ? formData.city + ', ' : ''}${formData.country}`}
                          days={3}
                        />
                      </div>
                    )}
                    
                    {/* Country Image */}
                    {countryImage?.url ? (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Destination</h4>
                        <img 
                          src={countryImage.url} 
                          alt={countryImage.description || `${formData.country}`} 
                          className="w-full h-48 object-cover rounded-md shadow-md"
                          onError={(e) => {
                            console.error('❌ Image failed to load:', countryImage.url);
                            e.target.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('✅ Image loaded successfully:', countryImage.url);
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">Destination</h4>
                        <div className="w-full h-48 bg-gray-200 rounded-md shadow-md flex items-center justify-center">
                          <p className="text-gray-500">Loading destination image...</p>
                        </div>
                      </div>
                    )}
                  </div>



                  {/* Cycling Days Component */}
                  {generatedRoute.routeType === 'cycling' && generatedRoute.dayDetails && (
                    <CyclingDaysComponent route={generatedRoute} />
                  )}

                  {/* Multi-day Route Information */}
                  {generatedRoute.days && generatedRoute.days.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                      <h4 className="text-lg font-semibold text-purple-800 mb-2">Multi-Day Route</h4>
                      <div className="space-y-2">
                        {generatedRoute.days.map((day, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-purple-700">Day {day.day}: {day.description || `Day ${day.day} route`}</span>
                            <span className="text-purple-600 font-medium">{safeToFixed(day.distance, 3)} km</span>
                          </div>
                        ))}
                        {generatedRoute.overnightStop && (
                          <p className="text-sm text-purple-700 mt-2">
                            <strong>Overnight:</strong> {generatedRoute.overnightStop}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <span className="mr-2" aria-hidden="true">&larr;</span>
                  Back
                </button>
                <button
                  type="button"
                  onClick={saveRoute}
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${
                    !generatedRoute || !formData.name.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  }`}
                  disabled={!generatedRoute || !formData.name.trim()}
                >
                  <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5" />
                  Save Route
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Cycling Route Error Modal */}
      {showCyclingErrorModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <span className="text-2xl">🚴‍♂️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Cycling Route Generation Failed
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  We tried to create a city cycling route <strong>15 times</strong> but weren't able to fetch proper coordinates for cycling paths.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Please try another location with better cycling infrastructure or bike-friendly streets.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => setShowCyclingErrorModal(false)}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Try Different Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanningPage;