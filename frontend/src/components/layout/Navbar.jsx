import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const { success } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Refs for dropdown elements
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch notifications on component mount and set up polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchNotifications = async () => {
    try {
      if (!user) return;
      
      // Simulate real-time notifications based on recent activities
      const [ordersResponse, partnersResponse] = await Promise.all([
        axios.get('/api/orders?limit=5&sortBy=orderPlacedAt&sortOrder=desc'),
        user?.role === 'restaurant_manager' ? axios.get('/api/auth/available-partners') : Promise.resolve({ data: { data: { partners: [] } } })
      ]);

      const recentOrders = ordersResponse.data.data.orders || [];
      const availablePartners = partnersResponse.data.data?.partners || [];
      
      const newNotifications = [];
      const now = new Date();
      
      // Generate notifications for recent orders
      recentOrders.forEach(order => {
        const orderTime = new Date(order.orderPlacedAt || order.createdAt);
        const timeDiff = (now - orderTime) / (1000 * 60); // minutes
        
        if (timeDiff < 60) { // Orders from last hour
          if (order.status === 'DELIVERED') {
            newNotifications.push({
              id: `delivered-${order._id}`,
              type: 'success',
              title: 'Order Delivered',
              message: `Order #${order._id.slice(-6).toUpperCase()} has been delivered to ${order.customerName}`,
              time: orderTime,
              icon: 'delivered'
            });
          } else if (order.status === 'PENDING') {
            newNotifications.push({
              id: `new-order-${order._id}`,
              type: 'info',
              title: 'New Order Received',
              message: `Order #${order._id.slice(-6).toUpperCase()} from ${order.customerName} - ₹${order.totalAmount}`,
              time: orderTime,
              icon: 'order'
            });
          } else if (order.status === 'READY') {
            newNotifications.push({
              id: `ready-${order._id}`,
              type: 'warning',
              title: 'Order Ready for Pickup',
              message: `Order #${order._id.slice(-6).toUpperCase()} is ready for delivery`,
              time: orderTime,
              icon: 'ready'
            });
          }
        }
      });

      // Generate notifications for partner status
      if (user?.role === 'restaurant_manager') {
        availablePartners.forEach(partner => {
          newNotifications.push({
            id: `partner-active-${partner._id}`,
            type: 'success',
            title: 'Delivery Partner Active',
            message: `${partner.firstName} ${partner.lastName} is now available for deliveries`,
            time: new Date(Date.now() - Math.random() * 1 * 60 * 1000), // Random time in last 30 mins
            icon: 'partner'
          });
        });
      }

      // Sort by time (newest first) and limit to 10
      const sortedNotifications = newNotifications
        .sort((a, b) => b.time - a.time)
        .slice(0, 10);

      setNotifications(sortedNotifications);
      setUnreadCount(sortedNotifications.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    success('Logged out successfully');
    navigate('/login');
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delivered':
        return '✅';
      case 'order':
        return '📦';
      case 'ready':
        return '🍽️';
      case 'partner':
        return '🛵';
      default:
        return '📢';
    }
  };

  const formatNotificationTime = (time) => {
    const now = new Date();
    const diff = (now - time) / (1000 * 60); // minutes
    
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${Math.floor(diff)}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-lg relative z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end h-16">
          {/* Right side - Notifications and User profile */}
          <div className="flex items-center space-x-4">
            
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markAsRead();
                }}
                className="relative p-2 text-gray-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
              >
                {/* Bell Icon - Proper Bell */}
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown - Solid White Background */}
              {showNotifications && (
                <div 
                  className="fixed top-16 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-300 z-[99999] max-h-96 overflow-hidden"
                  style={{ 
                    position: 'fixed',
                    top: '64px',
                    right: '16px',
                    zIndex: 99999
                  }}
                >
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-sm text-blue-600 font-medium">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto bg-white">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification.id} className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-start space-x-3">
                            <span className="text-xl">{getNotificationIcon(notification.icon)}</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <span className="text-xs text-gray-400 mt-2 block">
                                {formatNotificationTime(notification.time)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-white">
                        <p className="text-gray-500">No notifications yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-300 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/10"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                }}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
              >
                {/* User Avatar */}
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </span>
                </div>
                
                {/* User Info */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-white">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-gray-300">
                    {user?.role === 'restaurant_manager' ? 'Manager' : 'Partner'}
                  </p>
                </div>

                {/* Dropdown Arrow */}
                <svg className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu - Solid White Background */}
              {isProfileOpen && (
                <div 
                  className="fixed top-16 right-4 w-56 bg-white rounded-lg shadow-xl border border-gray-300 py-1 z-[99999]"
                  style={{ 
                    position: 'fixed',
                    top: '64px',
                    right: '16px',
                    zIndex: 99999
                  }}
                >
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {user ? `${user.firstName} ${user.lastName}` : 'User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1 bg-white">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile Settings
                    </Link>

                    {user?.role === 'delivery_partner' && (
                      <Link
                        to="/my-stats"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        My Statistics
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-gray-200 bg-white">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 