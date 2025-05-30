const express = require('express');
const router = express.Router();
const { getPartnerAnalytics } = require('../controllers/orderController');
const { auth } = require('../middleware/auth');

// @route   GET /api/analytics/partners
// @desc    Get partner analytics (Manager only)
// @access  Private (Manager)
router.get('/partners', auth, getPartnerAnalytics);

module.exports = router; 