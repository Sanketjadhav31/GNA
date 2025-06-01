const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'ORD' + Date.now().toString().slice(-6);
    }
  },
  
  items: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  
  prepTime: {
    type: Number,
    required: true,
    min: 5,
    max: 120 // in minutes
  },
  
  status: {
    type: String,
    enum: ['PREP', 'PICKED', 'ON_ROUTE', 'DELIVERED'],
    default: 'PREP'
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  dispatchTime: {
    type: Date
  },
  
  // Additional required fields
  customerName: {
    type: String,
    required: true
  },
  
  customerPhone: {
    type: String,
    required: true
  },
  
  customerAddress: {
    type: String,
    required: true
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  estimatedETA: {
    type: Number,
    default: 30 // in minutes
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  assignedAt: {
    type: Date,
    default: null
  },
  
  pickedAt: {
    type: Date,
    default: null
  },
  
  onRouteAt: {
    type: Date,
    default: null
  },
  
  deliveredAt: {
    type: Date,
    default: null
  },
  
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  customerEmail: {
    type: String,
    default: null
  },
  
  specialInstructions: {
    type: String,
    default: ''
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  estimatedDeliveryTime: {
    type: Number,
    default: 30 // in minutes
  },
}, {
  timestamps: true
});

// Pre-save middleware to calculate dispatch time
OrderSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('prepTime') || this.isModified('estimatedETA')) {
    const now = new Date();
    const dispatchTimeMs = now.getTime() + (this.prepTime + this.estimatedETA) * 60 * 1000;
    this.dispatchTime = new Date(dispatchTimeMs);
  }
  next();
});

// Method to check valid status transitions
OrderSchema.methods.canTransitionTo = function(newStatus) {
  const validFlow = {
    PREP: "PICKED",
    PICKED: "ON_ROUTE",
    ON_ROUTE: "DELIVERED"
  };
  
  return validFlow[this.status] === newStatus;
};

// Method to update status with validation
OrderSchema.methods.updateStatus = function(newStatus, updatedBy) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }
  
  this.status = newStatus;
  return this.save();
};

// Method to assign partner
OrderSchema.methods.assignPartner = async function(partnerId) {
  if (this.status !== 'PREP') {
    throw new Error('Can only assign partner to orders in PREP status');
  }
  
  if (this.assignedTo) {
    throw new Error('Order is already assigned to a partner');
  }
  
  const User = mongoose.model('User');
  const partner = await User.findById(partnerId);
  
  if (!partner || partner.role !== 'partner') {
    throw new Error('Invalid partner ID');
  }
  
  if (!partner.canTakeOrder()) {
    throw new Error('Partner is not available for new orders');
  }
  
  // Assign the order
  this.assignedTo = partnerId;
  this.assignedAt = new Date();
  
  // Update partner status
  await partner.assignOrder(this._id);
  
  return this.save();
};

// Method to complete delivery (as per PRD)
OrderSchema.methods.completeDelivery = async function() {
  if (this.status !== 'DELIVERED') {
    throw new Error('Order must be in DELIVERED status to complete');
  }
  
  // Make partner available again
  if (this.assignedTo) {
    const User = mongoose.model('User');
    const partner = await User.findById(this.assignedTo);
    if (partner) {
      await partner.completeOrder();
    }
  }
  
  return this;
};

// Static method to get orders by status
OrderSchema.statics.getOrdersByStatus = function(status) {
  return this.find({ status }).populate('assignedTo createdBy');
};

// Static method to get partner's current order (as per PRD: one order at a time)
OrderSchema.statics.getPartnerCurrentOrder = function(partnerId) {
  return this.findOne({
    assignedTo: partnerId,
    status: { $in: ['PREP', 'PICKED', 'ON_ROUTE'] }
  }).populate('assignedTo createdBy');
};

// Static method to get available orders for assignment
OrderSchema.statics.getAvailableOrders = function() {
  return this.find({
    status: 'PREP',
    assignedTo: null
  }).populate('createdBy');
};

// Virtual for time remaining until dispatch
OrderSchema.virtual('timeUntilDispatch').get(function() {
  if (!this.dispatchTime) return null;
  const now = new Date();
  const timeDiff = this.dispatchTime.getTime() - now.getTime();
  return Math.max(0, Math.ceil(timeDiff / (60 * 1000))); // minutes
});

// Virtual for order age
OrderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const ageDiff = now.getTime() - this.createdAt.getTime();
  return Math.ceil(ageDiff / (60 * 1000)); // minutes
});

// Virtual for next possible status
OrderSchema.virtual('nextStatus').get(function() {
  const statusFlow = {
    'PREP': 'PICKED',
    'PICKED': 'ON_ROUTE',
    'ON_ROUTE': 'DELIVERED',
    'DELIVERED': null
  };
  
  return statusFlow[this.status];
});

// Indexes for performance
OrderSchema.index({ status: 1 });
OrderSchema.index({ assignedTo: 1 });
OrderSchema.index({ createdBy: 1 });
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ createdAt: -1 });

// Ensure virtual fields are serialized
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', OrderSchema); 