import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const DeliveryDashboard = () => {
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    pendingPickups: 0,
    activeDeliveries: 0,
    completedToday: 0,
    earnings: 0,
    rating: 0
  });
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const { error: showError, success } = useToast();
  const { user, updateUser } = useAuth();
  const { 
    isConnected, 
    realtimeNotifications, 
    emitUpdateAvailability,
    emitOrderStatusUpdate 
  } = useSocket();

  useEffect(() => {
    fetchDashboardData();
    // Reduced refresh interval since we have real-time updates
    const interval = setInterval(fetchDashboardData, 60000); // 1 minute instead of 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      setIsAvailable(user.isAvailable || false);
    }
  }, [user]);

  // Listen for real-time order updates
  useEffect(() => {
    // Refresh dashboard when we receive real-time notifications
    if (realtimeNotifications.length > 0) {
      const lastNotification = realtimeNotifications[0];
      console.log('🔔 New notification received:', lastNotification);
      
      if (lastNotification.type === 'success' && 
          (lastNotification.id.includes('assigned') || 
           lastNotification.id.includes('status') ||
           lastNotification.id.includes('completed'))) {
        console.log('🔄 Refreshing dashboard due to notification');
        fetchDashboardData();
      }
    }
  }, [realtimeNotifications]);

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      console.log('🔄 Fetching dashboard data...', forceRefresh ? '(Force refresh)' : '');
      console.log('🔄 Current user ID:', user?._id);
      console.log('🔄 Current user role:', user?.role);
      
      // Add cache busting parameter for force refresh
      const timestamp = forceRefresh ? `?t=${Date.now()}` : '';
      
      const [statsResponse, ordersResponse] = await Promise.all([
        axios.get(`/api/partners/my/stats${timestamp}`),
        axios.get(`/api/partners/my/active-orders${timestamp}`)
      ]);

      console.log('📊 Stats response:', statsResponse.data);
      console.log('📦 Orders response:', ordersResponse.data);
      console.log('📦 Orders data structure:', {
        success: ordersResponse.data.success,
        message: ordersResponse.data.message,
        ordersCount: ordersResponse.data.data?.orders?.length || 0,
        orders: ordersResponse.data.data?.orders?.map(o => ({
          id: o._id?.slice(-6),
          status: o.status,
          customerName: o.customerName,
          hasDeliveryPartner: !!o.deliveryPartner
        })) || []
      });

      setStats(statsResponse.data.data.stats);
      setAssignedOrders(ordersResponse.data.data.orders);
      
      console.log('✅ Dashboard data updated - Orders count:', ordersResponse.data.data.orders.length);
      console.log('✅ Assigned orders state:', ordersResponse.data.data.orders.map(o => ({
        id: o._id?.slice(-6),
        status: o.status,
        customer: o.customerName
      })));
    } catch (error) {
      console.error('❌ Dashboard fetch error:', error);
      console.error('Error details:', error.response?.data);
      showError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    try {
      const newAvailability = !isAvailable;
      await axios.put('/api/partners/availability', { isAvailable: newAvailability });
      setIsAvailable(newAvailability);
      await updateUser({ isAvailable: newAvailability });
      
      // Emit real-time availability update
      emitUpdateAvailability(newAvailability);
      
      success(`You are now ${newAvailability ? 'available' : 'unavailable'} for deliveries`);
    } catch (error) {
      showError('Failed to update availability');
    }
  };

  const updateOrderStatus = async (orderId, status, notes = '') => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status, notes });
      success(`Order status updated to ${status.replace('_', ' ')}`);
      
      // Emit real-time status update
      emitOrderStatusUpdate(orderId, status, notes);
      
      fetchDashboardData(); // Refresh data
    } catch (error) {
      showError('Failed to update order status');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
      PREP: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      READY: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      PICKED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      ON_ROUTE: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      DELIVERED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    };
    
    const config = statusConfig[status] || statusConfig.PENDING;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      PREP: 'READY',
      READY: 'PICKED',
      PICKED: 'ON_ROUTE',
      ON_ROUTE: 'DELIVERED'
    };
    return statusFlow[currentStatus];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with Status and Availability Toggle */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Delivery Dashboard
              </h1>
              <p className="text-gray-600">Manage your deliveries and track your performance</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Manual Refresh Button */}
              <button
                onClick={() => fetchDashboardData(true)}
                className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg py-2 px-4 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Refresh</span>
              </button>
              
              {/* Real-time connection status */}
              <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg py-2 px-4 shadow-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              
              {/* Availability Toggle */}
              <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-lg py-2 px-4 shadow-sm">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <button
                  onClick={toggleAvailability}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isAvailable ? 'bg-green-600' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAvailable ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                  {isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {[
            { 
              label: 'Total Deliveries', 
              value: stats.totalDeliveries, 
              icon: '📦'
            },
            { 
              label: 'Pending Pickups', 
              value: stats.pendingPickups, 
              icon: '⏰'
            },
            { 
              label: 'Active Deliveries', 
              value: stats.activeDeliveries, 
              icon: '🚚'
            },
            { 
              label: "Today's Deliveries", 
              value: stats.completedToday, 
              icon: '✅'
            },
            { 
              label: "Today's Earnings", 
              value: formatCurrency(stats.earnings), 
              icon: '💰'
            },
            { 
              label: 'Your Rating', 
              value: stats.rating ? `${stats.rating.toFixed(1)}` : 'New', 
              icon: '⭐'
            }
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">{stat.icon}</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {typeof stat.value === 'string' ? stat.value : (stat.value || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Assigned Orders Section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Your Assigned Orders</h2>
            </div>
            <Link 
              to="/orders" 
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
            >
              View All →
            </Link>
          </div>
          
          <div className="p-6">
            {assignedOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No assigned orders</p>
                <p className="text-gray-400 text-sm mt-1">Orders will appear here when assigned to you</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedOrders.map((order) => (
                  <div 
                    key={order._id} 
                    className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-4">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            Order #{order._id.slice(-6).toUpperCase()}
                          </h4>
                          {getStatusBadge(order.status)}
                          <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Details</h4>
                            <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                            <p className="text-sm text-gray-600">{order.customerPhone}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Restaurant</h4>
                            <p className="text-sm font-medium text-gray-900">
                              {order.restaurantManager?.firstName} {order.restaurantManager?.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{order.restaurantManager?.phone}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Delivery Address</h4>
                            <p className="text-sm font-medium text-gray-900">{order.customerAddress?.street}</p>
                            <p className="text-sm text-gray-600">
                              {order.customerAddress?.city}, {order.customerAddress?.pincode}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-3 lg:ml-6">
                        {/* Status Update Actions */}
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order._id, getNextStatus(order.status))}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 inline-flex items-center space-x-2"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Mark {getNextStatus(order.status).replace('_', ' ')}</span>
                          </button>
                        )}
                        
                        {/* Order Details Link */}
                        <Link
                          to={`/orders/${order._id}`}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 inline-flex items-center space-x-2 text-center"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>View Details</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard; 