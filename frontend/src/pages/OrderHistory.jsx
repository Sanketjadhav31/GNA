import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  MapPinIcon,
  PhoneIcon,
  CurrencyRupeeIcon,
  StarIcon,
  CalendarDaysIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EyeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Loading from '../components/ui/Loading';
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations';

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalEarnings: 0,
    averageRating: 0
  });

  useEffect(() => {
    loadOrderHistory();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter, dateFilter]);

  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading order history from backend...');
      
      // Get partner's order history from backend
      const response = await orderService.getPartnerOrderHistory();
      
      if (response.success) {
        const orderHistory = response.data.orders || [];
        setOrders(orderHistory);
        
        // Use backend stats if available, otherwise calculate
        const backendStats = response.data.stats;
        if (backendStats) {
          setStats({
            totalOrders: backendStats.totalOrders || 0,
            completedOrders: backendStats.completedOrders || 0,
            totalEarnings: backendStats.totalEarnings || 0,
            averageRating: backendStats.averageRating || 0
          });
        } else {
          // Fallback calculation
          const completedOrders = orderHistory.filter(order => order.status === 'DELIVERED');
          const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
          const avgRating = completedOrders.length > 0 
            ? completedOrders.reduce((sum, order) => sum + (order.rating || 5), 0) / completedOrders.length 
            : 0;
          
          setStats({
            totalOrders: orderHistory.length,
            completedOrders: completedOrders.length,
            totalEarnings,
            averageRating: avgRating
          });
        }
        
        console.log(`✅ Loaded ${orderHistory.length} orders from history`);
      } else {
        console.error('❌ Failed to load order history:', response.message);
        toast.error('Failed to load order history');
      }
    } catch (error) {
      console.error('❌ Error loading order history:', error);
      toast.error('Failed to load order history: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => new Date(order.createdAt) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(order => new Date(order.createdAt) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(order => new Date(order.createdAt) >= filterDate);
          break;
        default:
          break;
      }
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    setFilteredOrders(filtered);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      PREP: 'bg-yellow-100 text-yellow-800',
      PICKED: 'bg-blue-100 text-blue-800',
      ON_ROUTE: 'bg-purple-100 text-purple-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDeliveryTime = (order) => {
    if (order.deliveredAt && order.createdAt) {
      const delivered = new Date(order.deliveredAt);
      const created = new Date(order.createdAt);
      const diffMinutes = Math.round((delivered - created) / (1000 * 60));
      return `${diffMinutes} min`;
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Loading size="lg" text="Loading order history..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <DocumentTextIcon className="h-8 w-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  Order History 📋
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  Track your delivery performance and earnings
                </p>
              </div>
            </div>

            <Button
              onClick={loadOrderHistory}
              variant="outline"
              icon={ArrowPathIcon}
              className="self-start lg:self-center"
            >
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-blue-900">{stats.totalOrders}</p>
                  </div>
                  <TruckIcon className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-green-900">{stats.completedOrders}</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 mb-1">Total Earnings</p>
                    <p className="text-3xl font-bold text-purple-900">{formatCurrency(stats.totalEarnings)}</p>
                  </div>
                  <CurrencyRupeeIcon className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card hover className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 mb-1">Avg Rating</p>
                    <div className="flex items-center">
                      <p className="text-3xl font-bold text-orange-900">{stats.averageRating.toFixed(1)}</p>
                      <StarIcon className="h-6 w-6 text-yellow-400 ml-2 fill-current" />
                    </div>
                  </div>
                  <StarIcon className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="PREP">Preparing</option>
                  <option value="PICKED">Picked Up</option>
                  <option value="ON_ROUTE">On Route</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="relative">
                <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              <div className="text-sm text-gray-600 flex items-center">
                <span className="font-medium">{filteredOrders.length}</span>
                <span className="ml-1">orders found</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium text-gray-500 mb-2">No Orders Found</p>
                <p className="text-gray-400">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'You haven\'t completed any deliveries yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredOrders.map((order, index) => (
                  <motion.div
                    key={order._id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderModal(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-sm">
                              #{order.orderId?.slice(-4) || '0000'}
                            </span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900">{order.customerName}</h3>
                              <StatusBadge status={order.status} />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-2" />
                                <span>{formatTime(order.createdAt)}</span>
                              </div>
                              
                              <div className="flex items-center">
                                <PhoneIcon className="h-4 w-4 mr-2" />
                                <span>{order.customerPhone}</span>
                              </div>
                              
                              <div className="flex items-center">
                                <TruckIcon className="h-4 w-4 mr-2" />
                                <span>Delivery: {getDeliveryTime(order)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-start mt-2">
                              <MapPinIcon className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-600 line-clamp-1">
                                {order.customerAddress}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 ml-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-900 text-lg">
                            {formatCurrency(order.totalAmount)}
                          </p>
                          {order.rating && (
                            <div className="flex items-center justify-end mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < order.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={EyeIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                            setShowOrderModal(true);
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Modal */}
        <AnimatePresence>
          {showOrderModal && selectedOrder && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderModal(false)}
            >
              <motion.div
                className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Order Details
                    </h2>
                    <button
                      onClick={() => setShowOrderModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Order Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Order ID</label>
                        <p className="text-lg font-semibold text-gray-900">#{selectedOrder.orderId}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="mt-1">
                          <StatusBadge status={selectedOrder.status} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Customer Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p className="text-gray-900">{selectedOrder.customerName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">{selectedOrder.customerPhone}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="text-gray-900">{selectedOrder.customerAddress}</p>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
                      <div className="space-y-2">
                        {selectedOrder.items?.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-900">{item.name}</span>
                            <span className="text-gray-600">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                          <span className="text-xl font-bold text-green-600">
                            {formatCurrency(selectedOrder.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Timing Info */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Timing Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Order Created</label>
                          <p className="text-gray-900">{formatTime(selectedOrder.createdAt)}</p>
                        </div>
                        {selectedOrder.deliveredAt && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Delivered At</label>
                            <p className="text-gray-900">{formatTime(selectedOrder.deliveredAt)}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-500">Delivery Time</label>
                        <p className="text-gray-900">{getDeliveryTime(selectedOrder)}</p>
                      </div>
                    </div>
                    
                    {/* Rating */}
                    {selectedOrder.rating && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Rating</h3>
                        <div className="flex items-center space-x-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`h-6 w-6 ${
                                i < selectedOrder.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-lg font-semibold text-gray-900 ml-2">
                            {selectedOrder.rating}/5
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderHistory; 