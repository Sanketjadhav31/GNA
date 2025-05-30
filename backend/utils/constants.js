// Order Status Constants
const ORDER_STATUS = {
  PREP: 'PREP',
  PICKED: 'PICKED',
  ON_ROUTE: 'ON_ROUTE',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

// Order Status Flow - Defines valid transitions
const ORDER_STATUS_FLOW = {
  [ORDER_STATUS.PREP]: [ORDER_STATUS.PICKED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PICKED]: [ORDER_STATUS.ON_ROUTE, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ON_ROUTE]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [], // Terminal state
  [ORDER_STATUS.CANCELLED]: [] // Terminal state
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PARTNER: 'partner'
};

// Partner Status
const PARTNER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  INACTIVE: 'inactive'
};

// Vehicle Types
const VEHICLE_TYPES = {
  BIKE: 'bike',
  SCOOTER: 'scooter',
  CAR: 'car',
  BICYCLE: 'bicycle'
};

// Order Priority Levels
const ORDER_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Default Configuration
const DEFAULT_CONFIG = {
  DEFAULT_PREP_TIME: 20, // minutes
  DEFAULT_ETA: 30, // minutes
  MAX_PREP_TIME: 120, // minutes
  MIN_PREP_TIME: 5, // minutes
  DEFAULT_DELIVERY_RADIUS: 10, // kilometers
  MAX_ORDERS_PER_PARTNER: 1, // concurrent orders
  JWT_EXPIRE_TIME: '24h',
  PAGINATION_LIMIT: 20,
  MAX_ITEMS_PER_ORDER: 50
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// Response Messages
const MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login successful',
    LOGOUT: 'Logout successful',
    ORDER_CREATED: 'Order created successfully',
    ORDER_UPDATED: 'Order updated successfully',
    ORDER_CANCELLED: 'Order cancelled successfully',
    PARTNER_ASSIGNED: 'Partner assigned successfully',
    STATUS_UPDATED: 'Status updated successfully',
    DATA_FETCHED: 'Data fetched successfully'
  },
  ERROR: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    UNAUTHORIZED: 'Unauthorized access',
    USER_NOT_FOUND: 'User not found',
    ORDER_NOT_FOUND: 'Order not found',
    PARTNER_NOT_FOUND: 'Partner not found',
    PARTNER_NOT_AVAILABLE: 'Partner is not available',
    PARTNER_ALREADY_ASSIGNED: 'Partner is already assigned to another order',
    INVALID_STATUS_TRANSITION: 'Invalid status transition',
    INSUFFICIENT_PREP_TIME: 'Preparation time is too short',
    ORDER_ALREADY_ASSIGNED: 'Order is already assigned to a partner',
    INVALID_ORDER_STATUS: 'Invalid order status for this operation',
    DATABASE_ERROR: 'Database operation failed',
    VALIDATION_ERROR: 'Validation failed',
    SERVER_ERROR: 'Internal server error',
    DUPLICATE_EMAIL: 'Email already exists',
    DUPLICATE_PHONE: 'Phone number already exists',
    INVALID_TOKEN: 'Invalid or expired token'
  }
};

// Socket Events
const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  PARTNER_ASSIGNED: 'partner_assigned',
  PARTNER_STATUS_CHANGED: 'partner_status_changed',
  NEW_ORDER_NOTIFICATION: 'new_order_notification',
  DELIVERY_UPDATE: 'delivery_update'
};

// Validation Patterns
const VALIDATION = {
  EMAIL_REGEX: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
  PHONE_REGEX: /^[0-9]{10}$/,
  TIME_REGEX: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  ORDER_ID_PREFIX: 'ORD',
  PARTNER_ID_PREFIX: 'PART'
};

// Database Collection Names
const COLLECTIONS = {
  USERS: 'users',
  ORDERS: 'orders',
  PARTNERS: 'partners'
};

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  USER_ROLES,
  PARTNER_STATUS,
  VEHICLE_TYPES,
  ORDER_PRIORITY,
  DEFAULT_CONFIG,
  HTTP_STATUS,
  MESSAGES,
  SOCKET_EVENTS,
  VALIDATION,
  COLLECTIONS
}; 