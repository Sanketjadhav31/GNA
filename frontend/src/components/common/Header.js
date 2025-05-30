import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  XMarkIcon,
  ComputerDesktopIcon,
  ShoppingBagIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { fadeInDown, slideInRight, fadeInUp } from '../../utils/animations';

const Header = ({ 
  searchPlaceholder = "Search orders, customers, partners...", 
  showSearch = true,
  onSearchChange 
}) => {
  const { user, logout } = useAuth();
  const { isDarkMode, isSystemPreference, toggleTheme, setTheme, useSystemPreference } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const themeMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target)) {
        setShowThemeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_created':
      case 'order_updated':
      case 'order_assigned':
        return ShoppingBagIcon;
      case 'partner_assigned':
      case 'partner_status_changed':
        return TruckIcon;
      case 'order_status_changed':
        return ClockIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffInMinutes / (24 * 60));
    return `${days}d ago`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95,
      transition: { duration: 0.15, ease: "easeIn" }
    }
  };

  return (
    <motion.header 
      className={cn(
        "sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-200",
        isDarkMode 
          ? "bg-slate-900/95 border-slate-700" 
          : "bg-white/95 border-gray-200"
      )}
      variants={fadeInDown}
      initial="initial"
      animate="animate"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Search Bar */}
          {showSearch && (
            <motion.div 
              className="flex-1 max-w-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className={cn(
                    "h-5 w-5 transition-colors",
                    searchFocused || searchTerm 
                      ? "text-red-500" 
                      : isDarkMode ? "text-gray-400" : "text-gray-400"
                  )} />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className={cn(
                    "block w-full pl-10 pr-4 py-2.5 text-sm transition-all duration-200",
                    "border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500",
                    "placeholder-gray-400",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-600 text-white focus:bg-slate-700" 
                      : "bg-white border-gray-300 text-gray-900 focus:bg-gray-50",
                    searchFocused && "ring-2 ring-red-500 ring-opacity-50"
                  )}
                  placeholder={searchPlaceholder}
                />
                {searchTerm && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => handleSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className={cn(
                      "h-4 w-4 transition-colors",
                      isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-600"
                    )} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* Right Side Controls */}
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            
            {/* Theme Toggle */}
            <div className="relative" ref={themeMenuRef}>
              <motion.button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-200",
                  isDarkMode 
                    ? "text-gray-400 hover:text-white hover:bg-slate-800" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {isDarkMode ? (
                    <motion.div
                      key="sun"
                      initial={{ opacity: 0, rotate: -180 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SunIcon className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ opacity: 0, rotate: -180 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 180 }}
                      transition={{ duration: 0.2 }}
                    >
                      <MoonIcon className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Theme Menu Dropdown */}
              <AnimatePresence>
                {showThemeMenu && (
                  <motion.div
                    className={cn(
                      "absolute right-0 mt-2 w-48 rounded-xl shadow-xl ring-1 z-50 overflow-hidden",
                      isDarkMode 
                        ? "bg-slate-800 ring-slate-700" 
                        : "bg-white ring-black/5"
                    )}
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className={cn(
                      "p-2 border-b",
                      isDarkMode ? "border-slate-700" : "border-gray-100"
                    )}>
                      <p className={cn(
                        "text-xs font-medium px-2 py-1",
                        isDarkMode ? "text-gray-300" : "text-gray-500"
                      )}>
                        Theme Settings
                      </p>
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => {
                          setTheme('light');
                          setShowThemeMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                          !isDarkMode && !isSystemPreference
                            ? "bg-red-50 text-red-700"
                            : isDarkMode 
                              ? "text-gray-300 hover:bg-slate-700 hover:text-white" 
                              : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <SunIcon className="h-4 w-4" />
                        <span>Light Mode</span>
                        {!isDarkMode && !isSystemPreference && (
                          <CheckCircleIcon className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          setTheme('dark');
                          setShowThemeMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                          isDarkMode && !isSystemPreference
                            ? "bg-red-50 text-red-700"
                            : isDarkMode 
                              ? "text-gray-300 hover:bg-slate-700 hover:text-white" 
                              : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <MoonIcon className="h-4 w-4" />
                        <span>Dark Mode</span>
                        {isDarkMode && !isSystemPreference && (
                          <CheckCircleIcon className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          useSystemPreference();
                          setShowThemeMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                          isSystemPreference
                            ? "bg-red-50 text-red-700"
                            : isDarkMode 
                              ? "text-gray-300 hover:bg-slate-700 hover:text-white" 
                              : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <ComputerDesktopIcon className="h-4 w-4" />
                        <span>System</span>
                        {isSystemPreference && (
                          <CheckCircleIcon className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <motion.button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative p-2.5 rounded-xl transition-all duration-200",
                  isDarkMode 
                    ? "text-gray-400 hover:text-white hover:bg-slate-800" 
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BellIcon className="h-6 w-6" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </motion.span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    className={cn(
                      "absolute right-0 mt-2 w-96 rounded-xl shadow-xl ring-1 z-50 overflow-hidden max-h-96",
                      isDarkMode 
                        ? "bg-slate-800 ring-slate-700" 
                        : "bg-white ring-black/5"
                    )}
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className={cn(
                      "p-4 border-b",
                      isDarkMode 
                        ? "border-slate-700 bg-gradient-to-r from-red-900/20 to-orange-900/20" 
                        : "border-gray-100 bg-gradient-to-r from-red-50 to-orange-50"
                    )}>
                      <div className="flex items-center justify-between">
                        <h3 className={cn(
                          "text-sm font-semibold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          Notifications
                        </h3>
                        <div className="flex items-center space-x-2">
                          {unreadCount > 0 && (
                            <motion.span
                              className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-medium"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              {unreadCount} new
                            </motion.span>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className={cn(
                                "text-xs px-2 py-1 rounded-full transition-colors",
                                isDarkMode 
                                  ? "text-gray-300 hover:bg-slate-700 hover:text-white" 
                                  : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                              )}
                            >
                              Mark all read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <motion.div
                          className="p-8 text-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <BellIcon className={cn(
                            "h-8 w-8 mx-auto mb-2",
                            isDarkMode ? "text-gray-600" : "text-gray-300"
                          )} />
                          <p className={cn(
                            "text-sm",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>
                            No notifications
                          </p>
                        </motion.div>
                      ) : (
                        notifications.slice(0, 10).map((notification, index) => {
                          const IconComponent = getNotificationIcon(notification.type);
                          return (
                            <motion.div
                              key={notification.id}
                              className={cn(
                                "p-4 border-b transition-colors cursor-pointer group",
                                !notification.read && (isDarkMode ? "bg-blue-950/20" : "bg-blue-50/50"),
                                isDarkMode 
                                  ? "border-slate-700 hover:bg-slate-700" 
                                  : "border-gray-50 hover:bg-gray-50"
                              )}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ x: 4 }}
                              onClick={() => {
                                if (!notification.read) {
                                  markAsRead(notification.id);
                                }
                              }}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={cn(
                                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                                  getPriorityColor(notification.priority)
                                )}>
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className={cn(
                                      "text-sm font-medium truncate",
                                      isDarkMode ? "text-white" : "text-gray-900"
                                    )}>
                                      {notification.title}
                                    </h4>
                                    <div className="flex items-center space-x-2">
                                      <span className={cn(
                                        "text-xs",
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        {getNotificationTime(notification.timestamp)}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeNotification(notification.id);
                                        }}
                                        className={cn(
                                          "opacity-0 group-hover:opacity-100 p-1 rounded transition-all",
                                          isDarkMode 
                                            ? "text-gray-400 hover:text-red-400 hover:bg-slate-600" 
                                            : "text-gray-400 hover:text-red-500 hover:bg-gray-200"
                                        )}
                                      >
                                        <TrashIcon className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className={cn(
                                    "text-sm",
                                    isDarkMode ? "text-gray-300" : "text-gray-600"
                                  )}>
                                    {notification.message}
                                  </p>
                                  {!notification.read && (
                                    <motion.div
                                      className="w-2 h-2 bg-blue-500 rounded-full mt-2"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                    
                    {notifications.length > 0 && (
                      <motion.div 
                        className={cn(
                          "p-3 border-t",
                          isDarkMode 
                            ? "border-slate-700 bg-slate-800" 
                            : "border-gray-100 bg-gray-50"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <motion.button
                          className={cn(
                            "text-sm font-medium w-full text-center py-1 rounded-lg transition-colors",
                            isDarkMode 
                              ? "text-red-400 hover:text-red-300 hover:bg-slate-700" 
                              : "text-red-600 hover:text-red-700 hover:bg-red-50"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => navigate('/notifications')}
                        >
                          View all notifications
                        </motion.button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={cn(
                  "flex items-center space-x-3 p-2 rounded-xl transition-all duration-200",
                  isDarkMode 
                    ? "text-gray-300 hover:text-white hover:bg-slate-800" 
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                      {user?.name || 'User'}
                    </div>
                    <div className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      {user?.role === 'partner' ? 'Delivery Partner' : 'Restaurant Manager'}
                    </div>
                  </div>
                  <ChevronDownIcon className={cn(
                    "h-4 w-4 transition-transform",
                    showUserMenu && "rotate-180",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )} />
                </div>
              </motion.button>

              {/* User Menu Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    className={cn(
                      "absolute right-0 mt-2 w-56 rounded-xl shadow-xl ring-1 z-50 overflow-hidden",
                      isDarkMode 
                        ? "bg-slate-800 ring-slate-700" 
                        : "bg-white ring-black/5"
                    )}
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className={cn(
                      "p-4 border-b",
                      isDarkMode ? "border-slate-700" : "border-gray-100"
                    )}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className={cn(
                            "font-medium",
                            isDarkMode ? "text-white" : "text-gray-900"
                          )}>
                            {user?.name || 'User'}
                          </div>
                          <div className={cn(
                            "text-sm",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => {
                          navigate('/settings');
                          setShowUserMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                          isDarkMode 
                            ? "text-gray-300 hover:bg-slate-700 hover:text-white" 
                            : "text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        <Cog6ToothIcon className="h-5 w-5" />
                        <span>Settings</span>
                      </button>
                      
                      <button
                        onClick={handleLogout}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                          isDarkMode 
                            ? "text-red-400 hover:bg-red-900/20 hover:text-red-300" 
                            : "text-red-600 hover:bg-red-50 hover:text-red-700"
                        )}
                      >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header; 