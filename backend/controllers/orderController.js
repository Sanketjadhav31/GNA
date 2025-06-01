const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');

// @desc    Create new order (Manager only)
// @route   POST /api/orders
// @access  Private (Manager)
const createOrder = async (req, res) => {
  try {
    const { orderId, items, prepTime, customerName, customerPhone, customerAddress, totalAmount } = req.body;
    
    // Validation
    if (!orderId || !items || !prepTime || !customerName || !customerPhone || !customerAddress || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (prepTime <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Prep time must be greater than 0'
      });
    }
    
    // Create order
    const order = new Order({
      orderId,
      items, 
      prepTime,
      customerName,
      customerPhone,
      customerAddress,
      totalAmount,
      createdBy: req.user.userId
    });
    
    await order.save();

    // Emit real-time event to all managers
    if (req.io) {
      req.io.to('manager').emit('orderCreated', {
        order: await order.populate('createdBy', 'name'),
        message: `New order ${orderId} created`
      });

      // Also emit to all partners about new available order
      req.io.emit('new_order_available', {
          orderId: order.orderId,
        _id: order._id,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          items: order.items,
          prepTime: order.prepTime,
        status: 'PREP',
          createdAt: order.createdAt,
        message: `New order ${orderId} is available for pickup`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// @desc    Get all orders (Manager view)
// @route   GET /api/orders
// @access  Private (Manager)
const getAllOrders = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    // Ensure only managers can view all orders
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can view all orders'
      });
    }

    const { status, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build query
    let query = {};
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    // Get orders with pagination
    const orders = await Order.find(query)
      .populate('assignedTo', 'name phone vehicleType vehicleNumber stats.rating')
      .populate('createdBy', 'name email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);

    // Get status summary
    const statusSummary = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
          hasPrev: page > 1
        },
        summary: {
          statusBreakdown: statusSummary,
          totalValue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
        }
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: error.message
    });
  }
};

// @desc    Get single order by ID
// @route   GET /api/orders/:id
// @access  Private (Role-based access)
const getOrderById = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id: orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('assignedTo', 'name phone vehicleType vehicleNumber stats.rating')
      .populate('createdBy', 'name email restaurantInfo.name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Role-based access control
    if (role === 'partner') {
      // Partners can only see their assigned orders
      if (!order.assignedTo || order.assignedTo._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view orders assigned to you'
        });
      }
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order',
      error: error.message
    });
  }
};

// @desc    Assign partner to order (Manager only)
// @route   PATCH /api/orders/:id/assign
// @access  Private (Manager)
const assignPartner = async (req, res) => {
  try {
    const { partnerId, partnerEmail } = req.body;
    const orderId = req.params.id;
    
    console.log('🔄 Processing partner assignment:', { orderId, partnerId, partnerEmail });
    
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is already assigned
    if (order.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Order is already assigned to a partner'
      });
    }

    // Check if order is in correct status for assignment
    if (order.status !== 'PREP') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in PREP status to assign a partner'
      });
    }
    
    // Find partner
    const partner = await User.findById(partnerId);
    if (!partner || partner.role !== 'partner') {
      return res.status(400).json({
        success: false,
        message: 'Invalid partner or partner not found'
      });
    }

    // Check if partner is available
    if (!partner.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Partner is not available for new orders'
      });
    }

    // Assign partner to order
    order.assignedTo = partnerId;
    order.assignedAt = new Date();
    order.status = 'PREP'; // Ensure status is PREP when assigned
    await order.save();
    
    // Update partner status to busy
    partner.isAvailable = false;
    partner.currentOrder = orderId;
    await partner.save();

    // Populate order with partner details
    const populatedOrder = await Order.findById(orderId)
      .populate('assignedTo', 'name phone email')
      .populate('createdBy', 'name email');

    console.log('✅ Order assigned successfully:', {
      orderId: order.orderId,
      partnerName: partner.name,
      partnerEmail: partner.email
    });
    
    // Emit comprehensive real-time events
    if (req.io) {
      // 1. Notify all managers about the assignment
      req.io.to('manager').emit('order_assigned', {
        order: populatedOrder,
        partnerId: partnerId,
        partnerName: partner.name,
        partnerEmail: partner.email,
        assignedBy: req.user.name || 'Manager',
        timestamp: new Date(),
        message: `Order ${order.orderId} assigned to ${partner.name}`
      });

      // 2. Notify the assigned partner using multiple room strategies
      const assignmentData = {
        order: {
          _id: order._id,
          orderId: order.orderId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail || 'Not provided',
          customerAddress: order.customerAddress,
          totalAmount: order.totalAmount,
          items: order.items,
          specialInstructions: order.specialInstructions || '',
          estimatedDeliveryTime: order.estimatedDeliveryTime || 30,
          status: order.status,
          assignedAt: order.assignedAt,
          priority: order.priority || 'medium'
        },
        partner: {
          id: partnerId,
          name: partner.name,
          email: partner.email
        },
        assignedBy: req.user.name || 'Manager',
        timestamp: new Date(),
        message: `You have been assigned order ${order.orderId}`
      };

      // Emit to partner's user ID room
      req.io.to(partnerId).emit('order-assigned', assignmentData);

      // Emit to partner's email-based room
      if (partner.email) {
        req.io.to(partner.email).emit('order-assigned', assignmentData);
      }

      // 3. Notify all managers about partner status change
      req.io.to('manager').emit('partner_status_updated', {
        partnerId: partnerId,
        partnerName: partner.name,
        partnerEmail: partner.email,
        newStatus: 'busy',
        currentOrder: orderId,
        timestamp: new Date(),
        message: `${partner.name} is now busy with order ${order.orderId}`
      });

      // 4. Update available orders for all partners (remove this order)
      req.io.emit('order_no_longer_available', {
        orderId: order._id,
        orderNumber: order.orderId,
        reason: 'assigned',
        assignedTo: partner.name,
        timestamp: new Date()
      });

      console.log('📡 Socket.IO events emitted for order assignment');
    }

    res.json({
      success: true,
      message: 'Partner assigned successfully',
      data: populatedOrder
    });

  } catch (error) {
    console.error('❌ Assign partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign partner',
      error: error.message
    });
  }
};

// @desc    Update order status (Partner only)
// @route   PATCH /api/orders/:id/status
// @access  Private (Partner)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;
    
    console.log(`🔄 Updating order ${orderId} status to ${status} by partner ${req.user.id}`);
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Find order
    const order = await Order.findById(orderId)
      .populate('assignedTo', 'name phone email')
      .populate('createdBy', 'name email');
      
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if partner is assigned to this order
    if (!order.assignedTo || order.assignedTo._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this order'
      });
    }

    // Validate status transition
    const validTransitions = {
      PREP: ['PICKED'],
      PICKED: ['ON_ROUTE'],
      ON_ROUTE: ['DELIVERED']
    };
    
    if (!validTransitions[order.status] || !validTransitions[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}. Valid transitions: ${validTransitions[order.status]?.join(', ') || 'none'}`
      });
    }

    // Update order status
    const previousStatus = order.status;
    order.status = status;

    // Set timestamps for different statuses
    switch (status) {
      case 'PICKED':
        order.pickedAt = new Date();
        break;
      case 'ON_ROUTE':
        order.onRouteAt = new Date();
        break;
      case 'DELIVERED':
        order.deliveredAt = new Date();
        order.rating = 5; // Default rating
        break;
    }
    
    await order.save();
    
    // If delivered, update partner status to available
    if (status === 'DELIVERED') {
      const partner = await User.findById(req.user.id);
      if (partner) {
        partner.isAvailable = true;
        partner.currentOrder = null;
        // Update partner stats
        if (!partner.stats) {
          partner.stats = { totalDeliveries: 0, totalEarnings: 0, rating: 5.0 };
        }
        partner.stats.totalDeliveries += 1;
        partner.stats.totalEarnings += order.totalAmount;
        await partner.save();
        
        console.log(`✅ Partner ${partner.name} marked as available after delivery completion`);
      }
    }
    
    // Populate updated order
    const updatedOrder = await Order.findById(orderId)
      .populate('assignedTo', 'name phone email')
      .populate('createdBy', 'name email');
    
    console.log(`✅ Order ${order.orderId} status updated from ${previousStatus} to ${status}`);
    
    // Emit comprehensive real-time events
    if (req.io) {
      // 1. Notify all managers about status update
      req.io.to('manager').emit('notify_managers', {
        type: 'order_status_updated',
        orderId: order._id,
        orderNumber: order.orderId,
        previousStatus,
        newStatus: status,
        partnerName: order.assignedTo.name,
        partnerEmail: order.assignedTo.email,
        customerName: order.customerName,
        timestamp: new Date(),
        message: `Order ${order.orderId} status updated to ${status} by ${order.assignedTo.name}`
      });

      // 2. Notify partner about successful status update
      req.io.to(req.user.id).emit('status-update-confirmed', {
            orderId: order._id,
            orderNumber: order.orderId,
        previousStatus,
        newStatus: status,
        timestamp: new Date(),
        completedOrder: status === 'DELIVERED',
        earnings: status === 'DELIVERED' ? order.totalAmount : null,
        message: `Order status updated to ${status}`
      });
      
      // 3. If delivered, notify about partner availability
      if (status === 'DELIVERED') {
        req.io.to('manager').emit('partner_available', {
          partnerId: req.user.id,
            partnerName: order.assignedTo.name,
          partnerEmail: order.assignedTo.email,
          completedOrder: order.orderId,
          earnings: order.totalAmount,
          timestamp: new Date(),
          message: `${order.assignedTo.name} completed delivery and is now available`
        });
        
        // Notify partner about delivery completion
        req.io.to(req.user.id).emit('delivery-completed', {
            orderId: order._id,
            orderNumber: order.orderId,
          earnings: order.totalAmount,
            customerName: order.customerName,
          timestamp: new Date(),
          message: 'Delivery completed successfully! You are now available for new orders.'
        });
      }
      
      console.log('📡 Socket.IO events emitted for status update');
    }
    
    res.json({
      success: true,
      message: `Order status updated to ${status} successfully`,
      data: updatedOrder
    });
    
  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// @desc    Get available orders for partners
// @route   GET /api/orders/available
// @access  Private (Partner)
const getAvailableOrders = async (req, res) => {
  try {
    // Get unassigned orders in PREP status
    const availableOrders = await Order.find({
      status: 'PREP',
      assignedTo: null
    })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      message: 'Available orders retrieved successfully',
      data: availableOrders,
      count: availableOrders.length
    });
    
  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available orders',
      error: error.message
    });
  }
};

// @desc    Get current order for partner
// @route   GET /api/orders/current
// @access  Private (Partner)
const getCurrentOrder = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can access this endpoint'
      });
    }

    // Find current active order for this partner
    const currentOrder = await Order.findOne({
      assignedTo: userId,
      status: { $in: ['PREP', 'PICKED', 'ON_ROUTE'] }
    })
    .populate('createdBy', 'name email')
    .sort({ assignedAt: -1 });

    if (!currentOrder) {
      return res.json({
        success: true,
        data: null,
        message: 'No current active order'
      });
    }

    res.json({
      success: true,
      data: currentOrder
    });

  } catch (error) {
    console.error('Get current order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching current order',
      error: error.message
    });
  }
};

// @desc    Get partner's order history
// @route   GET /api/orders/partner/history
// @access  Private (Partner)
const getPartnerOrderHistory = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can access this endpoint'
      });
    }

    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    // Build query for partner's orders
    let query = { assignedTo: userId };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get orders with pagination
    const orders = await Order.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);

    // Calculate statistics
    const stats = await Order.aggregate([
      { $match: { assignedTo: userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0] }
          },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    const partnerStats = stats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      totalEarnings: 0,
      averageRating: 0
    };

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
          hasPrev: page > 1
        },
        stats: partnerStats
      }
    });

  } catch (error) {
    console.error('Get partner order history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order history',
      error: error.message
    });
  }
};

// @desc    Get orders by status (Manager only)
// @route   GET /api/orders/status/:status
// @access  Private (Manager)
const getOrdersByStatus = async (req, res) => {
  try {
    const { role } = req.user;
    const { status } = req.params;

    // Ensure only managers can access this endpoint
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can access this endpoint'
      });
    }

    const validStatuses = ['PREP', 'PICKED', 'ON_ROUTE', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }

    const orders = await Order.getOrdersByStatus(status);

    res.json({
      success: true,
      data: {
        orders,
        count: orders.length,
        status
      }
    });

  } catch (error) {
    console.error('Get orders by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders by status',
      error: error.message
    });
  }
};

// @desc    Get available partners (Manager only)
// @route   GET /api/users?role=partner&isAvailable=true
// @access  Private (Manager)
const getAvailablePartners = async (req, res) => {
  try {
    const { role } = req.user;

    // Ensure only managers can access this endpoint
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can access this endpoint'
      });
    }

    const partners = await User.getAvailablePartners();

    res.json({
      success: true,
      data: {
        partners,
        count: partners.length
      }
    });

  } catch (error) {
    console.error('Get available partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available partners',
      error: error.message
    });
  }
};

// @desc    Get order analytics (Manager only)
// @route   GET /api/orders/analytics
// @access  Private (Manager)
const getOrderAnalytics = async (req, res) => {
  try {
    const { role } = req.user;

    // Ensure only managers can access this endpoint
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can access this endpoint'
      });
    }

    const { timeRange = 'today', startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      switch (timeRange) {
        case 'today':
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          dateFilter = { createdAt: { $gte: startOfDay } };
          break;
        case 'week':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - 7);
          dateFilter = { createdAt: { $gte: startOfWeek } };
          break;
        case 'month':
          const startOfMonth = new Date(now);
          startOfMonth.setMonth(now.getMonth() - 1);
          dateFilter = { createdAt: { $gte: startOfMonth } };
          break;
        default:
          // All time
        break;
      }
    }

    // Get order analytics
    const analytics = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $in: ['$status', ['PREP', 'PICKED', 'ON_ROUTE']] }, 1, 0] }
          },
          averageOrderValue: { $avg: '$totalAmount' },
          averagePrepTime: { $avg: '$prepTime' }
  }
      }
    ]);

    // Get status breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get daily trends (last 7 days)
    const dailyTrends = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
    }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const analyticsData = analytics[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      averageOrderValue: 0,
      averagePrepTime: 0
    };

    res.json({
      success: true,
      data: {
        summary: {
          ...analyticsData,
          completionRate: analyticsData.totalOrders > 0 
            ? parseFloat(((analyticsData.completedOrders / analyticsData.totalOrders) * 100).toFixed(2))
            : 0
        },
        statusBreakdown,
        dailyTrends,
        timeRange
      }
    });

  } catch (error) {
    console.error('Get order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order analytics',
      error: error.message
    });
  }
};

// @desc    Get partner analytics (Manager only)
// @route   GET /api/orders/partner-analytics
// @access  Private (Manager)
const getPartnerAnalytics = async (req, res) => {
  try {
    const { role } = req.user;

    // Ensure only managers can access this endpoint
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can access this endpoint'
      });
    }

    const { timeRange = 'today', partnerId } = req.query;

    // Build date filter
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: startOfDay } };
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - 7);
        dateFilter = { createdAt: { $gte: startOfWeek } };
        break;
      case 'month':
        const startOfMonth = new Date(now);
        startOfMonth.setMonth(now.getMonth() - 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
        break;
      default:
        break;
    }

    // Add partner filter if specified
    if (partnerId) {
      dateFilter.assignedTo = partnerId;
    }

    // Get partner performance analytics
    const partnerStats = await Order.aggregate([
      { $match: { assignedTo: { $ne: null }, ...dateFilter } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'partner'
        }
      },
      { $unwind: '$partner' },
      {
        $group: {
          _id: '$assignedTo',
          partnerName: { $first: '$partner.name' },
          partnerEmail: { $first: '$partner.email' },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0] }
          },
          averageRating: { $avg: '$rating' },
          averageDeliveryTime: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$deliveredAt', null] }, { $ne: ['$createdAt', null] }] },
                { $divide: [{ $subtract: ['$deliveredAt', '$createdAt'] }, 60000] },
                null
              ]
            }
          }
        }
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $multiply: [{ $divide: ['$completedOrders', '$totalOrders'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalOrders: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        partners: partnerStats,
        timeRange,
        summary: {
          totalPartners: partnerStats.length,
          totalOrders: partnerStats.reduce((sum, p) => sum + p.totalOrders, 0),
          totalEarnings: partnerStats.reduce((sum, p) => sum + p.totalEarnings, 0),
          averageCompletionRate: partnerStats.length > 0
            ? parseFloat((partnerStats.reduce((sum, p) => sum + p.completionRate, 0) / partnerStats.length).toFixed(2))
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Get partner analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner analytics',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  assignPartner,
  updateOrderStatus,
  getCurrentOrder,
  getOrdersByStatus,
  getAvailableOrders,
  getAvailablePartners,
  getPartnerOrderHistory,
  getOrderAnalytics,
  getPartnerAnalytics
}; 