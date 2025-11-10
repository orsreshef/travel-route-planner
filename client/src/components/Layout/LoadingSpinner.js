/**
 * Loading Spinner Component
 * Reusable loading indicator with nature theme
 */

import React from 'react';
import { MapIcon } from '@heroicons/react/24/outline';

const LoadingSpinner = ({ 
  size = 'medium', 
  message = 'Loading...', 
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center z-50'
    : 'flex items-center justify-center py-8';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative mb-4">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-full animate-pulse">
            <MapIcon className={`${sizeClasses[size]} text-white`} />
          </div>
          
          {/* Spinning Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-green-200 border-t-green-600 animate-spin"></div>
        </div>
        
        {/* Loading Message */}
        <div className="space-y-2">
          <p className="text-gray-700 font-medium">{message}</p>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;