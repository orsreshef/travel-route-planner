/**
 * Route Model - MongoDB Schema
 * Defines the route data structure for saving and managing travel routes
 */

const mongoose = require('mongoose');

const coordinateSchema = new mongoose.Schema({
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  }
}, { _id: false });

const routeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Route name is required'],
    trim: true,
    minlength: [2, 'Route name must be at least 2 characters long'],
    maxlength: [100, 'Route name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  routeType: {
    type: String,
    required: [true, 'Route type is required'],
    enum: {
      values: ['walking', 'cycling'],
      message: 'Route type must be either walking or cycling'
    }
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [100, 'Country name cannot exceed 100 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters']
  },
  startPoint: {
    type: coordinateSchema,
    required: [true, 'Start point coordinates are required']
  },
  endPoint: {
    type: coordinateSchema,
    required: [true, 'End point coordinates are required']
  },
  coordinates: {
    type: [coordinateSchema],
    required: [true, 'Route coordinates are required'],
    validate: {
      validator: function(coordinates) {
        return coordinates && coordinates.length >= 2;
      },
      message: 'Route must have at least 2 coordinate points'
    }
  },
  distance: {
    type: Number,
    required: [true, 'Distance is required'],
    min: [0.1, 'Distance must be at least 0.1 km'],
    validate: {
      validator: function(distance) {
        return distance >= 0.1;
      },
      message: 'Distance must be at least 0.1 km'
    }
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: [true, 'Estimated duration is required'],
    min: [10, 'Duration must be at least 10 minutes']
  },
  elevationGain: {
    type: Number,
    default: 0,
    min: 0
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'hard'],
    default: 'moderate'
  },
  routeData: {
    // additional route information from routing service
    instructions: [{
      type: String,
      distance: Number,
      duration: Number,
      text: String
    }],
    waypoints: [coordinateSchema],
    surface: String, 
    metadata: mongoose.Schema.Types.Mixed
  },
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(url) {
        if (!url) return true;
        // Accept URLs with file extensions
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url) || 
               /^https?:\/\/picsum\.photos\/.+/i.test(url) ||
               /^https?:\/\/images\.unsplash\.com\/.+/i.test(url);
      },
      message: 'Invalid image URL format'
    }
  },
  countryImage: {
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function(url) {
          if (!url) return true;
          return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url) || 
                 /^https?:\/\/picsum\.photos\/.+/i.test(url) ||
                 /^https?:\/\/images\.unsplash\.com\/.+/i.test(url);
        },
        message: 'Invalid country image URL format'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Image description cannot exceed 200 characters']
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  // Cycling-specific fields
  isMultiDay: {
    type: Boolean,
    default: false
  },
  dayDetails: [{
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 7
    },
    distance: {
      type: Number,
      required: true,
      min: 0.1
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    startPoint: coordinateSchema,
    endPoint: coordinateSchema,
    path: [coordinateSchema]
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  weather: {
    temperature: Number,
    conditions: String,
    humidity: Number,
    windSpeed: Number,
    recordedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Speeds up finding a user's routes and sorting them by creation date.
routeSchema.index({ userId: 1, createdAt: -1 });
// Speeds up searches for routes by a specific country and type.
routeSchema.index({ country: 1, routeType: 1 });
// Speeds up searches for public routes of a specific type.
routeSchema.index({ isPublic: 1, routeType: 1 });

// Virtual for circular route check (walking routes)
routeSchema.virtual('isCircular').get(function() {
  if (this.routeType !== 'walking') return false;
  
  const start = this.startPoint;
  const end = this.endPoint;
  const threshold = 0.001; // ~100 meters tolerance
  
  return Math.abs(start.lat - end.lat) < threshold && 
         Math.abs(start.lng - end.lng) < threshold;
});

// Virtual for route summary
routeSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    name: this.name,
    type: this.routeType,
    distance: this.distance,
    duration: this.estimatedDuration,
    country: this.country,
    difficulty: this.difficulty
  };
});

// Pre-save validation for walking routes (must be circular)
routeSchema.pre('save', function(next) {
  next();
});

// Static method to find routes by user
routeSchema.statics.findByUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    routeType
  } = options;

  const query = { userId };
  if (routeType) query.routeType = routeType;
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  return this.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('userId', 'fullName email');
};

// Static method to find public routes by country
routeSchema.statics.findPublicByCountry = function(country, routeType) {
  const query = { 
    isPublic: true, 
    country: new RegExp(country, 'i') 
  };
  
  if (routeType) query.routeType = routeType;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('userId', 'fullName');
};

// Instance method to calculate average speed
routeSchema.methods.getAverageSpeed = function() {
  // Speed in km/h
  if (this.estimatedDuration === 0) return 0;
  
  const hours = this.estimatedDuration / 60;
  return Math.round((this.distance / hours) * 100) / 100;
};

// Instance method to get route bounds
routeSchema.methods.getBounds = function() {
  if (!this.coordinates || this.coordinates.length === 0) return null;

  // 'lats' is an array of all latitudes (north/south position), and 'lngs' is an array of all longitudes (east/west position).
  // The purpose is to easily find the furthest north, south, east, and west points of the route.
  const lats = this.coordinates.map(coord => coord.lat);
  const lngs = this.coordinates.map(coord => coord.lng);
  
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
};

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;