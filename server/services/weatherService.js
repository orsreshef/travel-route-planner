/**
 * Weather Service
 * Handles OpenWeatherMap API integration for weather data
 */

const axios = require('axios');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Get 3-day weather forecast for a location
 * @param {Object} params - Location parameters
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {string} params.city - City name (optional)
 * @param {string} params.country - Country name (optional)
 * @returns {Promise<Object>} Weather forecast data
 */
const getWeatherForecast = async ({ lat, lng, city, country }) => {
  try {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeather API key is not configured');
    }

    // Use 5-day forecast API and extract 3 days
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
      params: {
        lat,
        lon: lng,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
        cnt: 24 // Get 24 forecasts (3 days * 8 forecasts per day)
      },
      timeout: 10000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    const forecastData = response.data;
    
    if (!forecastData.list || forecastData.list.length === 0) {
      throw new Error('No forecast data available');
    }

    // Group forecasts by day
    const dailyForecasts = groupForecastsByDay(forecastData.list);
    
    // Take only first 3 days
    const threeDayForecast = dailyForecasts.slice(0, 3);

    return {
      location: {
        name: forecastData.city.name,
        country: forecastData.city.country,
        coordinates: {
          lat: forecastData.city.coord.lat,
          lng: forecastData.city.coord.lon
        },
        timezone: forecastData.city.timezone,
        sunrise: new Date(forecastData.city.sunrise * 1000).toISOString(),
        sunset: new Date(forecastData.city.sunset * 1000).toISOString()
      },
      forecast: threeDayForecast,
      source: 'OpenWeatherMap',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Weather forecast error:', error);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Weather API error';
      
      if (status === 404) {
        throw new Error('Location not found');
      } else if (status === 401) {
        throw new Error('Weather API authentication failed');
      } else if (status === 429) {
        throw new Error('Weather API rate limit exceeded');
      }
      
      throw new Error(`Weather service error: ${message}`);
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Weather service timeout');
    }
    
    throw new Error('Weather service unavailable');
  }
};

/**
 * Get current weather for a location
 * @param {Object} params - Location parameters
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {string} params.city - City name (optional)
 * @returns {Promise<Object>} Current weather data
 */
const getCurrentWeather = async ({ lat, lng, city }) => {
  try {
    if (!OPENWEATHER_API_KEY) {
      throw new Error('OpenWeather API key is not configured');
    }

    const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      },
      timeout: 10000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });

    const weatherData = response.data;

    return {
      location: {
        name: weatherData.name,
        country: weatherData.sys.country,
        coordinates: {
          lat: weatherData.coord.lat,
          lng: weatherData.coord.lon
        },
        timezone: weatherData.timezone,
        sunrise: new Date(weatherData.sys.sunrise * 1000).toISOString(),
        sunset: new Date(weatherData.sys.sunset * 1000).toISOString()
      },
      current: {
        temperature: Math.round(weatherData.main.temp),
        feelsLike: Math.round(weatherData.main.feels_like),
        humidity: weatherData.main.humidity,
        pressure: weatherData.main.pressure,
        visibility: weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null,
        weather: {
          main: weatherData.weather[0].main,
          description: weatherData.weather[0].description,
          icon: convertWeatherIcon(weatherData.weather[0].icon),
          iconUrl: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`
        },
        wind: {
          speed: weatherData.wind.speed,
          direction: weatherData.wind.deg,
          gust: weatherData.wind.gust || null
        },
        clouds: weatherData.clouds.all,
        rain: weatherData.rain ? {
          oneHour: weatherData.rain['1h'] || 0,
          threeHours: weatherData.rain['3h'] || 0
        } : null,
        snow: weatherData.snow ? {
          oneHour: weatherData.snow['1h'] || 0,
          threeHours: weatherData.snow['3h'] || 0
        } : null
      },
      observedAt: new Date(weatherData.dt * 1000).toISOString(),
      source: 'OpenWeatherMap'
    };

  } catch (error) {
    console.error('Current weather error:', error);
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Weather API error';
      
      if (status === 404) {
        throw new Error('Location not found');
      } else if (status === 401) {
        throw new Error('Weather API authentication failed');
      }
      
      throw new Error(`Weather service error: ${message}`);
    }
    
    throw new Error('Weather service unavailable');
  }
};

/**
 * Group hourly forecasts by day
 * @param {Array} forecasts - Array of hourly forecasts
 * @returns {Array} Array of daily forecast summaries
 */
const groupForecastsByDay = (forecasts) => {
  const dailyData = {};

  forecasts.forEach(forecast => {
    const date = new Date(forecast.dt * 1000);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        date: dateKey,
        forecasts: [],
        temps: [],
        conditions: {}
      };
    }

    dailyData[dateKey].forecasts.push(forecast);
    dailyData[dateKey].temps.push(forecast.main.temp);

    // Count weather conditions
    const condition = forecast.weather[0].main;
    dailyData[dateKey].conditions[condition] = (dailyData[dateKey].conditions[condition] || 0) + 1;
  });

  // Convert to array and calculate daily summaries
  return Object.values(dailyData).map(day => {
    const temps = day.temps;
    const maxTemp = Math.round(Math.max(...temps));
    const minTemp = Math.round(Math.min(...temps));
    
    // Find most common weather condition
    const mostCommonCondition = Object.keys(day.conditions).reduce((a, b) => 
      day.conditions[a] > day.conditions[b] ? a : b
    );

    // Get representative forecast (noon or closest to noon)
    const noonForecast = day.forecasts.find(f => {
      const hour = new Date(f.dt * 1000).getHours();
      return hour >= 11 && hour <= 13;
    }) || day.forecasts[0];

    return {
      date: day.date,
      dayOfWeek: new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
      temperature: {
        max: maxTemp,
        min: minTemp,
        average: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)
      },
      weather: {
        main: mostCommonCondition,
        description: noonForecast.weather[0].description,
        icon: convertWeatherIcon(noonForecast.weather[0].icon),
        iconUrl: `https://openweathermap.org/img/wn/${noonForecast.weather[0].icon}@2x.png`
      },
      humidity: Math.round(day.forecasts.reduce((sum, f) => sum + f.main.humidity, 0) / day.forecasts.length),
      wind: {
        speed: Math.round(day.forecasts.reduce((sum, f) => sum + f.wind.speed, 0) / day.forecasts.length * 10) / 10,
        direction: noonForecast.wind.deg
      },
      precipitation: {
        probability: Math.max(...day.forecasts.map(f => f.pop || 0)) * 100,
        amount: day.forecasts.reduce((sum, f) => {
          const rain = f.rain ? (f.rain['3h'] || 0) : 0;
          const snow = f.snow ? (f.snow['3h'] || 0) : 0;
          return sum + rain + snow;
        }, 0)
      },
      hourlyCount: day.forecasts.length
    };
  });
};

/**
 * Convert OpenWeatherMap icon codes to readable weather descriptions
 * @param {string} iconCode - OpenWeatherMap icon code (e.g., "01d", "04d")
 * @returns {string} Weather description
 */
const convertWeatherIcon = (iconCode) => {
  const iconMap = {
    // Clear sky
    '01d': '☀️',
    '01n': '🌙',
    
    // Few clouds
    '02d': '⛅',
    '02n': '☁️',
    
    // Scattered clouds
    '03d': '☁️',
    '03n': '☁️',
    
    // Broken clouds
    '04d': '☁️',
    '04n': '☁️',
    
    // Shower rain
    '09d': '🌧️',
    '09n': '🌧️',
    
    // Rain
    '10d': '🌦️',
    '10n': '🌧️',
    
    // Thunderstorm
    '11d': '⛈️',
    '11n': '⛈️',
    
    // Snow
    '13d': '❄️',
    '13n': '❄️',
    
    // Mist
    '50d': '🌫️',
    '50n': '🌫️'
  };
  
  return iconMap[iconCode] || '🌤️';
};

/**
 * Get weather condition recommendation for outdoor activities
 * @param {Object} weather - Weather data
 * @returns {Object} Activity recommendation
 */
const getActivityRecommendation = (weather) => {
  const temp = weather.current?.temperature || weather.temperature?.average;
  const condition = weather.current?.weather.main || weather.weather.main;
  const windSpeed = weather.current?.wind.speed || weather.wind.speed;
  const precipitation = weather.current?.rain || weather.precipitation?.amount > 0;

  let recommendation = {
    suitable: true,
    level: 'excellent', // excellent, good, fair, poor
    warnings: [],
    suggestions: []
  };

  // Temperature checks
  if (temp < 0) {
    recommendation.suitable = false;
    recommendation.level = 'poor';
    recommendation.warnings.push('Freezing temperatures - risk of ice and hypothermia');
    recommendation.suggestions.push('Consider indoor activities or proper winter gear');
  } else if (temp < 5) {
    recommendation.level = 'fair';
    recommendation.warnings.push('Very cold weather');
    recommendation.suggestions.push('Dress warmly with layers');
  } else if (temp > 35) {
    recommendation.level = 'fair';
    recommendation.warnings.push('Very hot weather - risk of heat exhaustion');
    recommendation.suggestions.push('Start early, bring extra water, take frequent breaks');
  }

  // Weather condition checks
  if (['Thunderstorm', 'Tornado'].includes(condition)) {
    recommendation.suitable = false;
    recommendation.level = 'poor';
    recommendation.warnings.push('Severe weather conditions - dangerous for outdoor activities');
  } else if (['Rain', 'Drizzle'].includes(condition)) {
    recommendation.level = 'fair';
    recommendation.warnings.push('Wet conditions - slippery surfaces');
    recommendation.suggestions.push('Bring waterproof gear and watch footing');
  } else if (condition === 'Snow') {
    recommendation.level = 'fair';
    recommendation.warnings.push('Snowy conditions - limited visibility and traction');
    recommendation.suggestions.push('Consider postponing or bring appropriate winter equipment');
  }

  // Wind checks
  if (windSpeed > 20) {
    recommendation.level = recommendation.level === 'excellent' ? 'good' : 'fair';
    recommendation.warnings.push('Strong winds');
    recommendation.suggestions.push('Be cautious on exposed ridges and open areas');
  }

  return recommendation;
};

module.exports = {
  getWeatherForecast,
  getCurrentWeather,
  getActivityRecommendation
};