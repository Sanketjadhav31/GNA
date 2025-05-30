import axios from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`, config.data ? { data: config.data } : '');
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`, response.data);
    return response;
  },
  (error) => {
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status}`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Handle unauthorized errors
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized access - clearing auth data');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your connection and try again.';
    }
    
    return Promise.reject(error);
  }
);

// Auth service object
export const authService = {
  // Set auth token and user data
  setAuthData: (token, user, role) => {
    console.log('💾 Setting auth data:', { 
      hasToken: !!token, 
      userName: user?.name, 
      userRole: role || user?.role,
      userId: user?._id || user?.id
    });
    
    if (token && user) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', role || user.role);
    } else {
      console.warn('⚠️ Incomplete auth data provided');
      authService.removeAuthData();
    }
  },

  // Remove auth data
  removeAuthData: () => {
    console.log('🗑️ Removing auth data');
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
  },

  // Get stored user data
  getStoredUser: () => {
    try {
      const user = localStorage.getItem('user');
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('token');
      
      if (!user || !token) {
        return null;
      }
      
      const parsedUser = JSON.parse(user);
      const result = { 
        user: parsedUser, 
        role: role || parsedUser.role, 
        token 
      };
      
      console.log('💽 Retrieved stored user:', { 
        hasUser: !!result.user, 
        userName: result.user?.name,
        userRole: result.role,
        hasToken: !!result.token
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error parsing stored user data:', error);
      authService.removeAuthData(); // Clear corrupted data
      return null;
    }
  },

  // Login user (Manager or Partner)
  login: async (credentials) => {
    try {
      console.log('🔐 Attempting login...');
      const response = await api.post('/auth/login', {
        email: credentials.email?.trim(),
        password: credentials.password
      });
      
      console.log('📨 Login response received:', response.data);
      
      // Validate response structure
      if (!response.data.success) {
        throw new Error(response.data.message || 'Login failed - Invalid credentials');
      }
      
      if (!response.data.data || !response.data.data.token || !response.data.data.user) {
        throw new Error('Login failed - Invalid response format');
      }
      
      // Set auth data for future requests
      const { token, user, role } = response.data.data;
      authService.setAuthData(token, user, role);
      
      console.log('✅ Login successful for:', user.name);
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Login failed';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      enhancedError.status = error.response?.status;
      throw enhancedError;
    }
  },

  // Register Manager
  registerManager: async (userData) => {
    try {
      console.log('📝 Registering manager...');
      const response = await api.post('/auth/register/manager', userData);
      
      // Set auth data for future requests
      if (response.data.success && response.data.data.token) {
        const { token, user, role } = response.data.data;
        authService.setAuthData(token, user, role);
        console.log('✅ Manager registration successful for:', user.name);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Manager registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  },

  // Register Delivery Partner
  registerPartner: async (userData) => {
    try {
      console.log('📝 Registering partner...');
      const response = await api.post('/auth/register/partner', userData);
      
      // Set auth data for future requests
      if (response.data.success && response.data.data.token) {
        const { token, user, role } = response.data.data;
        authService.setAuthData(token, user, role);
        console.log('✅ Partner registration successful for:', user.name);
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Partner registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  },

  // Logout user
  logout: async () => {
    try {
      console.log('🚪 Logging out...');
      await api.post('/auth/logout');
      console.log('✅ Logout API call successful');
    } catch (error) {
      console.warn('⚠️ Logout API call failed (proceeding anyway):', error.message);
    } finally {
      authService.removeAuthData();
      console.log('✅ Local auth data cleared');
    }
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get profile';
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/auth/profile', userData);
      return response.data;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await api.put('/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('❌ Change password error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to change password';
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  },

  // Verify token
  verifyToken: async () => {
    try {
      console.log('🔍 Verifying token...');
      const response = await api.get('/auth/verify');
      console.log('✅ Token verification successful');
      return response.data;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Token verification failed';
      const enhancedError = new Error(errorMessage);
      enhancedError.response = error.response;
      throw enhancedError;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user role
  getUserRole: () => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    
    if (role) return role;
    
    try {
      const parsedUser = JSON.parse(user);
      return parsedUser?.role;
    } catch {
      return null;
    }
  }
};

// Export axios instance for other services
export default api; 