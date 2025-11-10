/**
 * Footer Component
 * Site footer with links and information
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapIcon
} from '@heroicons/react/24/outline';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const navigationLinks = [
    { name: 'About', href: '/about' },
    { name: 'Plan Route', href: '/routes/plan' },
    { name: 'My Routes', href: '/routes/history' },
    { name: 'Profile', href: '/profile' }
  ];

  return (
    <footer className="bg-white border-t border-green-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg">
                <MapIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Travel Planner</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Your personal adventure companion for planning and tracking walking and cycling routes 
              with real-time weather information.
            </p>

          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Navigation
            </h3>
            <ul className="space-y-3">
              {navigationLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-600 hover:text-green-600 transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between">

            
            <div className="text-sm text-gray-500">
              © {currentYear} Travel Planner. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;