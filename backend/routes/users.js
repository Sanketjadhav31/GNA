const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @desc    Get users (with filtering for available partners)
// @route   GET /api/users?role=partner&isAvailable=true
// @access  Private (Manager)
const getUsers = async (req, res) => {
  try {
    const { role: userRole } = req.user;
    const { role, isAvailable } = req.query;

    // Ensure only managers can access this endpoint
    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only restaurant managers can access this endpoint'
      });
    }

    // Build query based on filters
    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (isAvailable === 'true' && role === 'partner') {
      query.isAvailable = true;
      query.isActive = true;
      query.currentOrder = null;
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
  }
};

// @route   GET /api/users
// @desc    Get users with filtering
// @access  Private (Manager)
router.get('/', auth, getUsers);

module.exports = router; 