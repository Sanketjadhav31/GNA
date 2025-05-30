import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CurrencyRupeeIcon,
  MapPinIcon,
  CheckCircleIcon,
  StarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  TruckIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import partnerService from '../services/partnerService';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Loading from '../components/ui/Loading';
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations';

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [filteredOrders, setFilteredOrders] = useState([]);

  useEffect(() => {
    loadOrderHistory();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, selectedTimeRange]);

  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading order history from localStorage...');
      
      // Load completed orders from localStorage
      const completedOrders = JSON.parse(localStorage.getItem('completed_orders') || '[]');
      
      // Filter orders for this specific partner
      const partnerOrders = completedOrders
        .filter(order => order.partnerId === (user._id || user.id))
        .map(order => ({
          _id: order._id,
          orderId: order.orderId,
          customerName: order.customerName,
          customerAddress: order.customerAddress,
          totalAmount: order.totalAmount,
          deliveredAt: order.deliveredAt,
          rating: order.rating || 5,
          earnings: 50, // Standard delivery fee
          deliveryTime: order.deliveryTime || 25,
          items: order.items || []
        }))
        .sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt)); // Sort by delivery time, newest first
      
      setOrders(partnerOrders);
      console.log('✅ Order history loaded:', partnerOrders.length, 'real orders');
      
    } catch (error) {
      console.error('❌ Error loading order history:', error);
      toast.error('Failed to load order history');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by time range
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      const timeRanges = {
        'today': 1,
        'week': 7,
        'month': 30
      };
      
      const daysAgo = timeRanges[selectedTimeRange];
      if (daysAgo) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(order => new Date(order.deliveredAt) >= cutoffDate);
      }
    }

    setFilteredOrders(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const deliveryTime = new Date(timestamp);
    const diffInHours = Math.floor((now - deliveryTime) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const totalEarnings = filteredOrders.reduce((sum, order) => sum + (order.earnings || 0), 0);
  const averageRating = filteredOrders.length > 0 
    ? filteredOrders.reduce((sum, order) => sum + (order.rating || 0), 0) / filteredOrders.length 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Loading size="lg" text="Loading order history..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
              <p className="text-lg text-gray-600 mt-1">
                View your completed deliveries and earnings
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Time Filter */}
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Deliveries</p>
                    <p className="text-2xl font-bold text-green-900">{filteredOrders.length}</p>
                  </div>
                  <TruckIcon className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalEarnings)}</p>
                  </div>
                  <CurrencyRupeeIcon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Average Rating</p>
                    <p className="text-2xl font-bold text-yellow-900">{averageRating.toFixed(1)}</p>
                  </div>
                  <StarIcon className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Orders List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <DocumentTextIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Delivery History
                </span>
                <span className="text-sm text-gray-500">
                  {filteredOrders.length} orders
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-xl font-medium mb-2">No orders found</p>
                  <p>Try adjusting your search criteria</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOrders.map((order, index) => (
                    <motion.div
                      key={order._id}
                      className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <p className="font-semibold text-gray-900">
                              Order #{order.orderId}
                            </p>
                            <span className="text-sm text-gray-500">
                              {getTimeAgo(order.deliveredAt)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-1">
                            {order.customerName}
                          </p>
                          
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            <span className="truncate max-w-md">{order.customerAddress}</span>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm text-gray-500">
                              <ClockIcon className="h-4 w-4 inline mr-1" />
                              {formatDate(order.deliveredAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Rating */}
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium text-gray-900">
                              {order.rating || 'N/A'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">Rating</p>
                        </div>

                        {/* Earnings */}
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(order.earnings || 0)}
                          </p>
                          <p className="text-xs text-gray-500">Earned</p>
                        </div>

                        {/* Order Value */}
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(order.totalAmount)}
                          </p>
                          <p className="text-xs text-gray-500">Order Value</p>
                        </div>

                        {/* View Details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={EyeIcon}
                          onClick={() => {
                            // TODO: Open order details modal
                            toast.info('Order details feature coming soon!');
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Load More Button */}
        {filteredOrders.length > 0 && filteredOrders.length % 20 === 0 && (
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={() => {
                // TODO: Implement pagination
                toast.info('Pagination feature coming soon!');
              }}
              variant="secondary"
              size="lg"
            >
              Load More Orders
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory; 