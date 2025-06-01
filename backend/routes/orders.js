const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateOrderCreation } = require('../middleware/validation');

const router = express.Router();

// Simple ObjectId validation middleware
const validateObjectId = (req, res, next) => {
  const id = req.params.id;
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order ID format'
    });
  }
  next();
};

// @route   GET /api/orders/test
// @desc    Test endpoint to verify API and auth
// @access  Private
router.get('/test', authenticateToken, async (req, res) => {
  try {
    // Try to fetch a simple count
    const orderCount = await Order.countDocuments();
    const userCount = await User.countDocuments();
    
    res.json({
      success: true,
      message: 'Orders API is working',
      data: {
        user: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          role: req.user.role,
          email: req.user.email
        },
        database: {
          totalOrders: orderCount,
          totalUsers: userCount
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
});

// @route   GET /api/orders/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'restaurant_manager') {
      // Restaurant manager stats
      const totalOrders = await Order.countDocuments({ restaurantManager: req.user._id });
      const pendingOrders = await Order.countDocuments({ 
        restaurantManager: req.user._id, 
        status: 'PENDING' 
      });
      const activeOrders = await Order.countDocuments({ 
        restaurantManager: req.user._id, 
        status: { $in: ['PREP', 'READY', 'PICKED', 'ON_ROUTE'] }
      });
      const completedOrders = await Order.countDocuments({
        restaurantManager: req.user._id,
        status: 'DELIVERED'
      });

      const totalRevenue = await Order.aggregate([
        { 
          $match: { 
            restaurantManager: req.user._id,
            status: 'DELIVERED'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]);

      // Count available partners
      const availablePartners = await User.countDocuments({
        role: 'delivery_partner',
        isAvailable: true
      });

      stats = {
        totalOrders,
        pendingOrders,
        activeOrders,
        completedOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        availablePartners
      };
    } else if (req.user.role === 'delivery_partner') {
      // Delivery partner stats
      const totalDeliveries = await Order.countDocuments({
        deliveryPartner: req.user._id,
        status: 'DELIVERED'
      });
      const pendingPickups = await Order.countDocuments({ 
        deliveryPartner: req.user._id, 
        status: 'READY'
      });
      const activeDeliveries = await Order.countDocuments({ 
        deliveryPartner: req.user._id, 
        status: { $in: ['PREP', 'PICKED', 'ON_ROUTE'] }
      });
      const completedToday = await Order.countDocuments({
        deliveryPartner: req.user._id,
        status: 'DELIVERED',
        deliveredAt: {
          $gte: new Date().setHours(0, 0, 0, 0),
          $lte: new Date().setHours(23, 59, 59, 999)
        }
      });

      // Calculate today's earnings
      const todayEarnings = await Order.aggregate([
        { 
          $match: { 
            deliveryPartner: req.user._id,
            status: 'DELIVERED',
            deliveredAt: {
              $gte: new Date().setHours(0, 0, 0, 0),
              $lte: new Date().setHours(23, 59, 59, 999)
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$totalAmount', 0.1] } } // 10% commission
          }
        }
      ]);

      stats = {
        totalDeliveries,
        pendingPickups,
        activeDeliveries,
        completedToday,
        earnings: todayEarnings[0]?.total || 0,
        rating: req.user.rating
      };
    }

    res.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private (Restaurant Manager)
router.post('/', 
  authenticateToken, 
  requireRole('restaurant_manager'), 
  validateOrderCreation,
  async (req, res) => {
    try {
      // Create order data with restaurant manager reference
      const orderData = {
        ...req.body,
        restaurantManager: req.user._id,
        orderPlacedAt: new Date()
      };

      const order = new Order(orderData);
      await order.save();
      
      // Populate order details for response
      const populatedOrder = await Order.findById(order._id)
        .populate('restaurantManager', 'firstName lastName phone');

      // Emit real-time event for new order
      const io = req.app.get('io');
      if (io) {
        // Notify all delivery partners about new order
        io.to('delivery_partner').emit('new_order_available', {
          orderId: order._id,
          restaurantName: `${populatedOrder.restaurantManager.firstName} ${populatedOrder.restaurantManager.lastName}`,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          address: order.customerAddress,
          phone: order.customerPhone,
          timestamp: new Date()
        });

        // Notify manager about successful order creation
        io.to(`user_${req.user._id}`).emit('order_created_success', {
          orderId: order._id,
          orderDetails: populatedOrder,
          timestamp: new Date()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          order: populatedOrder
        }
      });
    } catch (error) {
      console.error('Order creation error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation Error',
          errors: Object.values(error.errors).map(e => e.message)
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: error.message
      });
    }
  }
);

// @route   GET /api/orders
// @desc    Get orders with filtering and pagination
// @access  Private
router.get('/', 
  authenticateToken, 
  async (req, res) => {
    try {
      const {
        status,
        priority,
        page = 1,
        limit = 20,
        sortBy = 'orderPlacedAt',
        sortOrder = 'desc'
      } = req.query;

      // Build query based on user role
      let query = {};
      
      if (req.user.role === 'restaurant_manager') {
        query.restaurantManager = req.user._id;
      } else if (req.user.role === 'delivery_partner') {
        query.deliveryPartner = req.user._id;
      }

      // Add filters
      if (status) query.status = status;
      if (priority) query.priority = priority;

      // Build sort object
      const sortObj = {};
      sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Execute query with pagination
      const orders = await Order.find(query)
        .populate('restaurantManager', 'firstName lastName phone')
        .populate('deliveryPartner', 'firstName lastName phone vehicleType rating')
        .sort(sortObj)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();

      // Get total count for pagination
      const total = await Order.countDocuments(query);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        message: 'Orders retrieved successfully',
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalOrders: total,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      console.error('Orders fetch error:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch orders',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// @route   GET /api/orders/:id
// @desc    Get a specific order by ID
// @access  Private
router.get('/:id', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantManager', 'firstName lastName phone')
      .populate('deliveryPartner', 'firstName lastName phone vehicleType rating')
      .populate('trackingNotes.addedBy', 'firstName lastName role');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'restaurant_manager' && order.restaurantManager._id.equals(req.user._id) ||
      req.user.role === 'delivery_partner' && order.deliveryPartner && order.deliveryPartner._id.equals(req.user._id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order'
      });
    }

    res.json({
      success: true,
      message: 'Order retrieved successfully',
      data: {
        order,
        trackingInfo: order.getTrackingInfo()
      }
    });
  } catch (error) {
    console.error('Order fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update an order
// @access  Private (Restaurant Manager)
router.put('/:id', 
  authenticateToken, 
  requireRole('restaurant_manager'),
  validateObjectId,
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if user owns this order
      if (!order.restaurantManager.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order'
        });
      }

      // Prevent updates after certain statuses
      if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update completed or cancelled orders'
        });
      }

      // Store old status for comparison
      const oldStatus = order.status;

      // Update order
      const allowedUpdates = ['prepTime', 'estimatedDeliveryTime', 'priority', 'status'];
      const updates = {};
      
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      // Add timestamp for status changes
      if (updates.status && updates.status !== oldStatus) {
        switch (updates.status) {
          case 'PREP':
            updates.prepStartedAt = new Date();
            break;
          case 'READY':
            updates.readyAt = new Date();
            break;
        }
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      ).populate('restaurantManager deliveryPartner', 'firstName lastName phone');

      // Emit real-time status update
      const io = req.app.get('io');
      if (io && updates.status && updates.status !== oldStatus) {
        // Notify delivery partner if assigned
        if (updatedOrder.deliveryPartner) {
          io.to(`user_${updatedOrder.deliveryPartner._id}`).emit('order_status_updated', {
            orderId: updatedOrder._id,
            oldStatus: oldStatus,
            newStatus: updates.status,
            timestamp: new Date(),
            updatedBy: req.user.firstName,
            orderDetails: updatedOrder
          });
        }

        // Notify restaurant manager
        io.to(`user_${updatedOrder.restaurantManager._id}`).emit('order_status_updated', {
          orderId: updatedOrder._id,
          oldStatus: oldStatus,
          newStatus: updates.status,
          timestamp: new Date(),
          updatedBy: req.user.firstName,
          orderDetails: updatedOrder
        });
      }

      res.json({
        success: true,
        message: 'Order updated successfully',
        data: {
          order: updatedOrder
        }
      });
    } catch (error) {
      console.error('Order update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order',
        error: error.message
      });
    }
  }
);

// @route   POST /api/orders/:id/assign
// @desc    Assign delivery partner to order
// @access  Private (Restaurant Manager)
router.post('/:id/assign', 
  authenticateToken, 
  requireRole('restaurant_manager'),
  validateObjectId,
  async (req, res) => {
    try {
      const { partnerId } = req.body;

      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check ownership
      if (!order.restaurantManager.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order'
        });
      }

      // Check if order can be assigned
      if (!['PENDING', 'PREP', 'READY'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be reassigned at this stage'
        });
      }

      // Verify partner exists and is available
      const partner = await User.findById(partnerId);
      
      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Delivery partner not found'
        });
      }

      if (partner.role !== 'delivery_partner') {
        return res.status(400).json({
          success: false,
          message: 'User is not a delivery partner'
        });
      }

      if (!partner.isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Partner is not available'
        });
      }

      // Check if partner has other active orders
      const activeOrders = await Order.find({
        deliveryPartner: partnerId,
        status: { $in: ['PREP', 'PICKED', 'ON_ROUTE'] }
      });

      if (activeOrders.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Partner already has active deliveries'
        });
      }

      // Assign partner
      console.log('🔧 Assigning partner to order...');
      console.log('🔧 Order ID:', order._id);
      console.log('🔧 Partner ID:', partnerId);
      console.log('🔧 Order status before:', order.status);
      
      order.deliveryPartner = partnerId;
      if (order.status === 'PENDING') {
        order.status = 'PREP';
        order.prepStartedAt = new Date();
      }
      
      await order.save();
      
      console.log('🔧 Order saved with partner assignment');
      console.log('🔧 Order status after:', order.status);
      console.log('🔧 Delivery partner set to:', order.deliveryPartner);

      // Update partner availability
      partner.isAvailable = false;
      await partner.save();

      const updatedOrder = await Order.findById(order._id)
        .populate('restaurantManager deliveryPartner', 'firstName lastName phone vehicleType');

      console.log('🔧 Updated order retrieved with populated data');
      console.log('🔧 Delivery partner populated:', updatedOrder.deliveryPartner?.firstName, updatedOrder.deliveryPartner?.lastName);

      // Emit real-time partner assignment event
      const io = req.app.get('io');
      if (io) {
        // Notify the assigned partner
        io.to(`user_${partnerId}`).emit('order_assigned', {
          orderId: updatedOrder._id,
          orderDetails: updatedOrder,
          message: `You have been assigned a new order #${updatedOrder._id.toString().slice(-6).toUpperCase()}`,
          timestamp: new Date()
        });

        // Notify restaurant manager
        io.to(`user_${req.user._id}`).emit('partner_assigned_success', {
          orderId: updatedOrder._id,
          partnerName: `${updatedOrder.deliveryPartner.firstName} ${updatedOrder.deliveryPartner.lastName}`,
          orderDetails: updatedOrder,
          timestamp: new Date()
        });

        // Notify all restaurant managers about partner availability change
        io.to('restaurant_manager').emit('partner_availability_updated', {
          partnerId: partnerId,
          partnerName: `${partner.firstName} ${partner.lastName}`,
          isAvailable: false,
          reason: 'Order assigned',
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        message: 'Partner assigned successfully',
        data: {
          order: updatedOrder
        }
      });
    } catch (error) {
      console.error('Partner assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign partner',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/orders/:id/assign
// @desc    Assign delivery partner to order (PUT method for frontend compatibility)
// @access  Private (Restaurant Manager)
router.put('/:id/assign', 
  authenticateToken, 
  requireRole('restaurant_manager'),
  validateObjectId,
  async (req, res) => {
    try {
      const { partnerId } = req.body;

      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check ownership
      if (!order.restaurantManager.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order'
        });
      }

      // Check if order can be assigned
      if (!['PENDING', 'PREP', 'READY'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be reassigned at this stage'
        });
      }

      // Verify partner exists and is available
      const partner = await User.findById(partnerId);
      
      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Delivery partner not found'
        });
      }

      if (partner.role !== 'delivery_partner') {
        return res.status(400).json({
          success: false,
          message: 'User is not a delivery partner'
        });
      }

      if (!partner.isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Partner is not available'
        });
      }

      // Check if partner has other active orders
      const activeOrders = await Order.find({
        deliveryPartner: partnerId,
        status: { $in: ['PREP', 'PICKED', 'ON_ROUTE'] }
      });

      if (activeOrders.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Partner already has active deliveries'
        });
      }

      // Assign partner
      console.log('🔧 Assigning partner to order...');
      console.log('🔧 Order ID:', order._id);
      console.log('🔧 Partner ID:', partnerId);
      console.log('🔧 Order status before:', order.status);
      
      order.deliveryPartner = partnerId;
      if (order.status === 'PENDING') {
        order.status = 'PREP';
        order.prepStartedAt = new Date();
      }
      
      await order.save();
      
      console.log('🔧 Order saved with partner assignment');
      console.log('🔧 Order status after:', order.status);
      console.log('🔧 Delivery partner set to:', order.deliveryPartner);

      // Update partner availability
      partner.isAvailable = false;
      await partner.save();

      const updatedOrder = await Order.findById(order._id)
        .populate('restaurantManager deliveryPartner', 'firstName lastName phone vehicleType');

      console.log('🔧 Updated order retrieved with populated data');
      console.log('🔧 Delivery partner populated:', updatedOrder.deliveryPartner?.firstName, updatedOrder.deliveryPartner?.lastName);

      // Emit real-time partner assignment event
      const io = req.app.get('io');
      if (io) {
        // Notify the assigned partner
        io.to(`user_${partnerId}`).emit('order_assigned', {
          orderId: updatedOrder._id,
          orderDetails: updatedOrder,
          message: `You have been assigned a new order #${updatedOrder._id.toString().slice(-6).toUpperCase()}`,
          timestamp: new Date()
        });

        // Notify restaurant manager
        io.to(`user_${req.user._id}`).emit('partner_assigned_success', {
          orderId: updatedOrder._id,
          partnerName: `${updatedOrder.deliveryPartner.firstName} ${updatedOrder.deliveryPartner.lastName}`,
          orderDetails: updatedOrder,
          timestamp: new Date()
        });

        // Notify all restaurant managers about partner availability change
        io.to('restaurant_manager').emit('partner_availability_updated', {
          partnerId: partnerId,
          partnerName: `${partner.firstName} ${partner.lastName}`,
          isAvailable: false,
          reason: 'Order assigned',
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        message: 'Partner assigned successfully',
        data: {
          order: updatedOrder
        }
      });
    } catch (error) {
      console.error('Partner assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign partner',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/orders/:id/status
// @desc    Update order status (for delivery partners)
// @access  Private (Delivery Partner)
router.put('/:id/status', 
  authenticateToken, 
  requireRole('delivery_partner'),
  validateObjectId,
  async (req, res) => {
    try {
      const { status, notes } = req.body;

      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if partner is assigned to this order
      if (!order.deliveryPartner || !order.deliveryPartner.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this order'
        });
      }

      // Validate status transition
      const statusFlow = {
        'PREP': ['READY'],
        'READY': ['PICKED'],
        'PICKED': ['ON_ROUTE'],
        'ON_ROUTE': ['DELIVERED']
      };

      const allowedNextStatuses = statusFlow[order.status] || [];
      
      if (!allowedNextStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from ${order.status} to ${status}`
        });
      }

      // Store old status for real-time updates
      const oldStatus = order.status;

      // Update order status with timestamps
      order.status = status;
      
      switch (status) {
        case 'PICKED':
          order.pickedAt = new Date();
          break;
        case 'ON_ROUTE':
          order.onRouteAt = new Date();
          break;
        case 'DELIVERED':
          order.deliveredAt = new Date();
          break;
      }
      
      // Add tracking note if provided
      if (notes) {
        order.trackingNotes.push({
          note: notes,
          addedBy: req.user._id
        });
      }

      await order.save();

      // Update partner availability when order is delivered
      if (status === 'DELIVERED') {
        await User.findByIdAndUpdate(req.user._id, { 
          isAvailable: true,
          $inc: { totalDeliveries: 1 }
        });
      }

      const updatedOrder = await Order.findById(order._id)
        .populate('restaurantManager deliveryPartner', 'firstName lastName phone')
        .populate('trackingNotes.addedBy', 'firstName lastName role');

      // Emit real-time status update
      const io = req.app.get('io');
      if (io) {
        // Notify restaurant manager
        io.to(`user_${updatedOrder.restaurantManager._id}`).emit('order_status_updated', {
          orderId: updatedOrder._id,
          oldStatus: oldStatus,
          newStatus: status,
          timestamp: new Date(),
          updatedBy: req.user.firstName,
          orderDetails: updatedOrder,
          notes: notes
        });

        // Notify delivery partner
        io.to(`user_${req.user._id}`).emit('order_status_updated', {
          orderId: updatedOrder._id,
          oldStatus: oldStatus,
          newStatus: status,
          timestamp: new Date(),
          updatedBy: req.user.firstName,
          orderDetails: updatedOrder,
          notes: notes
        });

        // If order is delivered, notify about partner availability
        if (status === 'DELIVERED') {
          io.to('restaurant_manager').emit('partner_availability_updated', {
            partnerId: req.user._id,
            partnerName: `${req.user.firstName} ${req.user.lastName}`,
            isAvailable: true,
            reason: 'Order delivered',
            timestamp: new Date()
          });

          // Notify partner about completion
          io.to(`user_${req.user._id}`).emit('order_completed', {
            orderId: updatedOrder._id,
            orderDetails: updatedOrder,
            message: `Order #${updatedOrder._id.toString().slice(-6).toUpperCase()} completed successfully!`,
            timestamp: new Date()
          });
        }
      }

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          order: updatedOrder,
          trackingInfo: updatedOrder.getTrackingInfo()
        }
      });
    } catch (error) {
      console.error('Order status update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error.message
      });
    }
  }
);

// @route   POST /api/orders/:id/rating
// @desc    Rate an order
// @access  Private
router.post('/:id/rating', 
  authenticateToken,
  validateObjectId, 
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Only allow rating after delivery
      if (order.status !== 'DELIVERED') {
        return res.status(400).json({
          success: false,
          message: 'Order must be delivered before rating'
        });
      }

      // Check if already rated
      if (order.rating && order.rating.overallExperience) {
        return res.status(400).json({
          success: false,
          message: 'Order has already been rated'
        });
      }

      // Update order rating
      order.rating = req.body.rating;
      await order.save();

      // Update delivery partner's average rating
      if (order.deliveryPartner) {
        const partnerOrders = await Order.find({
          deliveryPartner: order.deliveryPartner,
          status: 'DELIVERED',
          'rating.deliveryService': { $exists: true }
        });

        const avgRating = partnerOrders.reduce((sum, ord) => 
          sum + ord.rating.deliveryService, 0) / partnerOrders.length;

        await User.findByIdAndUpdate(order.deliveryPartner, {
          rating: Math.round(avgRating * 10) / 10
        });
      }

      res.json({
        success: true,
        message: 'Order rated successfully',
        data: {
          rating: order.rating
        }
      });
    } catch (error) {
      console.error('Order rating error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rate order',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/orders/:id
// @desc    Cancel an order
// @access  Private (Restaurant Manager)
router.delete('/:id', 
  authenticateToken, 
  requireRole('restaurant_manager'),
  validateObjectId, 
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check ownership
      if (!order.restaurantManager.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this order'
        });
      }

      // Can only cancel pending or prep orders
      if (!['PENDING', 'PREP'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel order at this stage'
        });
      }

      // Cancel order
      order.status = 'CANCELLED';
      await order.save();

      // Make delivery partner available again if assigned
      if (order.deliveryPartner) {
        await User.findByIdAndUpdate(order.deliveryPartner, { isAvailable: true });
      }

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          order
        }
      });
    } catch (error) {
      console.error('Order cancellation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel order',
        error: error.message
      });
    }
  }
);

module.exports = router; 