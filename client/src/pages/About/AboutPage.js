/**
 * About Page Component
 * Information about the Travel Planner application
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapIcon,
  GlobeAltIcon,
  CloudIcon,
  CameraIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  SparklesIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

// Move data outside component for better performance
const features = [
  {
    name: 'Interactive Route Planning',
    description: 'Create custom walking and cycling routes with real-time map visualization using Leaflet maps.',
    icon: MapIcon,
    color: 'text-green-600 bg-green-100'
  },
  {
    name: 'Weather Integration',
    description: '3-day weather forecasts for route locations to help you plan the perfect adventure.',
    icon: CloudIcon,
    color: 'text-blue-600 bg-blue-100'
  },
  {
    name: 'Route Management',
    description: 'Save, organize, and manage your route history with detailed information and statistics.',
    icon: UserGroupIcon,
    color: 'text-purple-600 bg-purple-100'
  },
  {
    name: 'Country Information',
    description: 'Get detailed information about destinations including currency, language, and culture.',
    icon: GlobeAltIcon,
    color: 'text-amber-600 bg-amber-100'
  },
  {
    name: 'Beautiful Imagery',
    description: 'High-quality images of destinations to inspire your next adventure.',
    icon: CameraIcon,
    color: 'text-indigo-600 bg-indigo-100'
  },
  {
    name: 'Secure & Private',
    description: 'Your routes and personal data are protected with industry-standard security.',
    icon: ShieldCheckIcon,
    color: 'text-red-600 bg-red-100'
  }
];



const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-full">
              <MapIcon className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Travel Planner
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Your personal adventure companion for planning and tracking walking and cycling routes 
            with real-time weather information. Explore the world one route at a time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/routes/plan"
              className="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              Start Planning
            </Link>
            <Link
              to="/routes/history"
              className="inline-flex items-center bg-white text-green-600 py-3 px-6 rounded-lg hover:bg-green-50 transition-colors font-medium border border-green-200"
            >
              <MapIcon className="h-5 w-5 mr-2" />
              View Routes
            </Link>
          </div>
        </div>

        {/* Mission Statement */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16 border border-green-100">
          <div className="text-center mb-8">
            <LightBulbIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              To inspire and enable outdoor adventures by providing intuitive tools for route planning, 
              comprehensive weather information, and a beautiful interface that makes exploring the world 
              accessible to everyone. Whether you're a casual walker or an avid cyclist, we're here to 
              help you discover new paths and create unforgettable memories.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Features</h2>
            <p className="text-lg text-gray-600">
              Everything you need to plan, track, and enjoy your outdoor adventures
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.name} className="bg-white rounded-xl shadow-lg p-6 border border-green-100 hover:shadow-xl transition-shadow">
                  <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.name}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Route Types Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
            <div className="text-center mb-4">
              <span className="text-4xl mb-2 block">🚶‍♀️</span>
              <h3 className="text-xl font-semibold text-gray-900">Walking Routes</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">5-15 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">Circular routes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">Single day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Perfect for:</span>
                <span className="font-medium">Hiking, exploration</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
            <div className="text-center mb-4">
              <span className="text-4xl mb-2 block">🚴‍♀️</span>
              <h3 className="text-xl font-semibold text-gray-900">Cycling Routes</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">Up to 60 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">Point-to-point</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">Two consecutive days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Perfect for:</span>
                <span className="font-medium">Long-distance touring</span>
              </div>
            </div>
          </div>
        </div>



        {/* Developer Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-16 border border-green-100">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 w-20 h-20 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">OR</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet the Developer</h2>
            <div className="max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Or Reshef S</h3>
              <p className="text-gray-600 mb-6">
                Full-Stack Web Developer passionate about creating intuitive and beautiful web applications. 
                Dedicated to writing clean, maintainable code and delivering exceptional user experiences.
              </p>

            </div>
          </div>
        </div>



        {/* Footer Note */}
        <div className="text-center mt-12 pt-8 border-t border-green-200">
          <p className="text-gray-500 text-sm">
            Travel Planner &copy; 2025 - Created with passion for outdoor adventures and modern web development
          </p>
        </div>

      </div>
    </div>
  );
};

export default AboutPage;