# 🚴‍♀️ Travel Planner

Your personal adventure companion for planning and tracking walking and cycling routes with real-time weather information. Built with React, Node.js, and MongoDB.

**Author:** Or Reshef S

## ✨ Features

### 🗺️ **Route Planning**
- **Walking Routes**: 5-15 km circular routes with detailed paths
- **Cycling Routes**: Multi-day cycling adventures (up to 60km per day)
- **AI-Powered**: Intelligent route generation with real-world coordinates
- **Interactive Maps**: Leaflet.js integration with custom markers and routes

### 🌍 **Global Coverage**
- **Country Selection**: Choose from 200+ countries worldwide
- **City-Specific Routes**: Optional city selection for precise routing
- **Representative Images**: Beautiful country images from Unsplash
- **Weather Integration**: Real-time weather forecasts for route planning

### 🚴‍♀️ **Cycling Features**
- **Multi-Day Routes**: 2-day cycling adventures with day-by-day breakdown
- **Day Details**: Individual maps and statistics for each day
- **Cycling Recommendations**: Safety tips, gear suggestions, and best practices
- **Route Continuity**: Seamless connection between days

### 💾 **Route Management**
- **Save Routes**: Store your favorite routes with custom names
- **Route History**: View and manage all your saved routes
- **Route Details**: Comprehensive route information with maps
- **Export Ready**: Detailed route data for external use

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Step-by-Step Wizard**: Intuitive 3-step route creation process
- **Real-time Validation**: Instant feedback on form inputs
- **Loading States**: Smooth user experience with loading indicators

## 🏗️ Architecture

### **Frontend (React)**
```
client/src/
├── components/
│   ├── Layout/        # Footer, LoadingSpinner, Navbar
│   ├── Map/           # MapContainer with Leaflet integration
│   ├── Route/         # CyclingDaysComponent, RouteCard
│   ├── UI/            # CountrySelect component
│   └── Weather/       # WeatherWidget
├── pages/
│   ├── About/         # AboutPage
│   ├── Auth/          # LoginPage, RegisterPage
│   ├── Home/          # HomePage dashboard
│   ├── Profile/       # ProfilePage
│   └── Routes/        # RouteDetailsPage, RouteHistoryPage, RoutePlanningPage
├── contexts/         # AuthContext for authentication
├── services/         # api.js, authService.js
├── utils/            # helpers.js with map utilities
└── App.js            # Main application component
```

### **Backend (Node.js)**
```
server/
├── middleware/      # auth.js, cache.js, rateLimiter.js
├── models/          # Route.js, User.js (MongoDB schemas)
├── routes/          # auth.js, country.js, routes.js, weather.js
├── services/        # Business logic and external API integrations
│   ├── countryService.js    # Country search and validation
│   ├── geocodingService.js  # Address to coordinates conversion
│   ├── groqService.js       # AI-powered country information
│   ├── imageService.js      # Country representative images
│   ├── routeService.js      # Route generation with OpenRouteService
│   └── weatherService.js    # Weather forecasting
└── server.js        # Main server entry point
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm

**MongoDB Installation:**
- **macOS**: `brew install mongodb-community`
- **Windows**: Download from [MongoDB website](https://www.mongodb.com/try/download/community)
- **Linux**: `sudo apt-get install mongodb` (Ubuntu/Debian)
- **Cloud**: Use MongoDB Atlas for cloud-hosted database

### **Installation**

1. **Install dependencies**
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

   **Note:** This project uses separate package.json files for client and server - no root-level dependencies needed.

2. **Environment Setup**
   ```bash
   # Create .env file in server directory
   cd server
   cp .env.example .env
   ```

   Configure your `.env` file:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   OPENROUTESERVICE_API_KEY=your_openrouteservice_key
   OPENCAGE_API_KEY=your_opencage_key
   UNSPLASH_ACCESS_KEY=your_unsplash_key
   GROQ_API_KEY=your_groq_api_key
   OPENWEATHER_API_KEY=your_openweather_key
   ```

3. **Start the application**
   ```bash
   # Start the server (from server directory)
   npm run dev

   # Start the client (from client directory)
   cd ../client
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📖 Usage Guide

### **Creating Your First Route**

1. **Navigate to Route Planning**
   - Click "Create Route" in the navigation
   - Or visit `/routes/plan`

2. **Configure Your Route**
   - **Route Type**: Choose between Walking (5-15 km) or Cycling (multi-day)
   - **Country**: Select your destination country
   - **City** (Optional): Specify a city for more precise routing

3. **Generate Route**
   - Click "Generate Route" to create your adventure
   - The AI will create a custom route based on your preferences

4. **Review & Save**
   - **Route Name**: Give your route a memorable name
   - **Description** (Optional): Add notes about your route
   - **Weather Forecast**: Check the weather for your route
   - **Save Route**: Store your route for future reference

### **Cycling Routes**

For cycling routes, you'll get:
- **2-Day Adventure**: Split into manageable daily segments
- **Day-by-Day Details**: Individual maps and statistics for each day
- **Cycling Recommendations**: Safety tips and best practices
- **Route Continuity**: Seamless connection between days

### **Managing Your Routes**

- **Route History**: View all your saved routes at `/routes/history`
- **Route Details**: Click on any route to see comprehensive information
- **Route Maps**: Interactive maps with start/end points and waypoints

## 🔧 API Endpoints

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### **Routes**
- `POST /api/routes/generate` - Generate new route
- `POST /api/routes/save` - Save route to database
- `GET /api/routes/my-routes` - Get user's routes
- `GET /api/routes/:id` - Get specific route details
- `PUT /api/routes/:id` - Update route
- `DELETE /api/routes/:id` - Delete route

### **Weather**
- `GET /api/weather/forecast` - Get weather forecast for coordinates
- `GET /api/weather/current` - Get current weather

### **Countries**
- `GET /api/routes/countries` - Get available countries
- `GET /api/routes/country-representative-image/:country` - Get country image
- `POST /api/routes/countries/search` - Search countries with AI validation

## 🛠️ Technology Stack

### **Frontend**
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Leaflet.js** - Interactive maps
- **Tailwind CSS** - Utility-first CSS framework
- **Heroicons** - SVG icons
- **React Hot Toast** - Toast notifications

### **Backend**
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication
- **Axios** - HTTP client

### **External APIs**
- **OpenRouteService** - Route generation and optimization
- **OpenCage Geocoding** - Address to coordinates conversion
- **OpenWeatherMap** - Weather data and forecasting
- **Unsplash** - High-quality country representative images
- **Groq AI** - Country information and search validation
- **REST Countries** - Fallback country data and metadata

## 🎯 Key Features Explained

### **AI-Powered Route Generation**
The application uses OpenRouteService API to generate realistic routes based on:
- **Route Type**: Walking (circular) or Cycling (point-to-point)
- **Distance Constraints**: Walking (5-15 km), Cycling (up to 60km/day)
- **Geographic Constraints**: Real-world terrain and road networks
- **Safety Considerations**: Preferring safe, accessible paths

### **Multi-Day Cycling Routes**
Cycling routes are automatically split into 2-day adventures:
- **Day 1**: First segment with detailed path and statistics
- **Day 2**: Second segment continuing from Day 1's endpoint
- **Route Continuity**: Seamless connection between days
- **Individual Maps**: Separate maps for each day's route

### **Weather Integration**
Real-time weather data helps you plan your adventure:
- **3-Day Forecast**: Weather predictions for your route
- **Temperature & Conditions**: Current and forecasted weather
- **Route Planning**: Weather-aware route recommendations

### **Country-Specific Features**
- **Representative Images**: Beautiful country images from Unsplash
- **Geographic Accuracy**: Country-specific coordinate systems
- **Cultural Considerations**: Route recommendations based on local customs

## 🔒 Security Features

- **JWT Authentication**: Secure user authentication
- **Input Validation**: Comprehensive form validation
- **SQL Injection Protection**: MongoDB with Mongoose
- **CORS Configuration**: Proper cross-origin resource sharing
- **Environment Variables**: Secure configuration management

## 🚀 Deployment

### **Frontend Deployment**
```bash
# Build the React app
cd client
npm start

```

### **Backend Deployment**
```bash
# Set up environment variables
Environment Variables Required:
- `MONGODB_URI`, `JWT_SECRET`
- `OPENROUTESERVICE_API_KEY`, `OPENCAGE_API_KEY`
- `UNSPLASH_ACCESS_KEY`, `GROQ_API_KEY`, `OPENWEATHER_API_KEY`
cd server
npm run dev
```

## 🙏 Acknowledgments

- **OpenRouteService** for route generation and optimization
- **OpenCage** for geocoding services
- **OpenWeatherMap** for weather data and forecasting
- **Unsplash** for beautiful country representative images
- **Groq AI** for intelligent country search and validation
- **Leaflet.js** for interactive maps
- **REST Countries** for country metadata

## 📁 Project Structure

This is a clean, well-organized full-stack application with:
- **Separate client/server structure** - Independent React and Node.js applications
- **No root dependencies** - Each part manages its own package.json
- **Clean component architecture** - Logical separation of UI, business logic, and utilities