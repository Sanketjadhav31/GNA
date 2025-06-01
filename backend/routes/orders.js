const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  createOrder,
  assignPartner,
  updateOrderStatus,
  getAvailableOrders,
  getCurrentOrder,
  getAllOrders,
  getPartnerOrderHistory,
  getOrderAnalytics,
  getPartnerAnalytics
} = require('../controllers/orderController');

const { auth } = require('../middleware/auth');

// Validation rules
const createOrderValidation = [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('prepTime').isInt({ min: 5, max: 120 }).withMessage('Prep time must be between 5 and 120 minutes'),
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerPhone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone number required'),
  body('customerAddress').notEmpty().withMessage('Customer address is required'),
  body('totalAmount').isNumeric().withMessage('Total amount must be a number')
];

const assignPartnerValidation = [
  body('partnerId').isMongoId().withMessage('Valid partner ID is required')
];

const updateStatusValidation = [
  body('status').isIn(['PICKED', 'ON_ROUTE', 'DELIVERED']).withMessage('Invalid status')
];

// Routes

// @route   POST /api/orders
// @desc    Create new order (Manager only)
// @access  Private (Manager)
router.post('/', [auth, ...createOrderValidation], createOrder);

// @route   GET /api/orders
// @desc    Get all orders (Manager only)
// @access  Private (Manager)
router.get('/', auth, getAllOrders);

// @route   GET /api/orders/analytics
// @desc    Get order analytics (Manager only)
// @access  Private (Manager)
router.get('/analytics', auth, getOrderAnalytics);

// @route   GET /api/orders/partner-analytics
// @desc    Get partner analytics (Manager only)
// @access  Private (Manager)
router.get('/partner-analytics', auth, getPartnerAnalytics);

// @route   GET /api/orders/available
// @desc    Get available orders for partners
// @access  Private (Partner)
router.get('/available', auth, getAvailableOrders);

// @route   GET /api/orders/current
// @desc    Get partner's current order
// @access  Private (Partner)
router.get('/current', auth, getCurrentOrder);

// @route   GET /api/orders/partner/history
// @desc    Get partner's order history
// @access  Private (Partner)
router.get('/partner/history', auth, getPartnerOrderHistory);

// @route   PATCH /api/orders/:id/assign
// @desc    Assign partner to order (Manager only)
// @access  Private (Manager)
router.patch('/:id/assign', [auth, ...assignPartnerValidation], assignPartner);

// @route   PATCH /api/orders/:id/status
// @desc    Update order status (Partner only)
// @access  Private (Partner)
router.patch('/:id/status', [auth, ...updateStatusValidation], updateOrderStatus);

module.exports = router; 