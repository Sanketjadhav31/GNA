import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  TruckIcon,
  UserGroupIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  ChartBarIcon,
  CogIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, logout, isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const userRole = user?.role;

    if (userRole === 'partner') {
      return [
        {
          name: 'My Dashboard',
          href: '/partner-dashboard',
          icon: HomeIcon
        },
        {
          name: 'Current Order',
          href: '/current-order',
          icon: ShoppingBagIcon
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: CogIcon
        }
      ];
    }

    // Manager navigation
    return [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon
      },
      {
        name: 'Orders',
        href: '/orders',
        icon: ShoppingBagIcon
      },
      {
        name: 'Partners',
        href: '/partners',
        icon: TruckIcon
      },
      {
        name: 'Analytics',
        href: '/analytics',
        icon: ChartBarIcon
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: CogIcon
      }
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Mobile menu */}
        <div className={`fixed inset-0 z-40 lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg">
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Zomato Ops Pro</h1>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-8">
              <div className="px-3 space-y-1">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${
                        isActive
                          ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200'
                          : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                      } group flex items-center px-2 py-2 text-sm font-medium border-l-4 rounded-md`}
                    >
                      <item.icon className="mr-3 h-6 w-6" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className={`fixed inset-y-0 left-0 z-30 ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 hidden lg:block`}>
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            {!sidebarCollapsed && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Zomato Ops Pro</h1>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-8">
            <div className="px-3 space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-200'
                        : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    } group flex items-center px-2 py-2 text-sm font-medium border-l-4 rounded-md`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <item.icon className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-6 w-6`} />
                    {!sidebarCollapsed && item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div className={`${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} transition-all duration-300`}>
          {/* Top header */}
          <header className="bg-white dark:bg-gray-800 shadow border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>

                {/* Page title */}
                <div className="flex items-center">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {location.pathname.split('/').pop() || 'Dashboard'}
                  </h2>
                </div>

                {/* Right side */}
                <div className="flex items-center space-x-4">
                  {/* Notifications */}
                  <button className="relative text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <BellIcon className="h-6 w-6" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </button>

                  {/* User menu */}
                  <div className="relative">
                    <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-200">
                      <UserCircleIcon className="h-8 w-8" />
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout; 