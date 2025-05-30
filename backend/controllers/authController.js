const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const DeliveryPartner = require('../models/DeliveryPartner');

// Generate JWT Token
const generateToken = (userId, role) => {
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  const jwtExpire = process.env.JWT_EXPIRE || '7d';
  
  console.log('🔑 JWT Configuration:', {
    hasJwtSecret: !!jwtSecret,
    jwtSecretLength: jwtSecret.length,
    jwtExpire,
    userId,
    role
  });
  
  if (!jwtSecret || jwtSecret === 'fallback-secret-key') {
    console.error('⚠️ JWT_SECRET not found in environment variables!');
  }
  
  return jwt.sign(
    { 
      id: userId,
      userId: userId, 
      role: role 
    },
    jwtSecret,
    { expiresIn: jwtExpire }
  );
};

// @desc    Register Manager
// @route   POST /api/auth/register/manager
// @access  Public
const registerManager = async (req, res) => {
  try {
    const { name, email, password, phone, restaurantInfo } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if manager already exists
    const existingManager = await User.findOne({ email });

    if (existingManager) {
      return res.status(400).json({
        success: false,
        message: 'Manager with this email already exists'
      });
    }

    // Create new manager with defaults
    const manager = new User({
      name: name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      password,
      phone: phone || '9876543210',
      role: 'manager',
      restaurantInfo: {
        name: restaurantInfo?.name || 'Restaurant - ' + (name || email.split('@')[0]),
        address: restaurantInfo?.address || 'Restaurant Address, City',
        cuisineType: restaurantInfo?.cuisineType || ['Indian', 'Continental']
      }
    });

    await manager.save();

    // Generate token
    const token = generateToken(manager._id, manager.role);

    // Update last login
    manager.lastLogin = new Date();
    await manager.save();

    res.status(201).json({
      success: true,
      message: 'Manager registered successfully',
      data: {
        user: manager,
        token,
        role: manager.role
      }
    });

  } catch (error) {
    console.error('Manager registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// @desc    Register Delivery Partner
// @route   POST /api/auth/register/partner
// @access  Public
const registerPartner = async (req, res) => {
  try {
    const { name, email, password, phone, vehicleType, vehicleNumber } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if partner already exists
    const existingPartner = await DeliveryPartner.findOne({ email });

    if (existingPartner) {
      return res.status(400).json({
        success: false,
        message: 'Delivery partner with this email already exists'
      });
    }

    // Create new delivery partner with defaults
    const partner = new DeliveryPartner({
      name: name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      password,
      phone: phone || '9876543210',
      vehicleType: vehicleType || 'bike',
      vehicleNumber: vehicleNumber || 'DL-01-XX-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0')
    });

    await partner.save();

    // Generate token
    const token = generateToken(partner._id, partner.role);

    // Update last login
    partner.lastLogin = new Date();
    await partner.save();

    res.status(201).json({
      success: true,
      message: 'Delivery partner registered successfully',
      data: {
        user: partner,
        token,
        role: partner.role
      }
    });

  } catch (error) {
    console.error('Partner registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// @desc    Login (Manager or Partner)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
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

    const { email, password } = req.body;

    let user;
    let userRole;

    // Try to find user in Manager collection first
    user = await User.findOne({ email, role: 'manager' });
    if (user) {
      userRole = 'manager';
    } else {
      // Try to find user in DeliveryPartner collection
      user = await DeliveryPartner.findOne({ email });
      if (user) {
        userRole = 'partner';
      }
    }

    // If user doesn't exist, create based on email pattern
    if (!user) {
      console.log('📝 Creating new user for:', email);
      
      // Determine role based on email pattern or default to partner
      const isManager = email.includes('manager') || email.includes('restaurant') || email.includes('admin');
      
      if (isManager) {
        // Create new manager
        user = new User({
          name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          email,
          password,
          phone: '9876543210',
          role: 'manager',
          restaurantInfo: {
            name: 'Restaurant - ' + email.split('@')[0],
            address: 'Restaurant Address, City',
            cuisineType: ['Indian', 'Continental']
          }
        });
        userRole = 'manager';
      } else {
        // Create new partner
        user = new DeliveryPartner({
          name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          email,
          password,
          phone: '9876543210',
          vehicleType: 'bike',
          vehicleNumber: 'DL-01-XX-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0')
        });
        userRole = 'partner';
      }
      
      await user.save();
      console.log('✅ New user created:', user.name, 'as', userRole);
    } else {
      // For existing users, accept any password (demo mode)
      console.log('👤 Existing user login:', user.name);
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Start shift for manager
    if (userRole === 'manager' && !user.currentShift.isOnDuty) {
      await user.startShift();
    }

    res.json({
      success: true,
      message: `${userRole === 'manager' ? 'Manager' : 'Delivery Partner'} logged in successfully`,
      data: {
        user,
        token,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const { userId, role } = req.user;

    let user;
    if (role === 'manager') {
      user = await User.findById(userId).select('-password');
    } else if (role === 'partner') {
      user = await DeliveryPartner.findById(userId)
        .select('-password')
        .populate('currentOrder');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates._id;

    let user;
    if (role === 'manager') {
      user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');
    } else if (role === 'partner') {
      user = await DeliveryPartner.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    let user;
    if (role === 'manager') {
      user = await User.findById(userId);
    } else if (role === 'partner') {
      user = await DeliveryPartner.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password',
      error: error.message
    });
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const { userId, role } = req.user;

    // End shift for manager
    if (role === 'manager') {
      const manager = await User.findById(userId);
      if (manager && manager.currentShift.isOnDuty) {
        await manager.endShift();
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  try {
    const { userId, role } = req.user;

    let user;
    if (role === 'manager') {
      user = await User.findById(userId).select('-password');
    } else if (role === 'partner') {
      user = await DeliveryPartner.findById(userId).select('-password');
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification',
      error: error.message
    });
  }
};

module.exports = {
  registerManager,
  registerPartner,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyToken
}; 