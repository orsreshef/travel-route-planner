/**
 * Home Page Component
 * Dashboard for authenticated users
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircleIcon, 
  ClockIcon, 
  MapIcon, 
  CloudIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext.js';


const HomePage = () => {
  const { user } = useAuth();
  const stats = {
    totalRoutes: 0,
    totalDistance: 0,
    totalTime: 0, // minutes
    favoriteType: 'walking'
  };
  const recentRoutes = [];


  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRouteTypeIcon = (type) => {
    return type === 'cycling' ? '🚴‍♀️' : '🚶‍♀️';
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.fullName?.split(' ')[0] || 'Explorer'}! 👋
                </h1>
                <p className="text-gray-600 text-lg">
                  Ready to plan your next adventure? Let's explore the world together.
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-full">
                  <MapIcon className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Plan New Route */}
            <Link
              to="/routes/plan"
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-green-100 hover:border-green-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-lg">
                    <PlusCircleIcon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan New Route</h3>
                <p className="text-gray-600">Create walking or cycling routes with real-time weather data</p>
              </div>
            </Link>

            {/* View Route History */}
            <Link
              to="/routes/history"
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-green-100 hover:border-green-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-3 rounded-lg">
                    <ClockIcon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Routes</h3>
                <p className="text-gray-600">View and manage your saved routes and adventures</p>
              </div>
            </Link>

            {/* Profile Settings */}
            <Link
              to="/profile"
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-green-100 hover:border-green-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Settings</h3>
                <p className="text-gray-600">Update your preferences and account information</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Adventure Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Routes */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Routes</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalRoutes}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <MapIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Total Distance */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Distance</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalDistance} km</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Time */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Time</p>
                  <p className="text-3xl font-bold text-purple-600">{formatDuration(stats.totalTime)}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Favorite Type */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Favorite Activity</p>
                  <p className="text-3xl font-bold text-amber-600 capitalize">{stats.favoriteType}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-lg">
                  <PlayIcon className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Routes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Routes</h2>
            <Link
              to="/routes/history"
              className="text-green-600 hover:text-green-700 font-medium flex items-center transition-colors"
            >
              View All
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>

          {recentRoutes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentRoutes.map((route) => (
                <div key={route.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getRouteTypeIcon(route.type)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(route.difficulty)}`}>
                          {route.difficulty}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(route.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{route.name}</h3>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="flex items-center">
                        <MapIcon className="h-4 w-4 mr-1" />
                        {Number(route.distance).toFixed(3)} km
                      </span>
                      <span className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDuration(route.duration)}
                      </span>
                    </div>
                    
                    <div className="mt-4">
                      <Link
                        to={`/routes/${route.id}`}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium text-center block"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-green-100">
              <MapIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Routes Yet</h3>
              <p className="text-gray-600 mb-4">Start your adventure by creating your first route!</p>
              <Link
                to="/routes/plan"
                className="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Plan Your First Route
              </Link>
            </div>
          )}
        </div>

        {/* Weather Widget */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Weather Update</h2>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CloudIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">Perfect Weather for Adventure!</p>
                  <p className="text-gray-600">Check weather conditions when planning your routes</p>
                </div>
              </div>
              <Link
                to="/routes/plan"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Plan Route
              </Link>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Adventure Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg flex-shrink-0">
                <MapIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Plan Ahead</h3>
                <p className="text-green-100 text-sm">Always check weather conditions and route difficulty before starting your adventure.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start Early</h3>
                <p className="text-green-100 text-sm">Begin your routes early in the day to avoid crowds and enjoy cooler temperatures.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg flex-shrink-0">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Stay Safe</h3>
                <p className="text-green-100 text-sm">Inform someone about your route and expected return time for safety.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;