const { validationResult } = require('express-validator');
const Partner = require('../models/Partner');
const Order = require('../models/Order');
const { HTTP_STATUS, MESSAGES, PARTNER_STATUS } = require('../utils/constants');

// @desc    Get all partners
// @route   GET /api/partners
// @access  Private (Manager/Admin)
const getPartners = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      isAvailable, 
      isActive, 
      vehicleType,
      status,
      search 
    } = req.query;

    let query = {};
    
    // Apply filters
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (vehicleType) query.vehicleType = vehicleType;
    if (status) query.status = status;

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { partnerId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { lastActiveAt: -1, rating: -1 }
    };

    const partners = await Partner.find(query)
      .populate('currentOrder', 'orderId status customerDetails.name')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Partner.countDocuments(query);

    // Get summary statistics
    const summary = await Partner.aggregate([
      {
        $group: {
          _id: null,
          totalPartners: { $sum: 1 },
          availablePartners: { 
            $sum: { 
              $cond: [{ $and: ['$isAvailable', '$isActive'] }, 1, 0] 
            } 
          },
          busyPartners: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'busy'] }, 1, 0] 
            } 
          },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.DATA_FETCHED,
      data: {
        partners,
        summary: summary[0] || {
          totalPartners: 0,
          availablePartners: 0,
          busyPartners: 0,
          avgRating: 0
        },
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
    console.error('Get partners error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Get available partners
// @route   GET /api/partners/available
// @access  Private (Manager/Admin)
const getAvailablePartners = async (req, res) => {
  try {
    const partners = await Partner.getAvailablePartners();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.DATA_FETCHED,
      data: { partners }
    });

  } catch (error) {
    console.error('Get available partners error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Get single partner
// @route   GET /api/partners/:id
// @access  Private
const getPartner = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id)
      .populate('currentOrder', 'orderId status customerDetails prepTime');

    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    // Get partner's delivery history
    const deliveryHistory = await Order.find({ assignedPartner: partner._id })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.DATA_FETCHED,
      data: { 
        partner,
        deliveryHistory
      }
    });

  } catch (error) {
    console.error('Get partner error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Create new partner
// @route   POST /api/partners
// @access  Private (Admin)
const createPartner = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.VALIDATION_ERROR,
        errors: errors.array()
      });
    }

    // Check if partner with phone already exists
    const existingPartner = await Partner.findOne({ phone: req.body.phone });
    if (existingPartner) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: MESSAGES.ERROR.DUPLICATE_PHONE
      });
    }

    const partner = new Partner(req.body);
    await partner.save();

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Partner created successfully',
      data: { partner }
    });

  } catch (error) {
    console.error('Create partner error:', error.message);
    
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: MESSAGES.ERROR.DUPLICATE_PHONE
      });
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Update partner
// @route   PUT /api/partners/:id
// @access  Private (Admin/Partner themselves)
const updatePartner = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.ERROR.VALIDATION_ERROR,
        errors: errors.array()
      });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    // Check if phone is being updated and if it's already taken
    if (req.body.phone && req.body.phone !== partner.phone) {
      const existingPartner = await Partner.findOne({ 
        phone: req.body.phone, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingPartner) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          message: MESSAGES.ERROR.DUPLICATE_PHONE
        });
      }
    }

    // Don't allow updating currentOrder through this endpoint
    const updateData = { ...req.body };
    delete updateData.currentOrder;
    delete updateData.totalDeliveries;
    delete updateData.rating;
    delete updateData.totalRatings;

    const updatedPartner = await Partner.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('currentOrder', 'orderId status');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Partner updated successfully',
      data: { partner: updatedPartner }
    });

  } catch (error) {
    console.error('Update partner error:', error.message);
    
    if (error.code === 11000) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: MESSAGES.ERROR.DUPLICATE_PHONE
      });
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Update partner availability
// @route   PUT /api/partners/:id/availability
// @access  Private
const updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    if (typeof isAvailable !== 'boolean') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'isAvailable must be a boolean value'
      });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    // If partner has current order, don't allow going offline
    if (!isAvailable && partner.currentOrder) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cannot go offline while having an active order'
      });
    }

    partner.isAvailable = isAvailable;
    await partner.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Partner is now ${isAvailable ? 'available' : 'unavailable'}`,
      data: { partner }
    });

  } catch (error) {
    console.error('Update availability error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Update partner location
// @route   PUT /api/partners/:id/location
// @access  Private (Partner themselves)
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    partner.currentLocation = {
      latitude,
      longitude,
      address,
      lastUpdated: new Date()
    };

    await partner.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Location updated successfully',
      data: { partner }
    });

  } catch (error) {
    console.error('Update location error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Get partner statistics
// @route   GET /api/partners/:id/stats
// @access  Private
const getPartnerStats = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    // Get delivery statistics
    const stats = await Order.aggregate([
      { $match: { assignedPartner: partner._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] }
          },
          totalEarnings: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get recent performance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStats = await Order.aggregate([
      { 
        $match: { 
          assignedPartner: partner._id,
          createdAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: null,
          recentDeliveries: { $sum: 1 },
          recentCompletions: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = {
      partner: {
        name: partner.name,
        rating: partner.rating,
        totalDeliveries: partner.totalDeliveries,
        status: partner.status,
        isAvailable: partner.isAvailable
      },
      lifetime: stats[0] || {
        totalOrders: 0,
        completedDeliveries: 0,
        cancelledOrders: 0,
        totalEarnings: 0,
        avgOrderValue: 0
      },
      recent: recentStats[0] || {
        recentDeliveries: 0,
        recentCompletions: 0
      },
      performance: {
        completionRate: stats[0] ? 
          (stats[0].completedDeliveries / stats[0].totalOrders * 100).toFixed(2) : 0,
        recentCompletionRate: recentStats[0] ? 
          (recentStats[0].recentCompletions / recentStats[0].recentDeliveries * 100).toFixed(2) : 0
      }
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.DATA_FETCHED,
      data: result
    });

  } catch (error) {
    console.error('Get partner stats error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Rate partner
// @route   POST /api/partners/:id/rate
// @access  Private (Manager/Admin)
const ratePartner = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    await partner.updateRating(rating);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Partner rated successfully',
      data: { 
        partner: {
          name: partner.name,
          rating: partner.rating,
          totalRatings: partner.totalRatings
        }
      }
    });

  } catch (error) {
    console.error('Rate partner error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Delete partner
// @route   DELETE /api/partners/:id
// @access  Private (Admin)
const deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: MESSAGES.ERROR.PARTNER_NOT_FOUND
      });
    }

    // Check if partner has active orders
    if (partner.currentOrder) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cannot delete partner with active orders'
      });
    }

    // Soft delete - deactivate instead of removing
    partner.isActive = false;
    partner.isAvailable = false;
    await partner.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Partner deactivated successfully'
    });

  } catch (error) {
    console.error('Delete partner error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

// @desc    Get partner analytics
// @route   GET /api/partners/analytics
// @access  Private (Manager/Admin)
const getPartnerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    // Partner performance analytics
    const analytics = await Partner.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalPartners: { $sum: 1 },
          availablePartners: { 
            $sum: { $cond: ['$isAvailable', 1, 0] } 
          },
          avgRating: { $avg: '$rating' },
          totalDeliveries: { $sum: '$totalDeliveries' }
        }
      }
    ]);

    // Vehicle type distribution
    const vehicleStats = await Partner.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
    ]);

    // Status distribution
    const statusStats = await Partner.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result = {
      summary: analytics[0] || {
        totalPartners: 0,
        availablePartners: 0,
        avgRating: 0,
        totalDeliveries: 0
      },
      vehicleDistribution: vehicleStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      statusDistribution: statusStats.reduce((acc, item) => {
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
    console.error('Get partner analytics error:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
      error: error.message
    });
  }
};

module.exports = {
  getPartners,
  getAvailablePartners,
  getPartner,
  createPartner,
  updatePartner,
  updateAvailability,
  updateLocation,
  getPartnerStats,
  ratePartner,
  deletePartner,
  getPartnerAnalytics
}; 