const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HTTP_STATUS, MESSAGES, USER_ROLES } = require('../utils/constants');

// Middleware to verify JWT token and extract user info
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided or invalid format'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: error.message
    });
  }
};

// Middleware to ensure only managers can access
const managerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Manager role required'
    });
  }

  next();
};

// Middleware to ensure only partners can access
const partnerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'partner') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Delivery partner role required'
    });
  }

  next();
};

// Middleware for endpoints that both managers and partners can access
const authenticatedOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!['manager', 'partner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Invalid role'
    });
  }

  next();
};

// Role-based Authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
        error: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
        error: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = authorize(USER_ROLES.ADMIN);

// Manager and Admin middleware
const managerOrAdmin = authorize(USER_ROLES.MANAGER, USER_ROLES.ADMIN);

// Check if user is the owner of the resource or has admin/manager role
const ownerOrManager = (req, res, next) => {
  if (!req.user) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: MESSAGES.ERROR.UNAUTHORIZED,
      error: 'User not authenticated'
    });
  }

  const isOwner = req.params.userId && req.params.userId === req.user._id.toString();
  const isManager = [USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(req.user.role);

  if (!isOwner && !isManager) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: MESSAGES.ERROR.UNAUTHORIZED,
      error: 'Access denied. You can only access your own resources or need manager/admin privileges'
    });
  }

  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.header('x-auth-token');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_for_zomato_ops_pro_2024');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Rate limiting middleware for login attempts
const loginRateLimit = (req, res, next) => {
  // Temporarily disabled for testing - just proceed
  next();
  
  // Simple in-memory rate limiting (in production, use Redis)
  // const attempts = req.app.locals.loginAttempts || {};
  // const clientIp = req.ip || req.connection.remoteAddress;
  // const currentTime = Date.now();
  
  // if (!attempts[clientIp]) {
  //   attempts[clientIp] = { count: 1, lastAttempt: currentTime };
  // } else {
  //   const timeDiff = currentTime - attempts[clientIp].lastAttempt;
    
  //   // Reset count if more than 15 minutes have passed
  //   if (timeDiff > 15 * 60 * 1000) {
  //     attempts[clientIp] = { count: 1, lastAttempt: currentTime };
  //   } else {
  //     attempts[clientIp].count += 1;
  //     attempts[clientIp].lastAttempt = currentTime;
      
  //     // Block if more than 5 attempts in 15 minutes
  //     if (attempts[clientIp].count > 5) {
  //       return res.status(HTTP_STATUS.TOO_MANY_REQUESTS || 429).json({
  //         success: false,
  //         message: 'Too many login attempts. Please try again later.',
  //         error: 'Rate limit exceeded'
  //       });
  //     }
  //   }
  // }
  
  // req.app.locals.loginAttempts = attempts;
  // next();
};

// Clear rate limit on successful login
const clearRateLimit = (req, res, next) => {
  const attempts = req.app.locals.loginAttempts || {};
  const clientIp = req.ip || req.connection.remoteAddress;
  
  if (attempts[clientIp]) {
    delete attempts[clientIp];
    req.app.locals.loginAttempts = attempts;
  }
  
  next();
};

module.exports = {
  auth,
  managerOnly,
  partnerOnly,
  authenticatedOnly,
  authorize,
  adminOnly,
  managerOrAdmin,
  ownerOrManager,
  optionalAuth,
  loginRateLimit,
  clearRateLimit
}; 