const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const partnerRoutes = require('./routes/partners');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active connections by user ID
const activeConnections = new Map();

// Socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const jwt = require('jsonwebtoken');
    const User = require('./models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.firstName} (${socket.user.role}) - Socket ID: ${socket.id}`);
  
  // Store user connection
  activeConnections.set(socket.user._id.toString(), {
    socketId: socket.id,
    user: socket.user,
    role: socket.user.role
  });

  // Join role-specific rooms
  socket.join(socket.user.role);
  socket.join(`user_${socket.user._id}`);

  // Handle partner availability updates
  socket.on('update_availability', async (data) => {
    try {
      if (socket.user.role === 'delivery_partner') {
        const User = require('./models/User');
        await User.findByIdAndUpdate(socket.user._id, { 
          isAvailable: data.isAvailable 
        });
        
        // Notify all restaurant managers about partner availability
        socket.to('restaurant_manager').emit('partner_availability_updated', {
          partnerId: socket.user._id,
          partnerName: `${socket.user.firstName} ${socket.user.lastName}`,
          isAvailable: data.isAvailable,
          timestamp: new Date()
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to update availability' });
    }
  });

  // Handle order status updates
  socket.on('update_order_status', async (data) => {
    try {
      const Order = require('./models/Order');
      const order = await Order.findById(data.orderId)
        .populate('restaurantManager deliveryPartner', 'firstName lastName');

      if (!order) {
        return socket.emit('error', { message: 'Order not found' });
      }

      // Emit real-time update to relevant users
      if (order.restaurantManager) {
        io.to(`user_${order.restaurantManager._id}`).emit('order_status_updated', {
          orderId: order._id,
          status: data.status,
          timestamp: new Date(),
          updatedBy: socket.user.firstName,
          orderDetails: order
        });
      }

      if (order.deliveryPartner) {
        io.to(`user_${order.deliveryPartner._id}`).emit('order_status_updated', {
          orderId: order._id,
          status: data.status,
          timestamp: new Date(),
          updatedBy: socket.user.firstName,
          orderDetails: order
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to process status update' });
    }
  });

  // Handle partner assignment
  socket.on('partner_assigned', async (data) => {
    try {
      const Order = require('./models/Order');
      const order = await Order.findById(data.orderId)
        .populate('restaurantManager deliveryPartner', 'firstName lastName phone');

      if (order && order.deliveryPartner) {
        // Notify the assigned partner
        io.to(`user_${order.deliveryPartner._id}`).emit('order_assigned', {
          orderId: order._id,
          orderDetails: order,
          message: `You have been assigned a new order #${order._id.slice(-6).toUpperCase()}`,
          timestamp: new Date()
        });

        // Notify restaurant manager
        io.to(`user_${order.restaurantManager._id}`).emit('partner_assigned_success', {
          orderId: order._id,
          partnerName: `${order.deliveryPartner.firstName} ${order.deliveryPartner.lastName}`,
          timestamp: new Date()
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to process partner assignment' });
    }
  });

  // Handle new order creation
  socket.on('new_order_created', async (data) => {
    try {
      // Notify all available delivery partners about new order
      socket.to('delivery_partner').emit('new_order_available', {
        orderId: data.orderId,
        restaurantName: data.restaurantName,
        totalAmount: data.totalAmount,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error broadcasting new order:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.firstName} - Socket ID: ${socket.id}`);
    activeConnections.delete(socket.user._id.toString());
  });
});

// Make io available to routes
app.set('io', io);

// Trust proxy setting for rate limiting
app.set('trust proxy', 1);

// CORS configuration with credentials support
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Preflight handling
// app.options('*', cors(corsOptions));

// Rate limiting with proper configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit to 1000 requests per windowMs to prevent blocking during development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use a simple key generator to avoid X-Forwarded-For issues
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  // Skip rate limiting for health checks
  skip: (req) => {
    return req.path === '/api/status' || req.path === '/api/health';
  }
});
app.use(limiter);

// Security headers with proper CSP for Socket.io
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000']
    }
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware for debugging (commented out for cleaner logs)
// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//   if (req.method === 'POST' && req.path === '/api/orders') {
//     console.log('POST /api/orders - Request body keys:', Object.keys(req.body));
//   }
//   next();
// });

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zomato-ops-pro')
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/partners', partnerRoutes);

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Zomato Ops Pro API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    socketConnections: activeConnections.size
  });
});

// Real-time status endpoint
app.get('/api/realtime/status', (req, res) => {
  res.status(200).json({
    success: true,
    activeConnections: activeConnections.size,
    connectedUsers: Array.from(activeConnections.values()).map(conn => ({
      userId: conn.user._id,
      name: `${conn.user.firstName} ${conn.user.lastName}`,
      role: conn.user.role,
      socketId: conn.socketId
    }))
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler - handle all unmatched routes
// app.all('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/api/status`);
  console.log(`⚡ Socket.io real-time server ready`);
}); 