/**
 * Route Card Component
 * Displays route information in card format
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const RouteCard = ({ 
  route, 
  onEdit = null, 
  onDelete = null,
  onSelect = null,
  isSelected = false,
  showActions = true 
}) => {
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

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100 hover:border-green-200 overflow-hidden ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
      {/* Route Image */}
      {route.imageUrl && (
        <div className="relative h-48">
          <img
            src={route.imageUrl}
            alt={route.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <span className="text-2xl bg-white bg-opacity-90 p-1 rounded">
              {getRouteTypeIcon(route.type)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(route.difficulty)}`}>
              {route.difficulty}
            </span>
          </div>
          {onSelect && (
            <div className="absolute top-4 right-4">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(route.id)}
                className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500"
              />
            </div>
          )}
        </div>
      )}

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
            <span>{formatDuration(route.estimatedDuration || route.duration)}</span>
          </div>
        </div>

        {/* Cycling Day Details */}
        {(() => {
          const isCyclingRoute = route.routeType === 'cycling';
          const hasDetailedDayInfo = route.isMultiDay && route.dayDetails && route.dayDetails.length > 0;
          
          if (hasDetailedDayInfo) {
            return (
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-blue-900">🚴‍♀️ Multi-Day Cycling Route</span>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                      {route.dayDetails.length} Days
                    </span>
                  </div>
                </div>
                
                {/* Day Split Summary */}
                <div className="mb-3 p-2 bg-white rounded border border-blue-100">
                  <div className="text-xs font-medium text-blue-800 mb-2">📅 Suggested Day Split:</div>
                  <div className="grid grid-cols-2 gap-3">
                    {route.dayDetails.map((day, index) => (
                      <div key={index} className="bg-blue-50 rounded p-2 border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-900 text-sm">Day {day.day}</span>
                          <span className="text-xs bg-blue-200 text-blue-800 px-1 py-0.5 rounded">
                            {day.distance.toFixed(3)} km
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">
                            ⏱️ {Math.round(day.duration)} min
                          </span>
                          <span className="text-xs text-blue-600">
                            {((day.distance / route.distance) * 100).toFixed(0)}% of total
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Total Summary */}
                <div className="flex items-center justify-between text-xs text-blue-700">
                  <span>Total: {route.distance.toFixed(3)} km • {formatDuration(route.estimatedDuration || route.duration)}</span>
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    {route.dayDetails.length}-Day Split
                  </span>
                </div>
              </div>
            );
          } else if (isCyclingRoute) {
            // Show a basic day split for cycling routes without detailed day info
            const totalDistance = route.distance || 0;
            const totalDuration = route.estimatedDuration || route.duration || 0;
            
            if (totalDistance > 20) { // Assume multi-day for routes over 20km
              const day1Distance = Math.round(totalDistance * 0.45 * 10) / 10; // 45% of total
              const day2Distance = Math.round((totalDistance - day1Distance) * 10) / 10;
              const day1Duration = Math.round(totalDuration * 0.45);
              const day2Duration = totalDuration - day1Duration;
              
              return (
                <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-blue-900">🚴‍♀️ Cycling Route</span>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                        2 Days (Estimated)
                      </span>
                    </div>
                  </div>
                  
                  {/* Estimated Day Split */}
                  <div className="mb-3 p-2 bg-white rounded border border-blue-100">
                    <div className="text-xs font-medium text-blue-800 mb-2">📅 Estimated Day Split:</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded p-2 border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-900 text-sm">Day 1</span>
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            {day1Distance} km
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">
                            ⏱️ {day1Duration} min
                          </span>
                          <span className="text-xs text-blue-600">
                            45% of total
                          </span>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded p-2 border border-blue-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-900 text-sm">Day 2</span>
                          <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            {day2Distance} km
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">
                            ⏱️ {day2Duration} min
                          </span>
                          <span className="text-xs text-blue-600">
                            55% of total
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total Summary */}
                  <div className="flex items-center justify-between text-xs text-blue-700">
                    <span>Total: {totalDistance.toFixed(3)} km • {formatDuration(totalDuration)}</span>
                    <span className="bg-blue-100 px-2 py-1 rounded">
                      Estimated Split
                    </span>
                  </div>
                </div>
              );
            } else {
              // Single day cycling route
              return (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-900">🚴‍♀️ Single Day Cycling Route</span>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                      {totalDistance.toFixed(3)} km
                    </span>
                  </div>
                </div>
              );
            }
          }
          
          return null;
        })()}

        {/* Location and Date */}
        <div className="text-xs text-gray-500 mb-4">
          <p className="mb-1">{route.city}, {route.country}</p>
          <p>Created: {formatDate(route.createdAt)}</p>
        </div>

        {/* Tags */}
        {route.tags && route.tags.length > 0 && (
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
        {showActions && (
          <div className="flex space-x-2">
            <Link
              to={`/routes/${route.id}`}
              className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-center text-sm font-medium flex items-center justify-center"
            >
              <EyeIcon className="h-4 w-4 mr-1" />
              View
            </Link>
            {onEdit && (
              <button
                onClick={() => onEdit(route)}
                className="bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(route.id)}
                className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteCard;