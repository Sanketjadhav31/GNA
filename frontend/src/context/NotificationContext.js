import React, { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification types
export const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_ASSIGNED: 'order_assigned',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  PARTNER_ASSIGNED: 'partner_assigned',
  PARTNER_STATUS_CHANGED: 'partner_status_changed',
  PARTNER_LOCATION_UPDATED: 'partner_location_updated',
  SYSTEM: 'system',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info'
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState({
    sound: true,
    soundAlerts: true,
    desktop: true,
    email: true,
    emailNotifications: true,
    sms: false,
    smsNotifications: false,
    push: true,
    pushNotifications: true,
    newOrders: true,
    orderUpdates: true,
    partnerUpdates: true,
    orderAssignments: true,
    systemAlerts: true
  });

  // Add notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      category: 'general',
      autoClose: true,
      duration: 5000,
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev.slice(0, 99)]; // Keep only latest 100
      return updated;
    });

    setUnreadCount(prev => prev + 1);

    // Show toast notification
    showToastNotification(newNotification);

    return newNotification;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );

    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Remove notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      const updated = prev.filter(n => n.id !== notificationId);
      
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      
      return updated;
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Show toast notification
  const showToastNotification = (notification) => {
    const toastOptions = {
      duration: notification.duration || 4000,
      position: 'top-right',
    };

    switch (notification.type) {
      case NOTIFICATION_TYPES.ORDER_CREATED:
        toast.success(`🆕 ${notification.title}`, toastOptions);
        break;
      case NOTIFICATION_TYPES.ORDER_ASSIGNED:
        toast.success(`🎯 ${notification.title}`, toastOptions);
        break;
      case NOTIFICATION_TYPES.ORDER_STATUS_CHANGED:
        toast.success(`📝 ${notification.title}`, toastOptions);
        break;
      case NOTIFICATION_TYPES.PARTNER_ASSIGNED:
        toast.success(`👤 ${notification.title}`, toastOptions);
        break;
      case NOTIFICATION_TYPES.ERROR:
        toast.error(`❌ ${notification.title}`, toastOptions);
        break;
      case NOTIFICATION_TYPES.WARNING:
        toast.error(`⚠️ ${notification.title}`, toastOptions);
        break;
      case NOTIFICATION_TYPES.SUCCESS:
        toast.success(`✅ ${notification.title}`, toastOptions);
        break;
      default:
        toast(`📢 ${notification.title}`, toastOptions);
    }
  };

  const value = {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateSettings,
    NOTIFICATION_TYPES,
    NOTIFICATION_PRIORITIES
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 