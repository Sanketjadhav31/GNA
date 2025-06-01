import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  TruckIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
  DocumentTextIcon,
  CogIcon,
  MapPinIcon,
  PhoneIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import orderService from '../../services/orderService';

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [currentOrderDetails, setCurrentOrderDetails] = useState(null);

  // Load current order details for partners
  useEffect(() => {
    if (user?.role === 'partner' && user?.currentOrder) {
      // Load order details from backend API only
      const loadCurrentOrder = async () => {
        try {
          const response = await orderService.getCurrentOrder();
          if (response.success && response.data) {
            setCurrentOrderDetails(response.data);
          } else {
            setCurrentOrderDetails(null);
          }
        } catch (error) {
          console.error('Error loading current order:', error);
          setCurrentOrderDetails(null);
        }
      };
      
      loadCurrentOrder();
    } else {
      setCurrentOrderDetails(null);
    }
  }, [user]);

  // Listen for real-time order updates
  useEffect(() => {
    const handleOrderStatusUpdate = (event) => {
      if (currentOrderDetails && event.detail.orderId === currentOrderDetails._id) {
        setCurrentOrderDetails(prev => ({
          ...prev,
          status: event.detail.newStatus
        }));
      }
    };

    const handleOrderCompleted = (event) => {
      if (currentOrderDetails && event.detail.orderId === currentOrderDetails._id) {
        setCurrentOrderDetails(null);
      }
    };

    window.addEventListener('order-status-updated', handleOrderStatusUpdate);
    window.addEventListener('orderCompleted', handleOrderCompleted);

    return () => {
      window.removeEventListener('order-status-updated', handleOrderStatusUpdate);
      window.removeEventListener('orderCompleted', handleOrderCompleted);
    };
  }, [currentOrderDetails, user]);

  // Navigation configuration based on role
  const getNavigationItems = () => {
    const userRole = user?.role || 'manager';
    
    const managerItems = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        badge: null,
        submenu: null
      },
      {
        name: 'Orders',
        href: '/orders',
        icon: ShoppingBagIcon,
        badge: 5,
        submenu: null
      },
      {
        name: 'Partners',
        href: '/partners',
        icon: TruckIcon,
        badge: 3,
        submenu: null
      },
      {
        name: 'Analytics',
        href: '/analytics',
        icon: ChartBarIcon,
        badge: null,
        submenu: [
          { name: 'Overview', href: '/analytics' },
          { name: 'Orders Analytics', href: '/analytics/orders' },
          { name: 'Partner Performance', href: '/analytics/partners' },
          { name: 'Revenue Reports', href: '/analytics/revenue' }
        ]
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: Cog6ToothIcon,
        badge: null,
        submenu: [
          { name: 'General', href: '/settings' },
          { name: 'Profile', href: '/settings/profile' },
          { name: 'Notifications', href: '/settings/notifications' },
          { name: 'Preferences', href: '/settings/preferences' }
        ]
      }
    ];

    const partnerItems = [
      {
        name: 'Dashboard',
        href: '/partner-dashboard',
        icon: HomeIcon,
        badge: null,
        submenu: null
      },
      {
        name: 'Available Orders',
        href: '/available-orders',
        icon: ShoppingBagIcon,
        badge: null,
        submenu: null
      },
      {
        name: 'Current Order',
        href: '/current-order',
        icon: ClockIcon,
        badge: user?.currentOrder ? 1 : null,
        submenu: null
      },
      {
        name: 'Order History',
        href: '/order-history',
        icon: DocumentTextIcon,
        badge: null,
        submenu: null
      },
      {
        name: 'Profile',
        href: '/profile',
        icon: UserIcon,
        badge: null,
        submenu: [
          { name: 'My Profile', href: '/profile' },
          { name: 'Settings', href: '/profile/settings' },
          { name: 'Preferences', href: '/profile/preferences' }
        ]
      }
    ];

    return userRole === 'partner' ? partnerItems : managerItems;
  };

  const navigationItems = getNavigationItems();

  const handleSubmenuToggle = (itemName) => {
    if (isCollapsed) return;
    setActiveSubmenu(activeSubmenu === itemName ? null : itemName);
  };

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const quickActions = [
    {
      name: 'New Order',
      icon: PlusIcon,
      action: () => {
        const event = new CustomEvent('openCreateOrderModal');
        window.dispatchEvent(event);
      },
      color: 'bg-red-600 hover:bg-red-700',
      show: user?.role === 'manager'
    },
    {
      name: 'Update Status',
      icon: CheckCircleIcon,
      action: () => window.location.href = '/partner-dashboard',
      color: 'bg-green-600 hover:bg-green-700',
      show: user?.role === 'partner'
    }
  ].filter(action => action.show);

  return (
    <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-red-600 to-red-700">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">Z</span>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-white">Zomato Ops Pro</h1>
              <p className="text-xs text-red-200">GNA Energy Pvt Ltd</p>
            </div>
          </div>
        )}
        
        {isCollapsed && (
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto">
            <span className="text-red-600 font-bold text-lg">Z</span>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-red-200 hover:text-white hover:bg-red-800 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {/* Navigation Menu */}
      <nav className="mt-5 px-2 space-y-1 flex-1 overflow-y-auto scrollbar-thin">
        {navigationItems.map((item) => (
          <div key={item.name}>
            <div
              className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                isActive(item.href)
                  ? 'bg-red-50 text-red-700 border-r-2 border-red-500'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => item.submenu ? handleSubmenuToggle(item.name) : null}
            >
              <Link 
                to={item.href} 
                className={`flex items-center flex-1 ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className={`flex-shrink-0 h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
              
              {!isCollapsed && item.submenu && (
                <ChevronRightIcon 
                  className={`h-4 w-4 transition-transform ${
                    activeSubmenu === item.name ? 'rotate-90' : ''
                  }`} 
                />
              )}
            </div>

            {/* Submenu */}
            {!isCollapsed && item.submenu && activeSubmenu === item.name && (
              <div className="ml-8 mt-1 space-y-1">
                {item.submenu.map((subItem) => (
                  <Link
                    key={subItem.name}
                    to={subItem.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(subItem.href)
                        ? 'bg-red-50 text-red-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    <span className="w-2 h-2 bg-gray-300 rounded-full mr-3"></span>
                    {subItem.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Current Active Order Section for Partners */}
      {!isCollapsed && user?.role === 'partner' && currentOrderDetails && (
        <div className="px-2 py-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="px-2 text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            Current Active Order
          </h3>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-200">
            <div className="space-y-3">
              {/* Order ID and Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">
                  #{currentOrderDetails.orderId}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  currentOrderDetails.status === 'PREP' ? 'bg-yellow-100 text-yellow-800' :
                  currentOrderDetails.status === 'PICKED' ? 'bg-blue-100 text-blue-800' :
                  currentOrderDetails.status === 'ON_ROUTE' ? 'bg-purple-100 text-purple-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {currentOrderDetails.status}
                </span>
              </div>
              
              {/* Customer Info */}
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-600">
                  <UserIcon className="h-3 w-3 mr-1" />
                  <span className="font-medium text-gray-900">{currentOrderDetails.customerName}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <PhoneIcon className="h-3 w-3 mr-1" />
                  <span>{currentOrderDetails.customerPhone}</span>
                </div>
                <div className="flex items-start text-xs text-gray-600">
                  <MapPinIcon className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{currentOrderDetails.customerAddress}</span>
                </div>
              </div>
              
              {/* Order Amount */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center text-xs text-gray-600">
                  <CurrencyRupeeIcon className="h-3 w-3 mr-1" />
                  <span>Amount:</span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  ₹{currentOrderDetails.totalAmount}
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  to="/partner-dashboard"
                  className="block w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors text-center"
                >
                  View Full Details
                </Link>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => window.open(`tel:${currentOrderDetails.customerPhone}`)}
                    className="flex items-center justify-center px-2 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    <PhoneIcon className="h-3 w-3 mr-1" />
                    Call
                  </button>
                  
                  {currentOrderDetails.customerEmail && currentOrderDetails.customerEmail !== 'Not provided' && (
                    <button
                      onClick={() => window.open(`mailto:${currentOrderDetails.customerEmail}`)}
                      className="flex items-center justify-center px-2 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700 transition-colors"
                    >
                      📧 Email
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!isCollapsed && quickActions.length > 0 && (
        <div className="px-2 py-4 border-t border-gray-200">
          <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium text-white rounded-md transition-colors ${action.color}`}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User Info Footer */}
      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Loading...'}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {user?.role || 'Loading...'}
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {isCollapsed && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 font-semibold text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 
