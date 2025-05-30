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
  HomeIcon
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

const PartnerDashboard = () => {
  const { user, updatePartnerStatus } = useAuth();
  const { socket, connected } = useSocket();
  
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
  const [availableOrders, setAvailableOrders] = useState([]);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });

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

  // Location tracking functions
  const startLocationTracking = useCallback(() => {
    if (navigator.geolocation) {
      console.log('📍 Starting location tracking...');
      
      // Get initial location
      getCurrentLocation();
      
      // Set up periodic location updates (every 30 seconds)
      const locationInterval = setInterval(() => {
        getCurrentLocation();
      }, 30000);
      
      // Store interval ID for cleanup
      window.locationInterval = locationInterval;
    } else {
      console.warn('⚠️ Geolocation is not supported by this browser');
      toast.error('Location tracking not supported');
    }
  }, []);

  const stopLocationTracking = useCallback(() => {
    console.log('🛑 Stopping location tracking...');
    if (window.locationInterval) {
      clearInterval(window.locationInterval);
      delete window.locationInterval;
    }
  }, []);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    startLocationTracking();
    
    // Set up global functions for socket events
    window.refreshAvailableOrders = () => {
      console.log('🔄 Refreshing available orders from socket event...');
      loadDashboardData();
    };
    
    window.removeFromAvailableOrders = (orderId) => {
      console.log('🗑️ Removing order from available list:', orderId);
      setAvailableOrders(prev => prev.filter(order => order._id !== orderId));
    };
    
    window.showNotification = (data) => {
      toast(data.message, {
        icon: data.type === 'success' ? '✅' : data.type === 'error' ? '❌' : 'ℹ️',
        duration: 4000
      });
    };
    
    // Listen for order completion events
    const handleOrderCompleted = (event) => {
      const { newStats, totalStats, completionBonus } = event.detail;
      console.log('🎉 Order completed event received, updating dashboard...', newStats);
      
      // Refresh dashboard data to show updated statistics
      setTimeout(() => {
        loadDashboardData();
        toast.success(`📈 Statistics updated! +₹${completionBonus}`, {
          duration: 3000
        });
      }, 500);
    };
    
    // Listen for new orders created by managers
    const handleNewOrderCreated = (event) => {
      const { order } = event.detail;
      console.log('🆕 New order received from manager:', order.orderId, 'Partner status:', partnerStatus);
      
      // Only add to available orders if partner is available and order is not already assigned
      if (partnerStatus === 'available' && !order.assignedPartner) {
        setAvailableOrders(prev => {
          // Check if order already exists to avoid duplicates
          const orderExists = prev.some(existingOrder => existingOrder._id === order._id);
          if (!orderExists) {
            const newOrders = [order, ...prev];
            console.log('✅ Order added to available list for partner:', user.name, 'Order ID:', order.orderId, 'Total available orders:', newOrders.length);
            
            toast.success(`🔔 New order available: ${order.orderId}`, {
              icon: '🆕',
              duration: 5000,
              style: {
                background: '#f0f9ff',
                border: '1px solid #0ea5e9',
                color: '#0369a1'
              }
            });
            
            return newOrders;
          } else {
            console.log('ℹ️ Order already exists in available list:', order.orderId);
            return prev;
          }
        });
      } else {
        console.log('ℹ️ Partner not available or order already assigned:', { 
          partnerStatus, 
          partnerName: user.name,
          orderAssigned: !!order.assignedPartner 
        });
      }
    };
    
    // Listen for orders accepted by other partners
    const handleOrderAccepted = (event) => {
      const { orderId, partnerName, partnerId } = event.detail;
      
      // Only process if it's not this partner who accepted the order
      if (partnerId !== (user._id || user.id)) {
        console.log(`📦 Order ${orderId} accepted by ${partnerName}, removing from available list for partner: ${user.name}`);
        
        // Remove order from available orders list immediately
        setAvailableOrders(prev => {
          const filteredOrders = prev.filter(order => order._id !== orderId);
          console.log('🗑️ Order removed from available list. Remaining orders:', filteredOrders.length);
          return filteredOrders;
        });
        
        toast.info(`📦 Order ${orderId} accepted by ${partnerName}`, {
          icon: 'ℹ️',
          duration: 3000
        });
      } else {
        console.log('ℹ️ Ignoring orderAccepted event from self:', partnerName);
      }
    };
    
    // Listen for order status changes and cancellations
    const handleOrderStatusChanged = (event) => {
      const { orderId, newStatus, partnerId } = event.detail;
      
      // If order is cancelled or returned to PREP status, add it back to available orders
      if (newStatus === 'PREP' && partnerId !== (user._id || user.id)) {
        console.log(`🔄 Order ${orderId} returned to PREP status, checking if should be available for partner: ${user.name}`);
        
        // Reload available orders to include the returned order
        setTimeout(() => {
          loadDashboardData();
        }, 500);
      }
    };
    
    window.addEventListener('orderCompleted', handleOrderCompleted);
    window.addEventListener('newOrderCreated', handleNewOrderCreated);
    window.addEventListener('orderAccepted', handleOrderAccepted);
    window.addEventListener('orderStatusChanged', handleOrderStatusChanged);
    
    // Listen for localStorage changes from other tabs/windows
    const handleStorageChange = (event) => {
      if (event.key === 'global_orders') {
        console.log('🔄 Global orders updated in another tab, refreshing available orders...');
        // Small delay to ensure the storage is fully updated
        setTimeout(() => {
          loadDashboardData();
        }, 200);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup on unmount
    return () => {
      delete window.refreshAvailableOrders;
      delete window.removeFromAvailableOrders;
      delete window.showNotification;
      window.removeEventListener('orderCompleted', handleOrderCompleted);
      window.removeEventListener('newOrderCreated', handleNewOrderCreated);
      window.removeEventListener('orderAccepted', handleOrderAccepted);
      window.removeEventListener('orderStatusChanged', handleOrderStatusChanged);
      window.removeEventListener('storage', handleStorageChange);
      stopLocationTracking();
    };
  }, [partnerStatus, user]); // Added dependencies to re-run when status or user changes

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading partner dashboard demo data...');
      
      // Load today's statistics from localStorage with real-time updates
      const todayStats = JSON.parse(localStorage.getItem('partner_today_stats') || '{}');
      const totalStats = JSON.parse(localStorage.getItem('partner_total_stats') || '{}');
      
      // Calculate dynamic statistics
      const todayDeliveries = todayStats.deliveries || 8;
      const todayEarnings = todayStats.earnings || 1200;
      const totalDeliveries = totalStats.deliveries || 247;
      const totalEarnings = totalStats.earnings || 28450;
      const totalDeliveryTime = totalStats.totalDeliveryTime || 5681;
      const avgDeliveryTime = totalDeliveries > 0 ? Math.round(totalDeliveryTime / totalDeliveries) : 23;
      
      // Demo statistics with real-time data
      const demoStats = {
        todayDeliveries,
        totalDeliveries,
        todayEarnings,
        totalEarnings,
        averageRating: 4.7,
        completionRate: 96.5,
        onTimeDeliveries: Math.round(totalDeliveries * 0.89),
        averageDeliveryTime: avgDeliveryTime,
        weeklyEarnings: [800, 950, 1100, 1200, 950, 1300, todayEarnings]
      };
      setStatistics(demoStats);
      
      // Load available orders from global storage (created by managers)
      let availableOrdersList = [];
      if (partnerStatus === 'available') {
        const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
        // Filter orders that are in PREP status and not assigned to anyone
        availableOrdersList = globalOrders.filter(order => 
          order.status === 'PREP' && 
          !order.assignedPartner
        ).map(order => ({
          ...order,
          createdAt: new Date(order.createdAt),
          estimatedDeliveryTime: 25
        }));
        
        console.log('✅ Real available orders loaded:', availableOrdersList.length);
      }
      setAvailableOrders(availableOrdersList);
      
      // Load recent deliveries from completed orders history (real orders only)
      const completedOrders = JSON.parse(localStorage.getItem('completed_orders') || '[]');
      const partnerCompletedOrders = completedOrders
        .filter(order => order.partnerId === (user._id || user.id))
        .slice(0, 5)
        .map(order => ({
          _id: order._id,
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          deliveredAt: new Date(order.deliveredAt),
          rating: order.rating || 5,
          deliveryTime: order.deliveryTime || 25
        }));
      
      setRecentDeliveries(partnerCompletedOrders);

      console.log('✅ Demo data loaded successfully with real-time stats:', {
        todayDeliveries,
        todayEarnings,
        totalDeliveries,
        totalEarnings
      });
      
    } catch (error) {
      console.error('❌ Error loading demo data:', error);
      setAvailableOrders([]);
      setRecentDeliveries([]);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      setUpdatingStatus(true);
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
      
      // Simulate API call (since we're in demo mode)
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
      setUpdatingStatus(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      console.log('✅ Partner', user.name, 'accepting order:', orderId);
      
      // Find the order from available orders
      const orderToAccept = availableOrders.find(order => order._id === orderId);
      if (!orderToAccept) {
        toast.error('Order not found or already taken');
        return;
      }
      
      // Check if order is still available in global storage (race condition protection)
      const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
      const globalOrder = globalOrders.find(order => order._id === orderId);
      
      if (!globalOrder || globalOrder.assignedPartner) {
        toast.error('This order has already been taken by another partner');
        setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
        return;
      }
      
      // Update the order in global storage IMMEDIATELY to assign it to this partner
      const updatedGlobalOrders = globalOrders.map(order => 
        order._id === orderId 
          ? { 
              ...order, 
              assignedPartner: user._id || user.id,
              partnerName: user.name,
              assignedAt: new Date().toISOString(),
              status: 'PICKED' 
            }
          : order
      );
      localStorage.setItem('global_orders', JSON.stringify(updatedGlobalOrders));
      console.log('🔄 Global storage updated - Order assigned to:', user.name);
      
      // IMMEDIATELY broadcast to all other partners to remove this order
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('orderAccepted', {
          detail: {
            orderId: orderId,
            partnerName: user.name,
            partnerId: user._id || user.id
          }
        }));
        console.log('📢 Broadcasted order acceptance to all partners');
      }, 100); // Small delay to ensure localStorage is updated first
      
      // Update the order status to PICKED and set as current order
      const acceptedOrder = {
        ...orderToAccept,
        status: 'PICKED',
        assignedPartner: user._id || user.id,
        partnerName: user.name,
        assignedAt: new Date()
      };
      
      // Update current order and remove from available orders
      setCurrentOrder(acceptedOrder);
      setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
      
      // Update partner status to busy
      setPartnerStatus('busy');
      updatePartnerStatus('busy', acceptedOrder._id);
      
      // Store order status in localStorage for persistence
      const storedAuth = JSON.parse(localStorage.getItem('zomato_auth') || '{}');
      if (storedAuth.user) {
        storedAuth.user.orderStatus = 'PICKED';
        storedAuth.user.currentOrder = acceptedOrder._id;
        localStorage.setItem('zomato_auth', JSON.stringify(storedAuth));
      }
      
      // Show success message
      toast.success(`Order ${acceptedOrder.orderId} accepted successfully! You are now busy.`, {
        icon: '✅',
        duration: 4000
      });
      
      console.log('✅ Order accepted and assigned:', {
        orderId: acceptedOrder._id,
        orderNumber: acceptedOrder.orderId,
        partnerStatus: 'busy',
        partnerName: user.name,
        broadcastSent: true
      });
      
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      toast.error(error.message || 'Failed to accept order', {
        icon: '❌',
        duration: 4000
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      console.log('📝 Updating order status:', orderId, status);
      const response = await partnerService.updateOrderStatus(orderId, status);
      
      if (response.success) {
        setCurrentOrder(response.data);
        toast.success(`Order status updated to ${status}`, {
          icon: status === 'DELIVERED' ? '✅' : '📝',
          duration: 3000
        });
        
        // If delivered, clear current order
        if (status === 'DELIVERED') {
          setCurrentOrder(null);
        }
        
        // Refresh statistics
        loadDashboardData();
      }
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      toast.error('Failed to update order status');
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
                      disabled={updatingStatus}
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
                      value={statistics.todayDeliveries} 
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
                      value={statistics.todayEarnings} 
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
                        value={statistics.averageRating} 
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
                      value={statistics.completionRate} 
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
                      
                      <div className="mt-4">
                        <p className="text-white/70 text-sm mb-2">Delivery Address</p>
                        <div className="flex items-start space-x-2">
                          <MapPinIcon className="h-5 w-5 text-white/70 mt-0.5" />
                          <p className="text-white">{currentOrder.customerAddress}</p>
                        </div>
                      </div>
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
                  <span className="text-sm text-gray-500">
                    {availableOrders.length} orders nearby
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {availableOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <TruckIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-xl font-medium mb-2">No orders available</p>
                      <p>Check back in a few minutes for new orders</p>
                    </div>
                  ) : (
                    <div className="space-y-4 p-6">
                      {availableOrders.map((order, index) => (
                        <motion.div
                          key={order._id}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 bg-white"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-indigo-600 font-semibold text-sm">
                                  #{order.orderId?.slice(-3) || '000'}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{order.customerName}</p>
                                <p className="text-sm text-gray-500">{formatTime(order.createdAt)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">
                                {formatCurrency(order.totalAmount)}
                              </p>
                              <StatusBadge status={order.status} size="sm" />
                            </div>
                          </div>
                          
                          <div className="flex items-center text-sm text-gray-600 mb-3">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            <span className="truncate">{order.customerAddress}</span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                ~25 min
                              </span>
                              <span className="flex items-center">
                                <GlobeAltIcon className="h-4 w-4 mr-1" />
                                2.5 km
                              </span>
                            </div>
                            
                            <Button
                              onClick={() => handleAcceptOrder(order._id)}
                              size="sm"
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                              Accept Order
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
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
                    value={statistics.totalDeliveries} 
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
                    value={statistics.totalEarnings} 
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
                      value={statistics.averageDeliveryTime} 
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