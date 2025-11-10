/**
 * Route History Page Component
 * Display and manage user's saved routes
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ClockIcon,
  MapIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EyeIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

import { useAuth } from '../../contexts/AuthContext.js';

// Optimized RouteImage component - moved outside to prevent re-creation on renders
const RouteImage = React.memo(({ src, alt, className, fallbackImage }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [imageError, setImageError] = useState(false);

  // Update currentSrc when src prop changes, but only if it's different
  useEffect(() => {
    if (src !== currentSrc && !imageError) {
      setCurrentSrc(src);
      setImageError(false);
    }
  }, [src, currentSrc, imageError]);

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      setCurrentSrc(fallbackImage);
    } else {
      // If even the fallback fails, show a placeholder div
      setCurrentSrc(null);
    }
  };

  if (currentSrc === null) {
    // Show a gradient placeholder when all images fail
    return (
      <div className={`${className} bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center`}>
        <div className="text-center text-white">
          <MapIcon className="h-12 w-12 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-medium opacity-90">Route Image</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleImageError}
    />
  );
});

const RouteHistoryPage = () => {
  const [routes, setRoutes] = useState([]); // Initialize as empty array
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedRoutes, setSelectedRoutes] = useState([]);



  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    filterAndSortRoutes();
  }, [routes, searchTerm, filterType, sortBy]);

  const fetchRoutes = async () => {
    try {

      
      // Use fetch API directly instead of importing routeService in component
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/routes/my-routes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched routes response:', data);

      // Handle different response structures
      let routesData = [];
      if (data.status === 'success' && data.data && data.data.routes) {
        routesData = data.data.routes;
      } else if (data.routes) {
        routesData = data.routes;
      } else if (Array.isArray(data)) {
        routesData = data;
      } else {
        console.warn('Unexpected data structure:', data);
        routesData = [];
      }

      // Ensure routesData is an array
      if (!Array.isArray(routesData)) {
        console.warn('Routes data is not an array:', typeof routesData);
        routesData = [];
      }

      // Transform routes to ensure consistent structure (API fetches missing images automatically)
      const transformedRoutes = routesData.map((route) => {
        // ONLY use saved API images - NO fallbacks
        let imageUrl = route.countryImage?.url || route.imageUrl || null;
        
        return {
          id: route.id || route._id,
          name: route.name || 'Unnamed Route',
          description: route.description || '',
          routeType: route.routeType || route.type || 'walking',
          type: route.routeType || route.type || 'walking', // For backward compatibility
          country: route.country || '',
          city: route.city || '',
          distance: route.distance || 0,
          estimatedDuration: route.estimatedDuration || 0,
          difficulty: route.difficulty || 'moderate',
          isPublic: route.isPublic || false,
          createdAt: route.createdAt || new Date().toISOString(),
          updatedAt: route.updatedAt || route.createdAt || new Date().toISOString(),
          // Use the saved country image, fallback to random image only if no country image exists
          imageUrl: imageUrl,
          coordinatesCount: route.coordinatesCount || 0,
          tags: Array.isArray(route.tags) ? route.tags : [],
          hasPath: route.hasPath || route.coordinatesCount > 0,
          // Cycling-specific fields
          isMultiDay: route.isMultiDay || false,
          dayDetails: route.dayDetails || null,
          metadata: route.metadata || {}
        };
      });

      console.log('Transformed routes:', transformedRoutes);
      
      // Debug cycling routes
      const cyclingRoutes = transformedRoutes.filter(route => route.routeType === 'cycling');
      if (cyclingRoutes.length > 0) {
        console.log('🚴‍♀️ Cycling routes found:', cyclingRoutes.map(route => ({
          id: route.id,
          name: route.name,
          isMultiDay: route.isMultiDay,
          dayDetails: route.dayDetails,
          hasDayDetails: route.dayDetails && route.dayDetails.length > 0,
          distance: route.distance,
          estimatedDuration: route.estimatedDuration
        })));
        
        console.log('🔍 Raw cycling route data:', cyclingRoutes);
      }
      
      setRoutes(transformedRoutes);

    } catch (error) {
      console.error('Failed to fetch routes:', error);
      if (error.response) {
        console.error('API error response:', error.response.data);
      }
      toast.error('Failed to load routes');
      // Ensure routes is still an array on error
      setRoutes([]);
    }
  };

  const filterAndSortRoutes = () => {
    try {
      // ensure routes is always an array
      if (!Array.isArray(routes)) {
        console.warn('⚠️ Routes is not an array in filterAndSortRoutes:', typeof routes);
        setFilteredRoutes([]);
        return;
      }

      let filtered = [...routes]; 

      // Apply search filter
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(route => {
          if (!route) return false;
          
          const searchableFields = [
            route.name || '',
            route.description || '',
            route.country || '',
            route.city || '',
            ...(Array.isArray(route.tags) ? route.tags : [])
          ];
          
          return searchableFields.some(field => 
            field.toString().toLowerCase().includes(searchLower)
          );
        });
      }

      // Apply type filter
      if (filterType && filterType !== 'all') {
        filtered = filtered.filter(route => 
          route && (route.type === filterType || route.routeType === filterType)
        );
      }

      filtered.sort((a, b) => {
        if (!a || !b) return 0;

        switch (sortBy) {
          case 'newest':
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          case 'oldest':
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          case 'distance-asc':
            return (a.distance || 0) - (b.distance || 0);
          case 'distance-desc':
            return (b.distance || 0) - (a.distance || 0);
          case 'name':
            return (a.name || '').localeCompare(b.name || '');
          case 'difficulty':
            const difficultyOrder = { easy: 1, moderate: 2, hard: 3 };
            return (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2);
          default:
            return 0;
        }
      });

      console.log(`✅ Filtering complete: ${filtered.length} routes (from ${routes.length} total)`);
      setFilteredRoutes(filtered);

    } catch (error) {
      console.error('❌ Error in filterAndSortRoutes:', error);
      setFilteredRoutes([]);
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
        month: 'short',
        day: 'numeric'
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

  const handleRouteSelect = (routeId) => {
    setSelectedRoutes(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const handleDeleteRoutes = async () => {
    if (selectedRoutes.length === 0) {
      toast.error('Please select routes to delete');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedRoutes.length} route${selectedRoutes.length > 1 ? 's' : ''}?`
    );

    if (confirmDelete) {
      try {
        // API calls for deletion
        const token = localStorage.getItem('token');
        const deletePromises = selectedRoutes.map(routeId =>
          fetch(`/api/routes/${routeId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        );

        await Promise.all(deletePromises);
        
        setRoutes(prev => prev.filter(route => !selectedRoutes.includes(route.id)));
        setSelectedRoutes([]);
        toast.success(`${selectedRoutes.length} route${selectedRoutes.length > 1 ? 's' : ''} deleted successfully`);
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete routes');
      }
    }
  };

  // Calculate statistics safely
  const calculateStats = () => {
    if (!Array.isArray(routes) || routes.length === 0) {
      return {
        totalRoutes: 0,
        totalDistance: 0,
        totalTime: 0,
        walkingCount: 0,
        cyclingCount: 0
      };
    }

    return {
      totalRoutes: routes.length,
      totalDistance: routes.reduce((sum, route) => sum + (route.distance || 0), 0),
      totalTime: routes.reduce((sum, route) => sum + (route.estimatedDuration || 0), 0),
      walkingCount: routes.filter(route => (route.type || route.routeType) === 'walking').length,
      cyclingCount: routes.filter(route => (route.type || route.routeType) === 'cycling').length
    };
  };

  const stats = calculateStats();



  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Routes</h1>
            <p className="text-gray-600">
              Manage and explore your saved routes ({stats.totalRoutes} total)
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link
              to="/routes/plan"
              className="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Plan New Route
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-green-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search routes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                <option value="all">All Types</option>
                <option value="walking">Walking</option>
                <option value="cycling">Cycling</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="distance-asc">Distance (Low to High)</option>
                <option value="distance-desc">Distance (High to Low)</option>
                <option value="difficulty">Difficulty</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              {selectedRoutes.length > 0 && (
                <button
                  onClick={handleDeleteRoutes}
                  className="flex items-center bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  Delete ({selectedRoutes.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Routes Grid */}
        {Array.isArray(filteredRoutes) && filteredRoutes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map((route) => (
              <div
                key={route.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-200 overflow-hidden"
              >
                {/* Route Image - Using RouteImage component with no local references */}
                <div className="relative h-48">
                  {route.imageUrl ? (
                    <RouteImage
                      src={route.imageUrl}
                      alt={route.name}
                      className="w-full h-full object-cover"
                      fallbackImage={null}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <MapIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Loading image...</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex items-center space-x-2">
                    <span className="text-2xl bg-white bg-opacity-90 p-1 rounded">
                      {getRouteTypeIcon(route.type || route.routeType)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(route.difficulty)}`}>
                      {route.difficulty}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <input
                      type="checkbox"
                      checked={selectedRoutes.includes(route.id)}
                      onChange={() => handleRouteSelect(route.id)}
                      className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Route Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                      {route.name}
                    </h3>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {route.description}
                  </p>

                  {/* Route Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                         <div className="flex items-center text-gray-600">
                       <MapIcon className="h-4 w-4 mr-2 text-green-600" />
                       <span>{Number(route.distance).toFixed(3)} km</span>
                     </div>
                    <div className="flex items-center text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-2 text-blue-600" />
                      <span>{formatDuration(route.estimatedDuration)}</span>
                    </div>
                  </div>

                  {/* Location and Date */}
                  <div className="text-xs text-gray-500 mb-4">
                    <p className="mb-1">{route.city}{route.city && route.country && ', '}{route.country}</p>
                    <p>Created: {formatDate(route.createdAt)}</p>
                  </div>

                  {/* Tags */}
                  {Array.isArray(route.tags) && route.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {route.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {route.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{route.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      to={`/routes/${route.id}`}
                      className="w-full bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-center text-sm font-medium flex items-center justify-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-green-100 max-w-md mx-auto">
              <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || filterType !== 'all' ? 'No Routes Found' : 'No Routes Yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters to find routes.'
                  : 'Start your adventure by creating your first route!'}
              </p>
              {!searchTerm && filterType === 'all' && (
                <Link
                  to="/routes/plan"
                  className="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Plan Your First Route
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Statistics Footer */}
        {stats.totalRoutes > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-green-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.totalRoutes}</p>
                <p className="text-sm text-gray-600">Total Routes</p>
              </div>
                             <div>
                 <p className="text-2xl font-bold text-blue-600">
                   {stats.totalDistance.toFixed(3)} km
                 </p>
                 <p className="text-sm text-gray-600">Total Distance</p>
               </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.floor(stats.totalTime / 60)}h
                </p>
                <p className="text-sm text-gray-600">Total Time</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.walkingCount}/{stats.cyclingCount}
                </p>
                <p className="text-sm text-gray-600">Walk/Cycle</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteHistoryPage;