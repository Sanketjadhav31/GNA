import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPinIcon,
  CurrencyRupeeIcon,
  TruckIcon,
  ClockIcon,
  StarIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BellIcon,
  ChartBarIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PlayIcon,
  PauseIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  BanknotesIcon,
  TrophyIcon,
  FireIcon,
  ShieldCheckIcon,
  EyeIcon,
  HomeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import partnerService from '../services/partnerService';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Counter, { CurrencyCounter, PercentageCounter } from '../components/ui/Counter';
import Loading from '../components/ui/Loading';
import { fadeInUp, staggerContainer, staggerItem, slideInRight, scaleIn } from '../utils/animations';
import { cn } from '../utils/cn';
import io from 'socket.io-client';

const PartnerDashboard = () => {
  const { user, updatePartnerStatus } = useAuth();
  const { socket, connected, emitPartnerStatusUpdate, emitOrderStatusUpdate } = useSocket();
  
  // State management
  const [partnerStatus, setPartnerStatus] = useState(user?.status || 'offline');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [statistics, setStatistics] = useState({
    todayDeliveries: 0,
    totalDeliveries: 0,
    todayEarnings: 0,
    totalEarnings: 0,
    averageRating: 0,
    completionRate: 0,
    onTimeDeliveries: 0,
    averageDeliveryTime: 0,
    weeklyEarnings: []
  });
  const [todayStats, setTodayStats] = useState({
    deliveries: 0,
    earnings: 0,
    rating: 5.0,
    onlineTime: 0
  });
  const [totalStats, setTotalStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    averageRating: 5.0,
    totalOnlineTime: 0
  });
  const [availableOrders, setAvailableOrders] = useState([]);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [realtimeSocket, setRealtimeSocket] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);

  // Initialize partner status from user data on component mount
  useEffect(() => {
    if (user && user.status) {
      setPartnerStatus(user.status);
      console.log('✅ Partner status loaded from user:', user.status);
    }
    
    // Check if user has a current order stored and load it from global storage
    if (user && user.currentOrder) {
      // Load the actual order from global storage
      const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
      const userCurrentOrder = globalOrders.find(order => 
        order._id === user.currentOrder && 
        (order.assignedPartner === (user._id || user.id) || order.assignedPartner === user.currentOrder)
      );
      
      if (userCurrentOrder) {
        // Get stored order status from localStorage - this is the source of truth for partner actions
        const storedAuth = JSON.parse(localStorage.getItem('zomato_auth') || '{}');
        const authStatus = storedAuth.user?.orderStatus;
        
        // Use auth status as the source of truth
        const finalStatus = authStatus || userCurrentOrder.status || 'PICKED';
        
        // Update global storage to match auth status if needed
        if (userCurrentOrder.status !== finalStatus) {
          const updatedGlobalOrders = globalOrders.map(order => 
            order._id === user.currentOrder 
              ? { ...order, status: finalStatus, updatedAt: new Date().toISOString() }
              : order
          );
          localStorage.setItem('global_orders', JSON.stringify(updatedGlobalOrders));
          console.log('🔄 Dashboard: Global storage synced with auth status:', finalStatus);
        }
        
        const currentOrderWithStatus = {
          ...userCurrentOrder,
          status: finalStatus
        };
        
        setCurrentOrder(currentOrderWithStatus);
        console.log('✅ Real current order loaded in Dashboard:', userCurrentOrder.orderId, 'with status:', finalStatus);
      } else {
        console.log('ℹ️ No matching current order found in global storage');
        // Clear invalid current order reference
        updatePartnerStatus(user.status || 'available', null);
      }
    }
  }, [user]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user && user.role === 'partner') {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Join partner rooms (both user ID and email-based)
      newSocket.emit('join_room', {
        role: 'partner',
        userId: user._id || user.id,
        userEmail: user.email
      });

      setRealtimeSocket(newSocket);

      // Listen for order assignments specifically for this partner
      newSocket.on('order-assigned', (data) => {
        console.log('📦 Order assignment received via Socket.IO:', data);
        
        // Verify this assignment is for current partner
        if (data.partner && (
          data.partner.email === user.email ||
          data.partner.id === (user._id || user.id)
        )) {
          console.log('✅ Order assigned to current partner via Socket.IO');
          handleOrderAssignedToCurrentPartner(data.order, data);
        } else {
          console.log('ℹ️ Order assigned to different partner');
        }
      });

      // Listen for order status confirmations
      newSocket.on('status-update-confirmed', (data) => {
        console.log('✅ Status update confirmed:', data);
        if (data.completedOrder) {
          setCurrentOrder(null);
          setPartnerStatus('available');
          toast.success(`Order ${data.orderNumber} completed! Earned ₹${data.earnings}`, {
            duration: 5000,
            icon: '💰'
          });
        } else {
          setCurrentOrder(prev => prev ? { ...prev, status: data.newStatus } : null);
          toast.success(`Order status updated to ${data.newStatus}`);
        }
      });

      // Listen for delivery completion
      newSocket.on('delivery-completed', (data) => {
        console.log('🎉 Delivery completed:', data);
        setCurrentOrder(null);
        setPartnerStatus('available');
        toast.success(`Delivery completed! You're now available for new orders.`, {
          duration: 5000,
          icon: '🎉'
        });
      });

      // Listen for new orders available
      newSocket.on('new_order_available', (data) => {
        console.log('📢 New order available:', data);
        toast.success(`🔔 New order available: ${data.orderId}`, {
          duration: 3000,
          position: 'top-right'
        });
        // Refresh available orders
        loadDashboardData();
      });

      console.log('🔌 Partner Socket.IO connected for real-time updates');

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, partnerStatus, currentOrder]);

  // Enhanced function to handle order assignment to current partner
  const handleOrderAssignedToCurrentPartner = (orderData, assignmentData) => {
    console.log('🎯 Processing order assignment for current partner:', user.email);
    console.log('📦 Order data:', orderData);
    console.log('📋 Assignment data:', assignmentData);
      
      // Create complete order object with all necessary data
      const assignedOrder = {
      _id: orderData._id || orderData.orderId,
      orderId: orderData.orderId || orderData.orderNumber,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail || 'Not provided',
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        totalAmount: orderData.totalAmount,
        items: orderData.items || [],
        specialInstructions: orderData.specialInstructions || '',
        estimatedDeliveryTime: orderData.estimatedDeliveryTime || 30,
      status: orderData.status || 'PREP',
      assignedAt: orderData.assignedAt || assignmentData.assignedAt || new Date().toISOString(),
      assignedBy: assignmentData.assignedBy || assignmentData.managerName || 'Manager',
      priority: orderData.priority || 'medium',
      assignedPartnerEmail: user.email
      };
      
      console.log('📦 Setting current order in dashboard:', assignedOrder);
      
      // Set as current order immediately
      setCurrentOrder(assignedOrder);
      console.log('✅ Current order set:', assignedOrder.orderId);
      
      // Update partner status to busy
      setPartnerStatus('busy');
      
      // Update auth context with current order
      updatePartnerStatus('busy', assignedOrder._id);
      
      // Store in localStorage for persistence
      localStorage.setItem('current_order', JSON.stringify(assignedOrder));
      
      // Update auth data to include current order
      const storedAuth = JSON.parse(localStorage.getItem('zomato_auth') || '{}');
      if (storedAuth.user) {
      storedAuth.user.orderStatus = assignedOrder.status;
        storedAuth.user.currentOrder = assignedOrder._id;
        storedAuth.user.status = 'busy';
        localStorage.setItem('zomato_auth', JSON.stringify(storedAuth));
        console.log('✅ Auth data updated with current order');
      }
      
      // Update partner status in registered partners
      const allPartners = JSON.parse(localStorage.getItem('registered_partners') || '[]');
      const updatedPartners = allPartners.map(partner => 
      partner.email === user.email || partner._id === (user._id || user.id)
          ? { ...partner, status: 'busy', currentOrder: assignedOrder._id }
          : partner
      );
      localStorage.setItem('registered_partners', JSON.stringify(updatedPartners));
      
      // Show detailed assignment notification with complete customer info
      toast.success(
        <div className="space-y-2">
          <div className="font-bold">🚚 Order Assigned to You!</div>
          <div className="text-sm">
          <div>📦 Order: #{assignedOrder.orderId}</div>
          <div>👤 Customer: {assignedOrder.customerName}</div>
          <div>📧 Email: {assignedOrder.customerEmail}</div>
          <div>📞 Phone: {assignedOrder.customerPhone}</div>
          <div>💰 Amount: ₹{assignedOrder.totalAmount}</div>
          <div className="text-blue-600">Assigned by: {assignedOrder.assignedBy}</div>
          </div>
        </div>,
        {
          duration: 8000,
          position: 'top-center'
        }
      );
      
      console.log('✅ Order assignment completed in dashboard:', {
        orderId: assignedOrder._id,
        orderNumber: assignedOrder.orderId,
      partnerEmail: user.email,
        partnerStatus: 'busy',
        currentOrderSet: true
      });
      
      // Refresh dashboard data to ensure everything is in sync
      setTimeout(() => {
        console.log('🔄 Refreshing dashboard after order assignment...');
        loadDashboardData();
      }, 1000);
    };
    
  // Load initial data and set up real-time updates
  useEffect(() => {
    loadDashboardData();
    startLocationTracking();
    
    // Set up real-time updates every 30 seconds for available orders
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing available orders...');
      loadDashboardData();
    }, 30000);
    
    // Real-time event listeners for order updates
    const handleOrderCompleted = (event) => {
      console.log('✅ Order completed event received, refreshing available orders...');
      loadDashboardData();
    };

    const handleNewOrderCreated = (event) => {
      console.log('📦 New order created event received, refreshing available orders...');
      loadDashboardData();
      toast.success('📦 New order available!', { duration: 3000 });
    };

    const handleOrderAssignedToMe = (event) => {
      console.log('🎯 Order assigned to me event received:', event.detail);
      const orderData = event.detail;
      
      if (orderData && (orderData.assignedPartnerEmail === user.email || orderData.partnerEmail === user.email)) {
        handleOrderAssignedToCurrentPartner(orderData, event.detail);
        loadDashboardData(); // Refresh to remove from available orders
      }
    };

    const handlePartnerOrderAssigned = (event) => {
      console.log('👥 Partner order assigned event received:', event.detail);
      // Refresh available orders as one order was assigned
          loadDashboardData();
    };

    const handlePartnerOrderNotification = (event) => {
      console.log('🔔 Partner order notification received:', event.detail);
      const data = event.detail;
      
      if (data.partnerEmail === user.email || data.assignedPartnerEmail === user.email) {
        toast.success(`📦 New order assigned: ${data.orderNumber}`, { duration: 5000 });
        loadDashboardData();
      }
    };

    const handleOrderNoLongerAvailable = (event) => {
      console.log('❌ Order no longer available:', event.detail);
      // Refresh available orders to remove assigned/completed orders
      loadDashboardData();
    };

    const handleOrderStatusChanged = (event) => {
      console.log('🔄 Order status changed:', event.detail);
      // Refresh available orders as status changes might affect availability
      loadDashboardData();
    };

    const handleOrderAccepted = (event) => {
      console.log('✅ Order accepted by partner:', event.detail);
      // Refresh available orders to remove accepted order
      loadDashboardData();
    };

    const handleStorageChange = (event) => {
      if (event.key === 'global_orders' || event.key === 'completed_orders') {
        console.log('💾 Storage change detected for orders, refreshing...');
        setTimeout(() => loadDashboardData(), 500); // Small delay to ensure storage is updated
      }
    };

    // Add event listeners
    window.addEventListener('orderCompleted', handleOrderCompleted);
    window.addEventListener('newOrderCreated', handleNewOrderCreated);
    window.addEventListener('orderAssignedToMe', handleOrderAssignedToMe);
    window.addEventListener('partnerOrderAssigned', handlePartnerOrderAssigned);
    window.addEventListener('partnerOrderNotification', handlePartnerOrderNotification);
    window.addEventListener('orderNoLongerAvailable', handleOrderNoLongerAvailable);
    window.addEventListener('orderStatusChanged', handleOrderStatusChanged);
    window.addEventListener('orderAccepted', handleOrderAccepted);
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('orderCompleted', handleOrderCompleted);
      window.removeEventListener('newOrderCreated', handleNewOrderCreated);
      window.removeEventListener('orderAssignedToMe', handleOrderAssignedToMe);
      window.removeEventListener('partnerOrderAssigned', handlePartnerOrderAssigned);
      window.removeEventListener('partnerOrderNotification', handlePartnerOrderNotification);
      window.removeEventListener('orderNoLongerAvailable', handleOrderNoLongerAvailable);
      window.removeEventListener('orderStatusChanged', handleOrderStatusChanged);
      window.removeEventListener('orderAccepted', handleOrderAccepted);
      window.removeEventListener('storage', handleStorageChange);
      stopLocationTracking();
    };
  }, [user]);

  // Location tracking functions
  const startLocationTracking = () => {
    console.log('📍 Starting location tracking for partner...');
    getCurrentLocation();
    
    // Update location every 2 minutes
    const locationInterval = setInterval(() => {
      getCurrentLocation();
    }, 120000);
    
    // Store interval ID for cleanup
    window.partnerLocationInterval = locationInterval;
  };

  const stopLocationTracking = () => {
    console.log('📍 Stopping location tracking...');
    if (window.partnerLocationInterval) {
      clearInterval(window.partnerLocationInterval);
      delete window.partnerLocationInterval;
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          
          // Update location on server
          partnerService.updateLocation(newLocation).catch(error => {
            console.warn('Failed to update location on server:', error);
          });
        },
        (error) => {
          console.warn('Failed to get current location:', error);
        }
      );
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      console.log('📝 Updating partner status to:', newStatus);
      
      // Update local state immediately for better UX
      setPartnerStatus(newStatus);
      
      // Only allow manual status change to 'available' or 'offline'
      // 'busy' status should only be set when accepting an order
      if (newStatus === 'busy' && !currentOrder) {
        toast.error('You can only become busy by accepting an order');
        setPartnerStatus(user?.status || 'available');
        return;
      }
      
      if (newStatus === 'available') {
        // Clear current order when becoming available
        setCurrentOrder(null);
        updatePartnerStatus(newStatus, null);
      } else {
        updatePartnerStatus(newStatus, currentOrder?._id);
      }
      
      // Emit real-time status update
      if (emitPartnerStatusUpdate) {
      emitPartnerStatusUpdate(newStatus, location);
      }
      
      toast.success(`Status updated to ${newStatus}`, {
        icon: newStatus === 'available' ? '🟢' : newStatus === 'busy' ? '🟡' : '🔴',
        duration: 2000
      });
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      // Revert local state on error
      setPartnerStatus(user?.status || 'offline');
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdating(true);
      console.log(`🔄 Updating order ${orderId} status to ${newStatus}...`);

      // Use backend API only
      const response = await orderService.updateOrderStatusBackend(orderId, newStatus);
      
      if (response.success) {
        console.log('✅ Order status updated via backend API');
        
        // Update local state with backend response
        const updatedOrder = response.data;
        setCurrentOrder(updatedOrder);
        
        // Emit real-time event for dashboard updates
        window.dispatchEvent(new CustomEvent('order-updated', {
          detail: { orderId, newStatus, source: 'backend' }
        }));
        
        // If delivered, clear current order and update status
        if (newStatus === 'DELIVERED') {
          setTimeout(() => {
            setCurrentOrder(null);
            setPartnerStatus('available');
            updatePartnerStatus('available', null);
            toast.success(`🎉 Order delivered successfully!`);
            loadDashboardData(); // Refresh available orders
          }, 1500);
        }
        
        toast.success(`✅ Order ${newStatus.toLowerCase()}!`);
        
      } else {
        throw new Error(response.message || 'Failed to update order status');
      }

    } catch (error) {
      console.error('❌ Error updating order status:', error);
      toast.error('Failed to update order status: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading partner dashboard data from backend API...');
      
      // Get current assigned order from backend API
      try {
        const currentOrderResponse = await orderService.getCurrentOrder();
        if (currentOrderResponse.success && currentOrderResponse.data) {
          setCurrentOrder(currentOrderResponse.data);
          setPartnerStatus('busy');
          console.log('✅ Current order loaded from backend:', currentOrderResponse.data.orderId);
        } else {
          setCurrentOrder(null);
          setPartnerStatus(user?.status || 'available');
          console.log('ℹ️ No current order found in backend');
        }
      } catch (error) {
        console.log('⚠️ Failed to load current order from backend:', error.message);
        setCurrentOrder(null);
        setPartnerStatus(user?.status || 'available');
      }
      
      // Load available orders from backend
      try {
        const availableOrdersResponse = await orderService.getAvailableOrders();
        if (availableOrdersResponse.success) {
          const orders = availableOrdersResponse.data.map(order => ({
            ...order,
            formattedTime: formatTime(order.createdAt),
            formattedAmount: formatCurrency(order.totalAmount),
            timeAgo: getTimeAgo(order.createdAt)
          }));
          setAvailableOrders(orders);
          console.log(`✅ Loaded ${orders.length} available orders from backend`);
        }
      } catch (error) {
        console.log('⚠️ Failed to load available orders from backend:', error.message);
        setAvailableOrders([]);
      }
      
      // Load partner statistics from backend (if available)
      try {
        const statsResponse = await partnerService.getPartnerStats();
        if (statsResponse.success) {
          setTodayStats(statsResponse.data.today || {
            deliveries: 0,
            earnings: 0,
            rating: 5.0,
            onlineTime: 0
          });
          setTotalStats(statsResponse.data.total || {
            totalDeliveries: 0,
            totalEarnings: 0,
            averageRating: 5.0,
            totalOnlineTime: 0
          });
        }
      } catch (error) {
        console.log('⚠️ Failed to load stats from backend, using defaults:', error.message);
        setTodayStats({
          deliveries: 0,
          earnings: 0,
          rating: 5.0,
          onlineTime: 0
        });
        setTotalStats({
          totalDeliveries: 0,
          totalEarnings: 0,
          averageRating: 5.0,
          totalOnlineTime: 0
        });
      }
      
      console.log('✅ Partner dashboard data loaded from backend API');
      
    } catch (error) {
      console.error('❌ Error loading partner dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
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

  const getStatusColor = (status) => {
    const colors = {
      available: 'text-green-600 bg-green-100',
      busy: 'text-yellow-600 bg-yellow-100',
      offline: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getOrderStatusColor = (status) => {
    const colors = {
      PREP: 'text-amber-600',
      PICKED: 'text-blue-600',
      ON_ROUTE: 'text-purple-600',
      DELIVERED: 'text-green-600',
      CANCELLED: 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Loading size="lg" text="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header Section */}
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Welcome Section */}
            <div className="flex items-center space-x-4">
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <UserCircleIcon className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Welcome back, {user?.name}! 👋
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Ready to deliver excellence today?
                </p>
              </div>
            </div>

            {/* Status & Connection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Connection Status */}
              <motion.div
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium",
                  connected 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                )}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {connected ? '🟢 Live Connected' : '🔴 Offline'}
              </motion.div>

              {/* Partner Status Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex bg-white rounded-xl p-1 shadow-md">
                  {['available', 'busy', 'offline'].map((status) => (
                    <motion.button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={updating}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        partnerStatus === status
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {status === 'available' && '🟢'}
                      {status === 'busy' && '🟡'}
                      {status === 'offline' && '🔴'}
                      {' '}
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Today's Deliveries */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600 mb-1">Today's Deliveries</p>
                    <Counter 
                      value={todayStats.deliveries || 0} 
                      className="text-3xl font-bold text-blue-900"
                    />
                    <div className="flex items-center mt-2">
                      <TruckIcon className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-sm text-blue-600">Active</span>
                    </div>
                  </div>
                  <motion.div
                    className="p-3 bg-blue-500 rounded-xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <TruckIcon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Today's Earnings */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-600 mb-1">Today's Earnings</p>
                    <CurrencyCounter 
                      value={todayStats.earnings || 0} 
                      className="text-3xl font-bold text-green-900"
                    />
                    <div className="flex items-center mt-2">
                      <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+12.5%</span>
                    </div>
                  </div>
                  <motion.div
                    className="p-3 bg-green-500 rounded-xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CurrencyRupeeIcon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rating */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-600 mb-1">Average Rating</p>
                    <div className="flex items-center">
                      <Counter 
                        value={totalStats.averageRating || 5.0} 
                        decimals={1}
                        className="text-3xl font-bold text-purple-900"
                      />
                      <StarIcon className="h-6 w-6 text-yellow-400 ml-2 fill-current" />
                    </div>
                    <div className="flex items-center mt-2">
                      <TrophyIcon className="h-4 w-4 text-purple-500 mr-1" />
                      <span className="text-sm text-purple-600">Excellent</span>
                    </div>
                  </div>
                  <motion.div
                    className="p-3 bg-purple-500 rounded-xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <StarIcon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Completion Rate */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-600 mb-1">Completion Rate</p>
                    <PercentageCounter 
                      value={statistics.completionRate || 100} 
                      className="text-3xl font-bold text-orange-900"
                    />
                    <div className="flex items-center mt-2">
                      <ShieldCheckIcon className="h-4 w-4 text-orange-500 mr-1" />
                      <span className="text-sm text-orange-600">Reliable</span>
                    </div>
                  </div>
                  <motion.div
                    className="p-3 bg-orange-500 rounded-xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Current Order Section */}
        <AnimatePresence>
          {currentOrder && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card variant="elevated" className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center">
                      <FireIcon className="h-6 w-6 mr-2" />
                      Current Active Order
                    </span>
                    <StatusBadge status={currentOrder.status} className="bg-white/20" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Order Details */}
                    <div className="lg:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-white/70 text-sm mb-1">Order ID</p>
                          <p className="text-xl font-bold text-white">{currentOrder.orderId}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-sm mb-1">Customer</p>
                          <p className="text-lg font-semibold text-white">{currentOrder.customerName}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-sm mb-1">Amount</p>
                          <p className="text-xl font-bold text-white">{formatCurrency(currentOrder.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-white/70 text-sm mb-1">Phone</p>
                          <p className="text-lg font-semibold text-white">{currentOrder.customerPhone}</p>
                        </div>
                      </div>
                      
                      {/* Customer Email */}
                      {currentOrder.customerEmail && currentOrder.customerEmail !== 'Not provided' && (
                        <div className="mt-4">
                          <p className="text-white/70 text-sm mb-1">Customer Email</p>
                          <p className="text-white font-medium">{currentOrder.customerEmail}</p>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <p className="text-white/70 text-sm mb-2">Delivery Address</p>
                        <div className="flex items-start space-x-2">
                          <MapPinIcon className="h-5 w-5 text-white/70 mt-0.5" />
                          <p className="text-white">{currentOrder.customerAddress}</p>
                        </div>
                      </div>
                      
                      {/* Special Instructions */}
                      {currentOrder.specialInstructions && (
                        <div className="mt-4">
                          <p className="text-white/70 text-sm mb-2">Special Instructions</p>
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-white text-sm">{currentOrder.specialInstructions}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {currentOrder.status === 'PREP' && (
                        <Button
                          onClick={() => handleUpdateOrderStatus(currentOrder._id, 'PICKED')}
                          fullWidth
                          size="lg"
                          className="bg-white text-indigo-600 hover:bg-gray-100 shadow-lg"
                        >
                          Mark as Picked Up
                        </Button>
                      )}
                      
                      {currentOrder.status === 'PICKED' && (
                        <Button
                          onClick={() => handleUpdateOrderStatus(currentOrder._id, 'ON_ROUTE')}
                          fullWidth
                          size="lg"
                          className="bg-white text-indigo-600 hover:bg-gray-100 shadow-lg"
                        >
                          Start Delivery
                        </Button>
                      )}
                      
                      {currentOrder.status === 'ON_ROUTE' && (
                        <Button
                          onClick={() => handleUpdateOrderStatus(currentOrder._id, 'DELIVERED')}
                          fullWidth
                          size="lg"
                          className="bg-white text-indigo-600 hover:bg-gray-100 shadow-lg"
                        >
                          Mark as Delivered
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => window.open(`tel:${currentOrder.customerPhone}`)}
                        fullWidth
                        variant="ghost"
                        size="lg"
                        className="text-white border-white/30 hover:bg-white/10"
                        icon={PhoneIcon}
                      >
                        Call Customer
                      </Button>
                      
                      {/* Email Customer Button */}
                      {currentOrder.customerEmail && currentOrder.customerEmail !== 'Not provided' && (
                        <Button
                          onClick={() => window.open(`mailto:${currentOrder.customerEmail}`)}
                          fullWidth
                          variant="ghost"
                          size="lg"
                          className="text-white border-white/30 hover:bg-white/10"
                        >
                          📧 Email Customer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Available Orders */}
          <motion.div
            className="xl:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="elevated" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <BellIcon className="h-6 w-6 mr-2 text-indigo-600" />
                    Available Orders
                  </span>
                  <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">
                      {availableOrders.length} orders available
                  </span>
                    <Button
                      onClick={loadDashboardData}
                      variant="ghost"
                      size="sm"
                      icon={ArrowPathIcon}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      Refresh
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {availableOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <TruckIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-xl font-medium mb-2">No Available Orders</p>
                    <p className="text-gray-600 mb-4">
                        All orders are currently assigned or completed.<br/>
                        New orders will appear here when they're ready for pickup.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                      <div className="flex items-center text-blue-800 text-sm">
                        <BellIcon className="h-5 w-5 mr-2" />
                          <span className="font-medium">Real-time updates enabled</span>
                    </div>
                      <p className="text-blue-700 text-xs mt-1">
                          You'll see new orders automatically when they're created
                      </p>
                            </div>
                          </div>
                  ) : (
                    <div className="space-y-1">
                      {availableOrders.map((order, index) => (
                        <motion.div
                          key={order._id}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b last:border-b-0 cursor-pointer"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ x: 4, backgroundColor: '#f8fafc' }}
                        >
                          <div className="flex items-center space-x-4 flex-1">
                            {/* Order Icon */}
                            <div className="w-12 h-12 bg-gradient-to-r from-orange-100 to-red-100 rounded-xl flex items-center justify-center">
                              <span className="text-orange-600 font-semibold text-sm">
                                #{order.orderId?.slice(-3) || '000'}
                              </span>
                </div>
                            
                            {/* Order Details */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-gray-900">
                                  {order.customerName}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <StatusBadge status={order.status} size="sm" />
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {order.timeAgo}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                <div className="flex items-center space-x-1">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>{order.formattedTime}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <PhoneIcon className="h-4 w-4" />
                                  <span>{order.customerPhone}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-1 mt-2">
                                <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {order.customerAddress}
                                </p>
                              </div>
                              
                              {/* Special Instructions */}
                              {order.specialInstructions && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                                  <p className="text-xs text-yellow-800">
                                    <span className="font-medium">Note:</span> {order.specialInstructions}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Order Amount and Actions */}
                          <div className="flex items-center space-x-4 ml-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-900 text-lg">
                                {order.formattedAmount}
                              </p>
                              <p className="text-xs text-gray-500">
                                {order.items?.length || 0} items
                              </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col space-y-2">
                              <Button
                                onClick={() => window.open(`tel:${order.customerPhone}`)}
                                variant="ghost"
                                size="sm"
                                icon={PhoneIcon}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                Call
                              </Button>
                              
                              {order.customerEmail && order.customerEmail !== 'Not provided' && (
                                <Button
                                  onClick={() => window.open(`mailto:${order.customerEmail}`)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                                >
                                  📧 Email
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Footer with info */}
                {availableOrders.length > 0 && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live updates enabled</span>
                      </div>
                      <span>Orders ready for pickup</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Summary */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Performance Stats */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Total Deliveries */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <TruckIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">Total Deliveries</p>
                      <p className="text-sm text-blue-600">All time</p>
                    </div>
                  </div>
                  <Counter 
                    value={totalStats.totalDeliveries || 0} 
                    className="text-2xl font-bold text-blue-900"
                  />
                </div>

                {/* Total Earnings */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <BanknotesIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Total Earnings</p>
                      <p className="text-sm text-green-600">All time</p>
                    </div>
                  </div>
                  <CurrencyCounter 
                    value={totalStats.totalEarnings || 0} 
                    className="text-2xl font-bold text-green-900"
                  />
                </div>

                {/* Average Delivery Time */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <ClockIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-purple-900">Avg. Delivery Time</p>
                      <p className="text-sm text-purple-600">Per order</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Counter 
                      value={25} 
                      suffix=" min"
                      className="text-2xl font-bold text-purple-900"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Deliveries */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <CalendarDaysIcon className="h-5 w-5 mr-2 text-orange-600" />
                    Recent Deliveries
                  </span>
                  <Button variant="ghost" size="sm" icon={EyeIcon}>
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentDeliveries.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <HomeIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No recent deliveries</p>
                    </div>
                  ) : (
                    recentDeliveries.slice(0, 3).map((delivery, index) => (
                      <motion.div
                        key={delivery._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              #{delivery.orderId?.slice(-3) || '000'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatTime(delivery.deliveredAt || delivery.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 text-sm">
                            {formatCurrency(delivery.totalAmount || 0)}
                          </p>
                          <div className="flex items-center justify-end">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarIcon
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < (delivery.rating || 5)
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard; 