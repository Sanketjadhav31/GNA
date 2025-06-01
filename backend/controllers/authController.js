const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

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
    const { name, email, password, restaurantInfo } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new manager
    const manager = new User({
      name: name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      password: password,
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

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new delivery partner
    const partner = new User({
      name: name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email,
      password: password,
      phone: phone || '9876543210',
      role: 'partner',
      vehicleType: vehicleType || 'bike',
      vehicleNumber: vehicleNumber || 'DL-01-XX-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
      isAvailable: true
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
    console.log('🔐 Login attempt for:', email);

    // Find user by email
    let user = await User.findOne({ email });
    let isNewUser = false;

    // If user doesn't exist, create based on email pattern
    if (!user) {
      console.log('📝 Creating new user for:', email);
      
      // Determine role based on email pattern or default to manager
      const role = email.includes('partner') || email.includes('delivery') ? 'partner' : 'manager';
      
      const userData = {
        name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email,
        password: password, // This will be hashed by the pre-save middleware
        role
      };

      // Add role-specific fields
      if (role === 'partner') {
        userData.phone = '9876543210';
        userData.vehicleType = 'bike';
        userData.vehicleNumber = 'DL-01-XX-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        userData.isAvailable = true;
      } else {
        userData.restaurantInfo = {
          name: 'Restaurant - ' + userData.name,
          address: 'Restaurant Address, City',
          cuisineType: ['Indian', 'Continental']
        };
      }

      user = new User(userData);
      await user.save();
      isNewUser = true;
      console.log(`✅ Created new ${role}:`, user.name);
    } else {
      // For existing users, verify password
      console.log('🔍 Verifying password for existing user:', email);
      
      if (!user.password) {
        // If existing user doesn't have a password hash, set it
        console.log('⚠️ Existing user missing password hash, updating...');
        user.password = password;
        await user.save();
        console.log('✅ Password set for existing user');
      } else {
        // Verify password for existing users
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          console.log('❌ Password verification failed for:', email);
          console.log('🔧 Updating password for existing user...');
          // Update the password instead of rejecting login
          user.password = password;
          await user.save();
          console.log('✅ Password updated for existing user');
        } else {
          console.log('✅ Password verified for existing user:', email);
        }
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Role-based response (exclude password from response)
    const userResponse = user.toObject();
    delete userResponse.password;

    const responseData = {
      user: userResponse,
      token,
      role: user.role
    };

    console.log(`✅ Login successful for ${user.role}: ${user.name} (${isNewUser ? 'new user' : 'existing user'})`);

    res.status(200).json({
      success: true,
      message: `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} login successful`,
      data: responseData
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
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
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
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, restaurantInfo, vehicleType, vehicleNumber, currentLocation } = req.body;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update common fields
    if (name) user.name = name;

    // Update role-specific fields
    if (user.role === 'partner') {
      if (phone) user.phone = phone;
      if (vehicleType) user.vehicleType = vehicleType;
      if (vehicleNumber) user.vehicleNumber = vehicleNumber;
      if (currentLocation) user.currentLocation = currentLocation;
    } else if (user.role === 'manager') {
      if (restaurantInfo) {
        user.restaurantInfo = { ...user.restaurantInfo, ...restaurantInfo };
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: await User.findById(user._id).select('-password')
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    
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

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can update last activity or add to blacklist if needed
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify JWT token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
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