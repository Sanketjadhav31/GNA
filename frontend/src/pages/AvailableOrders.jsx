import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CurrencyRupeeIcon,
  MapPinIcon,
  ShoppingBagIcon,
  UserIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations';
import io from 'socket.io-client';

const AvailableOrders = () => {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    loadAvailableOrders();
    setupSocketConnection();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const setupSocketConnection = () => {
    if (!user) return;

    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    // Join partner room for real-time updates
    newSocket.emit('join_room', {
      role: 'partner',
      userId: user._id || user.id,
      userEmail: user.email
    });

    console.log('🔌 Partner connected to Socket.IO for real-time orders');

    // Listen for new orders from managers (correct event name from backend)
    newSocket.on('new_order_available', (data) => {
      console.log('📦 New order available from manager:', data);
      
      // Add to available orders list
      setAvailableOrders(prev => {
        // Check if order already exists to avoid duplicates
        const exists = prev.some(order => order._id === data._id);
        if (!exists) {
          return [data, ...prev];
        }
        return prev;
      });
      
      toast.success(
        <div className="space-y-1">
          <div className="font-medium">🆕 New Order Available!</div>
          <div className="text-sm">Order #{data.orderId}</div>
          <div className="text-xs text-gray-600">₹{data.totalAmount} • {data.customerName}</div>
        </div>,
        { duration: 5000 }
      );
    });

    // Listen for order assignments (when manager assigns to someone else)
    newSocket.on('order_assigned', (data) => {
      console.log('👥 Order assigned:', data);
      
      // Remove from available orders if assigned to someone else
      if (data.partnerId !== (user._id || user.id)) {
        setAvailableOrders(prev => 
          prev.filter(order => order._id !== data.orderId)
        );
        
        toast.info(`Order ${data.orderNumber} assigned to ${data.partnerName}`);
      } else {
        // If assigned to current user, redirect to current order
        toast.success(`✅ You've been assigned order ${data.orderNumber}!`);
        setTimeout(() => {
          window.location.href = '/current-order';
        }, 2000);
      }
    });

    // Listen for order status updates (if order gets cancelled, etc.)
    newSocket.on('order_status_updated', (data) => {
      console.log('📝 Order status updated:', data);
      
      // Remove from available orders if status changed from PREP
      if (data.newStatus !== 'PREP') {
        setAvailableOrders(prev => 
          prev.filter(order => order._id !== data.orderId)
        );
      }
    });

    // Listen for manager notifications
    newSocket.on('notify_partners', (data) => {
      console.log('📢 Partner notification:', data);
      
      if (data.type === 'new_order') {
        // Refresh available orders
        loadAvailableOrders();
        toast.success(`📦 New order ${data.orderNumber} available!`);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  };

  const loadAvailableOrders = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading available orders from backend...');
      
      // Check authentication first
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('🔐 Auth check:', { hasToken: !!token, userRole: user.role, userName: user.name });
      
      if (!token) {
        console.error('❌ No authentication token found');
        toast.error('Please login to view available orders');
        return;
      }
      
      const response = await orderService.getAvailableOrders();
      
      if (response.success) {
        console.log('📋 Raw API response:', response.data);
        
        const allOrders = response.data || [];
        console.log('📦 All orders from API:', allOrders.length);
        
        // Less strict filtering - only filter out obviously invalid orders
        const validOrders = allOrders.filter(order => {
          // Must have basic required fields
          const hasBasicFields = order.orderId && order.customerName && order.totalAmount;
          
          // Must be available (PREP status and unassigned)
          const isAvailable = order.status === 'PREP' && !order.assignedTo;
          
          // Log each order for debugging
          console.log(`🔍 Order ${order.orderId}:`, {
            hasBasicFields,
            isAvailable,
            status: order.status,
            assigned: !!order.assignedTo,
            customer: order.customerName
          });
          
          return hasBasicFields && isAvailable;
        });
        
        setAvailableOrders(validOrders);
        console.log('✅ Valid available orders loaded:', validOrders.length);
        
        if (validOrders.length === 0) {
          console.log('ℹ️ No available orders found');
          if (allOrders.length > 0) {
            console.log('⚠️ All orders are either assigned or not in PREP status');
            allOrders.forEach(order => {
              console.log(`- ${order.orderId}: status=${order.status}, assigned=${!!order.assignedTo}`);
            });
          }
        } else {
          console.log('📋 Available orders:');
          validOrders.forEach(order => {
            console.log(`- ${order.orderId} - ${order.customerName} - ₹${order.totalAmount}`);
          });
        }
      } else {
        console.error('❌ Failed to load available orders:', response.message);
        toast.error('Failed to load available orders: ' + response.message);
        setAvailableOrders([]);
      }
    } catch (error) {
      console.error('❌ Error loading available orders:', error);
      
      // Check if it's an authentication error
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        toast.error('Authentication expired. Please login again.');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error('Failed to load available orders: ' + error.message);
      }
      
      setAvailableOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      setAccepting(orderId);
      
      // Send acceptance request to backend
      console.log('📝 Sending order acceptance request for:', orderId);
      
      // For now, we'll notify the manager via Socket.IO
      // In a full implementation, this would be an API call
      if (socket) {
        socket.emit('partner_requests_order', {
          orderId: orderId,
          partnerId: user._id || user.id,
          partnerName: user.name,
          partnerEmail: user.email,
          message: `${user.name} wants to accept order ${orderId}`
        });
        
        toast.success(
          <div className="space-y-1">
            <div className="font-medium">✅ Request Sent!</div>
            <div className="text-sm">Manager will assign the order to you</div>
          </div>,
          { duration: 4000 }
        );
      } else {
        toast.error('Connection error. Please refresh and try again.');
      }
      
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      toast.error('Failed to accept order: ' + error.message);
    } finally {
      setAccepting(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours}h ago`;
  };

  const formatItems = (items) => {
    if (!items || !Array.isArray(items)) return 'No items';
    
    // If items are objects with name and quantity
    if (items.length > 0 && typeof items[0] === 'object') {
      return items.map(item => `${item.name} x${item.quantity}`).join(', ');
    }
    
    // If items are just strings
    return items.join(', ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Loading size="lg" text="Loading available orders..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Available Orders</h1>
              <p className="text-lg text-gray-600 mt-1">
                {availableOrders.length} orders waiting for pickup
              </p>
              <p className="text-sm text-gray-500 mt-1">
                🔴 Live updates from restaurant managers
              </p>
            </div>
            
            <Button
              onClick={loadAvailableOrders}
              variant="secondary"
              size="md"
              className="shadow-md"
            >
              🔄 Refresh
            </Button>
          </div>
        </motion.div>

        {/* Orders List */}
        {availableOrders.length === 0 ? (
          <motion.div
            className="text-center py-12"
            initial={fadeInUp.initial}
            animate={fadeInUp.animate}
            transition={fadeInUp.transition}
          >
            <ShoppingBagIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Available Orders</h3>
            <p className="text-gray-500 mb-4">Waiting for restaurant managers to create new orders...</p>
            
            {/* Real-time status indicator */}
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Connected • Real-time updates active
            </div>
            
            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
              <h4 className="font-medium text-blue-900 mb-2">💡 How to test:</h4>
              <ol className="text-sm text-blue-800 text-left space-y-1">
                <li>1. Login as Manager: <code className="bg-blue-100 px-1 rounded">san3280@gmail.com</code></li>
                <li>2. Go to Orders page and create a new order</li>
                <li>3. Orders will appear here instantly via real-time updates</li>
                <li>4. Click "Request Order" to send assignment request</li>
              </ol>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-6"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {availableOrders.map((order, index) => (
              <motion.div
                key={order._id}
                variants={staggerItem}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                #{order.orderId?.slice(-3) || '000'}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                Order {order.orderId}
                              </h3>
                              <div className="flex items-center text-sm text-gray-500">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                <span>{getTimeAgo(order.createdAt)}</span>
                                <span className="mx-2">•</span>
                                <span>Prep: {order.prepTime}min</span>
                                <span className="mx-2">•</span>
                                <span className="text-green-600 font-medium">🟢 Available</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(order.totalAmount)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Est. earnings: {formatCurrency(Math.round(order.totalAmount * 0.1))}
                            </div>
                          </div>
                        </div>

                        {/* Customer Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center space-x-3">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{order.customerName}</p>
                              <p className="text-sm text-gray-500">Customer</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <PhoneIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{order.customerPhone}</p>
                              <p className="text-sm text-gray-500">Phone</p>
                            </div>
                          </div>
                        </div>

                        {/* Address */}
                        <div className="flex items-start space-x-3 mb-4">
                          <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="font-medium text-gray-900">Delivery Address</p>
                            <p className="text-sm text-gray-600">{order.customerAddress}</p>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="flex items-start space-x-3">
                          <ShoppingBagIcon className="h-5 w-5 text-gray-400 mt-1" />
                          <div>
                            <p className="font-medium text-gray-900">
                              Items ({Array.isArray(order.items) ? order.items.length : 0})
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatItems(order.items)}
                            </p>
                          </div>
                        </div>

                        {/* Manager Info */}
                        {order.createdBy && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs text-gray-500">
                              Created by: <span className="font-medium">{order.createdBy.name}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="lg:w-48">
                        <Button
                          onClick={() => handleAcceptOrder(order._id)}
                          loading={accepting === order._id}
                          fullWidth
                          size="lg"
                          icon={CheckCircleIcon}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
                        >
                          {accepting === order._id ? 'Requesting...' : 'Request Order'}
                        </Button>
                        
                        <div className="mt-3 text-center">
                          <p className="text-xs text-gray-500">
                            Distance: ~2.5 km
                          </p>
                          <p className="text-xs text-gray-500">
                            Est. time: {order.prepTime + 15}min
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          className="mt-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">How it works</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 🔴 Real-time orders appear here when managers create them</li>
                    <li>• 📝 Click "Request Order" to send assignment request to manager</li>
                    <li>• ✅ Manager will assign the order to you if available</li>
                    <li>• 🚚 You'll be redirected to track the assigned order</li>
                    <li>• 💰 Earn ~10% of order value as delivery fee</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Connection Status */}
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Real-time connection active • Socket.IO connected
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailableOrders; 