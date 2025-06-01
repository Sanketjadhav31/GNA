const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['restaurant_manager', 'delivery_partner'],
    required: [true, 'Role is required']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit emergency contact phone number']
    },
    relation: {
      type: String,
      enum: ['parent', 'spouse', 'sibling', 'friend', 'relative', 'other'],
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Delivery partner specific fields
  isAvailable: {
    type: Boolean,
    default: function() {
      return this.role === 'delivery_partner';
    }
  },
  currentLocation: {
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'scooter', 'bicycle', 'car'],
    required: function() {
      return this.role === 'delivery_partner';
    }
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
});

// Index for better query performance (only create indexes not already created by unique: true)
UserSchema.index({ role: 1 });
UserSchema.index({ isAvailable: 1 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user without password
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to find available delivery partners
UserSchema.statics.findAvailablePartners = function() {
  return this.find({
    role: 'delivery_partner',
    isAvailable: true,
    isActive: true
  }).select('-password');
};

module.exports = mongoose.model('User', UserSchema); 