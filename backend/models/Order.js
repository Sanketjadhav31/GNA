const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    uppercase: true,
    match: [/^ORD\d{6}$/, 'Order ID must be in format ORD123456']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
  },
  customerAddress: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^\d{6}$/, 'Pincode must be exactly 6 digits']
    }
  },
  items: [{
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Price cannot be negative']
    },
    category: {
      type: String,
      enum: ['appetizer', 'main_course', 'dessert', 'beverage', 'side_dish'],
      default: 'main_course'
    },
    specialInstructions: {
      type: String,
      maxlength: [200, 'Special instructions cannot exceed 200 characters']
    }
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  prepTime: {
    type: Number,
    required: [true, 'Preparation time is required'],
    min: [5, 'Preparation time must be at least 5 minutes'],
    max: [120, 'Preparation time cannot exceed 120 minutes']
  },
  estimatedDeliveryTime: {
    type: Number,
    min: [10, 'Estimated delivery time must be at least 10 minutes'],
    max: [60, 'Estimated delivery time cannot exceed 60 minutes'],
    default: 30
  },
  dispatchTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PENDING', 'PREP', 'READY', 'PICKED', 'ON_ROUTE', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  // Restaurant and delivery partner references
  restaurantManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Restaurant manager is required']
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(partnerId) {
        if (!partnerId) return true; // Allow null/undefined
        const User = mongoose.model('User');
        const partner = await User.findById(partnerId);
        return partner && partner.role === 'delivery_partner';
      },
      message: 'Invalid delivery partner'
    }
  },
  // Timestamps for tracking
  orderPlacedAt: {
    type: Date,
    default: Date.now
  },
  prepStartedAt: {
    type: Date
  },
  readyAt: {
    type: Date
  },
  pickedAt: {
    type: Date
  },
  onRouteAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  // Additional tracking info
  trackingNotes: [{
    note: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  rating: {
    foodQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    deliveryService: {
      type: Number,
      min: 1,
      max: 5
    },
    overallExperience: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      maxlength: [500, 'Feedback cannot exceed 500 characters']
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance (only create indexes not already created by unique: true)
OrderSchema.index({ status: 1 });
OrderSchema.index({ deliveryPartner: 1 });
OrderSchema.index({ restaurantManager: 1 });
OrderSchema.index({ orderPlacedAt: -1 });
OrderSchema.index({ priority: 1, orderPlacedAt: 1 });

// Auto-generate order ID
OrderSchema.pre('save', function(next) {
  if (!this.orderId) {
    // Generate a 6-digit number from timestamp + random
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    this.orderId = `ORD${timestamp}${random}`;
  }
  next();
});

// Calculate dispatch time when prep time or ETA changes
OrderSchema.pre('save', function(next) {
  if (this.prepTime && this.estimatedDeliveryTime && !this.dispatchTime) {
    this.dispatchTime = new Date(Date.now() + (this.prepTime * 60 * 1000));
  }
  next();
});

// Update timestamps based on status changes
OrderSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.isModified('status')) {
    switch (this.status) {
      case 'PREP':
        if (!this.prepStartedAt) this.prepStartedAt = now;
        break;
      case 'READY':
        if (!this.readyAt) this.readyAt = now;
        break;
      case 'PICKED':
        if (!this.pickedAt) this.pickedAt = now;
        break;
      case 'ON_ROUTE':
        if (!this.onRouteAt) this.onRouteAt = now;
        break;
      case 'DELIVERED':
        if (!this.deliveredAt) this.deliveredAt = now;
        break;
    }
  }
  
  next();
});

// Virtual for total preparation + delivery time
OrderSchema.virtual('totalEstimatedTime').get(function() {
  return this.prepTime + this.estimatedDeliveryTime;
});

// Virtual for order age
OrderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.orderPlacedAt) / (1000 * 60)); // in minutes
});

// Static method to find orders by status
OrderSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('deliveryPartner restaurantManager', 'firstName lastName phone');
};

// Static method to find partner's current orders
OrderSchema.statics.findPartnerOrders = function(partnerId) {
  return this.find({
    deliveryPartner: partnerId,
    status: { $in: ['PICKED', 'ON_ROUTE'] }
  }).populate('restaurantManager', 'firstName lastName phone');
};

// Instance method to check if order can be assigned to partner
OrderSchema.methods.canAssignToPartner = function(partnerId) {
  return !this.deliveryPartner || this.status === 'READY';
};

// Instance method to get current tracking status
OrderSchema.methods.getTrackingInfo = function() {
  const statusFlow = ['PENDING', 'PREP', 'READY', 'PICKED', 'ON_ROUTE', 'DELIVERED'];
  const currentIndex = statusFlow.indexOf(this.status);
  
  return {
    currentStatus: this.status,
    currentStep: currentIndex + 1,
    totalSteps: statusFlow.length,
    nextStatus: currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null,
    isCompleted: this.status === 'DELIVERED',
    estimatedCompletion: this.dispatchTime
  };
};

module.exports = mongoose.model('Order', OrderSchema); 