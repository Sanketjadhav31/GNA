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
  CogIcon
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
    orderGrowth: 0
  });
  
  const [recentOrders, setRecentOrders] = useState([]);
  const [partnerStats, setPartnerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading dashboard data...');
      
      // Load analytics data
      const [ordersResponse, partnersResponse] = await Promise.all([
        orderService.getOrderAnalytics(),
        partnerService.getPartnerAnalytics()
      ]);

      if (ordersResponse.success) {
        setAnalytics(prev => ({
          ...prev,
          ...ordersResponse.data
        }));
        console.log('✅ Order analytics loaded:', ordersResponse.data);
      }

      if (partnersResponse.success) {
        setAnalytics(prev => ({
          ...prev,
          ...partnersResponse.data
        }));
        console.log('✅ Partner analytics loaded:', partnersResponse.data);
      }

      // Load recent orders
      const recentOrdersResponse = await orderService.getRecentOrders();
      if (recentOrdersResponse.success) {
        setRecentOrders(recentOrdersResponse.data);
        console.log('✅ Recent orders loaded:', recentOrdersResponse.data.length);
      }

      // Load partner statistics
      const partnerStatsResponse = await partnerService.getPartnerStatistics();
      if (partnerStatsResponse.success) {
        // Ensure data is an array, fallback to empty array if not
        const statsData = Array.isArray(partnerStatsResponse.data) ? partnerStatsResponse.data : [];
        setPartnerStats(statsData);
        console.log('✅ Partner statistics loaded:', statsData.length);
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
                      value={analytics.totalOrders} 
                      className="text-2xl lg:text-3xl font-bold text-blue-900"
                    />
                    <div className="flex items-center mt-2">
                      <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      <PercentageCounter 
                        value={analytics.orderGrowth || 12} 
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
                      value={analytics.activeOrders} 
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
                      value={analytics.totalRevenue} 
                      className="text-2xl lg:text-3xl font-bold text-green-900"
                    />
                    <div className="flex items-center mt-2">
                      <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                      <PercentageCounter 
                        value={analytics.revenueGrowth || 8.5} 
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
                      value={analytics.activePartners} 
                      className="text-2xl lg:text-3xl font-bold text-purple-900"
                    />
                    <p className="text-sm text-purple-600 mt-2">
                      of {analytics.totalPartners} total
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
                        value={analytics.averageOrderValue} 
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
                        value={analytics.deliverySuccess} 
                        className="text-xl font-bold text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${analytics.deliverySuccess || 0}%` }}
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
                          value={analytics.averageDeliveryTime} 
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
                                <span>{formatTime(order.createdAt)}</span>
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
                                {formatCurrency(order.totalAmount || 0)}
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
                            {partner.deliveriesCompleted || 0}
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
                    value={analytics.completedOrders} 
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
                    value={analytics.activeOrders} 
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
                    value={analytics.cancelledOrders} 
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