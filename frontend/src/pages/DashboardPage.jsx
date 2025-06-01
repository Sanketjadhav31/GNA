import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  CurrencyRupeeIcon,
  TruckIcon,
  ClockIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PlusIcon,
  EyeIcon,
  MapPinIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  BellIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  FireIcon,
  StarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  UserPlusIcon,
  CogIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import partnerService from '../services/partnerService';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Counter, { CurrencyCounter, PercentageCounter } from '../components/ui/Counter';
import Loading from '../components/ui/Loading';
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations';
import { cn } from '../utils/cn';
import io from 'socket.io-client';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    activePartners: 0,
    totalPartners: 0,
    deliverySuccess: 0,
    averageDeliveryTime: 0,
    revenueGrowth: 0,
    orderGrowth: 0,
    ordersByStatus: {}
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [partnerStats, setPartnerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState(null);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    activeOrders: 0,
    totalRevenue: 0,
    prepOrders: 0,
    pickedOrders: 0,
    onRouteOrders: 0,
    deliveredOrders: 0,
    successRate: 0,
    avgDeliveryTime: 0,
    unassignedOrders: 0,
    assignedOrders: 0
  });
  const [availablePartners, setAvailablePartners] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activePartners, setActivePartners] = useState([]);
  const [validPartners, setValidPartners] = useState([]);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);
    
    // Listen for real-time events (as per your Socket.IO specifications)
    const handleOrderUpdate = (event) => {
      console.log('📊 Real-time order update received, refreshing dashboard...');
      loadDashboardData();
    };
    
    const handleNewOrder = (event) => {
      console.log('📦 New order created, updating dashboard...');
      loadDashboardData();
      toast.success('📦 New order received!', { duration: 3000 });
    };
    
    const handleOrderStatusChange = (event) => {
      console.log('🔄 Order status changed, updating dashboard...');
      loadDashboardData();
    };
    
    // Real-time event listeners (matching your Socket.IO events)
    window.addEventListener('orderCompleted', handleOrderUpdate);
    window.addEventListener('orderStatusChanged', handleOrderStatusChange);
    window.addEventListener('newOrderCreated', handleNewOrder);
    window.addEventListener('order-updated', handleOrderUpdate);
    window.addEventListener('new-order', handleNewOrder);
    window.addEventListener('order-assigned', handleOrderUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('orderCompleted', handleOrderUpdate);
      window.removeEventListener('orderStatusChanged', handleOrderStatusChange);
      window.removeEventListener('newOrderCreated', handleNewOrder);
      window.removeEventListener('order-updated', handleOrderUpdate);
      window.removeEventListener('new-order', handleNewOrder);
      window.removeEventListener('order-assigned', handleOrderUpdate);
    };
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user && user.role === 'manager') {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Join manager room
      newSocket.emit('join_room', {
        role: 'manager',
        userId: user._id || user.id
      });

      setSocket(newSocket);

      // Socket event listeners for real-time updates
      newSocket.on('order-created', (data) => {
        console.log('📦 New order created:', data);
        setMetrics(prev => ({ ...prev, ...data.metrics }));
        setRecentOrders(prev => [data.order, ...prev.slice(0, 9)]);
        addActivity(`New order ${data.order.orderId} created for ${data.order.customerName}`, 'success');
        toast.success(`New order ${data.order.orderId} created!`);
      });

      newSocket.on('order-assignment-confirmed', (data) => {
        console.log('👥 Order assigned:', data);
        setMetrics(prev => ({ ...prev, ...data.metrics }));
        setRecentOrders(prev => 
          prev.map(order => 
            order._id === data.order._id 
              ? { ...order, assignedTo: data.order.assignedTo, assignedAt: data.order.assignedAt }
              : order
          )
        );
        addActivity(`Order ${data.order.orderId} assigned to ${data.order.assignedTo.name}`, 'info');
        toast.success(`Order assigned to ${data.order.assignedTo.name}`);
      });

      newSocket.on('order-status-updated', (data) => {
        console.log('📋 Order status updated:', data);
        setMetrics(prev => ({ ...prev, ...data.metrics }));
        setRecentOrders(prev => 
          prev.map(order => 
            order._id === data.order._id 
              ? { ...order, status: data.order.status, updatedAt: data.order.updatedAt }
              : order
          )
        );
        addActivity(`Order ${data.order.orderId} status: ${data.order.status}`, 'info');
      });

      newSocket.on('order-picked', (data) => {
        console.log('🚚 Order picked:', data);
        addActivity(`${data.partnerName} picked up order ${data.orderNumber}`, 'success');
        toast.success(`Order ${data.orderNumber} picked up!`);
      });

      newSocket.on('order-on-route', (data) => {
        console.log('🛣️ Order on route:', data);
        addActivity(`Order ${data.orderNumber} is on route to ${data.customerName}`, 'info');
        toast.success(`Order ${data.orderNumber} is on the way!`);
      });

      newSocket.on('order-delivered', (data) => {
        console.log('✅ Order delivered:', data);
        addActivity(`Order ${data.orderNumber} delivered in ${data.deliveryTime} minutes`, 'success');
        toast.success(`Order ${data.orderNumber} delivered successfully!`);
      });

      newSocket.on('partner-available', (data) => {
        console.log('👤 Partner available:', data);
        setAvailablePartners(prev => {
          const exists = prev.find(p => p._id === data.partnerId);
          if (!exists) {
            return [...prev, { _id: data.partnerId, name: data.partnerName, isAvailable: true }];
          }
          return prev.map(p => 
            p._id === data.partnerId ? { ...p, isAvailable: true } : p
          );
        });
        if (data.justCompleted) {
          addActivity(`${data.partnerName} completed delivery and is now available`, 'success');
        }
      });

      newSocket.on('new-order-available', (data) => {
        console.log('📢 New order available for partners:', data);
        addActivity(`Order ${data.orderNumber} broadcasted to ${data.availablePartnerCount} partners`, 'info');
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load from localStorage for immediate display
      const storedOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
      const storedPartners = JSON.parse(localStorage.getItem('manager_partners') || '[]');
      
      // Calculate metrics from stored data
      const totalOrders = storedOrders.length;
      const activeOrders = storedOrders.filter(o => ['PREP', 'PICKED', 'ON_ROUTE'].includes(o.status)).length;
      const deliveredOrders = storedOrders.filter(o => o.status === 'DELIVERED').length;
      const totalRevenue = storedOrders
        .filter(o => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      
      const calculatedMetrics = {
        totalOrders,
        activeOrders,
        totalRevenue,
        prepOrders: storedOrders.filter(o => o.status === 'PREP').length,
        pickedOrders: storedOrders.filter(o => o.status === 'PICKED').length,
        onRouteOrders: storedOrders.filter(o => o.status === 'ON_ROUTE').length,
        deliveredOrders,
        successRate: totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
        avgDeliveryTime: 25, // Default estimate
        unassignedOrders: storedOrders.filter(o => o.status === 'PREP' && !o.assignedPartner).length,
        assignedOrders: storedOrders.filter(o => o.assignedPartner && ['PREP', 'PICKED', 'ON_ROUTE'].includes(o.status)).length
      };
      
      setMetrics(calculatedMetrics);
      setRecentOrders(storedOrders.slice(0, 10));
      setAvailablePartners(storedPartners.filter(p => p.availability === 'AVAILABLE'));
      
      console.log('📊 Dashboard loaded with metrics:', calculatedMetrics);
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const addActivity = (message, type = 'info') => {
    const activity = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setRecentActivities(prev => [activity, ...prev.slice(0, 9)]);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading comprehensive dashboard data...');
      
      // Load orders from localStorage (primary source for real-time data)
      const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
      const completedOrders = JSON.parse(localStorage.getItem('completed_orders') || '[]');
      const allOrders = [...globalOrders, ...completedOrders];
      
      // Load partners data
      const allPartners = JSON.parse(localStorage.getItem('registered_partners') || '[]');
      const validPartnersData = allPartners.filter(partner => 
        partner.name && partner.phone && partner.name.trim().length > 0
      );
      setValidPartners(validPartnersData);
      
      // 📊 Calculate Real-time Metrics (as per your specifications)
      
      // 1. Total Orders
      const totalOrders = allOrders.length;
      
      // 2. Active Orders (status != "DELIVERED")
      const activeOrders = globalOrders.filter(order => order.status !== 'DELIVERED').length;
      
      // 3. Total Revenue (sum of delivered orders)
      const deliveredOrders = allOrders.filter(order => order.status === 'DELIVERED');
      const totalRevenue = deliveredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      // 4. Average Order Value
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // 5. Delivery Success Rate
      const deliverySuccess = totalOrders > 0 ? (deliveredOrders.length / totalOrders) * 100 : 100;
      
      // 6. Average Delivery Time (calculate difference DELIVERED - createdAt)
      const deliveryTimes = deliveredOrders
        .filter(order => order.deliveredAt && order.createdAt)
        .map(order => {
          const created = new Date(order.createdAt);
          const delivered = new Date(order.deliveredAt);
          return (delivered - created) / (1000 * 60); // minutes
        });
      const averageDeliveryTime = deliveryTimes.length > 0 
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length 
        : 25; // default 25 minutes
      
      // 7. Partner Statistics
      const activePartnersData = validPartnersData.filter(partner => 
        ['available', 'online', 'busy'].includes(partner.status)
      );
      setActivePartners(activePartnersData);
      
      // 8. Orders by Status Breakdown (for donut chart)
      const ordersByStatus = {
        PREP: globalOrders.filter(o => o.status === 'PREP').length,
        PICKED: globalOrders.filter(o => o.status === 'PICKED').length,
        ON_ROUTE: globalOrders.filter(o => o.status === 'ON_ROUTE').length,
        DELIVERED: deliveredOrders.length
      };
      
      // Update metrics state for real-time display
      setMetrics({
        totalOrders,
        activeOrders,
        totalRevenue,
        prepOrders: ordersByStatus.PREP,
        pickedOrders: ordersByStatus.PICKED,
        onRouteOrders: ordersByStatus.ON_ROUTE,
        deliveredOrders: ordersByStatus.DELIVERED,
        successRate: deliverySuccess,
        avgDeliveryTime: Math.round(averageDeliveryTime),
        unassignedOrders: globalOrders.filter(o => !o.assignedTo).length,
        assignedOrders: globalOrders.filter(o => o.assignedTo).length,
        averageOrderValue
      });

      // Update analytics state
      setAnalytics({
        totalOrders,
        activeOrders,
        completedOrders: deliveredOrders.length,
        cancelledOrders: allOrders.filter(o => o.status === 'CANCELLED').length,
        totalRevenue,
        averageOrderValue,
        activePartners: activePartnersData.length,
        totalPartners: validPartnersData.length,
        deliverySuccess,
        averageDeliveryTime,
        revenueGrowth: 12.5, // Mock growth data
        orderGrowth: 8.3,
        ordersByStatus
      });

      // 📋 Recent Orders Section (Live) - Last 5 orders sorted by creation time
      const recentOrdersData = globalOrders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(order => ({
          ...order,
          formattedTime: formatTime(order.createdAt),
          formattedAmount: formatCurrency(order.totalAmount)
        }));
      setRecentOrders(recentOrdersData);

      // 👥 Partner Statistics with availability status
      const partnerStatsData = validPartnersData.map(partner => ({
        ...partner,
        availabilityStatus: getPartnerAvailabilityStatus(partner),
        completedToday: Math.floor(Math.random() * 10), // Mock data
        rating: partner.rating || (4.0 + Math.random() * 1.0).toFixed(1)
      }));
      setPartnerStats(partnerStatsData);

      console.log('✅ Comprehensive dashboard data loaded:', {
        totalOrders,
        activeOrders,
        totalRevenue: formatCurrency(totalRevenue),
        deliverySuccess: `${deliverySuccess.toFixed(1)}%`,
        averageDeliveryTime: `${Math.round(averageDeliveryTime)}m`,
        activePartners: `${activePartnersData.length}/${validPartnersData.length}`,
        ordersByStatus
      });

      // Try to load additional data from backend APIs (if available)
      try {
        console.log('🔄 Attempting to fetch additional data from backend...');
        
        const [ordersResponse, partnersResponse] = await Promise.all([
          orderService.getOrderAnalytics().catch(() => ({ success: false })),
          partnerService.getPartnerAnalytics().catch(() => ({ success: false }))
        ]);

        if (ordersResponse.success) {
          console.log('✅ Backend order analytics loaded');
          // Merge backend data with localStorage data
          setAnalytics(prev => ({
            ...prev,
            ...ordersResponse.data
          }));
        }

        if (partnersResponse.success) {
          console.log('✅ Backend partner analytics loaded');
          setAnalytics(prev => ({
            ...prev,
            ...partnersResponse.data
          }));
        }
      } catch (backendError) {
        console.log('⚠️ Backend APIs unavailable, using localStorage data only');
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine partner availability status
  const getPartnerAvailabilityStatus = (partner) => {
    if (!partner.isActive) return 'inactive';
    if (partner.currentOrder) return 'busy';
    if (partner.status === 'available' || partner.status === 'online') return 'available';
    return 'offline';
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('📊 Dashboard refreshed!');
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
      PREP: 'text-amber-600',
      PICKED: 'text-blue-600',
      ON_ROUTE: 'text-purple-600',
      DELIVERED: 'text-green-600',
      CANCELLED: 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'create-order':
        navigate('/orders');
        setTimeout(() => {
          const event = new CustomEvent('openCreateOrderModal');
          window.dispatchEvent(event);
        }, 100);
        break;
      case 'assign-partners':
        navigate('/partners');
        break;
      case 'view-analytics':
        navigate('/analytics');
        break;
      case 'partner-management':
        navigate('/partners');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loading size="lg" text="Loading dashboard analytics..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
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
                className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <BuildingStorefrontIcon className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Operations Dashboard 🏢
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Welcome back, {user?.name}! Here's your restaurant overview.
                </p>
              </div>
            </div>
            
            <motion.div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Quick Actions */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleRefresh}
                  loading={refreshing}
                  variant="secondary"
                  size="md"
                  icon={ArrowPathIcon}
                  className="shadow-md"
                >
                  Refresh
                </Button>
                
                <Button
                  onClick={() => handleQuickAction('create-order')}
                  variant="primary"
                  size="md"
                  icon={PlusIcon}
                  className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-md"
                >
                  New Order
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Analytics Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Total Orders */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600 mb-1">Total Orders</p>
                    <Counter 
                      value={metrics.totalOrders} 
                      className="text-2xl lg:text-3xl font-bold text-blue-900"
                    />
                    <div className="flex items-center mt-2">
                      <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      <PercentageCounter 
                        value={metrics.orderGrowth || 12} 
                        className="text-sm text-green-600 font-medium"
                      />
                    </div>
                  </div>
                  <motion.div
                    className="p-3 bg-blue-500 rounded-xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Orders */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-600 mb-1">Active Orders</p>
                    <Counter 
                      value={metrics.activeOrders} 
                      className="text-2xl lg:text-3xl font-bold text-amber-900"
                    />
                    <div className="flex items-center mt-2">
                      <FireIcon className="h-4 w-4 text-amber-500 mr-1" />
                      <span className="text-sm text-amber-600 font-medium">In Progress</span>
                    </div>
                  </div>
                  <motion.div
                    className="p-3 bg-amber-500 rounded-xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ClockIcon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-600 mb-1">Total Revenue</p>
                    <CurrencyCounter 
                      value={metrics.totalRevenue} 
                      className="text-2xl lg:text-3xl font-bold text-green-900"
                    />
                    <div className="flex items-center mt-2">
                      <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      <PercentageCounter 
                        value={metrics.revenueGrowth || 8.5} 
                        className="text-sm text-green-600 font-medium"
                      />
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

          {/* Active Partners */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-600 mb-1">Active Partners</p>
                    <Counter 
                      value={activePartners.length} 
                      className="text-2xl lg:text-3xl font-bold text-purple-900"
                    />
                    <p className="text-sm text-purple-600 mt-2">
                      of {validPartners.length} total
                    </p>
                  </div>
                  <motion.div
                    className="p-3 bg-purple-500 rounded-xl shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Secondary Metrics */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Average Order Value */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-white shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <ShoppingCartIcon className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Order Value</p>
                      <CurrencyCounter 
                        value={metrics.averageOrderValue} 
                        className="text-xl font-bold text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-600">
                      <ArrowUpIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">+5.2%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Delivery Success Rate */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-white shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Delivery Success</p>
                      <PercentageCounter 
                        value={metrics.successRate} 
                        className="text-xl font-bold text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${metrics.successRate || 0}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Average Delivery Time */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-white shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <ClockIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Delivery Time</p>
                      <div className="flex items-center">
                        <Counter 
                          value={metrics.avgDeliveryTime} 
                          className="text-xl font-bold text-gray-900"
                        />
                        <span className="text-xl font-bold text-gray-900 ml-1">min</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-600">
                      <ArrowDownIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">-2 min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Orders by Status Breakdown (Donut Chart Data) */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Orders by Status */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-white shadow-md h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <ChartPieIcon className="h-5 w-5 mr-2 text-indigo-600" />
                    Orders by Status
                  </span>
                  <span className="text-sm text-gray-500">
                    Live Updates
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* PREP Status */}
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">Preparing</p>
                        <p className="text-sm text-gray-500">Ready for pickup</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Counter 
                        value={metrics.prepOrders} 
                        className="text-xl font-bold text-yellow-700"
                      />
                      <p className="text-xs text-gray-500">orders</p>
                    </div>
                  </div>

                  {/* PICKED Status */}
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">Picked Up</p>
                        <p className="text-sm text-gray-500">Partner collected</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Counter 
                        value={metrics.pickedOrders} 
                        className="text-xl font-bold text-blue-700"
                      />
                      <p className="text-xs text-gray-500">orders</p>
                    </div>
                  </div>

                  {/* ON_ROUTE Status */}
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">On Route</p>
                        <p className="text-sm text-gray-500">Out for delivery</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Counter 
                        value={metrics.onRouteOrders} 
                        className="text-xl font-bold text-purple-700"
                      />
                      <p className="text-xs text-gray-500">orders</p>
                    </div>
                  </div>

                  {/* DELIVERED Status */}
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">Delivered</p>
                        <p className="text-sm text-gray-500">Successfully completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Counter 
                        value={metrics.deliveredOrders} 
                        className="text-xl font-bold text-green-700"
                      />
                      <p className="text-xs text-gray-500">orders</p>
                    </div>
                  </div>
                </div>

                {/* Total Active Orders Summary */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Total Active Orders</span>
                    <Counter 
                      value={metrics.activeOrders} 
                      className="text-lg font-bold text-red-600"
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Orders in PREP, PICKED, and ON_ROUTE status
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-white shadow-md h-full">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TruckIcon className="h-5 w-5 mr-2 text-green-600" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Average Delivery Time */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <ClockIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">Avg. Delivery Time</p>
                        <p className="text-sm text-blue-600">From order to delivery</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Counter 
                        value={Math.round(metrics.avgDeliveryTime)} 
                        suffix=" min"
                        className="text-2xl font-bold text-blue-900"
                      />
                    </div>
                  </div>

                  {/* Delivery Success Rate */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-green-900">Success Rate</p>
                        <p className="text-sm text-green-600">Delivered vs Total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <PercentageCounter 
                        value={metrics.successRate} 
                        className="text-2xl font-bold text-green-900"
                      />
                    </div>
                  </div>

                  {/* Partner Utilization */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <UserGroupIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-purple-900">Partner Utilization</p>
                        <p className="text-sm text-purple-600">Active vs Total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <PercentageCounter 
                        value={activePartners.length > 0 ? (activePartners.length / validPartners.length) * 100 : 0} 
                        className="text-2xl font-bold text-purple-900"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Recent Orders */}
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
                    <BellIcon className="h-6 w-6 mr-2 text-red-600" />
                    Recent Orders
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {recentOrders.length} orders
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      icon={EyeIcon}
                      onClick={() => navigate('/orders')}
                    >
                      View All
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {recentOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <ShoppingCartIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-xl font-medium mb-2">No recent orders</p>
                      <p>Orders will appear here when placed</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recentOrders.slice(0, 6).map((order, index) => (
                        <motion.div
                          key={order._id}
                          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold text-sm">
                                #{order.orderId?.slice(-3) || '000'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {order.customerName || 'Unknown Customer'}
                              </p>
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <ClockIcon className="h-4 w-4" />
                                <span>{order.formattedTime}</span>
                                {order.partner && (
                                  <>
                                    <span>•</span>
                                    <span className="text-blue-600">{order.partner.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-bold text-gray-900 text-lg">
                                {order.formattedAmount}
                              </p>
                              <StatusBadge status={order.status} size="sm" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Sidebar */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CogIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleQuickAction('create-order')}
                  fullWidth
                  size="md"
                  icon={PlusIcon}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  Create New Order
                </Button>
                
                <Button
                  onClick={() => handleQuickAction('partner-management')}
                  fullWidth
                  size="md"
                  variant="secondary"
                  icon={UserPlusIcon}
                >
                  Manage Partners
                </Button>
                
                <Button
                  onClick={() => handleQuickAction('view-analytics')}
                  fullWidth
                  size="md"
                  variant="secondary"
                  icon={DocumentChartBarIcon}
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Top Partners */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <StarIcon className="h-5 w-5 mr-2 text-yellow-500" />
                    Top Partners
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    icon={EyeIcon}
                    onClick={() => navigate('/partners')}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!Array.isArray(partnerStats) || partnerStats.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <UserGroupIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No partner data</p>
                    </div>
                  ) : (
                    partnerStats.slice(0, 3).map((partner, index) => (
                      <motion.div
                        key={partner._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {partner.name?.charAt(0) || 'P'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {partner.name}
                            </p>
                            <div className="flex items-center space-x-1">
                              <StarIcon className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-500">
                                {partner.rating || 4.5}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {partner.completedToday || 0}
                          </p>
                          <p className="text-xs text-gray-500">deliveries</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartPieIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Completed Orders */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Completed</span>
                  </div>
                  <Counter 
                    value={metrics.completedOrders} 
                    className="text-lg font-bold text-green-900"
                  />
                </div>

                {/* Active Orders */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <TruckIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Active</span>
                  </div>
                  <Counter 
                    value={metrics.activeOrders} 
                    className="text-lg font-bold text-blue-900"
                  />
                </div>

                {/* Cancelled Orders */}
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Cancelled</span>
                  </div>
                  <Counter 
                    value={metrics.cancelledOrders} 
                    className="text-lg font-bold text-red-900"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 