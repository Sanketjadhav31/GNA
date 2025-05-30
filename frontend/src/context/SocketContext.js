import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const { isAuthenticated, user, token } = useAuth();

  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 2000;

  const initializeSocket = useCallback(() => {
    // Check if user is properly authenticated with all required data
    if (!isAuthenticated || !user || !token) {
      console.log('🔍 User authentication status:', {
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        userName: user?.name,
        userRole: user?.role
      });
      return null;
    }

    // Ensure user has required properties
    if (!user._id && !user.id) {
      console.log('⚠️ User missing ID, waiting for complete user data:', user);
      return null;
    }

    const userId = user._id || user.id;
    const userRole = user.role;
    
    console.log('🚀 Initializing socket connection for user:', {
      name: user.name,
      role: userRole,
      id: userId,
      email: user.email
    });
    
    // Simplified socket connection configuration
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling'], // Try websocket first
      withCredentials: true,
      timeout: 10000,
      autoConnect: true,
      auth: {
        token: token
      }
    });

    return newSocket;
  }, [isAuthenticated, user, token]);

  useEffect(() => {
    // Reset retry count when authentication state changes
    setRetryCount(0);
    
    const newSocket = initializeSocket();
    if (!newSocket) {
      console.log('⏸️ Skipping socket initialization - user not ready');
      return;
    }

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      setRetryCount(0); // Reset retry count on successful connection
      
      const userId = user._id || user.id;
      const userRole = user.role;
      
      // Join role-based room
      newSocket.emit('join_room', {
        role: userRole,
        userId: userId,
        userName: user.name
      });

      toast.success('🔥 Connected to real-time updates', {
        duration: 2000,
        position: 'bottom-right'
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
      
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        console.log('🔄 Attempting to reconnect...');
        // Don't show error toast for normal disconnections
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      setConnected(false);
      
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setRetryCount(prev => prev + 1);
        console.log(`🔄 Retrying connection (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
        
        setTimeout(() => {
          newSocket.connect();
        }, RETRY_DELAY * (retryCount + 1));
      } else {
        toast.error('⚠️ Connection failed. Some features may not work properly.', {
          duration: 5000,
          position: 'bottom-right'
        });
      }
    });

    // Order event handlers with better error handling
    newSocket.on('order_created', (data) => {
      try {
        const orderId = data.order?.orderId || data.orderId || 'Unknown';
        toast.success(`🆕 New order created: ${orderId}`, {
          duration: 4000,
          position: 'top-right'
        });
      } catch (error) {
        console.error('Error handling order_created event:', error);
      }
    });

    newSocket.on('order_updated', (data) => {
      try {
        const orderId = data.order?.orderId || data.orderId || 'Unknown';
        toast.success(`📝 Order ${orderId} updated`, {
          duration: 3000,
          position: 'top-right'
        });
      } catch (error) {
        console.error('Error handling order_updated event:', error);
      }
    });

    newSocket.on('order_status_changed', (data) => {
      try {
        const statusMessages = {
          PREP: '👨‍🍳 Order is being prepared',
          PICKED: '🛵 Order has been picked up',
          ON_ROUTE: '🚚 Order is on the way',
          DELIVERED: '✅ Order has been delivered'
        };
        
        const orderId = data.order?.orderId || data.orderId || 'Unknown';
        const status = data.order?.status || data.status;
        const message = statusMessages[status] || `Status updated to ${status}`;
        
        toast.success(`${orderId}: ${message}`, {
          duration: 4000,
          position: 'top-right'
        });
      } catch (error) {
        console.error('Error handling order_status_changed event:', error);
      }
    });

    newSocket.on('order_assigned', (data) => {
      try {
        const orderId = data.order?.orderId || data.orderId || 'Unknown';
        toast.success(`🎯 New order assigned: ${orderId}`, {
          duration: 5000,
          position: 'top-center'
        });
      } catch (error) {
        console.error('Error handling order_assigned event:', error);
      }
    });

    newSocket.on('partner_assigned', (data) => {
      try {
        const partnerName = data.partner?.name || data.partnerName || 'Unknown';
        const orderId = data.order?.orderId || data.orderId || 'Unknown';
        toast.success(`👤 Partner ${partnerName} assigned to order ${orderId}`, {
          duration: 4000,
          position: 'top-right'
        });
      } catch (error) {
        console.error('Error handling partner_assigned event:', error);
      }
    });

    // Partner event handlers
    newSocket.on('partner_status_changed', (data) => {
      try {
        const partnerName = data.partner?.name || data.partnerName || 'Partner';
        toast.success(`📍 ${partnerName} status updated`, {
          duration: 3000,
          position: 'top-right'
        });
      } catch (error) {
        console.error('Error handling partner_status_changed event:', error);
      }
    });

    newSocket.on('partner_location_changed', (data) => {
      try {
        // Handle partner location updates (for real-time tracking)
        console.log('📍 Partner location updated:', data);
      } catch (error) {
        console.error('Error handling partner_location_changed event:', error);
      }
    });

    newSocket.on('new_order_notification', (data) => {
      try {
        if (user.role === 'partner') {
          const orderId = data.order?.orderId || data.orderId || 'Unknown';
          toast.success(`🔔 New order available: ${orderId}`, {
            duration: 6000,
            position: 'top-center'
          });
        }
      } catch (error) {
        console.error('Error handling new_order_notification event:', error);
      }
    });

    newSocket.on('delivery_update', (data) => {
      try {
        toast.success(`🚚 Delivery update: ${data.message}`, {
          duration: 4000,
          position: 'top-right'
        });
      } catch (error) {
        console.error('Error handling delivery_update event:', error);
      }
    });

    // Listen for specific events
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      setRetryCount(0);
      
      // Join role-based room
      if (user?.role) {
        newSocket.emit('join_room', { 
          role: user.role, 
          userId: user._id || user.id 
        });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.log('❌ Socket connection error:', error);
      setConnected(false);
      
      // Retry logic
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        retryCount++;
        console.log(`🔄 Retrying connection (${retryCount}/${MAX_RETRY_ATTEMPTS})...`);
        setTimeout(() => {
          newSocket.connect();
        }, RETRY_DELAY * retryCount);
      }
    });

    // Partner-specific events
    if (user?.role === 'partner') {
      // New order available for pickup
      newSocket.on('new_order_available', (data) => {
        console.log('🆕 New order available:', data);
        // Show notification
        if (window.showNotification) {
          window.showNotification({
            title: `New Order Available - ${data.orderNumber}`,
            message: `${data.customerName} - ₹${data.totalAmount}`,
            type: 'info'
          });
        }
        // Trigger refresh of available orders
        if (window.refreshAvailableOrders) {
          window.refreshAvailableOrders();
        }
      });

      // Order was taken by another partner
      newSocket.on('order_taken', (data) => {
        console.log('📦 Order taken by another partner:', data);
        // Remove from available orders list
        if (window.removeFromAvailableOrders) {
          window.removeFromAvailableOrders(data.orderId);
        }
      });
    }

    // Manager-specific events
    if (user?.role === 'manager') {
      // Order was assigned to a partner
      newSocket.on('order_assigned', (data) => {
        console.log('✅ Order assigned:', data);
        if (window.showNotification) {
          window.showNotification({
            title: 'Order Assigned',
            message: `Order ${data.orderNumber} assigned to ${data.partnerName}`,
            type: 'success'
          });
        }
        // Refresh orders list
        if (window.refreshOrders) {
          window.refreshOrders();
        }
      });

      // New order created
      newSocket.on('order_created', (data) => {
        console.log('🆕 New order created:', data);
        if (window.refreshOrders) {
          window.refreshOrders();
        }
      });
    }

    // Universal events for all users
    newSocket.on('partner_status_changed', (data) => {
      console.log('👤 Partner status changed:', data);
      // Update partner status in any partner lists
      if (window.updatePartnerStatus) {
        window.updatePartnerStatus(data.partnerId, data.status, data.currentOrder);
      }
    });

    newSocket.on('order_status_changed', (data) => {
      console.log('📋 Order status changed:', data);
      // Update order status in any order lists
      if (window.updateOrderStatus) {
        window.updateOrderStatus(data.orderId, data.status, data.updatedBy);
      }
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.close();
      }
      setSocket(null);
      setConnected(false);
    };
  }, [isAuthenticated, user, token, retryCount, initializeSocket]);
  // Socket event emitters with error handling
  const emitOrderStatusUpdate = useCallback((orderData) => {
    if (socket && socket.connected) {
      try {
        socket.emit('order_status_update', orderData);
        console.log('📤 Emitted order status update:', orderData);
      } catch (error) {
        console.error('Error emitting order status update:', error);
      }
    } else {
      console.warn('Cannot emit order status update - socket not connected');
    }
  }, [socket]);

  const emitPartnerLocationUpdate = useCallback((locationData) => {
    if (socket && socket.connected) {
      try {
        socket.emit('partner_location_update', locationData);
        console.log('📤 Emitted partner location update:', locationData);
      } catch (error) {
        console.error('Error emitting partner location update:', error);
      }
    } else {
      console.warn('Cannot emit partner location update - socket not connected');
    }
  }, [socket]);

  const emitOrderCreated = useCallback((orderData) => {
    if (socket && socket.connected) {
      try {
        socket.emit('order_created', orderData);
        console.log('📤 Emitted order created:', orderData);
      } catch (error) {
        console.error('Error emitting order created:', error);
      }
    } else {
      console.warn('Cannot emit order created - socket not connected');
    }
  }, [socket]);

  const emitPartnerAssigned = useCallback((assignmentData) => {
    if (socket && socket.connected) {
      try {
        socket.emit('partner_assigned', assignmentData);
        console.log('📤 Emitted partner assigned:', assignmentData);
      } catch (error) {
        console.error('Error emitting partner assigned:', error);
      }
    } else {
      console.warn('Cannot emit partner assigned - socket not connected');
    }
  }, [socket]);

  const joinRoom = useCallback((roomName) => {
    if (socket && socket.connected) {
      try {
        socket.emit('join_room', roomName);
        console.log('📤 Joined room:', roomName);
      } catch (error) {
        console.error('Error joining room:', error);
      }
    }
  }, [socket]);

  const leaveRoom = useCallback((roomName) => {
    if (socket && socket.connected) {
      try {
        socket.emit('leave_room', roomName);
        console.log('📤 Left room:', roomName);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
  }, [socket]);

  const value = {
    socket,
    connected,
    onlineUsers,
    retryCount,
    emitOrderStatusUpdate,
    emitPartnerLocationUpdate,
    emitOrderCreated,
    emitPartnerAssigned,
    joinRoom,
    leaveRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 
