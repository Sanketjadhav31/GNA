import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useSocket } from '../../contexts/SocketContext';

const RestaurantDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    availablePartners: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error: showError, success } = useToast();
  const { 
    isConnected, 
    realtimeNotifications, 
    emitPartnerAssigned,
    emitNewOrderCreated 
  } = useSocket();

  useEffect(() => {
    fetchDashboardData();
    // Reduced refresh interval since we have real-time updates
    const interval = setInterval(fetchDashboardData, 60000); // 1 minute instead of 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time order updates
  useEffect(() => {
    // Refresh dashboard when we receive real-time notifications
    if (realtimeNotifications.length > 0) {
      const lastNotification = realtimeNotifications[0];
      if (lastNotification.type === 'success' && 
          (lastNotification.id.includes('partner-assigned') || 
           lastNotification.id.includes('status'))) {
        fetchDashboardData();
      }
    }
  }, [realtimeNotifications]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, ordersResponse, partnersResponse] = await Promise.all([
        axios.get('/api/orders/stats'),
        axios.get('/api/orders?limit=5&sortBy=orderPlacedAt&sortOrder=desc'),
        axios.get('/api/auth/available-partners')
      ]);

      setStats(statsResponse.data.data);
      setRecentOrders(ordersResponse.data.data.orders);
      setAvailablePartners(partnersResponse.data.data.partners);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      showError(error.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const assignPartner = async (orderId, partnerId) => {
    try {
      await axios.put(`/api/orders/${orderId}/assign`, { partnerId });
      success('Partner assigned successfully');
      
      // Emit real-time event
      emitPartnerAssigned(orderId);
      
      fetchDashboardData(); // Refresh data
    } catch (error) {
      showError('Failed to assign partner');
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      // Use the correct endpoint for restaurant managers
      await axios.put(`/api/orders/${orderId}`, { status });
      success(`Order status updated to ${status.replace('_', ' ')}`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Status update error:', error);
      showError(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      PENDING: 'status-badge status-pending',
      PREP: 'status-badge status-prep',
      READY: 'status-badge status-ready',
      PICKED: 'status-badge status-picked',
      ON_ROUTE: 'status-badge status-on-route',
      DELIVERED: 'status-badge status-delivered',
      CANCELLED: 'status-badge status-cancelled'
    };
    
    return (
      <span className={statusClasses[status] || 'status-badge status-pending'}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      PENDING: 'PREP',
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
    <div className="p-6 max-w-7xl mx-auto">
        {/* Header with Real-time Status */}
      <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurant Dashboard</h1>
        <p className="text-gray-600">Monitor orders, manage delivery partners, and track performance</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Real-time connection status */}
              <div className="bg-white rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {isConnected ? 'Real-time Connected' : 'Offline'}
                  </span>
            </div>
          </div>
              <Link 
                to="/orders/new" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
                <span>Create New Order</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {[
            { 
              label: 'Total Orders', 
              value: stats.totalOrders, 
              icon: '📊', 
              color: 'blue',
              change: '+12%'
            },
            { 
              label: 'Pending Orders', 
              value: stats.pendingOrders, 
              icon: '⏳', 
              color: 'yellow',
              change: '+5%'
            },
            { 
              label: 'Active Orders', 
              value: stats.activeOrders, 
              icon: '🔥', 
              color: 'purple',
              change: '+8%'
            },
            { 
              label: 'Completed', 
              value: stats.completedOrders, 
              icon: '✅', 
              color: 'green',
              change: '+15%'
            },
            { 
              label: 'Revenue', 
              value: formatCurrency(stats.totalRevenue), 
              icon: '💰', 
              color: 'indigo',
              change: '+22%'
            },
            { 
              label: 'Available Partners', 
              value: stats.availablePartners, 
              icon: '🛵', 
              color: 'pink',
              change: '+3%'
            }
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'yellow' ? 'bg-yellow-100' :
                  stat.color === 'purple' ? 'bg-purple-100' :
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'indigo' ? 'bg-indigo-100' :
                  'bg-pink-100'
                }`}>
                  <span className="text-xl">{stat.icon}</span>
            </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.change.startsWith('+') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {stat.change}
                </span>
            </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
          </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
      </div>

      {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Recent Orders</h2>
                </div>
                <Link 
                  to="/orders" 
                  className="text-blue-100 hover:text-white font-medium transition-colors duration-200 text-sm flex items-center space-x-1"
                >
                  <span>View All</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent orders</h3>
                  <p className="text-gray-500">Orders will appear here once you start receiving them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div 
                      key={order._id} 
                      className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h4 className="font-bold text-gray-900 text-lg">
                        #{order._id.slice(-6).toUpperCase()}
                              </h4>
                              {getStatusBadge(order.status)}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">{formatCurrency(order.totalAmount)}</p>
                              <p className="text-xs text-gray-500">{new Date(order.orderPlacedAt || order.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-3 border border-gray-100">
                              <div className="flex items-center space-x-2 mb-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700">Customer</span>
                              </div>
                              <p className="font-semibold text-gray-900">{order.customerName}</p>
                              <p className="text-sm text-gray-600">{order.customerPhone}</p>
                            </div>
                            
                            {order.deliveryPartner && (
                              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <div className="flex items-center space-x-2 mb-2">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  <span className="text-sm font-medium text-green-700">Delivery Partner</span>
                                </div>
                                <p className="font-semibold text-green-900">
                                  {order.deliveryPartner.firstName} {order.deliveryPartner.lastName}
                                </p>
                                <p className="text-sm text-green-700">{order.deliveryPartner.phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 lg:ml-4 min-w-[140px]">
                          {/* Status Update Button */}
                          {getNextStatus(order.status) && ['PENDING', 'PREP'].includes(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order._id, getNextStatus(order.status))}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm flex items-center justify-center space-x-2"
                          >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                              <span>Mark {getNextStatus(order.status).replace('_', ' ')}</span>
                          </button>
                        )}
                        
                          {/* Partner Assignment */}
                          {order.status === 'READY' && !order.deliveryPartner && availablePartners.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignPartner(order._id, e.target.value);
                                }
                              }}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                              <option value="">🛵 Assign Partner</option>
                              {availablePartners.map(partner => (
                                <option key={partner._id} value={partner._id}>
                                  {partner.firstName} {partner.lastName} ({partner.vehicleType})
                                </option>
                              ))}
                            </select>
                        )}
                        
                        <Link
                          to={`/orders/${order._id}`}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm flex items-center justify-center space-x-2"
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

        {/* Available Partners */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Available Partners</h2>
                </div>
                <Link 
                  to="/partners" 
                  className="text-purple-100 hover:text-white font-medium transition-colors duration-200 text-sm flex items-center space-x-1"
                >
                  <span>View All</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="p-6">
              {availablePartners.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No partners available</h3>
                  <p className="text-gray-500">Partners will appear here when they come online</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {availablePartners.slice(0, 5).map((partner) => (
                    <div 
                      key={partner._id} 
                      className="bg-gray-50 rounded-lg p-5 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                              <span className="text-white font-bold text-lg">
                                {partner.firstName?.charAt(0)}{partner.lastName?.charAt(0)}
                        </span>
                      </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 text-lg">
                          {partner.firstName} {partner.lastName}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-700">{partner.vehicleType}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-sm text-gray-600">{partner.phone}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-600 font-medium text-sm">Available</span>
                          </div>
                          {partner.rating && (
                            <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-yellow-700 font-semibold text-sm">{partner.rating}</span>
                            </div>
                          )}
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
    </div>
  );
};

export default RestaurantDashboard; 