const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
require('dotenv').config();

// Debug environment variables
console.log('🔍 Environment Variables Debug:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  hasJWT_SECRET: !!process.env.JWT_SECRET,
  JWT_SECRET_length: process.env.JWT_SECRET?.length,
  JWT_EXPIRE: process.env.JWT_EXPIRE,
  MONGODB_URI: process.env.MONGODB_URI ? '***configured***' : 'missing',
  CLIENT_URL: process.env.CLIENT_URL
});

// Import configurations and utilities
const connectDB = require('./config/db');
const { SOCKET_EVENTS } = require('./utils/constants');

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const partnerRoutes = require('./routes/partners');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const usersRoutes = require('./routes/users');
const notificationService = require('./services/notificationService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set up notification service with Socket.IO
notificationService.setSocketIO(io);

// Connect to MongoDB
connectDB();

// Security and logging middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CLIENT_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zomato Ops Pro API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zomato Ops Pro API v1.0',
    documentation: {
      auth: '/api/auth - Authentication endpoints',
      orders: '/api/orders - Order management endpoints',
      partners: '/api/partners - Partner management endpoints'
    },
    features: [
      'Role-based authentication (Admin, Manager, Partner)',
      'Order lifecycle management (PREP → PICKED → ON_ROUTE → DELIVERED)',
      'Partner assignment and availability tracking',
      'Real-time updates via WebSocket',
      'Order and partner analytics',
      'Status validation and business logic enforcement'
    ]
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', usersRoutes);

// Socket.IO authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || decoded.id;
      socket.userRole = decoded.role;
      console.log(`✅ Socket authenticated for user: ${socket.userId}, role: ${socket.userRole}`);
    }
    
    next();
  } catch (error) {
    console.log('⚠️ Socket authentication error:', error.message);
    next();
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`📡 User connected: ${socket.id}`);

  // Join room based on role and user data
  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`👤 User joined room: ${roomId}`);
  });

  // Enhanced room joining with multiple room support
  socket.on('join_room', (data) => {
    const { role, userId, userEmail } = data;
    
    if (role === 'manager') {
      socket.join('manager');
      console.log(`👨‍💼 Manager joined manager room`);
    } else if (role === 'partner') {
      // Join both user ID and email-based rooms for partners
      socket.join(userId); // Partner joins their user ID room
      if (userEmail) {
        socket.join(userEmail); // Partner also joins their email room
        console.log(`🚚 Partner ${userId} (${userEmail}) joined personal rooms`);
      } else {
        console.log(`🚚 Partner ${userId} joined personal room`);
      }
    }
    
    // Auto-join role-based rooms based on socket authentication
    if (socket.userRole === 'manager') {
      socket.join('manager');
      console.log(`👨‍💼 Manager auto-joined manager room`);
    } else if (socket.userRole === 'partner') {
      socket.join(socket.userId); // Partner joins their own room
      console.log(`🚚 Partner ${socket.userId} auto-joined personal room`);
    }
  });

  // Handle direct order assignment to partner
  socket.on('assign_order_to_partner', (data) => {
    const { partnerId, partnerEmail, order, assignedBy } = data;
    console.log(`📦 Direct order assignment: ${order.orderId} to partner ${partnerId} (${partnerEmail})`);
    
    // Emit to partner's rooms
    socket.to(partnerId).emit('order-assigned', {
      order,
      partner: {
        id: partnerId,
        email: partnerEmail
      },
      assignedBy,
      message: `You have been assigned order ${order.orderId}`
    });
    
    // Also emit to email-based room if available
    if (partnerEmail) {
      socket.to(partnerEmail).emit('order-assigned', {
        order,
        partner: {
          id: partnerId,
          email: partnerEmail
        },
        assignedBy,
        message: `You have been assigned order ${order.orderId}`
      });
    }
  });

  // Handle partner requesting an order
  socket.on('partner_requests_order', (data) => {
    const { orderId, partnerId, partnerName, partnerEmail, message } = data;
    console.log(`📝 Partner request: ${partnerName} (${partnerId}) wants order ${orderId}`);
    
    // Notify all managers about the partner request
    socket.to('manager').emit('partner_order_request', {
      orderId,
      partnerId,
      partnerName,
      partnerEmail,
      message,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
    
    console.log(`📢 Notified managers about partner request for order ${orderId}`);
  });

  // Handle partner status updates
  socket.on('order_status_update', (data) => {
    console.log(`📝 Partner status update received:`, data);
    
    // Broadcast to all managers
    socket.to('manager').emit('order_status_update', data);
    
    // Also emit to all connected clients for real-time updates
    io.emit('partner_status_update', {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      status: data.status,
      partnerId: data.partnerId,
      partnerName: data.partnerName,
      partnerEmail: data.partnerEmail,
      customerName: data.customerName,
      updatedAt: data.updatedAt || new Date().toISOString()
    });
    
    console.log(`📡 Status update broadcasted to managers: ${data.orderNumber} → ${data.status}`);
  });

  // Handle manager notifications
  socket.on('notify_managers', (data) => {
    console.log(`📢 Manager notification:`, data);
    
    // Send to all managers
    socket.to('manager').emit('notify_managers', data);
    
    // Also emit specific event for order status updates
    if (data.type === 'order_status_updated') {
      socket.to('manager').emit('order_status_updated', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        newStatus: data.newStatus,
        partnerId: data.partnerId,
        partnerName: data.partnerName,
        partnerEmail: data.partnerEmail,
        customerName: data.customerName,
        message: data.message,
        timestamp: data.timestamp
      });
    }
    
    console.log(`📡 Manager notification sent: ${data.message}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`📡 User disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
      error: 'Duplicate field value'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: err.message
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: err.message
    });
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: 'Origin not allowed'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Something went wrong'
  });
});

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health - Health check',
      'GET /api - API documentation',
      'POST /api/auth/login - User login',
      'GET /api/orders - Get orders',
      'GET /api/partners - Get partners'
    ]
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
🚀 Zomato Ops Pro Server is running!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Server URL: http://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}/health
📚 API Docs: http://localhost:${PORT}/api
🔐 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/zomato_ops_pro'}
🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}
⚡ Socket.IO: Ready for real-time communications
  `);
});

// Export for testing
module.exports = { app, server, io }; 