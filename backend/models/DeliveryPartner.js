const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deliveryPartnerSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  phone: {
    type: String,
    required: true,
    unique: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  // Role for authentication
  role: {
    type: String,
    default: 'partner',
    immutable: true
  },
  
  // Availability Status (as per PRD: partner availability control)
  isAvailable: {
    type: Boolean,
    default: true,
    comment: "Automatically set to false when assigned order, true when delivered"
  },
  
  // Current Order Assignment (as per PRD: one order at a time)
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
    comment: "Partner can only have one active order at a time"
  },
  
  // Vehicle Information
  vehicleType: {
    type: String,
    enum: ['bike', 'bicycle', 'scooter', 'car'],
    required: true,
    default: 'bike'
  },
  
  vehicleNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  
  // Location Information
  currentLocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    address: {
      type: String,
      trim: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Performance Metrics
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
      get: function(val) {
        return Math.round(val * 10) / 10; // Round to 1 decimal
      }
    },
    averageDeliveryTime: {
      type: Number,
      default: 30, // in minutes
      comment: "Average delivery time in minutes"
    },
    onTimeDeliveries: {
      type: Number,
      default: 0
    }
  },
  
  // Work Schedule
  workingHours: {
    start: {
      type: String,
      default: '09:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
    },
    end: {
      type: String,
      default: '22:00',
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
    }
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Login Information
  lastLogin: {
    type: Date
  },
  
  // Emergency Contact
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
  }
  
}, {
  timestamps: true
});

// Password hashing middleware
deliveryPartnerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
deliveryPartnerSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to check if partner can take new order (as per PRD: workload validation)
deliveryPartnerSchema.methods.canTakeOrder = function() {
  return this.isAvailable && this.isActive && !this.currentOrder;
};

// Method to assign order (as per PRD: one order at a time)
deliveryPartnerSchema.methods.assignOrder = function(orderId) {
  if (!this.canTakeOrder()) {
    throw new Error('Partner is not available for new orders');
  }
  
  this.currentOrder = orderId;
  this.isAvailable = false;
  return this.save();
};

// Method to complete order (as per PRD: mark available after delivery)
deliveryPartnerSchema.methods.completeOrder = function() {
  this.currentOrder = null;
  this.isAvailable = true;
  this.stats.completedOrders += 1;
  return this.save();
};

// Method to update location
deliveryPartnerSchema.methods.updateLocation = function(latitude, longitude, address) {
  this.currentLocation = {
    latitude,
    longitude,
    address,
    lastUpdated: new Date()
  };
  return this.save();
};

// Method to update stats after order completion
deliveryPartnerSchema.methods.updateStats = function(deliveryTime, wasOnTime) {
  this.stats.totalOrders += 1;
  
  // Update average delivery time
  const totalDeliveryTime = this.stats.averageDeliveryTime * (this.stats.totalOrders - 1) + deliveryTime;
  this.stats.averageDeliveryTime = Math.round(totalDeliveryTime / this.stats.totalOrders);
  
  // Update on-time deliveries
  if (wasOnTime) {
    this.stats.onTimeDeliveries += 1;
  }
  
  // Calculate new rating based on performance
  const onTimePercentage = this.stats.onTimeDeliveries / this.stats.totalOrders;
  this.stats.rating = Math.max(1, Math.min(5, 3 + (onTimePercentage * 2)));
  
  return this.save();
};

// Static method to get available partners (as per PRD: partner availability)
deliveryPartnerSchema.statics.getAvailablePartners = function() {
  return this.find({
    isAvailable: true,
    isActive: true,
    currentOrder: null
  }).select('-password');
};

// Static method to get partner by current order
deliveryPartnerSchema.statics.getPartnerByOrder = function(orderId) {
  return this.findOne({ currentOrder: orderId }).select('-password');
};

// Virtual for completion rate
deliveryPartnerSchema.virtual('completionRate').get(function() {
  if (this.stats.totalOrders === 0) return 100;
  return Math.round((this.stats.completedOrders / this.stats.totalOrders) * 100);
});

// Virtual for on-time rate
deliveryPartnerSchema.virtual('onTimeRate').get(function() {
  if (this.stats.totalOrders === 0) return 100;
  return Math.round((this.stats.onTimeDeliveries / this.stats.totalOrders) * 100);
});

// Virtual for current status display
deliveryPartnerSchema.virtual('statusDisplay').get(function() {
  if (!this.isActive) return 'Inactive';
  if (this.currentOrder) return 'On Delivery';
  if (this.isAvailable) return 'Available';
  return 'Busy';
});

// Remove password from JSON output
deliveryPartnerSchema.methods.toJSON = function() {
  const partner = this.toObject();
  delete partner.password;
  return partner;
};

// Index for efficient queries
deliveryPartnerSchema.index({ email: 1 });
deliveryPartnerSchema.index({ phone: 1 });
deliveryPartnerSchema.index({ isAvailable: 1, isActive: 1 });
deliveryPartnerSchema.index({ currentOrder: 1 });

module.exports = mongoose.model('DeliveryPartner', deliveryPartnerSchema); 