const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getAvailablePartners,
  getAllPartners,
  getPartnerById,
  updateAvailability,
  updateLocation,
  getMyStatistics,
  getPartnerProfile,
  getPartnerStatistics,
  getPartnerAnalytics,
  getDeliveryHistory
} = require('../controllers/partnerController');

const { auth } = require('../middleware/auth');

// Validation middleware
const updateLocationValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Address must be at least 5 characters')
];

const updateAvailabilityValidation = [
  body('isAvailable')
    .isBoolean()
    .withMessage('Availability status must be true or false')
];

// @route   GET /api/partners/available
// @desc    Get all available delivery partners (Manager only)
// @access  Private (Manager)
router.get('/available', auth, getAvailablePartners);

// @route   GET /api/partners/my-statistics
// @desc    Get partner's own statistics (Partner only)
// @access  Private (Partner)
router.get('/my-statistics', auth, getMyStatistics);

// @route   GET /api/partners/delivery-history
// @desc    Get partner's delivery history (Partner only)
// @access  Private (Partner)
router.get('/delivery-history', auth, getDeliveryHistory);

// @route   GET /api/partners/profile
// @desc    Get partner's own profile (Partner only)
// @access  Private (Partner)
router.get('/profile', auth, getPartnerProfile);

// @route   GET /api/partners/statistics
// @desc    Get overall partner statistics (Manager only)
// @access  Private (Manager)
router.get('/statistics', auth, getPartnerStatistics);

// @route   PUT /api/partners/availability
// @desc    Update partner availability (Partner only)
// @access  Private (Partner)
router.put('/availability', [auth, ...updateAvailabilityValidation], updateAvailability);

// @route   PUT /api/partners/location
// @desc    Update partner location (Partner only)
// @access  Private (Partner)
router.put('/location', [auth, ...updateLocationValidation], updateLocation);

// @route   GET /api/partners/:id/analytics
// @desc    Get partner performance analytics (Manager only)
// @access  Private (Manager)
router.get('/:id/analytics', auth, getPartnerAnalytics);

// @route   GET /api/partners
// @desc    Get all delivery partners with filtering and pagination (Manager only)
// @access  Private (Manager)
router.get('/', auth, getAllPartners);

// @route   GET /api/partners/:id
// @desc    Get partner by ID (Manager only)
// @access  Private (Manager)
router.get('/:id', auth, getPartnerById);

module.exports = router; 