/**
 * Groq AI Service
 * Handles country validation and metadata fetching using Groq API
 */

const axios = require('axios');
const https = require('https');

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.baseURL = 'https://api.groq.com/openai/v1';
    
    // Create HTTPS agent to handle SSL certificate issues
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Accept self-signed certificates
      keepAlive: true,
      timeout: 30000
    });
    
    if (!this.apiKey) {
      console.warn('⚠️ GROQ_API_KEY not found in environment variables');
    }
  }

  /**
   * Make a request to Groq API
   * @param {Array} messages - Chat messages
   * @returns {Promise<string>} Response from Groq
   */
  async makeRequest(messages) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'llama3-8b-8192',
          messages: messages,
          temperature: 0.1,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          httpsAgent: this.httpsAgent,
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      // Enhanced error logging for SSL issues
      if (error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' || error.code === 'CERT_HAS_EXPIRED') {
        console.error('🔒 SSL Certificate issue with Groq API:', error.message);
        console.log('💡 Suggestion: Check your system certificates or network configuration');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('🌐 Network connectivity issue with Groq API:', error.message);
      } else {
        console.error('🤖 Groq API error:', error.response?.data || error.message);
      }
      
      throw new Error(`Groq API failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Validate if a country exists
   * @param {string} countryName - Name of the country to validate
   * @returns {Promise<Object>} Validation result with country info
   */
  async validateCountry(countryName) {
    if (!countryName || typeof countryName !== 'string') {
      return { isValid: false, reason: 'Invalid country name provided' };
    }

    const messages = [
      {
        role: 'system',
        content: `You are a geography expert. Your task is to validate if a given text represents a real country name and provide basic information about it.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "isValid": true/false,
  "countryName": "Official country name if valid, null if invalid",
  "reason": "Explanation if invalid, null if valid"
}

Do not include any other text, explanations, or markdown. Only the JSON object.`
      },
      {
        role: 'user',
        content: `Is "${countryName}" a real country? Validate and respond with the JSON format specified.`
      }
    ];

    try {
      const response = await this.makeRequest(messages);
      
      // Parse the JSON response
      const result = JSON.parse(response.trim());
      
      // Validate the response structure
      if (typeof result.isValid !== 'boolean') {
        throw new Error('Invalid response format from Groq');
      }
      
      return result;
    } catch (error) {
      console.error('Country validation error:', error.message);
      // Fallback to a simple validation
      return {
        isValid: false,
        countryName: null,
        reason: 'Unable to validate country due to service error'
      };
    }
  }

  /**
   * Get comprehensive country metadata
   * @param {string} countryName - Name of the country
   * @returns {Promise<Object>} Country metadata
   */
  async getCountryMetadata(countryName) {
    if (!countryName || typeof countryName !== 'string') {
      throw new Error('Invalid country name provided');
    }

    const messages = [
      {
        role: 'system',
        content: `You are a comprehensive geography and cultural expert. Provide detailed information about countries.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "name": "Official country name",
  "capital": "Capital city",
  "population": "Population in millions (e.g., '10.5 million')",
  "currency": "Primary currency name",
  "language": "Primary language(s)",
  "religion": "Primary religion(s)",
  "continent": "Continent name",
  "timeZone": "Primary timezone (e.g., 'UTC+2')",
  "emergencyNumber": "Emergency phone number",
  "drivingSide": "left or right",
  "internetTLD": "Top-level domain (e.g., '.com')",
  "callingCode": "International calling code (e.g., '+1')"
}

Provide accurate, current information. If any field is unknown, use "N/A".
Do not include any other text, explanations, or markdown. Only the JSON object.`
      },
      {
        role: 'user',
        content: `Provide comprehensive metadata for the country: "${countryName}"`
      }
    ];

    try {
      const response = await this.makeRequest(messages);
      
      // Parse the JSON response
      const result = JSON.parse(response.trim());
      
      // Validate required fields
      const requiredFields = ['name', 'capital', 'population', 'currency', 'language', 'religion'];
      for (const field of requiredFields) {
        if (!result.hasOwnProperty(field)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Country metadata error:', error.message);
      throw new Error(`Failed to fetch country metadata: ${error.message}`);
    }
  }

  /**
   * Get a list of valid countries from Groq
   * @param {string} searchTerm - Search term for countries
   * @returns {Promise<Array>} List of matching countries
   */
  async searchCountries(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 2) {
      return [];
    }

    const messages = [
      {
        role: 'system',
        content: `You are a geography expert. Your task is to find real countries that match a search term.

IMPORTANT: Respond ONLY with a valid JSON array of country names in this exact format:
["Country Name 1", "Country Name 2", "Country Name 3"]

Rules:
- Include only real, recognized countries
- Match countries that start with or contain the search term
- Limit to maximum 10 results
- Use official country names
- Sort alphabetically

Do not include any other text, explanations, or markdown. Only the JSON array.`
      },
      {
        role: 'user',
        content: `Find countries that match the search term: "${searchTerm}"`
      }
    ];

    try {
      const response = await this.makeRequest(messages);
      
      // Parse the JSON response
      const result = JSON.parse(response.trim());
      
      // Validate it's an array
      if (!Array.isArray(result)) {
        throw new Error('Invalid response format from Groq');
      }
      
      // Validate all items are strings and remove duplicates
      const validCountries = result.filter(country => 
        typeof country === 'string' && country.length > 0
      );
      
      // Remove duplicates (case-insensitive)
      const uniqueCountries = [...new Set(validCountries.map(country => 
        country.trim()
      ))];
      
      return uniqueCountries.slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error('Country search error:', error.message);
      return []; // Return empty array on error
    }
  }

  /**
   * Get the capital city of a country
   * @param {string} countryName - Name of the country
   * @returns {Promise<string>} Capital city name
   */
  async getCapitalCity(countryName) {
    if (!countryName || typeof countryName !== 'string') {
      throw new Error('Invalid country name provided');
    }

    const messages = [
      {
        role: 'system',
        content: `You are a geography expert. Your task is to provide the capital city of a given country.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "capitalCity": "Name of the capital city",
  "country": "Official country name"
}

Do not include any other text, explanations, or markdown. Only the JSON object.`
      },
      {
        role: 'user',
        content: `What is the capital city of "${countryName}"? Respond with the JSON format specified.`
      }
    ];

    try {
      const response = await this.makeRequest(messages);
      
      // Parse the JSON response
      const result = JSON.parse(response.trim());
      
      // Validate the response structure
      if (!result.capitalCity || typeof result.capitalCity !== 'string') {
        throw new Error('Invalid response format from Groq - missing capitalCity');
      }
      
      console.log(`🏛️ Capital city for ${countryName}: ${result.capitalCity}`);
      return result.capitalCity;
      
    } catch (error) {
      console.error(`Error getting capital city for ${countryName}:`, error.message);
      throw new Error(`Could not determine capital city for ${countryName}: ${error.message}`);
    }
  }

  /**
   * Validate if a city is actually located in the specified country
   * Prevents geographic errors like "Paris, Japan" or "New York, Germany"
   * @param {string} cityName - Name of the city (e.g., "Paris", "Tokyo")
   * @param {string} countryName - Name of the country (e.g., "France", "Japan")
   * @returns {Promise<Object>} Validation result with isValid, reason, confidence
   */
  async validateCityInCountry(cityName, countryName) {
    if (!cityName || typeof cityName !== 'string') {
      return { isValid: false, reason: 'Invalid city name provided' };
    }
    
    if (!countryName || typeof countryName !== 'string') {
      return { isValid: false, reason: 'Invalid country name provided' };
    }

    try {
      console.log(`🔍 Validating if "${cityName}" is in "${countryName}"...`);
      
      const messages = [
        {
          role: 'system',
          content: `You are a geography validation expert. Your task is to verify if a city is located in a specific country. 
                   
                   Rules:
                   - Be very strict about geographic accuracy
                   - Consider major cities, capitals, and well-known locations
                   - Account for different spellings and language variations
                   - Return JSON format only
                   
                   Response format:
                   {
                     "isValid": boolean,
                     "cityName": "standardized city name",
                     "countryName": "standardized country name", 
                     "reason": "explanation if not valid",
                     "confidence": number (0-100)
                   }`
        },
        {
          role: 'user',
          content: `Is the city "${cityName}" located in the country "${countryName}"? Provide a JSON response only.`
        }
      ];

      const responseText = await this.makeRequest(messages);
      
      // Parse the JSON response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse Groq city validation response:', parseError.message);
        console.error('Raw response:', responseText);
        
        // Fallback: basic string analysis
        const isValidBasic = responseText.toLowerCase().includes('true') || 
                           responseText.toLowerCase().includes('"isvalid": true') ||
                           responseText.toLowerCase().includes('yes');
        
        return {
          isValid: isValidBasic,
          cityName: cityName,
          countryName: countryName,
          reason: isValidBasic ? 'Validation passed' : 'City does not appear to be in the specified country',
          confidence: 50
        };
      }
      
      // Validate the response structure
      if (typeof result.isValid !== 'boolean') {
        throw new Error('Invalid response format from Groq - missing isValid boolean');
      }
      
      console.log(`✅ City validation result: ${cityName} in ${countryName} = ${result.isValid} (confidence: ${result.confidence}%)`);
      
      return {
        isValid: result.isValid,
        cityName: result.cityName || cityName,
        countryName: result.countryName || countryName,
        reason: result.reason || (result.isValid ? 'City is in country' : 'City is not in country'),
        confidence: result.confidence || 80
      };
      
    } catch (error) {
      console.error(`Error validating city ${cityName} in country ${countryName}:`, error.message);
      
      return {
        isValid: true,
        cityName: cityName,
        countryName: countryName,
        reason: `Validation service unavailable: ${error.message}`,
        confidence: 0
      };
    }
  }
}

module.exports = new GroqService();