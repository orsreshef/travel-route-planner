/**
 * CountrySelect Component
 * Provides an autocomplete country selection with API-based data and filtering
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const CountrySelect = ({ 
  value, 
  onChange, 
  placeholder = "Select a country",
  className = "",
  disabled = false,
  error = null
}) => {
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(false);
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load all countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const response = await api.get('/country/list');
        if (response.data.status === 'success') {
          const countryList = response.data.data.countries;
          setCountries(countryList);
          setFilteredCountries(countryList);
        }
      } catch (error) {
        console.error('Failed to load countries:', error);
        // Fallback to a basic list if API fails
        const fallbackCountries = [
          { name: 'United States', code: 'US', flag: '🇺🇸' },
          { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
          { name: 'Canada', code: 'CA', flag: '🇨🇦' },
          { name: 'Australia', code: 'AU', flag: '🇦🇺' },
          { name: 'Germany', code: 'DE', flag: '🇩🇪' },
          { name: 'France', code: 'FR', flag: '🇫🇷' },
          { name: 'Italy', code: 'IT', flag: '🇮🇹' },
          { name: 'Spain', code: 'ES', flag: '🇪🇸' },
          { name: 'Netherlands', code: 'NL', flag: '🇳🇱' },
          { name: 'Japan', code: 'JP', flag: '🇯🇵' },
          { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿' }
        ];
        setCountries(fallbackCountries);
        setFilteredCountries(fallbackCountries);
      } finally {
        setLoadingCountries(false);
      }
    };

    loadCountries();
  }, []);

  // Filter countries based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCountries(countries);
      return;
    }

    const filtered = countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCountries(filtered);
  }, [searchTerm, countries]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchTerm('');
    // Clear the input search term when country is selected
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const selectedCountry = countries.find(c => c.name === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Input */}
      <div 
        className={`
          relative w-full px-3 py-2 border rounded-lg cursor-pointer transition-all
          ${error ? 'border-red-300 focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500' : 
            'border-gray-300 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
        `}
        onClick={handleInputFocus}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            {selectedCountry ? (
              <>
                <span className="mr-2 text-lg">{selectedCountry.flag}</span>
                <span className="text-gray-900">{selectedCountry.name}</span>
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDownIcon 
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search countries..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                autoFocus
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-48 overflow-y-auto">
            {loadingCountries ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mx-auto"></div>
                <span className="mt-2 block text-sm">Loading countries...</span>
              </div>
            ) : filteredCountries.length > 0 ? (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className={`
                    w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                    flex items-center transition-colors
                    ${selectedCountry?.code === country.code ? 'bg-green-50 text-green-700' : 'text-gray-900'}
                  `}
                >
                  <span className="mr-3 text-lg">{country.flag}</span>
                  <div className="flex-1">
                    <span className="font-medium">{country.name}</span>
                    {country.capital && (
                      <span className="ml-2 text-sm text-gray-500">• {country.capital}</span>
                    )}
                  </div>
                  {selectedCountry?.code === country.code && (
                    <span className="text-green-600">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <span className="text-sm">No countries found</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CountrySelect;