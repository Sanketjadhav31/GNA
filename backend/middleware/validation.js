const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

// User validation
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
    
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    
  body('phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),
    
  body('role')
    .isIn(['restaurant_manager', 'delivery_partner'])
    .withMessage('Role must be either restaurant_manager or delivery_partner'),
    
  body('vehicleType')
    .if(body('role').equals('delivery_partner'))
    .isIn(['bike', 'scooter', 'bicycle', 'car'])
    .withMessage('Vehicle type must be bike, scooter, bicycle, or car for delivery partners'),
    
  handleValidationErrors
];

const validateUserLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  handleValidationErrors
];

// Order validation
const validateOrderCreation = [
  body('customerName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Customer name can only contain letters and spaces'),
    
  body('customerPhone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit Indian phone number'),
    
  body('customerAddress.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
    
  body('customerAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('City can only contain letters and spaces'),
    
  body('customerAddress.pincode')
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be exactly 6 digits'),
    
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
    
  body('items.*.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
    
  body('items.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Item quantity must be between 1 and 20'),
    
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be a positive number'),
    
  body('items.*.category')
    .optional()
    .isIn(['appetizer', 'main_course', 'dessert', 'beverage', 'side_dish'])
    .withMessage('Invalid item category'),
    
  body('totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
    
  body('prepTime')
    .isInt({ min: 5, max: 120 })
    .withMessage('Preparation time must be between 5 and 120 minutes'),
    
  body('estimatedDeliveryTime')
    .optional()
    .isInt({ min: 10, max: 60 })
    .withMessage('Estimated delivery time must be between 10 and 60 minutes'),
    
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .withMessage('Priority must be LOW, MEDIUM, HIGH, or URGENT'),
    
  handleValidationErrors
];

// Partner validation
const validatePartnerAvailability = [
  body('isAvailable')
    .isBoolean()
    .withMessage('Availability must be true or false'),
    
  handleValidationErrors
];

// Object ID validation
const validateObjectId = () => [
  param('id')
    .isMongoId()
    .withMessage('Invalid order ID format'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateOrderCreation,
  validatePartnerAvailability,
  validateObjectId,
  handleValidationErrors
}; 