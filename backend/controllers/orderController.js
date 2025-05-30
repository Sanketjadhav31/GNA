const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');

// @desc    Create new order (Manager only)
// @route   POST /api/orders
// @access  Private (Manager)
const createOrder = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, role } = req.user;

    // Ensure only managers can create orders
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can create orders'
      });
    }

    const manager = await User.findById(userId);
    if (!manager || !manager.canCreateOrder()) {
      return res.status(403).json({
        success: false,
        message: 'Manager does not have permission to create orders'
      });
    }

    const { 
      items, 
      customerName, 
      customerPhone, 
      customerAddress, 
      prepTime,
      estimatedDeliveryTime,
      priority 
    } = req.body;

    // Calculate total amount from items
    const totalAmount = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Create new order with auto-generated orderId
    const order = new Order({
      items,
      totalAmount,
      customerName,
      customerPhone,
      customerAddress,
      prepTime: prepTime || manager.preferences.defaultPrepTime,
      estimatedDeliveryTime: estimatedDeliveryTime || 30,
      priority: priority || 'medium',
      createdBy: userId,
      status: 'PREP'
    });

    // Save order (dispatch time will be auto-calculated by pre-save middleware)
    await order.save();

    // Update manager statistics
    await manager.updateOrderStats(totalAmount, order.prepTime);

    // Populate order with manager details
    await order.populate('createdBy', 'name email role');

    // Emit socket event to notify available partners about new order
    const io = req.app.get('io');
    if (io) {
      // Find available partners to notify
      const availablePartners = await DeliveryPartner.find({ 
        status: 'available',
        isActive: true 
      }).select('_id name');

      // Notify available partners about new order
      io.to('role_partner').emit('new_order_available', {
        orderId: order._id,
        orderNumber: order.orderId,
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        totalAmount: order.totalAmount,
        prepTime: order.prepTime,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        priority: order.priority,
        createdAt: order.createdAt,
        restaurantName: manager.restaurantInfo?.name || manager.name,
        availablePartnerCount: availablePartners.length
      });

      // Notify managers about new order creation
      io.to('role_manager').emit('order_created', {
        orderId: order._id,
        orderNumber: order.orderId,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        status: order.status,
        createdBy: manager.name,
        timestamp: new Date()
      });
    }

    console.log(`✅ New order ${order.orderId} created by ${manager.name} - Notified ${await DeliveryPartner.countDocuments({ status: 'available', isActive: true })} available partners`);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order,
        dispatchTime: order.dispatchTime,
        timeUntilDispatch: order.timeUntilDispatch
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order',
      error: error.message
    });
  }
};

// @desc    Get all orders (Manager view)
// @route   GET /api/orders
// @access  Private (Manager)
const getAllOrders = async (req, res) => {
  try {
    const { userId, role } = req.user;

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
      .populate('assignedPartner', 'name phone vehicleType vehicleNumber stats.rating')
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
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;

    let order;

    if (role === 'manager') {
      // Manager can view any order
      order = await Order.findById(id)
        .populate('assignedPartner', 'name phone vehicleType vehicleNumber stats currentLocation')
        .populate('createdBy', 'name email')
        .populate('statusHistory.updatedBy');
    } else if (role === 'partner') {
      // Partner can only view their assigned order
      order = await Order.findOne({ 
        _id: id,
        assignedPartner: userId 
      })
        .populate('createdBy', 'name email restaurantInfo')
        .populate('statusHistory.updatedBy');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    res.json({
      success: true,
      data: {
        order
      }
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

// @desc    Assign delivery partner to order (Manager only)
// @route   PUT /api/orders/:id/assign-partner
// @access  Private (Manager)
const assignPartner = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;
    const { partnerId } = req.body;

    // Ensure only managers can assign partners
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can assign delivery partners'
      });
    }

    const manager = await User.findById(userId);
    if (!manager || !manager.canAssignPartner()) {
      return res.status(403).json({
        success: false,
        message: 'Manager does not have permission to assign partners'
      });
    }

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be assigned (should be in PREP status)
    if (order.status !== 'PREP') {
      return res.status(400).json({
        success: false,
        message: 'Order can only be assigned when in PREP status'
      });
    }

    // Check if order already has a partner assigned
    if (order.assignedPartner) {
      return res.status(400).json({
        success: false,
        message: 'Order already has a delivery partner assigned'
      });
    }

    // Find the delivery partner
    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery partner not found'
      });
    }

    // Validate partner availability (as per PRD: workload validation)
    if (!partner.canTakeOrder()) {
      return res.status(400).json({
        success: false,
        message: 'Delivery partner is not available for new orders'
      });
    }

    // Prevent duplicate assignment (as per PRD: duplicate rider prevention)
    const existingAssignment = await Order.findOne({
      assignedPartner: partnerId,
      status: { $in: ['PICKED', 'ON_ROUTE'] }
    });

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Partner is already assigned to another active order'
      });
    }

    // Assign partner to order
    order.assignedPartner = partnerId;
    order.assignedAt = new Date();
    await order.save();

    // Update partner's current order (as per PRD: one partner per order)
    await partner.assignOrder(order._id);

    // Populate the updated order
    await order.populate('assignedPartner', 'name phone vehicleType vehicleNumber stats');
    await order.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Delivery partner assigned successfully',
      data: {
        order,
        partner: {
          id: partner._id,
          name: partner.name,
          phone: partner.phone,
          vehicleType: partner.vehicleType,
          rating: partner.stats.rating
        }
      }
    });

  } catch (error) {
    console.error('Assign partner error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning partner',
      error: error.message
    });
  }
};

// @desc    Update order status (Partner only)
// @route   PUT /api/orders/:id/status
// @access  Private (Partner)
const updateOrderStatus = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    // Ensure only partners can update order status
    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can update order status'
      });
    }

    // Find the order
    const order = await Order.findOne({
      _id: id,
      assignedPartner: userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or not assigned to you'
      });
    }

    // Validate status transition (as per PRD: status flow enforced)
    if (!order.canTransitionTo(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${order.status} to ${status}. Valid transitions: ${order.status === 'PREP' ? 'PICKED' : order.status === 'PICKED' ? 'ON_ROUTE' : order.status === 'ON_ROUTE' ? 'DELIVERED' : 'none'}`
      });
    }

    // Update order status using the model method
    await order.updateStatus(status, userId, 'DeliveryPartner');

    // Handle order completion (as per PRD: partner becomes available after delivery)
    if (status === 'DELIVERED') {
      const partner = await DeliveryPartner.findById(userId);
      await partner.completeOrder();
      
      // Update manager's completion stats
      const manager = await User.findById(order.createdBy);
      if (manager) {
        await manager.updateOrderStats(order.totalAmount, order.prepTime, true);
      }
      
      // Update partner's delivery stats
      const deliveryTime = Math.floor((new Date() - order.createdAt) / (60 * 1000));
      const wasOnTime = deliveryTime <= (order.prepTime + order.estimatedDeliveryTime + 10); // 10 min buffer
      await partner.updateStats(deliveryTime, wasOnTime);
    }

    // Populate updated order
    await order.populate('assignedPartner', 'name phone vehicleType stats');
    await order.populate('createdBy', 'name email restaurantInfo');

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: {
        order,
        statusTransition: {
          from: order.statusHistory[order.statusHistory.length - 2]?.status || 'PREP',
          to: status,
          timestamp: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status',
      error: error.message
    });
  }
};

// @desc    Get partner's current order (Partner only)
// @route   GET /api/orders/my-current
// @access  Private (Partner)
const getPartnerCurrentOrder = async (req, res) => {
  try {
    const { userId, role } = req.user;

    // Ensure only partners can access this endpoint
    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can access this endpoint'
      });
    }

    // Get partner's current order
    const order = await Order.getPartnerCurrentOrder(userId);

    if (!order) {
      return res.json({
        success: true,
        message: 'No active order assigned',
        data: {
          order: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        order
      }
    });

  } catch (error) {
    console.error('Get partner current order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching current order',
      error: error.message
    });
  }
};

// @desc    Get orders by status (for analytics)
// @route   GET /api/orders/status/:status
// @access  Private (Manager)
const getOrdersByStatus = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { status } = req.params;

    // Ensure only managers can access this endpoint
    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can access this endpoint'
      });
    }

    // Validate status
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
        status,
        count: orders.length,
        orders
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

// @desc    Get order analytics (Manager only)
// @route   GET /api/orders/analytics
// @access  Private (Manager)
const getOrderAnalytics = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view order analytics'
      });
    }

    const { timeRange = 'today' } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Get comprehensive analytics
    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          activeOrders: {
            $sum: { $cond: [{ $in: ['$status', ['PREP', 'PICKED', 'ON_ROUTE']] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0] }
          },
          avgOrderValue: { $avg: '$totalAmount' },
          avgDeliveryTime: { $avg: '$actualDeliveryTime' }
        }
      }
    ]);

    // Get daily breakdown
    const dailyBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get peak hours
    const peakHours = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 5 }
    ]);

    const analyticsData = analytics[0] || {
      totalOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      avgDeliveryTime: 0
    };

    // Calculate additional metrics
    analyticsData.deliverySuccess = analyticsData.totalOrders > 0 ? 
      parseFloat(((analyticsData.completedOrders / analyticsData.totalOrders) * 100).toFixed(2)) : 0;

    // Calculate growth (compare with previous period)
    const previousStartDate = new Date(startDate);
    const periodDiff = new Date() - startDate;
    previousStartDate.setTime(startDate.getTime() - periodDiff);

    const previousAnalytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousStartDate, $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0] }
          }
        }
      }
    ]);

    const prevData = previousAnalytics[0] || { totalOrders: 0, totalRevenue: 0 };
    analyticsData.orderGrowth = prevData.totalOrders > 0 ? 
      parseFloat((((analyticsData.totalOrders - prevData.totalOrders) / prevData.totalOrders) * 100).toFixed(2)) : 0;
    analyticsData.revenueGrowth = prevData.totalRevenue > 0 ? 
      parseFloat((((analyticsData.totalRevenue - prevData.totalRevenue) / prevData.totalRevenue) * 100).toFixed(2)) : 0;

    res.json({
      success: true,
      data: {
        ...analyticsData,
        dailyBreakdown,
        statusBreakdown,
        peakHours,
        timeRange,
        lastUpdated: new Date()
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

// @desc    Get recent orders for dashboard
// @route   GET /api/orders/recent
// @access  Private (Manager)
const getRecentOrders = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view recent orders'
      });
    }

    const { limit = 10 } = req.query;

    // Get recent orders with partner information
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('assignedPartner', 'name phone vehicleType vehicleNumber')
      .populate('createdBy', 'name restaurantInfo.name')
      .lean();

    // Add computed fields
    const enrichedOrders = orders.map(order => ({
      ...order,
      timeAgo: getTimeAgo(order.createdAt),
      statusColor: getStatusColor(order.status),
      priority: order.priority || 'medium'
    }));

    res.json({
      success: true,
      data: enrichedOrders,
      count: enrichedOrders.length,
      message: `Retrieved ${enrichedOrders.length} recent orders`
    });

  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent orders',
      error: error.message
    });
  }
};

// Helper function to get time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

// Helper function to get status color
const getStatusColor = (status) => {
  const colors = {
    PREP: 'amber',
    PICKED: 'blue',
    ON_ROUTE: 'purple',
    DELIVERED: 'green',
    CANCELLED: 'red'
  };
  return colors[status] || 'gray';
};

// @desc    Get partner analytics for managers
// @route   GET /api/orders/partner-analytics
// @access  Private (Manager)
const getPartnerAnalytics = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view partner analytics'
      });
    }

    const { timeRange = 'today' } = req.query;
    
    // Calculate date range
    let startDate = new Date();
    switch (timeRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Get partner analytics from orders
    const partnerAnalytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          assignedPartner: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'deliverypartners',
          localField: 'assignedPartner',
          foreignField: '_id',
          as: 'partnerInfo'
        }
      },
      {
        $unwind: '$partnerInfo'
      },
      {
        $group: {
          _id: '$assignedPartner',
          partnerName: { $first: '$partnerInfo.name' },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, { $multiply: ['$totalAmount', 0.1] }, 0] }
          },
          avgDeliveryTime: { $avg: '$actualDeliveryTime' },
          vehicleType: { $first: '$partnerInfo.vehicleType' },
          rating: { $first: '$partnerInfo.stats.rating' }
        }
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $multiply: [{ $divide: ['$completedOrders', '$totalOrders'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { completedOrders: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        partners: partnerAnalytics,
        timeRange,
        summary: {
          totalActivePartners: partnerAnalytics.length,
          totalOrders: partnerAnalytics.reduce((sum, p) => sum + p.totalOrders, 0),
          totalEarnings: partnerAnalytics.reduce((sum, p) => sum + p.totalEarnings, 0),
          avgSuccessRate: partnerAnalytics.length > 0 ? 
            parseFloat((partnerAnalytics.reduce((sum, p) => sum + p.successRate, 0) / partnerAnalytics.length).toFixed(2)) : 0
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

// @desc    Search orders
// @route   GET /api/orders/search
// @access  Private (Manager)
const searchOrders = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can search orders'
      });
    }

    const { q, status, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    let query = {
      $or: [
        { orderId: { $regex: q, $options: 'i' } },
        { customerName: { $regex: q, $options: 'i' } },
        { customerPhone: { $regex: q, $options: 'i' } },
        { customerAddress: { $regex: q, $options: 'i' } }
      ]
    };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .populate('assignedPartner', 'name phone vehicleType')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await Order.countDocuments(query);

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
        searchQuery: q
      }
    });

  } catch (error) {
    console.error('Search orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching orders',
      error: error.message
    });
  }
};

// @desc    Get available orders for partners (PREP status, no assigned partner)
// @route   GET /api/orders/available  
// @access  Private (Partner)
const getAvailableOrders = async (req, res) => {
  try {
    const { userId, role } = req.user;

    // Ensure only partners can access this endpoint
    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can access available orders'
      });
    }

    // Get orders that are ready for pickup (PREP status, no assigned partner)
    const availableOrders = await Order.find({
      status: 'PREP',
      assignedPartner: null
    })
      .populate('createdBy', 'name email restaurantInfo')
      .sort({ createdAt: 1 }) // First come, first served
      .limit(20); // Limit to prevent overwhelming

    res.json({
      success: true,
      data: availableOrders,
      count: availableOrders.length,
      message: `Found ${availableOrders.length} available orders`
    });

  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available orders',
      error: error.message
    });
  }
};

// @desc    Accept an available order (Partner only)
// @route   POST /api/orders/:id/accept
// @access  Private (Partner)
const acceptOrder = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;

    // Ensure only partners can accept orders
    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can accept orders'
      });
    }

    // Find the partner
    const partner = await DeliveryPartner.findById(userId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Delivery partner not found'
      });
    }

    // Check if partner can take orders (available status)
    if (partner.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: `You must be available to accept orders. Current status: ${partner.status}`
      });
    }

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is available for pickup
    if (order.status !== 'PREP') {
      return res.status(400).json({
        success: false,
        message: 'This order is not available for pickup'
      });
    }

    if (order.assignedPartner) {
      return res.status(400).json({
        success: false,
        message: 'This order has already been assigned to another partner'
      });
    }

    // Assign order to partner
    order.assignedPartner = userId;
    order.assignedAt = new Date();
    await order.save();

    // Update partner status to busy and assign current order
    partner.status = 'busy';
    partner.currentOrder = order._id;
    partner.lastActive = new Date();
    await partner.save();

    // Populate the updated order with full details
    await order.populate('createdBy', 'name email restaurantInfo');
    await order.populate('assignedPartner', 'name phone vehicleType vehicleNumber');

    // Emit socket events for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Notify managers about order assignment
      io.to('role_manager').emit('order_assigned', {
        orderId: order._id,
        orderNumber: order.orderId,
        partnerId: userId,
        partnerName: partner.name,
        timestamp: new Date()
      });

      // Notify all partners that this order is no longer available
      io.to('role_partner').emit('order_taken', {
        orderId: order._id,
        takenBy: userId,
        timestamp: new Date()
      });

      // Update partner status for all clients
      io.emit('partner_status_changed', {
        partnerId: userId,
        status: 'busy',
        currentOrder: order._id,
        timestamp: new Date()
      });
    }

    console.log(`✅ Order ${order.orderId} accepted by partner ${partner.name}`);

    res.json({
      success: true,
      message: 'Order accepted successfully! You are now busy with this order.',
      data: {
        order,
        partner: {
          id: partner._id,
          name: partner.name,
          status: partner.status,
          currentOrder: partner.currentOrder
        }
      }
    });

  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while accepting order',
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
  getPartnerCurrentOrder,
  getOrdersByStatus,
  getOrderAnalytics,
  getRecentOrders,
  getPartnerAnalytics,
  searchOrders,
  getAvailableOrders,
  acceptOrder
}; 