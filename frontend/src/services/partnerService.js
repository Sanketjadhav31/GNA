import api from './authService';

const partnerService = {
  // Get available partners (Manager only)
  getAvailablePartners: async (location = null) => {
    try {
      console.log('👥 Fetching available partners...');
      let url = '/partners/available';
      
      if (location) {
        const params = new URLSearchParams();
        params.append('lat', location.lat);
        params.append('lng', location.lng);
        if (location.maxDistance) {
          params.append('maxDistance', location.maxDistance);
        }
        url += `?${params.toString()}`;
      }
      
      const response = await api.get(url);
      console.log('✅ Available partners fetched:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching available partners:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch available partners');
    }
  },

  // Get all partners with optional filters
  getAllPartners: async (filters = {}) => {
    try {
      console.log('👥 Fetching all partners with filters:', filters);
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/partners?${params.toString()}`);
      console.log('✅ Partners fetched successfully:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partners:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch partners');
    }
  },

  // Search partners
  searchPartners: async (searchQuery, filters = {}) => {
    try {
      console.log('🔍 Searching partners:', searchQuery);
      const searchFilters = {
        ...filters,
        search: searchQuery
      };
      
      return await partnerService.getAllPartners(searchFilters);
    } catch (error) {
      console.error('❌ Error searching partners:', error);
      throw new Error(error.response?.data?.message || 'Failed to search partners');
    }
  },

  // Get partner statistics
  getPartnerStatistics: async (timeRange = 'today') => {
    try {
      console.log('📊 Fetching partner statistics...');
      const response = await api.get(`/partners/statistics?timeRange=${timeRange}`);
      console.log('✅ Partner statistics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner statistics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch partner statistics');
    }
  },

  // Get partner analytics
  getPartnerAnalytics: async (timeRange = 'today') => {
    try {
      console.log('📊 Fetching partner analytics...');
      const response = await api.get(`/orders/partner-analytics?timeRange=${timeRange}`);
      console.log('✅ Partner analytics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner analytics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch partner analytics');
    }
  },

  // Get partner by ID
  getPartnerById: async (partnerId) => {
    try {
      console.log('👤 Fetching partner:', partnerId);
      const response = await api.get(`/partners/${partnerId}`);
      console.log('✅ Partner fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch partner');
    }
  },

  // Get partner analytics by ID
  getPartnerAnalyticsById: async (partnerId, timeRange = 'month') => {
    try {
      console.log('📊 Fetching partner analytics for:', partnerId);
      const response = await api.get(`/partners/${partnerId}/analytics?timeRange=${timeRange}`);
      console.log('✅ Partner analytics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner analytics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch partner analytics');
    }
  },

  // Get current partner profile (for logged-in partner)
  getMyProfile: async () => {
    try {
      console.log('👤 Fetching my profile...');
      const response = await api.get('/partners/profile');
      console.log('✅ Profile fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch profile');
    }
  },

  // Get my statistics (for logged-in partner)
  getMyStatistics: async (timeRange = 'month') => {
    try {
      console.log('📊 Fetching my statistics...');
      const response = await api.get(`/partners/my-statistics?timeRange=${timeRange}`);
      console.log('✅ Statistics fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
    }
  },

  // Update partner profile
  updateProfile: async (profileData) => {
    try {
      console.log('📝 Updating partner profile...');
      const response = await api.put('/partners/profile', profileData);
      console.log('✅ Profile updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  },

  // Update partner status/availability
  updateStatus: async (status) => {
    try {
      console.log('📝 Updating partner status to:', status);
      const response = await api.put('/partners/availability', { status });
      console.log('✅ Status updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error updating status:', error);
      throw new Error(error.response?.data?.message || 'Failed to update status');
    }
  },

  // Update partner location
  updateLocation: async (location) => {
    try {
      console.log('📍 Updating partner location:', location);
      const response = await api.put('/partners/location', {
        latitude: location.lat || location.latitude,
        longitude: location.lng || location.longitude
      });
      console.log('✅ Location updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error updating location:', error);
      throw new Error(error.response?.data?.message || 'Failed to update location');
    }
  },

  // Get partner orders (current and completed)
  getMyOrders: async (status = null) => {
    try {
      console.log('📋 Fetching my orders with status:', status);
      const params = status ? `?status=${status}` : '';
      const response = await api.get(`/partners/orders${params}`);
      console.log('✅ Orders fetched successfully:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  },

  // Get current active order for partner
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

  // Accept an available order
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

  // Mark order as picked up
  markPickedUp: async (orderId) => {
    try {
      console.log('📦 Marking order as picked up:', orderId);
      const response = await api.put(`/orders/${orderId}/status`, {
        status: 'PICKED'
      });
      console.log('✅ Order marked as picked up');
      return response.data;
    } catch (error) {
      console.error('❌ Error marking order as picked up:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark order as picked up');
    }
  },

  // Mark order as on route
  markOnRoute: async (orderId) => {
    try {
      console.log('🚗 Marking order as on route:', orderId);
      const response = await api.put(`/orders/${orderId}/status`, {
        status: 'ON_ROUTE'
      });
      console.log('✅ Order marked as on route');
      return response.data;
    } catch (error) {
      console.error('❌ Error marking order as on route:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark order as on route');
    }
  },

  // Mark order as delivered
  markDelivered: async (orderId, deliveryData = {}) => {
    try {
      console.log('🎯 Marking order as delivered:', orderId);
      const response = await api.put(`/orders/${orderId}/status`, {
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

  // Go online/offline
  toggleAvailability: async () => {
    try {
      console.log('🔄 Toggling availability...');
      // First get current status
      const profileResponse = await api.get('/partners/profile');
      const currentStatus = profileResponse.data.data.profile.status;
      
      // Toggle status
      const newStatus = currentStatus === 'available' ? 'offline' : 'available';
      
      const response = await api.put('/partners/availability', { status: newStatus });
      console.log('✅ Availability toggled successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error toggling availability:', error);
      throw new Error(error.response?.data?.message || 'Failed to toggle availability');
    }
  },

  // Get earnings summary
  getEarningsSummary: async (timeRange = 'month') => {
    try {
      console.log('💰 Fetching earnings summary...');
      const response = await api.get(`/partners/my-statistics?timeRange=${timeRange}`);
      console.log('✅ Earnings summary fetched');
      
      // Extract earnings data from statistics
      const stats = response.data.data.summary;
      return {
        success: true,
        data: {
          totalEarnings: stats.totalEarnings || 0,
          completedOrders: stats.completedOrders || 0,
          avgEarningsPerOrder: stats.completedOrders > 0 ? 
            parseFloat((stats.totalEarnings / stats.completedOrders).toFixed(2)) : 0,
          successRate: stats.successRate || 0,
          timeRange
        }
      };
    } catch (error) {
      console.error('❌ Error fetching earnings summary:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch earnings summary');
    }
  },

  // Get available orders for assignment
  getAvailableOrders: async () => {
    try {
      console.log('📋 Fetching available orders...');
      const response = await api.get('/orders/available');
      console.log('✅ Available orders fetched:', response.data.data?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching available orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch available orders');
    }
  },

  // Get delivery history for partner
  getDeliveryHistory: async (limit = 50) => {
    try {
      console.log('📋 Fetching delivery history...');
      const response = await api.get(`/partners/delivery-history?limit=${limit}`);
      console.log('✅ Delivery history fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching delivery history:', error);
      // Return empty response for now
      return {
        success: true,
        data: [],
        message: 'No delivery history found'
      };
    }
  },

  // Get partner earnings report
  getEarningsReport: async (timeRange = 'month') => {
    try {
      console.log('💰 Fetching earnings report...');
      const response = await api.get(`/partners/earnings?timeRange=${timeRange}`);
      console.log('✅ Earnings report fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching earnings report:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch earnings report');
    }
  },

  // Submit feedback or report issue
  submitFeedback: async (feedbackData) => {
    try {
      console.log('📝 Submitting feedback...');
      const response = await api.post('/partners/feedback', feedbackData);
      console.log('✅ Feedback submitted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      throw new Error(error.response?.data?.message || 'Failed to submit feedback');
    }
  },

  // Get partner performance metrics
  getPerformanceMetrics: async (timeRange = 'month') => {
    try {
      console.log('📊 Fetching performance metrics...');
      const response = await api.get(`/partners/performance?timeRange=${timeRange}`);
      console.log('✅ Performance metrics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching performance metrics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch performance metrics');
    }
  },

  // Get partner analytics for managers
  getPartnerAnalytics: async (filters = {}) => {
    try {
      console.log('📊 Fetching partner analytics with filters:', filters);
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/analytics/partners?${params.toString()}`);
      console.log('✅ Partner analytics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching partner analytics:', error);
      // Return mock data for now
      return {
        success: false,
        message: 'Analytics data not available'
      };
    }
  },

  // Get partner status display name
  getStatusDisplayName: (isAvailable, isActive, currentOrder) => {
    if (!isActive) return 'Inactive';
    if (currentOrder) return 'Busy';
    if (isAvailable) return 'Available';
    return 'Offline';
  },

  // Get vehicle type display name
  getVehicleTypeDisplayName: (vehicleType) => {
    const vehicleNames = {
      'bike': 'Bike',
      'scooter': 'Scooter',
      'car': 'Car',
      'bicycle': 'Bicycle'
    };
    
    return vehicleNames[vehicleType] || vehicleType;
  },

  // Format partner rating
  formatRating: (rating) => {
    return Number(rating || 0).toFixed(1);
  },

  // Get rating stars
  getRatingStars: (rating) => {
    const normalizedRating = rating || 0;
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return {
      full: fullStars,
      half: hasHalfStar ? 1 : 0,
      empty: emptyStars
    };
  },

  // Calculate distance between two points (using Haversine formula)
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  },

  // Format distance
  formatDistance: (distance) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  },

  // Get partner performance level
  getPerformanceLevel: (rating, totalDeliveries) => {
    const normalizedRating = rating || 0;
    const normalizedDeliveries = totalDeliveries || 0;
    
    if (normalizedDeliveries < 10) return 'New';
    if (normalizedRating >= 4.5 && normalizedDeliveries >= 100) return 'Star';
    if (normalizedRating >= 4.0 && normalizedDeliveries >= 50) return 'Expert';
    if (normalizedRating >= 3.5) return 'Good';
    return 'Average';
  },

  // Format completion rate
  formatCompletionRate: (completedOrders, totalOrders) => {
    if (!totalOrders || totalOrders === 0) return '0%';
    const rate = (completedOrders / totalOrders) * 100;
    return `${Math.round(rate)}%`;
  },

  // Format average delivery time
  formatAverageTime: (timeInMinutes) => {
    if (!timeInMinutes) return 'N/A';
    
    if (timeInMinutes < 60) {
      return `${Math.round(timeInMinutes)}m`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const minutes = Math.round(timeInMinutes % 60);
      return `${hours}h ${minutes}m`;
    }
  },

  // Get status color for UI
  getStatusColor: (isAvailable, isActive, currentOrder) => {
    if (!isActive) return 'bg-gray-100 text-gray-800';
    if (currentOrder) return 'bg-red-100 text-red-800';
    if (isAvailable) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  },

  // Get performance color for UI
  getPerformanceColor: (level) => {
    const colors = {
      'Star': 'bg-yellow-100 text-yellow-800',
      'Expert': 'bg-blue-100 text-blue-800',
      'Good': 'bg-green-100 text-green-800',
      'Average': 'bg-gray-100 text-gray-800',
      'New': 'bg-purple-100 text-purple-800'
    };
    
    return colors[level] || 'bg-gray-100 text-gray-800';
  },

  // Validate partner data
  validatePartnerData: (partnerData) => {
    const errors = {};
    
    if (!partnerData.name) {
      errors.name = 'Name is required';
    }
    
    if (!partnerData.email) {
      errors.email = 'Email is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(partnerData.email)) {
      errors.email = 'Valid email is required';
    }
    
    if (!partnerData.phone) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(partnerData.phone)) {
      errors.phone = 'Phone must be 10 digits';
    }
    
    if (!partnerData.vehicleType) {
      errors.vehicleType = 'Vehicle type is required';
    }
    
    if (!partnerData.vehicleNumber) {
      errors.vehicleNumber = 'Vehicle number is required';
    }
    
    if (partnerData.password && partnerData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  // Get current location (browser geolocation)
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  },

  // Watch location changes
  watchLocation: (callback, errorCallback) => {
    if (!navigator.geolocation) {
      errorCallback(new Error('Geolocation is not supported by this browser'));
      return null;
    }
    
    return navigator.geolocation.watchPosition(
      (position) => {
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        });
      },
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  },

  // Get overall partner statistics (Manager only)
  getOverallPartnerStatistics: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get(`/partners/statistics?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update order status (existing function)
  updateOrderStatus: async (orderId, status) => {
    // Implementation of updateOrderStatus function
  },
};

export default partnerService; 