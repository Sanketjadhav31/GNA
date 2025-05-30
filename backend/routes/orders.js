const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
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
} = require('../controllers/orderController');

const { auth } = require('../middleware/auth');

// Validation rules
const createOrderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must have at least one item'),
  body('items.*.name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Item name is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be a positive number'),
  body('customerName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Customer name must be between 2 and 50 characters'),
  body('customerPhone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number'),
  body('customerAddress')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Customer address must be at least 10 characters'),
  body('prepTime')
    .optional()
    .isInt({ min: 5, max: 120 })
    .withMessage('Preparation time must be between 5 and 120 minutes'),
  body('estimatedDeliveryTime')
    .optional()
    .isInt({ min: 10, max: 180 })
    .withMessage('Estimated delivery time must be between 10 and 180 minutes'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high')
];

const assignPartnerValidation = [
  body('partnerId')
    .isMongoId()
    .withMessage('Valid partner ID is required')
];

const updateStatusValidation = [
  body('status')
    .isIn(['PICKED', 'ON_ROUTE', 'DELIVERED'])
    .withMessage('Status must be PICKED, ON_ROUTE, or DELIVERED')
];

// SPECIFIC ROUTES FIRST (to avoid conflicts with parameterized routes)

// @route   GET /api/orders/search
// @desc    Search orders (Manager only)
// @access  Private (Manager)
router.get('/search', auth, searchOrders);

// @route   GET /api/orders/recent
// @desc    Get recent orders for dashboard (Manager only)
// @access  Private (Manager)
router.get('/recent', auth, getRecentOrders);

// @route   GET /api/orders/my-current
// @desc    Get partner's current assigned order (Partner only)
// @access  Private (Partner)
router.get('/my-current', auth, getPartnerCurrentOrder);

// @route   GET /api/orders/analytics
// @desc    Get order analytics (Manager only)
// @access  Private (Manager)
router.get('/analytics', auth, getOrderAnalytics);

// @route   GET /api/orders/partner-analytics
// @desc    Get partner analytics (Manager only)
// @access  Private (Manager)
router.get('/partner-analytics', auth, getPartnerAnalytics);

// @route   GET /api/orders/analytics/partners
// @desc    Get partner analytics for frontend compatibility
// @access  Private (Manager)
router.get('/analytics/partners', auth, getPartnerAnalytics);

// @route   GET /api/orders/available
// @desc    Get available orders for assignment (Partner only)
// @access  Private (Partner)
router.get('/available', auth, getAvailableOrders);

// @route   GET /api/orders/status/:status
// @desc    Get orders by status (Manager only)
// @access  Private (Manager)
router.get('/status/:status', auth, getOrdersByStatus);

// GENERAL ROUTES

// @route   POST /api/orders
// @desc    Create new order (Manager only)
// @access  Private (Manager)
router.post('/', [auth, ...createOrderValidation], createOrder);

// @route   GET /api/orders
// @desc    Get all orders with filtering and pagination (Manager only)
// @access  Private (Manager)
router.get('/', auth, getAllOrders);

// PARAMETERIZED ROUTES LAST (to avoid conflicts)

// @route   GET /api/orders/:id
// @desc    Get single order by ID
// @access  Private (Role-based access)
router.get('/:id', auth, getOrderById);

// @route   PUT /api/orders/:id/assign-partner
// @desc    Assign delivery partner to order (Manager only)
// @access  Private (Manager)
router.put('/:id/assign-partner', [auth, ...assignPartnerValidation], assignPartner);

// @route   POST /api/orders/:id/accept
// @desc    Accept available order (Partner only)
// @access  Private (Partner)
router.post('/:id/accept', auth, acceptOrder);

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Partner only)
// @access  Private (Partner)
router.put('/:id/status', [auth, ...updateStatusValidation], updateOrderStatus);

module.exports = router; 