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
      console.log('📦 Creating order via API...');
      const response = await api.post('/orders', orderData);
      console.log('✅ Order created via API:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API order creation failed:', error);
      throw error;
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
  getCurrentOrder: async (partnerId) => {
    try {
      console.log('📋 Fetching current order for partner:', partnerId);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get orders from localStorage
      const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
      
      // Find the current active order for this partner
      const currentOrder = globalOrders.find(order => 
        order.assignedPartner === partnerId && 
        ['PICKED', 'ON_ROUTE'].includes(order.status)
      );
      
      console.log('✅ Current order fetched:', currentOrder ? currentOrder.orderId : 'None');
      
      return {
        success: true,
        data: currentOrder || null,
        message: currentOrder ? 'Current order found' : 'No active order'
      };
    } catch (error) {
      console.error('❌ Error fetching current order:', error);
      throw new Error('Failed to fetch current order');
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
  },

  // Get assigned orders for partner (localStorage implementation)
  getAssignedOrders: async (partnerId) => {
    try {
      console.log('📋 Fetching assigned orders for partner:', partnerId);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get orders from localStorage
      const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
      
      // Filter orders assigned to this partner that are not delivered
      const assignedOrders = globalOrders.filter(order => 
        order.assignedPartner === partnerId && 
        ['PREP', 'PICKED', 'ON_ROUTE'].includes(order.status)
      );
      
      console.log('✅ Assigned orders fetched:', assignedOrders.length);
      
      return {
        success: true,
        data: assignedOrders,
        message: `Found ${assignedOrders.length} assigned orders`
      };
    } catch (error) {
      console.error('❌ Error fetching assigned orders:', error);
      throw new Error('Failed to fetch assigned orders');
    }
  },

  // ===== BACKEND API INTEGRATION =====
  
  // Get partner's current assigned order (Backend API)
  getPartnerCurrentOrder: async (partnerEmail = null) => {
    try {
      console.log('📦 Fetching partner current order via API...');
      
      const params = {};
      if (partnerEmail) {
        params.partnerEmail = partnerEmail;
        console.log('📧 Using partner email for identification:', partnerEmail);
      }
      
      const response = await api.get('/orders/my-current', { params });
      console.log('✅ Partner current order fetched via API:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API partner current order fetch failed:', error);
      throw error;
    }
  },

  // Assign partner to order (Backend API)
  assignPartnerToOrder: async (orderId, partnerId, partnerEmail = null) => {
    try {
      console.log('👥 Assigning partner to order via API...');
      console.log('📋 Assignment details:', { orderId, partnerId, partnerEmail });
      
      const assignmentData = { partnerId };
      
      // Include partner email for identification if provided
      if (partnerEmail) {
        assignmentData.partnerEmail = partnerEmail;
      }
      
      const response = await api.put(`/orders/${orderId}/assign-partner`, assignmentData);
      console.log('✅ Partner assigned via API:', response.data);
      
      // Emit real-time event for immediate partner notification
      if (response.data.success && response.data.data?.order) {
        const order = response.data.data.order;
        const partner = order.assignedTo;
        
        // Emit Socket.IO event for real-time assignment
        window.dispatchEvent(new CustomEvent('partner-order-assigned', {
          detail: {
            orderId: order._id,
            orderNumber: order.orderId,
            partnerId: partner._id,
            partnerName: partner.name,
            partnerEmail: partner.email || partnerEmail,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerAddress: order.customerAddress,
            totalAmount: order.totalAmount,
            items: order.items,
            specialInstructions: order.specialInstructions,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            priority: order.priority,
            assignedAt: order.assignedAt,
            source: 'backend'
          }
        }));
        
        console.log('📡 Real-time assignment event emitted for partner:', partner.email || partnerEmail);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ API partner assignment failed:', error);
      throw error;
    }
  },

  // Update order status (Backend API)
  updateOrderStatusBackend: async (orderId, status) => {
    try {
      console.log('🔄 Updating order status via API...');
      console.log('📋 Status update:', { orderId, status });
      
      const response = await api.put(`/orders/${orderId}/status`, { status });
      console.log('✅ Order status updated via API:', response.data);
      
      // Emit real-time event for status update
      if (response.data.success) {
        window.dispatchEvent(new CustomEvent('order-status-updated-backend', {
          detail: {
            orderId,
            newStatus: status,
            source: 'backend',
            timestamp: new Date()
          }
        }));
        
        console.log('📡 Real-time status update event emitted');
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ API status update failed:', error);
      throw error;
    }
  },

  // Get available partners for assignment (Backend API)
  getAvailablePartners: async () => {
    try {
      console.log('👥 Fetching available partners from backend...');
      
      // Try the orders endpoint first
      try {
        const response = await api.get('/orders/partners/available');
        console.log('✅ Available partners fetched from orders endpoint');
        return response.data;
      } catch (ordersError) {
        console.log('⚠️ Orders endpoint failed, trying partners endpoint:', ordersError.message);
        
        // Try the partners endpoint as fallback
        try {
          const response = await api.get('/partners/available');
          console.log('✅ Available partners fetched from partners endpoint');
          return response.data;
        } catch (partnersError) {
          console.log('⚠️ Partners endpoint also failed:', partnersError.message);
          throw partnersError;
        }
      }
    } catch (error) {
      console.error('❌ Error fetching available partners from backend:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch available partners');
    }
  },

  // Create order via backend API
  createOrderBackend: async (orderData) => {
    try {
      console.log('📝 Creating new order via backend...');
      const response = await api.post('/orders', orderData);
      console.log('✅ Order created successfully via backend:', response.data.data?.order?.orderId);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating order via backend:', error);
      throw new Error(error.response?.data?.message || 'Failed to create order');
    }
  },

  // Get all orders via backend API
  getAllOrdersBackend: async (filters = {}) => {
    try {
      console.log('📋 Fetching all orders from backend with filters:', filters);
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/orders?${params.toString()}`);
      console.log('✅ Orders fetched successfully from backend:', response.data.data?.orders?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching orders from backend:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  },

  // Get available orders for assignment (Manager only)
  getAvailableOrders: async () => {
    try {
      console.log('📋 Fetching available orders via API...');
      const response = await api.get('/orders/available');
      console.log('✅ Available orders fetched via API:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API available orders fetch failed:', error);
      throw error;
    }
  },

  // Enhanced real-time order assignment with email-based partner identification
  assignOrderToPartnerByEmail: async (orderId, partnerEmail, orderData = {}) => {
    try {
      console.log('📧 Assigning order to partner by email...');
      console.log('📋 Assignment details:', { orderId, partnerEmail, orderData });
      
      // First, try to find partner by email in localStorage
      const registeredPartners = JSON.parse(localStorage.getItem('registered_partners') || '[]');
      const managerPartners = JSON.parse(localStorage.getItem('manager_partners') || '[]');
      const allPartners = [...registeredPartners, ...managerPartners];
      
      const partner = allPartners.find(p => p.email === partnerEmail);
      
      if (!partner) {
        throw new Error(`Partner with email ${partnerEmail} not found`);
      }
      
      console.log('✅ Partner found by email:', partner.name, partner.email);
      
      // Try backend assignment first
      try {
        const backendResponse = await orderService.assignPartnerToOrder(orderId, partner._id, partnerEmail);
        if (backendResponse.success) {
          console.log('✅ Order assigned via backend API');
          return backendResponse;
        }
      } catch (backendError) {
        console.log('⚠️ Backend assignment failed, using localStorage fallback');
      }
      
      // Fallback to localStorage assignment
      const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
      const orderIndex = globalOrders.findIndex(order => order._id === orderId);
      
      if (orderIndex === -1) {
        throw new Error('Order not found');
      }
      
      // Update order with partner assignment
      globalOrders[orderIndex] = {
        ...globalOrders[orderIndex],
        assignedPartner: partner._id,
        assignedPartnerName: partner.name,
        assignedPartnerEmail: partner.email,
        assignedAt: new Date().toISOString(),
        status: 'PREP'
      };
      
      // Update partner status
      const updatedPartners = allPartners.map(p => 
        p.email === partnerEmail 
          ? { ...p, status: 'busy', currentOrder: orderId }
          : p
      );
      
      // Save updates
      localStorage.setItem('global_orders', JSON.stringify(globalOrders));
      localStorage.setItem('registered_partners', JSON.stringify(updatedPartners.filter(p => registeredPartners.some(rp => rp._id === p._id))));
      localStorage.setItem('manager_partners', JSON.stringify(updatedPartners.filter(p => managerPartners.some(mp => mp._id === p._id))));
      
      // Emit real-time assignment event
      const assignmentData = {
        orderId,
        orderNumber: globalOrders[orderIndex].orderId,
        partnerId: partner._id,
        partnerName: partner.name,
        partnerEmail: partner.email,
        customerName: globalOrders[orderIndex].customerName,
        customerPhone: globalOrders[orderIndex].customerPhone,
        customerAddress: globalOrders[orderIndex].customerAddress,
        totalAmount: globalOrders[orderIndex].totalAmount,
        items: globalOrders[orderIndex].items,
        specialInstructions: globalOrders[orderIndex].specialInstructions,
        estimatedDeliveryTime: globalOrders[orderIndex].estimatedDeliveryTime,
        priority: globalOrders[orderIndex].priority,
        assignedAt: globalOrders[orderIndex].assignedAt,
        source: 'localStorage'
      };
      
      // Emit event for partner dashboard
      window.dispatchEvent(new CustomEvent('partner-order-assigned', {
        detail: assignmentData
      }));
      
      console.log('✅ Order assigned via localStorage with email identification');
      
      return {
        success: true,
        data: {
          order: globalOrders[orderIndex],
          partner: partner
        }
      };
      
    } catch (error) {
      console.error('❌ Email-based order assignment failed:', error);
      throw error;
    }
  },

  // Real-time partner notification system
  notifyPartnerOrderAssignment: (partnerEmail, orderData) => {
    console.log('📧 Sending real-time notification to partner:', partnerEmail);
    
    // Emit custom event for partner dashboard
    window.dispatchEvent(new CustomEvent('partner-order-notification', {
      detail: {
        partnerEmail,
        type: 'order_assigned',
        orderData,
        timestamp: new Date()
      }
    }));
    
    // Also emit Socket.IO event if available
    if (window.socket) {
      window.socket.emit('notify_partner_by_email', {
        partnerEmail,
        type: 'order_assigned',
        orderData,
        timestamp: new Date()
      });
    }
    
    console.log('📡 Real-time notification sent to partner:', partnerEmail);
  },

  // Get available orders for partners
  getAvailableOrders: async () => {
    try {
      console.log('📋 Fetching available orders for partner...');
      const response = await api.get('/orders/available');
      console.log('✅ Available orders fetched:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching available orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch available orders');
    }
  },

  // Get partner's current order
  getCurrentOrder: async () => {
    try {
      console.log('📋 Fetching current order for partner...');
      const response = await api.get('/orders/current');
      console.log('✅ Current order fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching current order:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch current order');
    }
  },

  // Get partner's order history
  getPartnerOrderHistory: async () => {
    try {
      console.log('📋 Fetching partner order history...');
      const response = await api.get('/orders/partner/history');
      console.log('✅ Partner order history fetched:', response.data.data?.orders?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner order history:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch order history');
    }
  },

  // Assign partner to order (Manager function)
  assignPartnerToOrder: async (orderId, partnerId, partnerEmail = null) => {
    try {
      console.log('👥 Assigning partner to order via backend API...');
      console.log('📋 Assignment details:', { orderId, partnerId, partnerEmail });
      
      const response = await api.patch(`/orders/${orderId}/assign`, {
        partnerId,
        partnerEmail
      });
      
      console.log('✅ Partner assigned successfully via backend API');
      return response.data;
    } catch (error) {
      console.error('❌ Error assigning partner via backend API:', error);
      throw new Error(error.response?.data?.message || 'Failed to assign partner');
    }
  },

  // Update order status via backend only
  updateOrderStatusBackend: async (orderId, newStatus) => {
    try {
      console.log(`🔄 Updating order ${orderId} status to ${newStatus} via backend...`);
      
      const response = await api.patch(`/orders/${orderId}/status`, {
        status: newStatus
      });
      
      console.log('✅ Order status updated successfully via backend');
      return response.data;
    } catch (error) {
      console.error('❌ Error updating order status via backend:', error);
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  }
};

export default orderService; 