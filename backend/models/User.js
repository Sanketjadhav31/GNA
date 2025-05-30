const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  
  // Role for authentication (as per PRD: Restaurant Manager role)
  role: {
    type: String,
    enum: ['manager'],
    default: 'manager',
    required: true,
    immutable: true
  },
  
  // Restaurant Information
  restaurantInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
      default: 'GNA Energy Kitchen'
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    cuisineType: {
      type: [String],
      default: ['Multi-Cuisine']
    },
    operatingHours: {
      start: {
        type: String,
        default: '08:00',
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
      },
      end: {
        type: String,
        default: '23:00',
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
      }
    }
  },
  
  // Manager Permissions & Settings
  permissions: {
    canCreateOrders: {
      type: Boolean,
      default: true
    },
    canAssignPartners: {
      type: Boolean,
      default: true
    },
    canViewAllOrders: {
      type: Boolean,
      default: true
    },
    canManageMenu: {
      type: Boolean,
      default: true
    }
  },
  
  // Performance Statistics
  stats: {
    totalOrdersCreated: {
      type: Number,
      default: 0
    },
    totalOrdersCompleted: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    averagePrepTime: {
      type: Number,
      default: 30 // in minutes
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
  
  // Shift Information
  currentShift: {
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    isOnDuty: {
      type: Boolean,
      default: false
    }
  },
  
  // Preferences
  preferences: {
    defaultPrepTime: {
      type: Number,
      default: 30,
      min: 5,
      max: 120
    },
    notifications: {
      orderUpdates: {
        type: Boolean,
        default: true
      },
      partnerUpdates: {
        type: Boolean,
        default: true
      },
      emailNotifications: {
        type: Boolean,
        default: true
      }
    }
  }
  
}, {
  timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to start shift
userSchema.methods.startShift = function() {
  this.currentShift.startTime = new Date();
  this.currentShift.isOnDuty = true;
  this.currentShift.endTime = null;
  return this.save();
};

// Method to end shift
userSchema.methods.endShift = function() {
  this.currentShift.endTime = new Date();
  this.currentShift.isOnDuty = false;
  return this.save();
};

// Method to check if manager can create order
userSchema.methods.canCreateOrder = function() {
  return this.isActive && this.permissions.canCreateOrders;
};

// Method to check if manager can assign partners
userSchema.methods.canAssignPartner = function() {
  return this.isActive && this.permissions.canAssignPartners;
};

// Method to update order statistics
userSchema.methods.updateOrderStats = function(orderValue, prepTime, isCompleted = false) {
  this.stats.totalOrdersCreated += 1;
  
  if (isCompleted) {
    this.stats.totalOrdersCompleted += 1;
  }
  
  // Update average order value
  const totalValue = this.stats.averageOrderValue * (this.stats.totalOrdersCreated - 1) + orderValue;
  this.stats.averageOrderValue = Math.round(totalValue / this.stats.totalOrdersCreated);
  
  // Update average prep time
  const totalPrepTime = this.stats.averagePrepTime * (this.stats.totalOrdersCreated - 1) + prepTime;
  this.stats.averagePrepTime = Math.round(totalPrepTime / this.stats.totalOrdersCreated);
  
  return this.save();
};

// Virtual for completion rate
userSchema.virtual('completionRate').get(function() {
  if (this.stats.totalOrdersCreated === 0) return 100;
  return Math.round((this.stats.totalOrdersCompleted / this.stats.totalOrdersCreated) * 100);
});

// Virtual for current shift duration
userSchema.virtual('currentShiftDuration').get(function() {
  if (!this.currentShift.isOnDuty || !this.currentShift.startTime) return 0;
  const now = new Date();
  const durationMs = now.getTime() - this.currentShift.startTime.getTime();
  return Math.floor(durationMs / (60 * 1000)); // minutes
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return `${this.name} (Manager)`;
});

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject({ virtuals: true });
  delete user.password;
  return user;
};

// Static method to get active managers
userSchema.statics.getActiveManagers = function() {
  return this.find({ 
    isActive: true,
    role: 'manager'
  }).select('-password');
};

// Static method to get managers on duty
userSchema.statics.getManagersOnDuty = function() {
  return this.find({
    isActive: true,
    role: 'manager',
    'currentShift.isOnDuty': true
  }).select('-password');
};

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'currentShift.isOnDuty': 1 });

module.exports = mongoose.model('User', userSchema); 