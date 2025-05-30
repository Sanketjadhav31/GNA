const { validationResult } = require('express-validator');
const Order = require('../models/Order');
const Partner = require('../models/Partner');
const { HTTP_STATUS, MESSAGES, ORDER_STATUS, ORDER_STATUS_FLOW } = require('../utils/constants');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Manager/Admin)
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.VALIDATION_ERROR,
        errors: errors.array()
      });
    }

    const orderData = {
      ...req.body,
      createdBy: req.user._id
    };

    const order = new Order(orderData);
    await order.save();

    // Populate the created order
    const populatedOrder = await Order.findById(order._id)
      .populate('assignedPartner', 'name phone vehicleType')
      .populate('createdBy', 'name email');

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.SUCCESS.ORDER_CREATED,
      data: { order: populatedOrder }
    });

  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority,
      partnerId,
      startDate,
      endDate,
      search 
    } = req.query;

    // Build query based on user role
    let query = {};
    
    // Role-based filtering
    if (req.user.role === 'partner') {
      // Partners can only see their assigned orders
      const partner = await Partner.findOne({ 
        $or: [
          { email: req.user.email },
          { phone: req.user.phone }
        ]
      });
      
      if (partner) {
        query.assignedPartner = partner._id;
      } else {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Partner profile not found'
        });
      }
    }

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (partnerId) query.assignedPartner = partnerId;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.phone': { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    };

    const orders = await Order.find(query)
      .populate('assignedPartner', 'name phone vehicleType status')
      .populate('createdBy', 'name email')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Order.countDocuments(query);

    // Calculate summary statistics
    const statusCounts = await Order.aggregate([
      { $match: req.user.role === 'partner' ? { assignedPartner: query.assignedPartner } : {} },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summary = statusCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.DATA_FETCHED,
      data: {
        orders,
        summary,
        pagination: {
          currentPage: options.page,
          totalPages: Math.ceil(total / options.limit),
          totalCount: total,
          hasNext: options.page < Math.ceil(total / options.limit),
          hasPrev: options.page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('assignedPartner', 'name phone vehicleType status currentLocation')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.ORDER_NOT_FOUND
      });
    }

    // Role-based access control
    if (req.user.role === 'partner') {
      const partner = await Partner.findOne({ 
        $or: [
          { email: req.user.email },
          { phone: req.user.phone }
        ]
      });
      
      if (!partner || !order.assignedPartner || order.assignedPartner._id.toString() !== partner._id.toString()) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Access denied. You can only view your assigned orders.'
        });
      }
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.DATA_FETCHED,
      data: { order }
    });

  } catch (error) {
    console.error('Get order error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private (Manager/Admin)
const updateOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.VALIDATION_ERROR,
        errors: errors.array()
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.ORDER_NOT_FOUND
      });
    }

    // Prevent updating delivered or cancelled orders
    if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cannot update delivered or cancelled orders'
      });
    }

    const updateData = { ...req.body };
    delete updateData.status; // Status should be updated via separate endpoint
    delete updateData.assignedPartner; // Partner assignment via separate endpoint

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedPartner', 'name phone vehicleType')
     .populate('createdBy', 'name email');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.ORDER_UPDATED,
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Update order error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Assign partner to order
// @route   PUT /api/orders/:id/assign-partner
// @access  Private (Manager/Admin)
const assignPartner = async (req, res) => {
  try {
    const { partnerId } = req.body;
    
    if (!partnerId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.ORDER_NOT_FOUND
      });
    }

    // Check if order is in valid status for assignment
    if (order.status !== ORDER_STATUS.PREP) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Order can only be assigned when in PREP status'
      });
    }

    // Check if order already has a partner
    if (order.assignedPartner) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.ORDER_ALREADY_ASSIGNED
      });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    // Check if partner is available
    if (!partner.isAvailable || !partner.isActive || partner.currentOrder) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_AVAILABLE
      });
    }

    // Assign partner to order
    order.assignedPartner = partnerId;
    await order.save();

    // Update partner status
    partner.currentOrder = order._id;
    partner.isAvailable = false;
    partner.status = 'busy';
    await partner.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('assignedPartner', 'name phone vehicleType')
      .populate('createdBy', 'name email');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.PARTNER_ASSIGNED,
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Assign partner error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Status is required'
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.ORDER_NOT_FOUND
      });
    }

    // Role-based access control for status updates
    if (req.user.role === 'partner') {
      const partner = await Partner.findOne({ 
        $or: [
          { email: req.user.email },
          { phone: req.user.phone }
        ]
      });
      
      if (!partner || !order.assignedPartner || order.assignedPartner.toString() !== partner._id.toString()) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          message: 'Access denied. You can only update status of your assigned orders.'
        });
      }
    }

    // Validate status transition
    const currentStatus = order.status;
    const allowedNextStatuses = ORDER_STATUS_FLOW[currentStatus] || [];
    
    if (!allowedNextStatuses.includes(status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.INVALID_STATUS_TRANSITION,
        error: `Cannot change status from ${currentStatus} to ${status}`
      });
    }

    // Update order status
    order.status = status;
    if (notes) {
      order.deliveryNotes = notes;
    }

    await order.save();

    // Update partner status when order is delivered or cancelled
    if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(status)) {
      if (order.assignedPartner) {
        await Partner.findByIdAndUpdate(order.assignedPartner, {
          currentOrder: null,
          isAvailable: true,
          status: 'online',
          $inc: status === ORDER_STATUS.DELIVERED ? { totalDeliveries: 1 } : {}
        });
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('assignedPartner', 'name phone vehicleType')
      .populate('createdBy', 'name email');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.STATUS_UPDATED,
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Update order status error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private (Manager/Admin)
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.ORDER_NOT_FOUND
      });
    }

    // Check if order can be cancelled
    if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Order is already delivered or cancelled'
      });
    }

    // Update order
    order.status = ORDER_STATUS.CANCELLED;
    order.cancelReason = reason || 'Cancelled by manager';
    await order.save();

    // Free up the partner
    if (order.assignedPartner) {
      await Partner.findByIdAndUpdate(order.assignedPartner, {
        currentOrder: null,
        isAvailable: true,
        status: 'online'
      });
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('assignedPartner', 'name phone vehicleType')
      .populate('createdBy', 'name email');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.ORDER_CANCELLED,
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('Cancel order error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Get order analytics
// @route   GET /api/orders/analytics
// @access  Private (Manager/Admin)
const getOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const analytics = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          avgPrepTime: { $avg: '$prepTime' },
          statusBreakdown: {
            $push: '$status'
          }
        }
      }
    ]);

    const statusCounts = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const priorityCounts = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const result = {
      summary: analytics[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        avgPrepTime: 0
      },
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      priorityBreakdown: priorityCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.DATA_FETCHED,
      data: result
    });

  } catch (error) {
    console.error('Get analytics error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
  assignPartner,
  updateOrderStatus,
  cancelOrder,
  getOrderAnalytics
}; 