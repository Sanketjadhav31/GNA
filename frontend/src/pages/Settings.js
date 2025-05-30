import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserCircleIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  TruckIcon,
  CheckCircleIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations';
import { cn } from '../utils/cn';

const Settings = () => {
  const { user, updateUser, changePassword, isManager, isPartner } = useAuth();
  const { isDarkMode, isSystemPreference, setTheme, useSystemPreference } = useTheme();
  const { settings: notificationSettings, updateSettings: updateNotificationSettings } = useNotifications();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    // Manager specific
    restaurantName: '',
    restaurantAddress: '',
    // Partner specific
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    dashboard: {
      defaultView: 'overview',
      autoRefresh: true,
      refreshInterval: 30,
      showMetrics: true,
      compactView: false
    },
    orders: {
      defaultPrepTime: 15,
      autoAssignPartners: true,
      requireConfirmation: false,
      priorityOrders: true
    }
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        restaurantName: user.restaurantInfo?.name || '',
        restaurantAddress: user.restaurantInfo?.address || '',
        vehicleType: user.vehicleType || '',
        vehicleNumber: user.vehicleNumber || '',
        licenseNumber: user.licenseNumber || ''
      });

      // Load user preferences if they exist
      if (user.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...user.preferences
        }));
      }
    }
  }, [user]);

  const tabs = [
    {
      id: 'profile',
      name: 'Profile',
      icon: UserCircleIcon,
      description: 'Manage your personal information'
    },
    {
      id: 'appearance',
      name: 'Appearance',
      icon: SunIcon,
      description: 'Theme and display settings'
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: BellIcon,
      description: 'Configure notification settings'
    },
    {
      id: 'preferences',
      name: 'Preferences',
      icon: CogIcon,
      description: 'Customize your experience'
    },
    {
      id: 'security',
      name: 'Security',
      icon: ShieldCheckIcon,
      description: 'Password and security settings'
    }
  ];

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        name: profileForm.name,
        phone: profileForm.phone
      };

      if (isManager()) {
        updateData.restaurantInfo = {
          name: profileForm.restaurantName,
          address: profileForm.restaurantAddress
        };
      }

      if (isPartner()) {
        updateData.vehicleType = profileForm.vehicleType;
        updateData.vehicleNumber = profileForm.vehicleNumber;
        updateData.licenseNumber = profileForm.licenseNumber;
      }

      await updateUser(updateData);
      toast.success('✅ Profile updated successfully!');
    } catch (error) {
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      toast.success('✅ Password changed successfully!');
    } catch (error) {
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUser({ preferences });
      toast.success('✅ Preferences updated successfully!');
    } catch (error) {
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      updateNotificationSettings(notificationSettings);
      toast.success('✅ Notification settings updated successfully!');
    } catch (error) {
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const toggleNotification = (setting) => {
    updateNotificationSettings({
      [setting]: !notificationSettings[setting]
    });
  };

  const updateDashboardPreference = (setting, value) => {
    setPreferences(prev => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        [setting]: value
      }
    }));
  };

  const updateOrderPreference = (setting, value) => {
    setPreferences(prev => ({
      ...prev,
      orders: {
        ...prev.orders,
        [setting]: value
      }
    }));
  };

  if (!user) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar */}
          <motion.aside variants={staggerItem} className="lg:col-span-3">
            <Card className="sticky top-8">
              <CardContent className="p-0">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center space-x-3 first:rounded-t-lg last:rounded-b-lg",
                        activeTab === tab.id
                          ? "bg-red-50 text-red-700 border-r-2 border-red-500"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <tab.icon className="h-5 w-5" />
                      <div>
                        <div>{tab.name}</div>
                        <div className="text-xs text-gray-500">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </motion.aside>

          {/* Main Content */}
          <motion.main variants={staggerItem} className="lg:col-span-9 mt-8 lg:mt-0">
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCircleIcon className="h-6 w-6 text-red-600" />
                    <span>Profile Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserCircleIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            value={profileForm.email}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            disabled
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <PhoneIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Enter your phone number"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {isManager() ? (
                              <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                            ) : (
                              <TruckIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={isManager() ? 'Restaurant Manager' : 'Delivery Partner'}
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Manager-specific fields */}
                    {isManager() && (
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Restaurant Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Restaurant Name
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                              </div>
                              <input
                                type="text"
                                value={profileForm.restaurantName}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, restaurantName: e.target.value }))}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="Enter restaurant name"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Restaurant Address
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPinIcon className="h-5 w-5 text-gray-400" />
                              </div>
                              <textarea
                                value={profileForm.restaurantAddress}
                                onChange={(e) => setProfileForm(prev => ({ ...prev, restaurantAddress: e.target.value }))}
                                rows={3}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                placeholder="Enter restaurant address"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Partner-specific fields */}
                    {isPartner() && (
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Vehicle Type
                            </label>
                            <select
                              value={profileForm.vehicleType}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value="bike">Motorcycle</option>
                              <option value="scooter">Scooter</option>
                              <option value="bicycle">Bicycle</option>
                              <option value="car">Car</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Vehicle Number
                            </label>
                            <input
                              type="text"
                              value={profileForm.vehicleNumber}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="DL01AB1234"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              License Number
                            </label>
                            <input
                              type="text"
                              value={profileForm.licenseNumber}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                              className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="DL123456789"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={loading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <SunIcon className="h-5 w-5" />
                    <span>Appearance Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Theme Preference
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <SunIcon className="h-5 w-5 text-yellow-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Light Mode</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Classic light theme for better visibility
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTheme('light')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              !isDarkMode && !isSystemPreference ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                !isDarkMode && !isSystemPreference ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <MoonIcon className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Easier on the eyes in low light conditions
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTheme('dark')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              isDarkMode && !isSystemPreference ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                isDarkMode && !isSystemPreference ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <ComputerDesktopIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">System Preference</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Follow your device's theme setting
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => useSystemPreference()}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              isSystemPreference ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                isSystemPreference ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Display Settings */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Display Settings
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Compact View</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Use smaller spacing and condensed layouts
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDashboardPreference('compactView', !preferences.dashboard.compactView)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              preferences.dashboard.compactView ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                preferences.dashboard.compactView ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Show Metrics</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Display performance metrics on dashboard
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDashboardPreference('showMetrics', !preferences.dashboard.showMetrics)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              preferences.dashboard.showMetrics ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                preferences.dashboard.showMetrics ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BellIcon className="h-5 w-5" />
                    <span>Notification Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleNotificationSettingsSubmit} className="space-y-6">
                    {/* Real-time Notifications */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Real-time Notifications
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <ShoppingBagIcon className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">New Orders</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Get notified when new orders are placed
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNotification('newOrders')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              notificationSettings.newOrders ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                notificationSettings.newOrders ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <ClockIcon className="h-5 w-5 text-yellow-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Order Updates</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Get notified when order status changes
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNotification('orderUpdates')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              notificationSettings.orderUpdates ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                notificationSettings.orderUpdates ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        {isManager && (
                          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <div className="flex items-center space-x-3">
                              <TruckIcon className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">Partner Updates</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Get notified about partner status changes
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleNotification('partnerUpdates')}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                notificationSettings.partnerUpdates ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  notificationSettings.partnerUpdates ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <CheckCircleIcon className="h-5 w-5 text-purple-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Order Assignments</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Get notified when orders are assigned to you
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNotification('orderAssignments')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              notificationSettings.orderAssignments ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                notificationSettings.orderAssignments ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Channels */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Delivery Channels
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <EnvelopeIcon className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Receive notifications via email
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNotification('emailNotifications')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              notificationSettings.emailNotifications ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                notificationSettings.emailNotifications ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <DevicePhoneMobileIcon className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">SMS Notifications</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Receive critical notifications via SMS
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNotification('smsNotifications')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              notificationSettings.smsNotifications ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                notificationSettings.smsNotifications ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <BellIcon className="h-5 w-5 text-purple-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Receive instant browser notifications
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNotification('pushNotifications')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              notificationSettings.pushNotifications ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                notificationSettings.pushNotifications ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sound Settings */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Sound Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <div className="flex items-center space-x-3">
                            <SpeakerWaveIcon className="h-5 w-5 text-red-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">Sound Alerts</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Play sound for important notifications
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleNotification('soundAlerts')}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              notificationSettings.soundAlerts ? "bg-red-600" : "bg-gray-200 dark:bg-gray-700"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                notificationSettings.soundAlerts ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                      >
                        {loading ? <Loading size="sm" /> : 'Save Notification Settings'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === 'preferences' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CogIcon className="h-6 w-6 text-red-600" />
                    <span>Application Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePreferencesSubmit} className="space-y-6">
                    {/* Dashboard Preferences */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Auto Refresh</h4>
                            <p className="text-sm text-gray-500">Automatically refresh dashboard data</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDashboardPreference('autoRefresh', !preferences.dashboard.autoRefresh)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              preferences.dashboard.autoRefresh ? "bg-red-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                preferences.dashboard.autoRefresh ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        {preferences.dashboard.autoRefresh && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Refresh Interval (seconds)
                            </label>
                            <select
                              value={preferences.dashboard.refreshInterval}
                              onChange={(e) => updateDashboardPreference('refreshInterval', parseInt(e.target.value))}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value={15}>15 seconds</option>
                              <option value={30}>30 seconds</option>
                              <option value={60}>1 minute</option>
                              <option value={120}>2 minutes</option>
                              <option value={300}>5 minutes</option>
                            </select>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Show Metrics</h4>
                            <p className="text-sm text-gray-500">Display performance metrics on dashboard</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDashboardPreference('showMetrics', !preferences.dashboard.showMetrics)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              preferences.dashboard.showMetrics ? "bg-red-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                preferences.dashboard.showMetrics ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Compact View</h4>
                            <p className="text-sm text-gray-500">Use compact layout for more information</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDashboardPreference('compactView', !preferences.dashboard.compactView)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              preferences.dashboard.compactView ? "bg-red-600" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                preferences.dashboard.compactView ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Order Preferences (Manager only) */}
                    {isManager() && (
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Management</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Default Preparation Time (minutes)
                            </label>
                            <select
                              value={preferences.orders.defaultPrepTime}
                              onChange={(e) => updateOrderPreference('defaultPrepTime', parseInt(e.target.value))}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            >
                              <option value={10}>10 minutes</option>
                              <option value={15}>15 minutes</option>
                              <option value={20}>20 minutes</option>
                              <option value={25}>25 minutes</option>
                              <option value={30}>30 minutes</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">Auto-assign Partners</h4>
                              <p className="text-sm text-gray-500">Automatically assign available partners to orders</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateOrderPreference('autoAssignPartners', !preferences.orders.autoAssignPartners)}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                preferences.orders.autoAssignPartners ? "bg-red-600" : "bg-gray-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  preferences.orders.autoAssignPartners ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">Require Confirmation</h4>
                              <p className="text-sm text-gray-500">Require confirmation before creating orders</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateOrderPreference('requireConfirmation', !preferences.orders.requireConfirmation)}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                preferences.orders.requireConfirmation ? "bg-red-600" : "bg-gray-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  preferences.orders.requireConfirmation ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">Priority Orders</h4>
                              <p className="text-sm text-gray-500">Enable priority ordering system</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateOrderPreference('priorityOrders', !preferences.orders.priorityOrders)}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                preferences.orders.priorityOrders ? "bg-red-600" : "bg-gray-200"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  preferences.orders.priorityOrders ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        loading={loading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Save Preferences
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                    <span>Security Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <KeyIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type={showPasswords.current ? "text" : "password"}
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="Enter current password"
                              required
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => togglePassword('current')}
                            >
                              {showPasswords.current ? (
                                <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                              ) : (
                                <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <KeyIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type={showPasswords.new ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="Enter new password"
                              required
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => togglePassword('new')}
                            >
                              {showPasswords.new ? (
                                <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                              ) : (
                                <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <KeyIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type={showPasswords.confirm ? "text" : "password"}
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              placeholder="Confirm new password"
                              required
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => togglePassword('confirm')}
                            >
                              {showPasswords.confirm ? (
                                <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                              ) : (
                                <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Security Information</h3>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-gray-700">Your account uses secure JWT authentication</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-gray-700">All passwords are encrypted using bcrypt</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-gray-700">Session automatically expires after inactivity</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPasswordForm({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        })}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        loading={loading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Change Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </motion.main>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings; 