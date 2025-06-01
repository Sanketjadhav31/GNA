import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sortBy: 'orderPlacedAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    totalPages: 1,
    currentPage: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  const { error: showError, success } = useToast();
  const { user } = useAuth();
  const { socket } = useSocket();

  useEffect(() => {
    fetchOrders();
    if (user?.role === 'restaurant_manager') {
      fetchAvailablePartners();
    }
  }, [filters]);

  // Listen for real-time Socket.io events
  useEffect(() => {
    if (!socket) return;

    const handleOrderStatusUpdate = (data) => {
      console.log('Real-time order status update received:', data);
      // Update the specific order in the list
      setOrders(prev => 
        prev.map(order => 
          order._id === data.orderId 
            ? { ...order, status: data.newStatus, ...data.orderDetails }
            : order
        )
      );
    };

    const handlePartnerAssigned = (data) => {
      console.log('Real-time partner assignment received:', data);
      // Refresh the orders list to show updated partner info
      fetchOrders();
      fetchAvailablePartners();
    };

    const handleOrderCompleted = (data) => {
      console.log('Real-time order completion received:', data);
      // Update the order status
      setOrders(prev => 
        prev.map(order => 
          order._id === data.orderId 
            ? { ...order, status: 'DELIVERED', ...data.orderDetails }
            : order
        )
      );
    };

    const handleNewOrderCreated = (data) => {
      console.log('Real-time new order created:', data);
      // Refresh orders list to show new order
      fetchOrders();
    };

    // Add event listeners
    socket.on('order_status_updated', handleOrderStatusUpdate);
    socket.on('partner_assigned_success', handlePartnerAssigned);
    socket.on('order_completed', handleOrderCompleted);
    socket.on('order_created_success', handleNewOrderCreated);
    socket.on('partner_availability_updated', () => {
      // Refresh available partners when availability changes
      if (user?.role === 'restaurant_manager') {
        fetchAvailablePartners();
      }
    });

    // Cleanup event listeners
    return () => {
      socket.off('order_status_updated', handleOrderStatusUpdate);
      socket.off('partner_assigned_success', handlePartnerAssigned);
      socket.off('order_completed', handleOrderCompleted);
      socket.off('order_created_success', handleNewOrderCreated);
      socket.off('partner_availability_updated');
    };
  }, [socket, user?.role]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('sortBy', filters.sortBy);
      queryParams.append('sortOrder', filters.sortOrder);
      queryParams.append('page', filters.page);
      queryParams.append('limit', filters.limit);

      console.log('Fetching orders with params:', queryParams.toString());

      const response = await axios.get(`/api/orders?${queryParams}`);
      console.log('Orders response:', response.data);
      
      if (response.data.success) {
        setOrders(response.data.data.orders || []);
        setPagination(response.data.data.pagination || {
          totalPages: 1,
          currentPage: 1,
          totalOrders: 0,
          hasNextPage: false,
          hasPrevPage: false
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Orders fetch error:', error);
      showError(error.response?.data?.message || 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePartners = async () => {
    try {
      const response = await axios.get('/api/auth/available-partners');
      if (response.data.success) {
        setAvailablePartners(response.data.data.partners || []);
      }
    } catch (error) {
      console.error('Failed to fetch available partners:', error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const endpoint = user?.role === 'delivery_partner' 
        ? `/api/orders/${orderId}/status`
        : `/api/orders/${orderId}`;
      
      await axios.put(endpoint, { status });
      success(`Order status updated to ${status.replace('_', ' ')}`);
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error('Status update error:', error);
      showError(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const assignPartner = async (orderId, partnerId) => {
    try {
      setAssigningOrder(orderId);
      await axios.put(`/api/orders/${orderId}/assign`, { partnerId });
      success('Delivery partner assigned successfully');
      fetchOrders(); // Refresh the list
      fetchAvailablePartners(); // Refresh available partners
    } catch (error) {
      console.error('Partner assignment error:', error);
      showError(error.response?.data?.message || 'Failed to assign delivery partner');
    } finally {
      setAssigningOrder(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { 
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        label: 'Pending'
      },
      PREP: { 
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        label: 'In Preparation'
      },
      READY: { 
        class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        label: 'Ready'
      },
      PICKED: { 
        class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
        label: 'Picked Up'
      },
      ON_ROUTE: { 
        class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        label: 'On Route'
      },
      DELIVERED: { 
        class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        label: 'Delivered'
      },
      CANCELLED: { 
        class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        label: 'Cancelled'
      }
    };
    
    const config = statusConfig[status] || statusConfig.PENDING;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getNextStatus = (currentStatus) => {
    if (user?.role === 'delivery_partner') {
      const partnerStatusFlow = {
        READY: 'PICKED',
        PICKED: 'ON_ROUTE',
        ON_ROUTE: 'DELIVERED'
      };
      return partnerStatusFlow[currentStatus];
    } else {
      const managerStatusFlow = {
        PENDING: 'PREP',
        PREP: 'READY'
      };
      return managerStatusFlow[currentStatus];
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PREP', label: 'In Preparation' },
    { value: 'READY', label: 'Ready for Pickup' },
    { value: 'PICKED', label: 'Picked Up' },
    { value: 'ON_ROUTE', label: 'On Route' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  const sortOptions = [
    { value: 'orderPlacedAt', label: 'Newest First', order: 'desc' },
    { value: 'orderPlacedAt', label: 'Oldest First', order: 'asc' },
    { value: 'totalAmount', label: 'Highest Amount', order: 'desc' },
    { value: 'totalAmount', label: 'Lowest Amount', order: 'asc' },
    { value: 'status', label: 'Status', order: 'asc' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
        <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders Management</h1>
              <p className="text-gray-600">Track and manage all your orders in real-time</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{pagination.totalOrders}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'DELIVERED').length}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                </div>
            </div>
            {user?.role === 'restaurant_manager' && (
              <Link 
                to="/orders/new" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Order</span>
              </Link>
            )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              Search & Filter Orders
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Orders</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Search by customer name, phone, or order ID..."
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="PREP">In Preparation</option>
                  <option value="READY">Ready</option>
                  <option value="PICKED">Picked Up</option>
                  <option value="ON_ROUTE">On Route</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <div className="flex space-x-2">
                <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="orderPlacedAt">Date</option>
                    <option value="totalAmount">Amount</option>
                    <option value="status">Status</option>
                </select>
                  <button
                    onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    <svg className={`w-5 h-5 text-gray-600 transition-transform ${filters.sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-500 mb-6">No orders match your current filters. Try adjusting your search criteria.</p>
                  {user?.role === 'restaurant_manager' && (
                <Link
                  to="/orders/new"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Order
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
                {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-bold text-gray-900">#{order._id.slice(-6).toUpperCase()}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(order.totalAmount)}</p>
                          <p className="text-sm text-gray-500">{formatDate(order.orderPlacedAt || order.createdAt)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Customer Info */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-medium text-blue-700">Customer</span>
                          </div>
                          <p className="font-semibold text-blue-900">{order.customerName}</p>
                          <p className="text-sm text-blue-700">{order.customerPhone}</p>
                        </div>

                        {/* Delivery Address */}
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium text-purple-700">Delivery Address</span>
                          </div>
                          <p className="font-semibold text-purple-900">{order.customerAddress?.street}</p>
                          <p className="text-sm text-purple-700">{order.customerAddress?.city}, {order.customerAddress?.pincode}</p>
                      </div>

                        {/* Delivery Partner */}
                        {order.deliveryPartner ? (
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
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
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center space-x-2 mb-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm font-medium text-gray-600">Delivery Partner</span>
                            </div>
                            <p className="text-gray-500">Not assigned yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-3 lg:ml-6 min-w-[160px]">
                      {/* Status Update */}
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order._id, getNextStatus(order.status))}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                          >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          <span>Mark {getNextStatus(order.status).replace('_', ' ')}</span>
                          </button>
                        )}

                      {/* Partner Assignment */}
                      {user?.role === 'restaurant_manager' && order.status === 'READY' && !order.deliveryPartner && availablePartners.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignPartner(order._id, e.target.value);
                                }
                              }}
                              disabled={assigningOrder === order._id}
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

                        {/* View Details */}
                        <Link
                          to={`/orders/${order._id}`}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        <span>View Details</span>
                        </Link>
                    </div>
                      </div>
                </div>
              </div>
            ))}
          </div>
        )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white rounded-lg border border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-700">
              Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalOrders} total orders)
                </div>
            <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
              <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                {pagination.currentPage}
              </span>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default OrderList; 