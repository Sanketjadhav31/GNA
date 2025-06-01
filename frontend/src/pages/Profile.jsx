import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  CameraIcon,
  StarIcon,
  TruckIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  BellIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  CogIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import partnerService from '../services/partnerService';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    emergencyContact: '',
    bankAccount: '',
    ifscCode: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [statistics, setStatistics] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
    joinedDate: '',
    completionRate: 0,
    averageDeliveryTime: 0
  });
  const [preferences, setPreferences] = useState({
    notifications: {
      newOrders: true,
      orderUpdates: true,
      earnings: true,
      promotions: false
    },
    workHours: {
      start: '09:00',
      end: '21:00'
    },
    deliveryRadius: 10
  });

  useEffect(() => {
    loadProfileData();
    loadStatistics();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      // Initialize with user data
      if (user) {
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          vehicleType: user.vehicleType || 'bike',
          vehicleNumber: user.vehicleNumber || '',
          licenseNumber: user.licenseNumber || '',
          emergencyContact: user.emergencyContact || '',
          bankAccount: user.bankAccount || '',
          ifscCode: user.ifscCode || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await partnerService.getMyStatistics();
      if (response.success) {
        setStatistics(response.data);
      } else {
        // Mock data for demonstration
        setStatistics({
          totalDeliveries: 145,
          totalEarnings: 14500,
          averageRating: 4.7,
          joinedDate: '2024-01-15',
          completionRate: 96.5,
          averageDeliveryTime: 25
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Use mock data
      setStatistics({
        totalDeliveries: 145,
        totalEarnings: 14500,
        averageRating: 4.7,
        joinedDate: '2024-01-15',
        completionRate: 96.5,
        averageDeliveryTime: 25
      });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      // TODO: Implement API call to update profile
      // const response = await partnerService.updateProfile(profileData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update auth context
      updateUser({ ...user, ...profileData });
      
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (category, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <Loading size="lg" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={fadeInUp.initial}
          animate={fadeInUp.animate}
          transition={fadeInUp.transition}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-lg text-gray-600 mt-1">
                Manage your profile information and preferences
              </p>
            </div>
            
            <div className="flex space-x-4">
              {editMode ? (
                <>
                  <Button
                    onClick={() => setEditMode(false)}
                    variant="secondary"
                    icon={XCircleIcon}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    loading={saving}
                    icon={CheckCircleIcon}
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditMode(true)}
                  icon={PencilIcon}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Profile Information */}
          <motion.div
            className="xl:col-span-2 space-y-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            
            {/* Basic Information */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-6 w-6 mr-2 text-blue-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'P'}
                      </span>
                    </div>
                    {editMode && (
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200 hover:bg-gray-50">
                        <CameraIcon className="h-4 w-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{profileData.name}</h3>
                    <p className="text-gray-600">Delivery Partner</p>
                    <p className="text-sm text-gray-500">Member since {formatDate(statistics.joinedDate)}</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact
                    </label>
                    <input
                      type="tel"
                      value={profileData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <textarea
                      value={profileData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!editMode}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TruckIcon className="h-6 w-6 mr-2 text-green-600" />
                  Vehicle & License Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Type
                    </label>
                    <select
                      value={profileData.vehicleType}
                      onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                      value={profileData.vehicleNumber}
                      onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driving License Number
                    </label>
                    <input
                      type="text"
                      value={profileData.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Banking Information */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <CurrencyRupeeIcon className="h-6 w-6 mr-2 text-purple-600" />
                    Banking Information
                  </span>
                  <Button
                    onClick={() => setShowBankDetails(!showBankDetails)}
                    variant="ghost"
                    size="sm"
                    icon={showBankDetails ? EyeSlashIcon : EyeIcon}
                  >
                    {showBankDetails ? 'Hide' : 'Show'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Account Number
                    </label>
                    <input
                      type={showBankDetails ? "text" : "password"}
                      value={profileData.bankAccount}
                      onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={profileData.ifscCode}
                      onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right Sidebar */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            
            {/* Performance Stats */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <StarIcon className="h-6 w-6 mr-2 text-yellow-500" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-900">Total Deliveries</p>
                    <p className="text-2xl font-bold text-green-900">{statistics.totalDeliveries}</p>
                  </div>
                  <TruckIcon className="h-8 w-8 text-green-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Earnings</p>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(statistics.totalEarnings)}</p>
                  </div>
                  <CurrencyRupeeIcon className="h-8 w-8 text-blue-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Average Rating</p>
                    <p className="text-2xl font-bold text-yellow-900">{statistics.averageRating}/5</p>
                  </div>
                  <StarIcon className="h-8 w-8 text-yellow-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Completion Rate</p>
                    <p className="text-2xl font-bold text-purple-900">{statistics.completionRate}%</p>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CogIcon className="h-6 w-6 mr-2 text-gray-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => window.location.href = '/current-order'}
                  fullWidth
                  size="md"
                  variant="secondary"
                  icon={ClockIcon}
                >
                  Current Order
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/order-history'}
                  fullWidth
                  size="md"
                  variant="secondary"
                  icon={DocumentIcon}
                >
                  Order History
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/partner-dashboard'}
                  fullWidth
                  size="md"
                  variant="secondary"
                  icon={TruckIcon}
                >
                  Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BellIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(preferences.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <button
                      onClick={() => handlePreferenceChange('notifications', key, !value)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 