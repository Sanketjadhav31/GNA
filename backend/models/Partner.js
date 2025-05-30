const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: false
  },
  longitude: {
    type: Number,
    required: false
  },
  address: {
    type: String,
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const PartnerSchema = new mongoose.Schema({
  partnerId: {
    type: String,
    unique: true,
    default: function() {
      return 'PART' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    }
  },
  name: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: ['bike', 'scooter', 'car', 'bicycle'],
    default: 'bike'
  },
  vehicleNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  licenseNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    type: LocationSchema,
    default: () => ({})
  },
  deliveryRadius: {
    type: Number,
    default: 10, // in kilometers
    min: [1, 'Delivery radius must be at least 1 km'],
    max: [50, 'Delivery radius cannot exceed 50 km']
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  totalDeliveries: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    type: Number,
    default: 4.0,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  totalRatings: {
    type: Number,
    default: 0,
    min: 0
  },
  earnings: {
    today: {
      type: Number,
      default: 0
    },
    thisWeek: {
      type: Number,
      default: 0
    },
    thisMonth: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  workingHours: {
    start: {
      type: String,
      default: '09:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
    },
    end: {
      type: String,
      default: '22:00',
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter time in HH:MM format']
    }
  },
  documents: {
    idProof: {
      type: String,
      trim: true
    },
    licenseProof: {
      type: String,
      trim: true
    },
    vehicleRegistration: {
      type: String,
      trim: true
    }
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    relation: {
      type: String,
      trim: true
    }
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy', 'inactive'],
    default: 'offline'
  }
}, {
  timestamps: true
});

// Update lastActiveAt when partner becomes available
PartnerSchema.pre('save', function(next) {
  if (this.isModified('isAvailable') && this.isAvailable) {
    this.lastActiveAt = new Date();
    this.status = 'online';
  } else if (this.isModified('isAvailable') && !this.isAvailable) {
    this.status = 'offline';
  }
  
  if (this.isModified('currentOrder')) {
    if (this.currentOrder) {
      this.status = 'busy';
      this.isAvailable = false;
    } else {
      this.status = 'online';
      this.isAvailable = true;
    }
  }
  
  next();
});

// Calculate average rating
PartnerSchema.methods.updateRating = function(newRating) {
  this.totalRatings += 1;
  this.rating = ((this.rating * (this.totalRatings - 1)) + newRating) / this.totalRatings;
  return this.save();
};

// Check if partner is currently working
PartnerSchema.methods.isWorkingHours = function() {
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  return currentTime >= this.workingHours.start && currentTime <= this.workingHours.end;
};

// Get available partners
PartnerSchema.statics.getAvailablePartners = function() {
  return this.find({
    isAvailable: true,
    isActive: true,
    currentOrder: null,
    status: { $in: ['online', 'offline'] }
  }).sort({ lastActiveAt: -1, rating: -1 });
};

// Index for better query performance
PartnerSchema.index({ isAvailable: 1, isActive: 1, status: 1 });
PartnerSchema.index({ phone: 1 });
PartnerSchema.index({ partnerId: 1 });
PartnerSchema.index({ rating: -1, totalDeliveries: -1 });

module.exports = mongoose.model('Partner', PartnerSchema); 