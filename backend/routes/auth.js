const express = require('express');
const { body } = require('express-validator');
const {
  registerManager,
  registerPartner,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit phone number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// @route   POST /api/auth/register/manager
// @desc    Register Restaurant Manager
// @access  Public
router.post('/register/manager', [
  ...registerValidation,
  body('restaurantInfo.address')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('Restaurant address must be at least 10 characters')
], registerManager);

// @route   POST /api/auth/register/partner
// @desc    Register Delivery Partner
// @access  Public
router.post('/register/partner', [
  ...registerValidation,
  body('vehicleType')
    .optional()
    .isIn(['bike', 'bicycle', 'scooter', 'car'])
    .withMessage('Vehicle type must be bike, bicycle, scooter, or car'),
  body('vehicleNumber')
    .trim()
    .isLength({ min: 6, max: 15 })
    .withMessage('Vehicle number must be between 6 and 15 characters')
], registerPartner);

// @route   POST /api/auth/login
// @desc    Login Manager or Partner
// @access  Public
router.post('/login', loginValidation, login);

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], changePassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, logout);

// @route   GET /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.get('/verify', auth, verifyToken);

module.exports = router; 