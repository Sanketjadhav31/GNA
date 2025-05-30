// Order Status Constants
export const ORDER_STATUS = {
  PREP: 'PREP',
  PICKED: 'PICKED',
  ON_ROUTE: 'ON_ROUTE',
  DELIVERED: 'DELIVERED'
};

// Partner Status Constants
export const PARTNER_STATUS = {
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PARTNER: 'partner'
};

// Status Colors for UI
export const STATUS_COLORS = {
  [ORDER_STATUS.PREP]: 'bg-yellow-100 text-yellow-800',
  [ORDER_STATUS.PICKED]: 'bg-blue-100 text-blue-800',
  [ORDER_STATUS.ON_ROUTE]: 'bg-purple-100 text-purple-800',
  [ORDER_STATUS.DELIVERED]: 'bg-green-100 text-green-800'
};

export const PARTNER_STATUS_COLORS = {
  [PARTNER_STATUS.AVAILABLE]: 'bg-green-100 text-green-800',
  [PARTNER_STATUS.BUSY]: 'bg-red-100 text-red-800',
  [PARTNER_STATUS.OFFLINE]: 'bg-gray-100 text-gray-800'
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    PROFILE: '/api/auth/profile',
    LOGOUT: '/api/auth/logout'
  },
  ORDERS: {
    BASE: '/api/orders',
    ASSIGN: '/api/orders/assign',
    ANALYTICS: '/api/orders/analytics'
  },
  PARTNERS: {
    BASE: '/api/partners',
    AVAILABILITY: '/api/partners/availability',
    STATS: '/api/partners/stats'
  }
};

// Socket Events
export const SOCKET_EVENTS = {
  ORDER_UPDATED: 'orderUpdated',
  PARTNER_STATUS_CHANGED: 'partnerStatusChanged',
  NEW_ORDER: 'newOrder',
  ORDER_ASSIGNED: 'orderAssigned'
};

// Demo Credentials
export const DEMO_CREDENTIALS = {
  ADMIN: { email: 'admin@zomato.com', password: 'admin123' },
  MANAGER: { email: 'manager@zomato.com', password: 'manager123' },
  PARTNER: { email: 'partner@zomato.com', password: 'partner123' }
}; 