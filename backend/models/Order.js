const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'ZO' + Date.now().toString().slice(-6);
    }
  },
  
  // Order Details
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
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Customer Details
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  
  customerPhone: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  customerAddress: {
    type: String,
    required: true,
    trim: true
  },
  
  // Timing Details (as per PRD)
  prepTime: {
    type: Number,
    required: true,
    min: 5,
    max: 120,
    comment: "Preparation time in minutes"
  },
  
  estimatedDeliveryTime: {
    type: Number,
    default: 30,
    comment: "ETA in minutes (predefined or calculated)"
  },
  
  dispatchTime: {
    type: Date,
    comment: "Auto-calculated: prepTime + ETA"
  },
  
  // Status Flow (as per PRD: PREP → PICKED → ON_ROUTE → DELIVERED)
  status: {
    type: String,
    enum: ['PREP', 'PICKED', 'ON_ROUTE', 'DELIVERED'],
    default: 'PREP',
    required: true
  },
  
  // Partner Assignment (as per PRD: one partner at a time)
  assignedPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPartner',
    default: null
  },
  
  assignedAt: {
    type: Date,
    default: null
  },
  
  // Status Change History
  statusHistory: [{
    status: {
      type: String,
      enum: ['PREP', 'PICKED', 'ON_ROUTE', 'DELIVERED']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'statusHistory.updatedByModel'
    },
    updatedByModel: {
      type: String,
      enum: ['User', 'DeliveryPartner']
    }
  }],
  
  // Manager who created the order
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Priority (optional enhancement)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
  
}, {
  timestamps: true
});

// Pre-save middleware to calculate dispatch time (as per PRD)
orderSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('prepTime') || this.isModified('estimatedDeliveryTime')) {
    const now = new Date();
    const dispatchTimeMs = now.getTime() + (this.prepTime + this.estimatedDeliveryTime) * 60 * 1000;
    this.dispatchTime = new Date(dispatchTimeMs);
  }
  next();
});

// Method to check if status transition is valid (as per PRD)
orderSchema.methods.canTransitionTo = function(newStatus) {
  const statusFlow = {
    'PREP': ['PICKED'],
    'PICKED': ['ON_ROUTE'],
    'ON_ROUTE': ['DELIVERED'],
    'DELIVERED': []
  };
  
  return statusFlow[this.status] && statusFlow[this.status].includes(newStatus);
};

// Method to update status with validation
orderSchema.methods.updateStatus = function(newStatus, updatedBy, updatedByModel) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    updatedBy,
    updatedByModel
  });
  
  this.status = newStatus;
  return this.save();
};

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(status) {
  return this.find({ status }).populate('assignedPartner createdBy');
};

// Static method to get partner's current order (as per PRD: one order at a time)
orderSchema.statics.getPartnerCurrentOrder = function(partnerId) {
  return this.findOne({
    assignedPartner: partnerId,
    status: { $in: ['PICKED', 'ON_ROUTE'] }
  }).populate('assignedPartner createdBy');
};

// Virtual for time remaining until dispatch
orderSchema.virtual('timeUntilDispatch').get(function() {
  if (!this.dispatchTime) return null;
  const now = new Date();
  const timeDiff = this.dispatchTime.getTime() - now.getTime();
  return Math.max(0, Math.ceil(timeDiff / (60 * 1000))); // minutes
});

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  const now = new Date();
  const ageDiff = now.getTime() - this.createdAt.getTime();
  return Math.ceil(ageDiff / (60 * 1000)); // minutes
});

// Index for efficient queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ assignedPartner: 1, status: 1 });
orderSchema.index({ orderId: 1 });

module.exports = mongoose.model('Order', orderSchema); 