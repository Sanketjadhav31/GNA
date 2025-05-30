import api from './api';

const orderService = {
  // Get all orders with optional filters
  getAllOrders: async (filters = {}) => {
    try {
      console.log('📋 Fetching all orders with filters:', filters);
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/orders?${params.toString()}`);
      console.log('✅ Orders fetched successfully:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  },

  // Get recent orders for dashboard
  getRecentOrders: async (limit = 10) => {
    try {
      console.log('📋 Fetching recent orders...');
      const response = await api.get(`/orders/recent?limit=${limit}`);
      console.log('✅ Recent orders fetched:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching recent orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch recent orders');
    }
  },

  // Get order analytics
  getOrderAnalytics: async (filters = {}) => {
    try {
      console.log('📊 Fetching order analytics with filters:', filters);
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/orders/analytics?${params.toString()}`);
      console.log('✅ Order analytics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching order analytics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch order analytics');
    }
  },

  // Get partner analytics
  getPartnerAnalytics: async (filters = {}) => {
    try {
      console.log('📊 Fetching partner analytics with filters:', filters);
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/orders/partner-analytics?${params.toString()}`);
      console.log('✅ Partner analytics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner analytics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch partner analytics');
    }
  },

  // Search orders
  searchOrders: async (searchQuery, filters = {}) => {
    try {
      console.log('🔍 Searching orders:', searchQuery);
      const params = new URLSearchParams();
      params.append('q', searchQuery);
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/orders/search?${params.toString()}`);
      console.log('✅ Orders search completed:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error searching orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to search orders');
    }
  },

  // Get order by ID
  getOrderById: async (orderId) => {
    try {
      console.log('📋 Fetching order:', orderId);
      const response = await api.get(`/orders/${orderId}`);
      console.log('✅ Order fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch order');
    }
  },

  // Create new order
  createOrder: async (orderData) => {
    try {
      console.log('📝 Creating new order...');
      const response = await api.post('/orders', orderData);
      console.log('✅ Order created successfully:', response.data.data?.orderId);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw new Error(error.response?.data?.message || 'Failed to create order');
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status, updateData = {}) => {
    try {
      console.log('📝 Updating order status:', orderId, status);
      const response = await api.patch(`/orders/${orderId}/status`, {
        status,
        ...updateData
      });
      console.log('✅ Order status updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  },

  // Assign partner to order
  assignPartner: async (orderId, partnerId) => {
    try {
      console.log('👥 Assigning partner to order:', orderId, partnerId);
      const response = await api.patch(`/orders/${orderId}/assign`, {
        partnerId
      });
      console.log('✅ Partner assigned successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error assigning partner:', error);
      throw new Error(error.response?.data?.message || 'Failed to assign partner');
    }
  },

  // Cancel order
  cancelOrder: async (orderId, reason) => {
    try {
      console.log('❌ Cancelling order:', orderId, reason);
      const response = await api.patch(`/orders/${orderId}/cancel`, {
        reason
      });
      console.log('✅ Order cancelled successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel order');
    }
  },

  // Get order tracking information
  getOrderTracking: async (orderId) => {
    try {
      console.log('📍 Fetching order tracking:', orderId);
      const response = await api.get(`/orders/${orderId}/tracking`);
      console.log('✅ Order tracking fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching order tracking:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch order tracking');
    }
  },

  // Get orders by status
  getOrdersByStatus: async (status) => {
    try {
      console.log('📋 Fetching orders by status:', status);
      const response = await api.get(`/orders/status/${status}`);
      console.log('✅ Orders by status fetched:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching orders by status:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch orders by status');
    }
  },

  // Get order statistics
  getOrderStatistics: async (timeRange = 'today') => {
    try {
      console.log('📊 Fetching order statistics for:', timeRange);
      const response = await api.get(`/orders/analytics?timeRange=${timeRange}`);
      console.log('✅ Order statistics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching order statistics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch order statistics');
    }
  },

  // Get my current order (for partners)
  getCurrentOrder: async () => {
    try {
      console.log('📋 Fetching current order...');
      const response = await api.get('/orders/my-current');
      console.log('✅ Current order fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching current order:', error);
      // Return empty response if no current order
      if (error.response?.status === 404) {
        return {
          success: true,
          data: null,
          message: 'No active order found'
        };
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch current order');
    }
  },

  // Accept order (for partners)
  acceptOrder: async (orderId) => {
    try {
      console.log('✅ Accepting order:', orderId);
      const response = await api.post(`/orders/${orderId}/accept`);
      console.log('✅ Order accepted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error accepting order:', error);
      throw new Error(error.response?.data?.message || 'Failed to accept order');
    }
  },

  // Mark order as picked up (for partners)
  markPickedUp: async (orderId) => {
    try {
      console.log('📦 Marking order as picked up:', orderId);
      const response = await api.patch(`/orders/${orderId}/status`, {
        status: 'PICKED'
      });
      console.log('✅ Order marked as picked up');
      return response.data;
    } catch (error) {
      console.error('❌ Error marking order as picked up:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark order as picked up');
    }
  },

  // Mark order as on route (for partners)
  markOnRoute: async (orderId) => {
    try {
      console.log('🚗 Marking order as on route:', orderId);
      const response = await api.patch(`/orders/${orderId}/status`, {
        status: 'ON_ROUTE'
      });
      console.log('✅ Order marked as on route');
      return response.data;
    } catch (error) {
      console.error('❌ Error marking order as on route:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark order as on route');
    }
  },

  // Mark order as delivered (for partners)
  markDelivered: async (orderId, deliveryData = {}) => {
    try {
      console.log('🎯 Marking order as delivered:', orderId);
      const response = await api.patch(`/orders/${orderId}/status`, {
        status: 'DELIVERED',
        ...deliveryData
      });
      console.log('✅ Order marked as delivered');
      return response.data;
    } catch (error) {
      console.error('❌ Error marking order as delivered:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark order as delivered');
    }
  },

  // Order status flow validation (according to PRD)
  getValidNextStatuses: (currentStatus) => {
    const statusFlow = {
      'PREP': ['PICKED'],
      'PICKED': ['ON_ROUTE'],
      'ON_ROUTE': ['DELIVERED'],
      'DELIVERED': []
    };
    
    return statusFlow[currentStatus] || [];
  },

  // Get order status display name
  getStatusDisplayName: (status) => {
    const statusNames = {
      'PREP': 'Preparing',
      'PICKED': 'Picked Up',
      'ON_ROUTE': 'On Route',
      'DELIVERED': 'Delivered'
    };
    
    return statusNames[status] || status;
  },

  // Get priority display name
  getPriorityDisplayName: (priority) => {
    const priorityNames = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High'
    };
    
    return priorityNames[priority] || priority;
  },

  // Calculate order total
  calculateOrderTotal: (items) => {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  },

  // Format order time
  formatOrderTime: (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Get time since order
  getTimeSinceOrder: (timestamp) => {
    const now = new Date();
    const orderTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days}d ago`;
    }
  },

  // Validate order data (according to PRD requirements)
  validateOrderData: (orderData) => {
    const errors = {};
    
    if (!orderData.items || orderData.items.length === 0) {
      errors.items = 'At least one item is required';
    } else {
      orderData.items.forEach((item, index) => {
        if (!item.name) {
          errors[`item_${index}_name`] = 'Item name is required';
        }
        if (!item.quantity || item.quantity < 1) {
          errors[`item_${index}_quantity`] = 'Item quantity must be at least 1';
        }
        if (!item.price || item.price < 0) {
          errors[`item_${index}_price`] = 'Item price must be positive';
        }
      });
    }
    
    if (!orderData.customerName) {
      errors.customerName = 'Customer name is required';
    }
    
    if (!orderData.customerPhone) {
      errors.customerPhone = 'Customer phone is required';
    } else if (!/^[0-9]{10}$/.test(orderData.customerPhone)) {
      errors.customerPhone = 'Phone must be 10 digits';
    }
    
    if (!orderData.customerAddress) {
      errors.customerAddress = 'Customer address is required';
    }
    
    if (!orderData.prepTime || orderData.prepTime < 5 || orderData.prepTime > 120) {
      errors.prepTime = 'Prep time must be between 5 and 120 minutes';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Get status color for UI
  getStatusColor: (status) => {
    const statusColors = {
      'PREP': 'bg-yellow-100 text-yellow-800',
      'PICKED': 'bg-blue-100 text-blue-800',
      'ON_ROUTE': 'bg-purple-100 text-purple-800',
      'DELIVERED': 'bg-green-100 text-green-800'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  },

  // Get time until dispatch
  getTimeUntilDispatch: (dispatchTime) => {
    const now = new Date();
    const dispatch = new Date(dispatchTime);
    const diffInMinutes = Math.floor((dispatch - now) / (1000 * 60));
    
    if (diffInMinutes <= 0) {
      return 'Ready for dispatch';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m until dispatch`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m until dispatch`;
    }
  }
};

export default orderService; 