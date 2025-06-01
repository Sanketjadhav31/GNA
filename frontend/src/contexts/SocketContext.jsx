import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

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
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeOrders, setRealtimeOrders] = useState([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const { user, token } = useAuth();
  const { success, info, warning, error: showError } = useToast();

  useEffect(() => {
    if (user && token) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => disconnectSocket();
  }, [user, token]);

  const connectSocket = () => {
    if (socket?.connected) return;

    const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
      auth: {
        token: token
      },
      transports: ['websocket'],
      upgrade: true,
      rememberUpgrade: true
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      info('Connected to real-time updates');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      warning('Disconnected from real-time updates');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      showError('Failed to connect to real-time server');
    });

    // Order-related events
    newSocket.on('new_order_available', (data) => {
      console.log('New order available:', data);
      if (user?.role === 'delivery_partner') {
        info(`New order available from ${data.restaurantName} - ₹${data.totalAmount}`);
        addNotification({
          id: `new-order-${data.orderId}`,
          type: 'info',
          title: 'New Order Available',
          message: `Order from ${data.restaurantName} - ₹${data.totalAmount}`,
          timestamp: new Date(data.timestamp),
          orderId: data.orderId
        });
      }
    });

    newSocket.on('order_assigned', (data) => {
      console.log('Order assigned:', data);
      if (user?.role === 'delivery_partner') {
        success(data.message);
        addNotification({
          id: `assigned-${data.orderId}`,
          type: 'success',
          title: 'Order Assigned',
          message: data.message,
          timestamp: new Date(data.timestamp),
          orderId: data.orderId
        });
      }
    });

    newSocket.on('partner_assigned_success', (data) => {
      console.log('Partner assigned successfully:', data);
      if (user?.role === 'restaurant_manager') {
        success(`${data.partnerName} assigned to order`);
        addNotification({
          id: `partner-assigned-${data.orderId}`,
          type: 'success',
          title: 'Partner Assigned',
          message: `${data.partnerName} assigned to order #${data.orderId.toString().slice(-6).toUpperCase()}`,
          timestamp: new Date(data.timestamp),
          orderId: data.orderId
        });
      }
    });

    newSocket.on('order_status_updated', (data) => {
      console.log('🔄 Order status updated:', data);
      console.log('📝 Current user role:', user?.role);
      console.log('📦 Order ID:', data.orderId);
      console.log('🔄 Status change:', data.oldStatus, '→', data.newStatus);
      
      const statusMessages = {
        PREP: 'Order is being prepared',
        READY: 'Order is ready for pickup',
        PICKED: 'Order has been picked up',
        ON_ROUTE: 'Order is on the way',
        DELIVERED: 'Order has been delivered'
      };

      const message = statusMessages[data.newStatus] || `Order status changed to ${data.newStatus}`;
      info(message);
      
      addNotification({
        id: `status-${data.orderId}-${Date.now()}`,
        type: data.newStatus === 'DELIVERED' ? 'success' : 'info',
        title: 'Order Update',
        message: `Order #${data.orderId.toString().slice(-6).toUpperCase()} - ${message}`,
        timestamp: new Date(data.timestamp),
        orderId: data.orderId
      });

      // Update real-time orders
      setRealtimeOrders(prev => 
        prev.map(order => 
          order._id === data.orderId 
            ? { ...order, status: data.newStatus, ...data.orderDetails }
            : order
        )
      );
    });

    newSocket.on('order_completed', (data) => {
      console.log('Order completed:', data);
      if (user?.role === 'delivery_partner') {
        success(data.message);
        addNotification({
          id: `completed-${data.orderId}`,
          type: 'success',
          title: 'Order Completed',
          message: data.message,
          timestamp: new Date(data.timestamp),
          orderId: data.orderId
        });
      }
    });

    newSocket.on('partner_availability_updated', (data) => {
      console.log('Partner availability updated:', data);
      if (user?.role === 'restaurant_manager') {
        const message = data.isAvailable 
          ? `${data.partnerName} is now available`
          : `${data.partnerName} is now unavailable`;
        
        info(message);
        addNotification({
          id: `availability-${data.partnerId}-${Date.now()}`,
          type: data.isAvailable ? 'success' : 'warning',
          title: 'Partner Availability',
          message: `${message}${data.reason ? ` (${data.reason})` : ''}`,
          timestamp: new Date(data.timestamp),
          partnerId: data.partnerId
        });
      }
    });

    newSocket.on('order_created_success', (data) => {
      console.log('Order created successfully:', data);
      if (user?.role === 'restaurant_manager') {
        success('Order created successfully');
        addNotification({
          id: `created-${data.orderId}`,
          type: 'success',
          title: 'Order Created',
          message: `Order #${data.orderId.toString().slice(-6).toUpperCase()} created successfully`,
          timestamp: new Date(data.timestamp),
          orderId: data.orderId
        });
      }
    });

    newSocket.on('error', (data) => {
      console.error('Socket error:', data);
      showError(data.message || 'Real-time error occurred');
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const addNotification = (notification) => {
    setRealtimeNotifications(prev => {
      const updated = [notification, ...prev.slice(0, 49)]; // Keep last 50 notifications
      return updated;
    });
  };

  const clearNotifications = () => {
    setRealtimeNotifications([]);
  };

  const removeNotification = (notificationId) => {
    setRealtimeNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  // Socket event emitters
  const emitUpdateAvailability = (isAvailable) => {
    if (socket && isConnected) {
      socket.emit('update_availability', { isAvailable });
    }
  };

  const emitOrderStatusUpdate = (orderId, status, notes = '') => {
    if (socket && isConnected) {
      socket.emit('update_order_status', { orderId, status, notes });
    }
  };

  const emitPartnerAssigned = (orderId) => {
    if (socket && isConnected) {
      socket.emit('partner_assigned', { orderId });
    }
  };

  const emitNewOrderCreated = (orderId, restaurantName, totalAmount) => {
    if (socket && isConnected) {
      socket.emit('new_order_created', { orderId, restaurantName, totalAmount });
    }
  };

  const contextValue = {
    socket,
    isConnected,
    realtimeOrders,
    realtimeNotifications,
    
    // Actions
    connectSocket,
    disconnectSocket,
    clearNotifications,
    removeNotification,
    
    // Event emitters
    emitUpdateAvailability,
    emitOrderStatusUpdate,
    emitPartnerAssigned,
    emitNewOrderCreated,
    
    // Utilities
    addNotification
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}; 