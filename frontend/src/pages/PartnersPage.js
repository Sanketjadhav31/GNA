import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  TruckIcon,
  MapPinIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import partnerService from '../services/partnerService';
import toast from 'react-hot-toast';

const PartnersPage = () => {
  const { user } = useAuth();
  
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadPartners();
  }, [statusFilter]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      console.log('🚚 Loading partners from localStorage...');
      
      // First try to load from localStorage
      const storedPartners = JSON.parse(localStorage.getItem('manager_partners') || '[]');
      
      if (storedPartners.length > 0) {
        setPartners(storedPartners);
        console.log('✅ Partners loaded from localStorage:', storedPartners.length);
      } else {
        // If no stored partners, initialize with mock data
        console.log('ℹ️ No stored partners found, initializing with demo data');
        localStorage.setItem('manager_partners', JSON.stringify(mockPartners));
        setPartners(mockPartners);
        console.log('✅ Demo partners initialized:', mockPartners.length);
      }
      
    } catch (error) {
      console.error('❌ Error loading partners:', error);
      // Fallback to mock data on error
      console.log('⚠️ Using mock partners data due to error');
      setPartners(mockPartners);
      localStorage.setItem('manager_partners', JSON.stringify(mockPartners));
    } finally {
      setLoading(false);
    }
  };

  const [newPartner, setNewPartner] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicleType: 'BIKE',
    vehicleNumber: '',
    emergencyContact: '',
    aadharNumber: '',
    licenseNumber: ''
  });

  // Mock partners data
  const mockPartners = [
    {
      _id: 'p1',
      name: 'Raj Kumar',
      phone: '+91 7654321098',
      email: 'raj.kumar@email.com',
      address: 'Sector 45, Gurugram',
      vehicleType: 'BIKE',
      vehicleNumber: 'HR-26-AX-1234',
      availability: 'BUSY',
      currentOrder: '2',
      rating: 4.8,
      totalDeliveries: 156,
      todayDeliveries: 8,
      earnings: 2240,
      joinDate: '2023-01-15',
      emergencyContact: '+91 9876543210',
      aadharNumber: 'XXXX-XXXX-1234',
      licenseNumber: 'HR-05-20231234',
      onlineStatus: true,
      lastSeen: new Date().toISOString(),
      completionRate: 96.5,
      avgRating: 4.8,
      totalEarnings: 45600
    },
    {
      _id: 'p2',
      name: 'Suresh Singh',
      phone: '+91 6543210876',
      email: 'suresh.singh@email.com',
      address: 'DLF Phase 2, Gurugram',
      vehicleType: 'BIKE',
      vehicleNumber: 'HR-26-BY-5678',
      availability: 'AVAILABLE',
      currentOrder: null,
      rating: 4.6,
      totalDeliveries: 143,
      todayDeliveries: 6,
      earnings: 1680,
      joinDate: '2023-02-20',
      emergencyContact: '+91 8765432109',
      aadharNumber: 'XXXX-XXXX-5678',
      licenseNumber: 'HR-05-20235678',
      onlineStatus: true,
      lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      completionRate: 94.2,
      avgRating: 4.6,
      totalEarnings: 38900
    },
    {
      _id: 'p3',
      name: 'Amit Sharma',
      phone: '+91 5432109765',
      email: 'amit.sharma@email.com',
      address: 'Cyber City, Gurugram',
      vehicleType: 'SCOOTER',
      vehicleNumber: 'HR-26-CZ-9012',
      availability: 'AVAILABLE',
      currentOrder: null,
      rating: 4.9,
      totalDeliveries: 189,
      todayDeliveries: 10,
      earnings: 2800,
      joinDate: '2022-11-10',
      emergencyContact: '+91 7654321098',
      aadharNumber: 'XXXX-XXXX-9012',
      licenseNumber: 'HR-05-20229012',
      onlineStatus: true,
      lastSeen: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      completionRate: 98.1,
      avgRating: 4.9,
      totalEarnings: 52300
    },
    {
      _id: 'p4',
      name: 'Rohit Verma',
      phone: '+91 4321098654',
      email: 'rohit.verma@email.com',
      address: 'Sector 56, Gurugram',
      vehicleType: 'BIKE',
      vehicleNumber: 'HR-26-DX-3456',
      availability: 'OFFLINE',
      currentOrder: null,
      rating: 4.4,
      totalDeliveries: 98,
      todayDeliveries: 0,
      earnings: 0,
      joinDate: '2023-03-05',
      emergencyContact: '+91 6543210987',
      aadharNumber: 'XXXX-XXXX-3456',
      licenseNumber: 'HR-05-20233456',
      onlineStatus: false,
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      completionRate: 92.8,
      avgRating: 4.4,
      totalEarnings: 28400
    },
    {
      _id: 'p5',
      name: 'Vikash Kumar',
      phone: '+91 3210987543',
      email: 'vikash.kumar@email.com',
      address: 'Sector 48, Gurugram',
      vehicleType: 'BIKE',
      vehicleNumber: 'HR-26-EY-7890',
      availability: 'AVAILABLE',
      currentOrder: null,
      rating: 4.7,
      totalDeliveries: 124,
      todayDeliveries: 7,
      earnings: 1960,
      joinDate: '2023-01-28',
      emergencyContact: '+91 5432109876',
      aadharNumber: 'XXXX-XXXX-7890',
      licenseNumber: 'HR-05-20237890',
      onlineStatus: true,
      lastSeen: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      completionRate: 95.3,
      avgRating: 4.7,
      totalEarnings: 41200
    }
  ];

  const handleAddPartner = () => {
    if (!newPartner.name || !newPartner.phone || !newPartner.vehicleNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    const partner = {
      _id: Date.now().toString(),
      ...newPartner,
      availability: 'OFFLINE',
      currentOrder: null,
      rating: 5.0,
      totalDeliveries: 0,
      todayDeliveries: 0,
      earnings: 0,
      joinDate: new Date().toISOString().split('T')[0],
      onlineStatus: false,
      lastSeen: new Date().toISOString(),
      completionRate: 100,
      avgRating: 5.0,
      totalEarnings: 0
    };

    const updatedPartners = [partner, ...(Array.isArray(partners) ? partners : [])];
    setPartners(updatedPartners);
    
    // Save to localStorage
    localStorage.setItem('manager_partners', JSON.stringify(updatedPartners));
    
    setShowCreateModal(false);
    setNewPartner({
      name: '',
      phone: '',
      email: '',
      address: '',
      vehicleType: 'BIKE',
      vehicleNumber: '',
      emergencyContact: '',
      aadharNumber: '',
      licenseNumber: ''
    });
    toast.success('Partner added successfully!');
    console.log('✅ New partner added and saved to localStorage:', partner.name);
  };

  const togglePartnerAvailability = (partnerId, newStatus) => {
    const updatedPartners = (Array.isArray(partners) ? partners : []).map(partner =>
      partner._id === partnerId
        ? { 
            ...partner, 
            availability: newStatus,
            onlineStatus: newStatus !== 'OFFLINE',
            lastSeen: new Date().toISOString()
          }
        : partner
    );
    
    setPartners(updatedPartners);
    
    // Save to localStorage
    localStorage.setItem('manager_partners', JSON.stringify(updatedPartners));
    
    toast.success(`Partner status updated to ${newStatus.toLowerCase()}`);
    console.log('✅ Partner status updated and saved:', partnerId, newStatus);
  };

  const getStatusBadge = (availability, onlineStatus) => {
    if (!onlineStatus) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-1"></div>
          Offline
        </span>
      );
    }

    const statusConfig = {
      AVAILABLE: { color: 'bg-green-100 text-green-800', dot: 'bg-green-400', text: 'Available' },
      BUSY: { color: 'bg-red-100 text-red-800', dot: 'bg-red-400', text: 'Busy' },
      OFFLINE: { color: 'bg-gray-100 text-gray-800', dot: 'bg-gray-400', text: 'Offline' }
    };

    const config = statusConfig[availability];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <div className={`w-2 h-2 ${config.dot} rounded-full mr-1 animate-pulse`}></div>
        {config.text}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPerformanceColor = (value, thresholds) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.average) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
          <p className="mt-2 text-gray-600">Manage delivery partners and track their performance</p>
        </div>
        {user?.role === 'manager' && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <UserGroupIcon className="w-5 h-5 mr-2" />
              Add New Partner
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TruckIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{Array.isArray(partners) ? partners.length : 0}</div>
              <div className="text-sm text-gray-600">Total Partners</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {Array.isArray(partners) ? partners.filter(p => p.availability === 'AVAILABLE').length : 0}
              </div>
              <div className="text-sm text-gray-600">Available Now</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {Array.isArray(partners) ? partners.filter(p => p.availability === 'BUSY').length : 0}
              </div>
              <div className="text-sm text-gray-600">Currently Busy</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <StarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {Array.isArray(partners) && partners.length > 0 
                  ? (partners.reduce((sum, p) => sum + p.rating, 0) / partners.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <div className="text-sm text-gray-600">Avg Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            />
          </div>
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Showing {Array.isArray(partners) ? partners.length : 0} of {Array.isArray(partners) ? partners.length : 0} partners
          </div>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact & Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(partners) && partners.map((partner) => (
                <tr key={partner._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                      <div className="text-xs text-gray-500">ID: {partner._id.slice(-6)}</div>
                      <div className="text-xs text-gray-500">
                        Joined: {formatDate(partner.joinDate)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center text-sm text-gray-900">
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        {partner.phone}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {partner.vehicleType}: {partner.vehicleNumber}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        <MapPinIcon className="h-3 w-3 inline mr-1" />
                        {partner.address}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {getStatusBadge(partner.availability, partner.onlineStatus)}
                      <div className="text-xs text-gray-500">
                        Last seen: {formatTime(partner.lastSeen)}
                      </div>
                      {partner.currentOrder && (
                        <div className="text-xs text-blue-600">
                          Order: #{partner.currentOrder}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">{partner.rating}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {partner.totalDeliveries} total deliveries
                      </div>
                      <div className={`text-xs font-medium ${getPerformanceColor(partner.completionRate, { good: 95, average: 90 })}`}>
                        {partner.completionRate}% completion
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(partner.earnings)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Today ({partner.todayDeliveries} orders)
                      </div>
                      <div className="text-xs text-gray-500">
                        Total: {formatCurrency(partner.totalEarnings)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => {
                          setSelectedPartner(partner);
                          setShowDetailsModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 text-xs"
                      >
                        View Details
                      </button>
                      {user?.role === 'manager' && (
                        <>
                          {partner.onlineStatus && partner.availability === 'AVAILABLE' && (
                            <button
                              onClick={() => togglePartnerAvailability(partner._id, 'OFFLINE')}
                              className="text-gray-600 hover:text-gray-900 text-xs"
                            >
                              Set Offline
                            </button>
                          )}
                          {!partner.onlineStatus && (
                            <button
                              onClick={() => togglePartnerAvailability(partner._id, 'AVAILABLE')}
                              className="text-green-600 hover:text-green-900 text-xs"
                            >
                              Set Online
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(!Array.isArray(partners) || partners.length === 0) && (
          <div className="text-center py-12">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-gray-500">No partners found</div>
          </div>
        )}
      </div>

      {/* Add Partner Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border max-w-2xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Add New Partner</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone *</label>
                <input
                  type="tel"
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newPartner.email}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                <select
                  value={newPartner.vehicleType}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, vehicleType: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="BIKE">Bike</option>
                  <option value="SCOOTER">Scooter</option>
                  <option value="BICYCLE">Bicycle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Number *</label>
                <input
                  type="text"
                  value={newPartner.vehicleNumber}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">License Number</label>
                <input
                  type="text"
                  value={newPartner.licenseNumber}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  value={newPartner.address}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                <input
                  type="tel"
                  value={newPartner.emergencyContact}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Aadhar Number</label>
                <input
                  type="text"
                  value={newPartner.aadharNumber}
                  onChange={(e) => setNewPartner(prev => ({ ...prev, aadharNumber: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPartner}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Add Partner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Details Modal */}
      {showDetailsModal && selectedPartner && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Partner Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Personal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <div className="text-sm text-gray-900">{selectedPartner.name}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <div className="text-sm text-gray-900">{selectedPartner.phone}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <div className="text-sm text-gray-900">{selectedPartner.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Address</label>
                      <div className="text-sm text-gray-900">{selectedPartner.address}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Emergency Contact</label>
                      <div className="text-sm text-gray-900">{selectedPartner.emergencyContact}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Vehicle Information</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Vehicle Type</label>
                      <div className="text-sm text-gray-900">{selectedPartner.vehicleType}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Vehicle Number</label>
                      <div className="text-sm text-gray-900">{selectedPartner.vehicleNumber}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">License Number</label>
                      <div className="text-sm text-gray-900">{selectedPartner.licenseNumber}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{selectedPartner.rating}</div>
                      <div className="text-sm text-gray-600">Rating</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{selectedPartner.totalDeliveries}</div>
                      <div className="text-sm text-gray-600">Total Deliveries</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{selectedPartner.completionRate}%</div>
                      <div className="text-sm text-gray-600">Completion Rate</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{selectedPartner.todayDeliveries}</div>
                      <div className="text-sm text-gray-600">Today's Deliveries</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Earnings</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Today's Earnings:</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedPartner.earnings)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Earnings:</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(selectedPartner.totalEarnings)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Current Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Availability:</span>
                      {getStatusBadge(selectedPartner.availability, selectedPartner.onlineStatus)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Seen:</span>
                      <span className="text-sm text-gray-900">{formatTime(selectedPartner.lastSeen)}</span>
                    </div>
                    {selectedPartner.currentOrder && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Current Order:</span>
                        <span className="text-sm font-medium text-blue-600">#{selectedPartner.currentOrder}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnersPage; 