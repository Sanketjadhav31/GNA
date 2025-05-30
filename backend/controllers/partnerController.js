const { validationResult } = require('express-validator');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');

// @desc    Get all partners (Manager view)
// @route   GET /api/partners
// @access  Private (Manager)
const getAllPartners = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view all partners'
      });
    }

    const { 
      status, 
      search, 
      sortBy = 'createdAt', 
      order = 'desc', 
      page = 1, 
      limit = 20,
      vehicleType,
      minRating
    } = req.query;

    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }
    
    if (minRating) {
      query['stats.rating'] = { $gte: parseFloat(minRating) };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;

    // Get partners with pagination
    const partners = await DeliveryPartner.find(query)
      .select('-password')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalPartners = await DeliveryPartner.countDocuments(query);

    // Get partner statistics
    const statsAgg = await DeliveryPartner.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$stats.rating' },
          totalDeliveries: { $sum: '$stats.totalDeliveries' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        partners,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPartners / limit),
          totalPartners,
          hasNext: skip + partners.length < totalPartners,
          hasPrev: page > 1
        },
        summary: {
          statusBreakdown: statsAgg,
          totalPartners,
          totalDeliveries: partners.reduce((sum, partner) => sum + partner.stats.totalDeliveries, 0),
          averageRating: partners.reduce((sum, partner) => sum + partner.stats.rating, 0) / partners.length || 0
        }
      }
    });

  } catch (error) {
    console.error('Get all partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partners',
      error: error.message
    });
  }
};

// @desc    Get available partners for assignment
// @route   GET /api/partners/available
// @access  Private (Manager)
const getAvailablePartners = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view available partners'
      });
    }

    const { lat, lng, maxDistance = 10 } = req.query;

    let query = {
      status: 'available',
      isActive: true
    };

    // If location provided, find partners within radius
    if (lat && lng) {
      query.currentLocation = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: maxDistance * 1000 // Convert to meters
        }
      };
    }

    const availablePartners = await DeliveryPartner.find(query)
      .select('name phone vehicleType vehicleNumber currentLocation stats.rating stats.totalDeliveries lastActive')
      .sort({ 'stats.rating': -1, lastActive: -1 })
      .limit(50);

    res.json({
      success: true,
      data: availablePartners,
      count: availablePartners.length
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

// @desc    Get partner statistics
// @route   GET /api/partners/statistics
// @access  Private (Manager)
const getPartnerStatistics = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view partner statistics'
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

    // Get all partners with enriched data
    const partners = await DeliveryPartner.find({ isActive: true })
      .select('-password')
      .lean();

    // Get orders data for the time range
    const ordersData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          assignedPartner: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$assignedPartner',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, { $multiply: ['$totalAmount', 0.1] }, 0] }
          },
          avgDeliveryTime: { $avg: '$actualDeliveryTime' }
        }
      }
    ]);

    // Enrich partners with real-time data
    const enrichedPartners = partners.map(partner => {
      const orderStats = ordersData.find(stat => stat._id.toString() === partner._id.toString());
      
      return {
        ...partner,
        todayStats: {
          ordersCompleted: orderStats?.completedOrders || 0,
          totalOrders: orderStats?.totalOrders || 0,
          earnings: orderStats?.totalEarnings || 0,
          avgDeliveryTime: orderStats?.avgDeliveryTime || 0
        },
        isOnline: partner.lastActive && (new Date() - new Date(partner.lastActive)) < 5 * 60 * 1000 // 5 minutes
      };
    });

    // Calculate overall statistics
    const totalPartners = partners.length;
    const activePartners = partners.filter(p => p.status === 'available').length;
    const busyPartners = partners.filter(p => p.status === 'busy').length;
    const offlinePartners = partners.filter(p => p.status === 'offline').length;

    const totalDeliveries = ordersData.reduce((sum, stat) => sum + stat.completedOrders, 0);
    const totalEarnings = ordersData.reduce((sum, stat) => sum + stat.totalEarnings, 0);
    const avgRating = partners.reduce((sum, partner) => sum + partner.stats.rating, 0) / totalPartners || 0;

    res.json({
      success: true,
      data: {
        partners: enrichedPartners,
        summary: {
          totalPartners,
          activePartners,
          busyPartners,
          offlinePartners,
          onlinePartners: enrichedPartners.filter(p => p.isOnline).length,
          totalDeliveries,
          totalEarnings,
          avgRating: parseFloat(avgRating.toFixed(2)),
          successRate: totalDeliveries > 0 ? parseFloat(((totalDeliveries / ordersData.reduce((sum, stat) => sum + stat.totalOrders, 0)) * 100).toFixed(2)) : 0
        },
        timeRange,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Get partner statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner statistics',
      error: error.message
    });
  }
};

// @desc    Get partner profile (Partner view)
// @route   GET /api/partners/profile
// @access  Private (Partner)
const getPartnerProfile = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can access this endpoint'
      });
    }

    const partner = await DeliveryPartner.findById(userId)
      .select('-password')
      .lean();

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Get recent orders
    const recentOrders = await Order.find({ assignedPartner: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name restaurantInfo.name')
      .lean();

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Order.aggregate([
      {
        $match: {
          assignedPartner: userId,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, { $multiply: ['$totalAmount', 0.1] }, 0] }
          },
          avgDeliveryTime: { $avg: '$actualDeliveryTime' }
        }
      }
    ]);

    const todayData = todayStats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      totalEarnings: 0,
      avgDeliveryTime: 0
    };

    res.json({
      success: true,
      data: {
        profile: partner,
        recentOrders,
        todayStats: todayData,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Get partner profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner profile',
      error: error.message
    });
  }
};

// @desc    Get partner by ID (Manager view)
// @route   GET /api/partners/:id
// @access  Private (Manager)
const getPartnerById = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view partner details'
      });
    }

    const partner = await DeliveryPartner.findById(id)
      .select('-password')
      .lean();

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    // Get partner's order history
    const orders = await Order.find({ assignedPartner: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('createdBy', 'name restaurantInfo.name')
      .lean();

    // Get analytics
    const analytics = await Order.aggregate([
      { $match: { assignedPartner: id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, { $multiply: ['$totalAmount', 0.1] }, 0] }
          },
          avgDeliveryTime: { $avg: '$actualDeliveryTime' },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0] }
          }
        }
      }
    ]);

    const analyticsData = analytics[0] || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalEarnings: 0,
      avgDeliveryTime: 0,
      totalRevenue: 0
    };

    res.json({
      success: true,
      data: {
        partner,
        orders,
        analytics: {
          ...analyticsData,
          successRate: analyticsData.totalOrders > 0 ? 
            parseFloat(((analyticsData.completedOrders / analyticsData.totalOrders) * 100).toFixed(2)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get partner by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching partner',
      error: error.message
    });
  }
};

// @desc    Update partner availability
// @route   PUT /api/partners/availability
// @access  Private (Partner)
const updateAvailability = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can update availability'
      });
    }

    const { status } = req.body;

    const partner = await DeliveryPartner.findById(userId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    partner.status = status;
    partner.lastActive = new Date();
    
    await partner.save();

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit('partner_status_changed', {
        partnerId: userId,
        status,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: {
        partnerId: userId,
        status,
        lastActive: partner.lastActive
      }
    });

  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating availability',
      error: error.message
    });
  }
};

// @desc    Update partner location
// @route   PUT /api/partners/location
// @access  Private (Partner)
const updateLocation = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can update location'
      });
    }

    const { latitude, longitude } = req.body;

    const partner = await DeliveryPartner.findById(userId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    partner.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    partner.lastActive = new Date();
    
    await partner.save();

    // Emit socket event for real-time location updates
    if (req.io) {
      req.io.emit('partner_location_updated', {
        partnerId: userId,
        location: { latitude, longitude },
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        partnerId: userId,
        location: { latitude, longitude },
        lastActive: partner.lastActive
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating location',
      error: error.message
    });
  }
};

// @desc    Get partner analytics (Manager view)
// @route   GET /api/partners/:id/analytics
// @access  Private (Manager)
const getPartnerAnalytics = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { id } = req.params;
    const { timeRange = 'month' } = req.query;

    if (role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view partner analytics'
      });
    }

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
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get detailed analytics
    const analytics = await Order.aggregate([
      {
        $match: {
          assignedPartner: id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status"
          },
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
          earnings: { $sum: { $multiply: ["$totalAmount", 0.1] } }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          statusBreakdown: {
            $push: {
              status: "$_id.status",
              count: "$count",
              revenue: "$revenue",
              earnings: "$earnings"
            }
          },
          totalOrders: { $sum: "$count" },
          totalRevenue: { $sum: "$revenue" },
          totalEarnings: { $sum: "$earnings" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get partner info
    const partner = await DeliveryPartner.findById(id)
      .select('name email phone vehicleType stats')
      .lean();

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: {
        partner,
        analytics,
        timeRange,
        summary: {
          totalDays: analytics.length,
          totalOrders: analytics.reduce((sum, day) => sum + day.totalOrders, 0),
          totalRevenue: analytics.reduce((sum, day) => sum + day.totalRevenue, 0),
          totalEarnings: analytics.reduce((sum, day) => sum + day.totalEarnings, 0),
          avgOrdersPerDay: analytics.length > 0 ? 
            parseFloat((analytics.reduce((sum, day) => sum + day.totalOrders, 0) / analytics.length).toFixed(2)) : 0
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

// @desc    Get my statistics (Partner view)
// @route   GET /api/partners/my-statistics
// @access  Private (Partner)
const getMyStatistics = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can access this endpoint'
      });
    }

    const { timeRange = 'month' } = req.query;

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
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get order statistics
    const stats = await Order.aggregate([
      {
        $match: {
          assignedPartner: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, { $multiply: ['$totalAmount', 0.1] }, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, '$totalAmount', 0] }
          },
          avgOrderValue: { $avg: '$totalAmount' },
          avgDeliveryTime: { $avg: '$actualDeliveryTime' }
        }
      }
    ]);

    const statsData = stats[0] || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalEarnings: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      avgDeliveryTime: 0
    };

    // Calculate success rate
    statsData.successRate = statsData.totalOrders > 0 ? 
      parseFloat(((statsData.completedOrders / statsData.totalOrders) * 100).toFixed(2)) : 0;

    // Get daily breakdown
    const dailyStats = await Order.aggregate([
      {
        $match: {
          assignedPartner: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          earnings: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, { $multiply: ['$totalAmount', 0.1] }, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: statsData,
        dailyBreakdown: dailyStats,
        timeRange,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Get my statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
      error: error.message
    });
  }
};

// @desc    Get delivery history for partner
// @route   GET /api/partners/delivery-history
// @access  Private (Partner)
const getDeliveryHistory = async (req, res) => {
  try {
    const { userId, role } = req.user;

    if (role !== 'partner') {
      return res.status(403).json({
        success: false,
        message: 'Only delivery partners can access delivery history'
      });
    }

    const { limit = 50, page = 1, status = 'DELIVERED' } = req.query;

    // Get delivery history
    const orders = await Order.find({
      assignedPartner: userId,
      status: status
    })
      .populate('createdBy', 'name restaurantInfo.name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Transform the data for frontend
    const deliveryHistory = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      customerName: order.customerDetails.name,
      customerAddress: order.customerDetails.address,
      restaurantName: order.createdBy?.restaurantInfo?.name || order.createdBy?.name || 'Unknown Restaurant',
      totalAmount: order.totalAmount,
      deliveredAt: order.updatedAt,
      prepTime: order.prepTime,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      actualDeliveryTime: order.actualDeliveryTime,
      earnings: order.totalAmount * 0.1, // Assuming 10% commission
      rating: order.rating || 0,
      orderType: order.orderType || 'delivery',
      items: order.items
    }));

    res.json({
      success: true,
      data: deliveryHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: deliveryHistory.length
      },
      message: 'Delivery history fetched successfully'
    });

  } catch (error) {
    console.error('Get delivery history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching delivery history',
      error: error.message
    });
  }
};

module.exports = {
  getAllPartners,
  getAvailablePartners,
  getPartnerStatistics,
  getPartnerProfile,
  getPartnerById,
  updateAvailability,
  updateLocation,
  getPartnerAnalytics,
  getMyStatistics,
  getDeliveryHistory
}; 