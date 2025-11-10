/**
 * Weather Widget Component
 * Displays weather forecast for route locations
 */

import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { 
  CloudIcon, 
  SunIcon, 
  EyeIcon,
  CloudIcon as CloudDrizzleFallbackIcon,
  ArrowsRightLeftIcon as WindFallbackIcon
} from '@heroicons/react/24/outline';


const WeatherWidget = ({ 
  coordinates, 
  location = 'Selected Location',
  days = 3,
  className = ''
}) => {
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (coordinates && coordinates.lat && coordinates.lng) {
      fetchWeather();
    }
  }, [coordinates]);

  const fetchWeather = async () => {
    setError(null);
    
    try {
      const response = await api.get(`/weather/forecast?lat=${coordinates.lat}&lng=${coordinates.lng}&city=${encodeURIComponent(location)}`);
      
      if (response.data.status === 'success') {
        setWeatherData({
          location: {
            name: location,
            coordinates: coordinates
          },
          forecast: response.data.data.forecast.forecast || []
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch weather');
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Weather data temporarily unavailable');
    }
  };



  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'sunny':
        return <SunIcon className="h-8 w-8 text-yellow-500" />;
      case 'cloudy':
        return <CloudIcon className="h-8 w-8 text-gray-500" />;
      case 'partly-cloudy':
        return <CloudIcon className="h-8 w-8 text-blue-400" />;
      case 'rainy':
        return <CloudDrizzleFallbackIcon className="h-8 w-8 text-blue-600" />;
      default:
        return <CloudIcon className="h-8 w-8 text-gray-400" />;
    }
  };

  const getActivityRecommendation = (day) => {
    const temp = day.temperature.average;
    const precipitation = day.precipitation.probability;
    const wind = day.wind.speed;

    if (precipitation > 70) {
      return { level: 'poor', message: 'Not recommended - high chance of rain', color: 'text-red-600' };
    } else if (temp < 5 || temp > 35) {
      return { level: 'fair', message: 'Use caution - extreme temperatures', color: 'text-yellow-600' };
    } else if (wind > 20) {
      return { level: 'fair', message: 'Moderate - windy conditions', color: 'text-yellow-600' };
    } else {
      return { level: 'excellent', message: 'Perfect for outdoor activities', color: 'text-green-600' };
    }
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };



  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-red-200 p-6 ${className}`}>
        <div className="text-center">
          <CloudIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-red-600 font-medium">{error}</p>
                      <button
            onClick={fetchWeather}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-green-100 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <CloudIcon className="h-12 w-12 mx-auto mb-2" />
          <p>Select a location to view weather forecast</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-lg border border-green-100 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Weather Forecast</h3>
          <p className="text-sm text-gray-600">{weatherData.location.name}</p>
        </div>
        <button
          onClick={fetchWeather}
          className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
          title="Refresh weather"
        >
          <CloudIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Weather Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {weatherData.forecast.map((day, index) => {
          const recommendation = getActivityRecommendation(day);
          const isToday = index === 0;
          
          return (
            <div
              key={day.date}
              className={`bg-white rounded-lg p-4 shadow-sm border ${
                isToday ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
              } transition-all hover:shadow-md`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`font-semibold ${isToday ? 'text-green-700' : 'text-gray-900'}`}>
                    {isToday ? 'Today' : day.dayOfWeek}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-2xl">
                  {typeof day.weather.icon === 'string' && day.weather.icon.startsWith('http') ? 
                    <img src={day.weather.icon} alt={day.weather.description} className="w-8 h-8" /> : 
                    day.weather.icon
                  }
                </div>
              </div>

              {/* Temperature */}
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {day.temperature.max}°
                  </span>
                  <span className="text-lg text-gray-600">
                    {day.temperature.min}°
                  </span>
                </div>
                <p className="text-xs text-gray-600 capitalize">{day.weather.description}</p>
              </div>

              {/* Weather Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <CloudDrizzleFallbackIcon className="h-3 w-3 text-blue-500" />
                    <span className="text-gray-600">Rain</span>
                  </div>
                  <span className="font-medium">{day.precipitation.probability}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <WindFallbackIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">Wind</span>
                  </div>
                  <span className="font-medium">
                    {day.wind.speed} km/h {getWindDirection(day.wind.direction)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <EyeIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">Humidity</span>
                  </div>
                  <span className="font-medium">{day.humidity}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <EyeIcon className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">Visibility</span>
                  </div>
                  <span className="font-medium">{day.visibility} km</span>
                </div>
              </div>

              {/* Activity Recommendation */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className={`text-xs font-medium ${recommendation.color}`}>
                  {recommendation.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-white bg-opacity-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Planning Tips</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Best conditions: {weatherData.forecast.find(d => getActivityRecommendation(d).level === 'excellent') ? 'Available' : 'Limited'}</p>
          <p>• Average temperature: {Math.round(weatherData.forecast.reduce((sum, d) => sum + d.temperature.average, 0) / weatherData.forecast.length)}°C</p>
          <p>• Rain probability: {Math.max(...weatherData.forecast.map(d => d.precipitation.probability))}% (highest)</p>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;