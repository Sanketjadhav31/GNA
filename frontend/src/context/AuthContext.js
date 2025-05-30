import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        role: action.payload.role || action.payload.user?.role,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        role: action.payload.role || action.payload.user?.role,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      return {
        ...initialState,
        isLoading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
        
        // Check if user data exists in localStorage
        const storedAuth = authService.getStoredUser();
        console.log('📱 Stored auth data:', storedAuth);
        
        if (storedAuth && storedAuth.token && storedAuth.user) {
          // Verify token with backend
          try {
            const verifyResponse = await authService.verifyToken();
            if (verifyResponse.success) {
              dispatch({
                type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
                payload: {
                  user: storedAuth.user,
                  token: storedAuth.token,
                  role: storedAuth.role || storedAuth.user.role
                }
              });
              console.log('✅ User loaded successfully:', storedAuth.user.name);
            } else {
              throw new Error('Token verification failed');
            }
          } catch (error) {
            console.log('❌ Token verification failed:', error.message);
            // Token is invalid, clear auth data
            authService.removeAuthData();
            dispatch({
              type: AUTH_ACTIONS.LOAD_USER_FAILURE,
              payload: null
            });
          }
        } else {
          console.log('ℹ️ No stored auth data found');
          dispatch({
            type: AUTH_ACTIONS.LOAD_USER_FAILURE,
            payload: null
          });
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
        dispatch({
          type: AUTH_ACTIONS.LOAD_USER_FAILURE,
          payload: error.message || 'Failed to load user'
        });
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      console.log('🔐 Attempting login for:', credentials.email);
      
      const response = await authService.login(credentials);
      console.log('📡 Login response:', response);
      
      if (response.success && response.data) {
        const { user, token, role } = response.data;
        
        // Ensure user has required properties
        const enrichedUser = {
          ...user,
          _id: user._id || user.id,
          role: role || user.role
        };
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { 
            user: enrichedUser, 
            token, 
            role: role || user.role 
          }
        });
        
        console.log('✅ Login successful for:', enrichedUser.name);
        return response;
      } else {
        throw new Error(response.message || 'Login failed - Invalid response');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      throw new Error(errorMessage);
    }
  };

  // Register function (unified)
  const register = async (userData) => {
    try {
      if (userData.role === 'manager') {
        return await registerManager(userData);
      } else if (userData.role === 'partner') {
        return await registerPartner(userData);
      } else {
        throw new Error('Invalid role specified');
      }
    } catch (error) {
      throw error;
    }
  };

  // Register Manager
  const registerManager = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      // Format the data according to backend expectations
      const formattedData = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        restaurantInfo: {
          name: userData.restaurantName || 'GNA Energy Kitchen',
          address: userData.address || 'Restaurant Address'
        }
      };
      
      const response = await authService.registerManager(formattedData);
      
      if (response.success) {
        const { user, token, role } = response.data;
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token, role }
        });
        
        toast.success(`Welcome, ${user.name}!`);
        return response;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Register Partner
  const registerPartner = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      const response = await authService.registerPartner(userData);
      
      if (response.success) {
        const { user, token, role } = response.data;
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token, role }
        });
        
        toast.success(`Welcome, ${user.name}!`);
        return response;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Clear partner current order and status if user is a partner
      if (state.user && state.role === 'partner') {
        // Remove current order assignment from global orders if any
        const globalOrders = JSON.parse(localStorage.getItem('global_orders') || '[]');
        const updatedGlobalOrders = globalOrders.map(order => {
          if (order.assignedPartner === (state.user._id || state.user.id)) {
            return {
              ...order,
              assignedPartner: null,
              partnerName: null,
              status: 'PREP' // Reset to PREP status for reassignment
            };
          }
          return order;
        });
        localStorage.setItem('global_orders', JSON.stringify(updatedGlobalOrders));
        
        console.log('🔄 Current order assignments cleared for partner:', state.user.name);
      }
      
      await authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    } catch (error) {
      // Still logout on client side even if API call fails
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  // Update user profile
  const updateUser = async (userData) => {
    try {
      const response = await authService.updateProfile(userData);
      
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: response.data
        });
        
        toast.success('Profile updated successfully');
        return response;
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update profile';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update partner status (for real-time updates)
  const updatePartnerStatus = (status, currentOrder = null) => {
    if (state.user && state.role === 'partner') {
      const updatedUser = {
        ...state.user,
        status,
        currentOrder
      };
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: updatedUser
      });
      
      // Also update localStorage to persist across refreshes
      const storedAuth = authService.getStoredUser();
      if (storedAuth) {
        const updatedAuth = {
          ...storedAuth,
          user: updatedUser
        };
        authService.setAuthData(updatedAuth.token, updatedUser, updatedAuth.role);
      }
      
      console.log('✅ Partner status updated:', { status, currentOrder });
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      const response = await authService.changePassword(passwordData);
      
      if (response.success) {
        toast.success('Password changed successfully');
        return response;
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to change password';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Check if user has required role
  const hasRole = (requiredRoles) => {
    if (!state.user || !state.isAuthenticated) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(state.role);
    }
    return state.role === requiredRoles;
  };

  // Check if user is manager
  const isManager = () => state.role === 'manager';

  // Check if user is partner
  const isPartner = () => state.role === 'partner';

  // Get user role
  const getUserRole = () => state.role;

  const value = {
    // State
    user: state.user,
    token: state.token,
    role: state.role,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    login,
    register,
    logout,
    updateUser,
    updatePartnerStatus,
    changePassword,
    clearError,
    
    // Utilities
    hasRole,
    isManager,
    isPartner,
    getUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 