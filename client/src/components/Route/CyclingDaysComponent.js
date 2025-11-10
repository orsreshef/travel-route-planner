/**
 * Cycling Days Component
 * Displays cycling route day details with maps and information
 */

import React from 'react';
import { MapIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import MapContainer from '../Map/MapContainer.js';

const CyclingDaysComponent = ({ route }) => {
  if (!route || !route.dayDetails || route.dayDetails.length === 0) {
    return null;
  }

  const formatDuration = (minutes) => {
    const mins = Math.round(Number(minutes) || 0);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🚴‍♀️</span>
            <h3 className="text-lg font-semibold text-blue-900">Cycling Route - {route.dayDetails.length} Days</h3>
          </div>
          <span className="text-sm bg-blue-200 text-blue-800 px-3 py-1 rounded-full">
            {route.distance.toFixed(3)} km total
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {route.dayDetails.map((day, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-900">Day {day.day}</h4>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {day.distance.toFixed(3)} km
                </span>
              </div>

              {/* Day Map */}
              {day.path && day.path.length > 0 && (
                <div className="mb-4">
                  <MapContainer
                    center={[day.startPoint.lat, day.startPoint.lng]}
                    zoom={12}
                    height={200}
                    routes={[{
                      coordinates: day.path,
                      type: 'cycling',
                      name: `Day ${day.day}`,
                      distance: day.distance,
                      estimatedDuration: day.duration
                    }]}
                    markers={[
                      {
                        lat: day.startPoint.lat,
                        lng: day.startPoint.lng,
                        type: 'start',
                        popup: `Day ${day.day} Start`
                      },
                      {
                        lat: day.endPoint.lat,
                        lng: day.endPoint.lng,
                        type: 'end',
                        popup: `Day ${day.day} End`
                      }
                    ]}
                    showControls={false}
                    className="rounded-lg"
                  />
                </div>
              )}

              {/* Day Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Duration
                  </span>
                  <span className="font-medium">{formatDuration(day.duration)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <MapIcon className="h-4 w-4 mr-1" />
                    Distance
                  </span>
                  <span className="font-medium">{day.distance.toFixed(3)} km</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Progress
                  </span>
                  <span className="font-medium">
                    {((day.distance / route.distance) * 100).toFixed(0)}% of total
                  </span>
                </div>
              </div>

              {/* Route Points */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Route Points:</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Start:</span>
                    <span className="text-gray-600">
                      {day.startPoint.lat.toFixed(4)}, {day.startPoint.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">End:</span>
                    <span className="text-gray-600">
                      {day.endPoint.lat.toFixed(4)}, {day.endPoint.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Summary */}
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-900 font-medium">Total Route Summary</span>
            <span className="text-blue-800 font-semibold">
              {route.distance.toFixed(3)} km • {formatDuration(route.estimatedDuration)}
            </span>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            {route.dayDetails.length}-day cycling adventure with daily distances ranging from{' '}
            {Math.min(...route.dayDetails.map(d => d.distance)).toFixed(3)} to{' '}
            {Math.max(...route.dayDetails.map(d => d.distance)).toFixed(3)} km
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyclingDaysComponent; 