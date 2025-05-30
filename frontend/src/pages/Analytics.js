import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  TruckIcon,
  ClockIcon,
  StarIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  DocumentChartBarIcon,
  PresentationChartLineIcon,
  ChartPieIcon,
  CursorArrowRaysIcon,
  UserGroupIcon,
  FireIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import orderService from '../services/orderService';
import partnerService from '../services/partnerService';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import Counter, { CurrencyCounter, PercentageCounter } from '../components/ui/Counter';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations';
import { cn } from '../utils/cn';

const Analytics = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  
  const [analytics, setAnalytics] = useState({
    orders: {},
    partners: {},
    revenue: {},
    performance: {},
    trends: {
      ordersGrowth: 0,
      revenueGrowth: 0,
      partnersGrowth: 0,
      deliveryTimeChange: 0
    },
    overview: {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      totalPartners: 0,
      averageDeliveryTime: 0,
      averageRating: 0
    },
    charts: {
      ordersByStatus: [
        { status: 'PREP', count: 0, percentage: 0 },
        { status: 'PICKED', count: 0, percentage: 0 },
        { status: 'ON_ROUTE', count: 0, percentage: 0 },
        { status: 'DELIVERED', count: 0, percentage: 0 },
        { status: 'CANCELLED', count: 0, percentage: 0 }
      ],
      revenueByDay: [
        { day: 'Mon', revenue: 0 },
        { day: 'Tue', revenue: 0 },
        { day: 'Wed', revenue: 0 },
        { day: 'Thu', revenue: 0 },
        { day: 'Fri', revenue: 0 },
        { day: 'Sat', revenue: 0 },
        { day: 'Sun', revenue: 0 }
      ],
      topPartners: [],
      popularTimes: [
        { hour: '9-10 AM', orders: 0 },
        { hour: '10-11 AM', orders: 0 },
        { hour: '11-12 PM', orders: 0 },
        { hour: '12-1 PM', orders: 0 },
        { hour: '1-2 PM', orders: 0 },
        { hour: '2-3 PM', orders: 0 },
        { hour: '7-8 PM', orders: 0 },
        { hour: '8-9 PM', orders: 0 },
        { hour: '9-10 PM', orders: 0 }
      ]
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState({
    daily: [],
    hourly: [],
    partners: [],
    revenue: []
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading analytics data...');
      
      // Mock data for when API is not available
      const mockAnalyticsData = {
        trends: {
          ordersGrowth: 12.5,
          revenueGrowth: 8.3,
          partnersGrowth: 5.7,
          deliveryTimeChange: -2.1
        },
        overview: {
          totalOrders: 1247,
          totalRevenue: 156780,
          averageOrderValue: 425,
          totalPartners: 23,
          averageDeliveryTime: 28,
          averageRating: 4.6,
          deliverySuccess: 96.8,
          activePartners: 18
        },
        charts: {
          ordersByStatus: [
            { status: 'PREP', count: 45, percentage: 15 },
            { status: 'PICKED', count: 23, percentage: 8 },
            { status: 'ON_ROUTE', count: 67, percentage: 22 },
            { status: 'DELIVERED', count: 156, percentage: 52 },
            { status: 'CANCELLED', count: 9, percentage: 3 }
          ],
          revenueByDay: [
            { day: 'Mon', revenue: 18500 },
            { day: 'Tue', revenue: 22300 },
            { day: 'Wed', revenue: 19800 },
            { day: 'Thu', revenue: 26500 },
            { day: 'Fri', revenue: 31200 },
            { day: 'Sat', revenue: 28900 },
            { day: 'Sun', revenue: 24100 }
          ],
          topPartners: [
            { name: 'Raj Kumar', rating: 4.8, deliveries: 156, earnings: 12300 },
            { name: 'Suresh Singh', rating: 4.6, deliveries: 143, earnings: 11200 },
            { name: 'Amit Sharma', rating: 4.9, deliveries: 189, earnings: 14800 },
            { name: 'Vikash Kumar', rating: 4.7, deliveries: 124, earnings: 9800 }
          ],
          popularTimes: [
            { hour: '9-10 AM', orders: 23 },
            { hour: '10-11 AM', orders: 34 },
            { hour: '11-12 PM', orders: 45 },
            { hour: '12-1 PM', orders: 67 },
            { hour: '1-2 PM', orders: 89 },
            { hour: '2-3 PM', orders: 56 },
            { hour: '7-8 PM', orders: 78 },
            { hour: '8-9 PM', orders: 92 },
            { hour: '9-10 PM', orders: 67 }
          ]
        }
      };
      
      try {
        const [orderAnalytics, partnerAnalytics] = await Promise.all([
          orderService.getOrderAnalytics({ timeRange }),
          partnerService.getPartnerAnalytics({ timeRange })
        ]);

        if (orderAnalytics.success && partnerAnalytics.success) {
          // Use real API data if available
          setAnalytics(prev => ({
            ...prev,
            orders: orderAnalytics.data,
            partners: partnerAnalytics.data
          }));
          processChartData(orderAnalytics.data, partnerAnalytics.data);
        } else {
          // Fallback to mock data
          console.log('⚠️ API failed, using mock analytics data');
          setAnalytics(prev => ({
            ...prev,
            ...mockAnalyticsData
          }));
        }
      } catch (apiError) {
        // Fallback to mock data on API error
        console.log('⚠️ Using mock analytics data due to API error:', apiError);
        setAnalytics(prev => ({
          ...prev,
          ...mockAnalyticsData
        }));
        toast.error('Using demo data - API connection failed');
      }

    } catch (error) {
      console.error('❌ Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (orderData, partnerData) => {
    // Implement the logic to process chart data based on the loaded analytics data
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast.success('📊 Analytics refreshed!');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      DELIVERED: 'text-green-600 bg-green-100',
      ON_ROUTE: 'text-purple-600 bg-purple-100',
      PICKED: 'text-blue-600 bg-blue-100',
      PREP: 'text-amber-600 bg-amber-100',
      CANCELLED: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getTrendIcon = (value) => {
    return value >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  };

  const getTrendColor = (value) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loading size="lg" text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-lg text-gray-600 mt-1">
                Detailed insights and performance metrics
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Time Range Filter */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 3 Months</option>
              </select>
              
              {/* Refresh Button */}
              <Button
                onClick={handleRefresh}
                loading={refreshing}
                variant="secondary"
                icon={ArrowPathIcon}
              >
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Overview Metrics */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Total Orders */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <ShoppingBagIcon className="h-8 w-8 text-blue-600" />
                  <div className={`flex items-center ${getTrendColor(analytics.trends.ordersGrowth)}`}>
                    {React.createElement(getTrendIcon(analytics.trends.ordersGrowth), { className: "h-4 w-4 mr-1" })}
                    <PercentageCounter value={Math.abs(analytics.trends.ordersGrowth)} className="text-sm font-medium" />
                  </div>
                </div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Orders</p>
                <Counter value={analytics.overview.totalOrders} className="text-2xl font-bold text-blue-900" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Revenue */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <CurrencyRupeeIcon className="h-8 w-8 text-green-600" />
                  <div className={`flex items-center ${getTrendColor(analytics.trends.revenueGrowth)}`}>
                    {React.createElement(getTrendIcon(analytics.trends.revenueGrowth), { className: "h-4 w-4 mr-1" })}
                    <PercentageCounter value={Math.abs(analytics.trends.revenueGrowth)} className="text-sm font-medium" />
                  </div>
                </div>
                <p className="text-sm font-medium text-green-600 mb-1">Total Revenue</p>
                <CurrencyCounter value={analytics.overview.totalRevenue} className="text-2xl font-bold text-green-900" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Average Order Value */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-sm font-medium text-purple-600 mb-1">Avg Order Value</p>
                <CurrencyCounter value={analytics.overview.averageOrderValue} className="text-2xl font-bold text-purple-900" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Delivery Success */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FireIcon className="h-8 w-8 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-amber-600 mb-1">Success Rate</p>
                <PercentageCounter value={analytics.overview.deliverySuccess} className="text-2xl font-bold text-amber-900" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Partners */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <UserGroupIcon className="h-8 w-8 text-indigo-600" />
                  <div className={`flex items-center ${getTrendColor(analytics.trends.partnersGrowth)}`}>
                    {React.createElement(getTrendIcon(analytics.trends.partnersGrowth), { className: "h-4 w-4 mr-1" })}
                    <PercentageCounter value={Math.abs(analytics.trends.partnersGrowth)} className="text-sm font-medium" />
                  </div>
                </div>
                <p className="text-sm font-medium text-indigo-600 mb-1">Active Partners</p>
                <Counter value={analytics.overview.activePartners} className="text-2xl font-bold text-indigo-900" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Average Delivery Time */}
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <ClockIcon className="h-8 w-8 text-red-600" />
                  <div className={`flex items-center ${getTrendColor(-analytics.trends.deliveryTimeChange)}`}>
                    {React.createElement(getTrendIcon(-analytics.trends.deliveryTimeChange), { className: "h-4 w-4 mr-1" })}
                    <span className="text-sm font-medium">{Math.abs(analytics.trends.deliveryTimeChange)}m</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-red-600 mb-1">Avg Delivery Time</p>
                <div className="flex items-center">
                  <Counter value={analytics.overview.averageDeliveryTime} className="text-2xl font-bold text-red-900" />
                  <span className="text-2xl font-bold text-red-900 ml-1">min</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Charts and Reports */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          
          {/* Orders by Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
                  Orders by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.charts.ordersByStatus.map((item, index) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${getStatusColor(item.status).split(' ')[1]}`}></div>
                        <span className="font-medium text-gray-900 capitalize">
                          {item.status.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">{item.percentage}%</span>
                        <span className="font-bold text-gray-900">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue by Day */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ChartBarIcon className="h-6 w-6 mr-2 text-green-600" />
                  Revenue by Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.charts.revenueByDay.map((item, index) => {
                    const maxRevenue = Math.max(...analytics.charts.revenueByDay.map(d => d.revenue));
                    const percentage = (item.revenue / maxRevenue) * 100;
                    
                    return (
                      <div key={item.day} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 w-20">
                          <span className="font-medium text-gray-900">{item.day}</span>
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className="bg-green-500 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 text-sm w-20 text-right">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Top Partners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <StarIcon className="h-6 w-6 mr-2 text-yellow-500" />
                    Top Performing Partners
                  </span>
                  <Button variant="ghost" size="sm" icon={EyeIcon}>
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.charts.topPartners.map((partner, index) => (
                    <motion.div
                      key={partner.name}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {partner.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{partner.name}</p>
                          <div className="flex items-center space-x-2">
                            <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-600">{partner.rating}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{partner.deliveries} deliveries</p>
                        <p className="text-sm text-green-600">{formatCurrency(partner.earnings)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Popular Times */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarDaysIcon className="h-6 w-6 mr-2 text-purple-600" />
                  Peak Order Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.charts.popularTimes.map((time, index) => {
                    const maxOrders = Math.max(...analytics.charts.popularTimes.map(t => t.orders));
                    const percentage = (time.orders / maxOrders) * 100;
                    
                    return (
                      <div key={time.hour} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 w-16">
                          <span className="font-medium text-gray-900">{time.hour}</span>
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <motion.div
                              className="bg-purple-500 h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 text-sm w-16 text-right">
                          {time.orders} orders
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 