const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['manager', 'partner'],
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true // For partner availability
  },
  
  // Additional fields for partners
  phone: {
    type: String,
    required: function() {
      return this.role === 'partner';
    }
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'bicycle', 'scooter', 'car'],
    required: function() {
      return this.role === 'partner';
    }
  },
  vehicleNumber: {
    type: String,
    required: function() {
      return this.role === 'partner';
    }
  },
  
  // Current assigned order for partner
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  
  // Stats
  stats: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 }
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if partner can take new order
UserSchema.methods.canTakeOrder = function() {
  return this.role === 'partner' && this.isAvailable && !this.currentOrder && this.isActive;
};

// Assign order to partner
UserSchema.methods.assignOrder = function(orderId) {
  if (!this.canTakeOrder()) {
    throw new Error('Partner is not available for new orders');
  }
  this.currentOrder = orderId;
  this.isAvailable = false;
  return this.save();
};

// Complete order and make partner available
UserSchema.methods.completeOrder = function() {
  this.currentOrder = null;
  this.isAvailable = true;
  this.stats.completedOrders += 1;
  return this.save();
};

// Static method to get available partners
UserSchema.statics.getAvailablePartners = function() {
  return this.find({
    role: 'partner',
    isActive: true,
    isAvailable: true,
    currentOrder: null
  });
};

module.exports = mongoose.model('User', UserSchema); 