import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const PartnerList = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    isAvailable: '',
    vehicleType: '',
    sortBy: 'rating',
    sortOrder: 'desc'
  });

  const { error: showError, success } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPartners();
  }, [filters]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      if (filters.isAvailable !== '') {
        params.append('isAvailable', filters.isAvailable);
      }
      if (filters.vehicleType) {
        params.append('vehicleType', filters.vehicleType);
      }

      const response = await axios.get(`/api/partners?${params}`);
      
      if (response.data.success) {
        setPartners(response.data.data.partners);
      }
    } catch (error) {
      showError('Failed to fetch delivery partners');
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = !searchTerm || 
      partner.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.phone.includes(searchTerm) ||
      partner.vehicleType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (partner) => {
    if (!partner.isActive) {
      return <span className="status-badge bg-red-100 text-red-800">Inactive</span>;
    }
    if (partner.isAvailable) {
      return <span className="status-badge bg-green-100 text-green-800">Available</span>;
    }
    return <span className="status-badge bg-yellow-100 text-yellow-800">Busy</span>;
  };

  const getVehicleIcon = (vehicleType) => {
    const icons = {
      bike: '🏍️',
      scooter: '🛵',
      bicycle: '🚲',
      car: '🚗'
    };
    return icons[vehicleType] || '🚗';
  };

  const updatePartnerRating = async (partnerId, newRating) => {
    try {
      await axios.put(`/api/partners/${partnerId}/rating`, { rating: newRating });
      success('Partner rating updated successfully');
      fetchPartners();
    } catch (error) {
      showError('Failed to update partner rating');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Loading delivery partners...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Delivery Partners</h1>
              <p className="text-gray-600">Manage and monitor your delivery team performance</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{filteredPartners.length}</p>
                    <p className="text-xs text-gray-500">Total Partners</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{filteredPartners.filter(p => p.isAvailable).length}</p>
                    <p className="text-xs text-gray-500">Available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              Search & Filter Partners
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Partners</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    placeholder="Search by name, phone, or vehicle type..."
                  />
                </div>
              </div>

              {/* Availability Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                <select
                  value={filters.isAvailable}
                  onChange={(e) => handleFilterChange('isAvailable', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  <option value="">All Partners</option>
                  <option value="true">Available</option>
                  <option value="false">Busy</option>
                </select>
              </div>

              {/* Vehicle Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                <select
                  value={filters.vehicleType}
                  onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                >
                  <option value="">All Vehicles</option>
                  <option value="bike">🏍️ Bike</option>
                  <option value="scooter">🛵 Scooter</option>
                  <option value="bicycle">🚲 Bicycle</option>
                  <option value="car">🚗 Car</option>
                </select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
                >
                  <option value="rating">Rating</option>
                  <option value="firstName">Name</option>
                  <option value="createdAt">Join Date</option>
                </select>
                <button
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${filters.sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Partners Grid */}
        {filteredPartners.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No delivery partners found</h3>
              <p className="text-gray-500">No partners match your current filters. Try adjusting your search criteria.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map((partner) => (
              <div key={partner._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="p-6">
                  {/* Partner Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-lg">
                            {partner.firstName?.charAt(0)}{partner.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                          partner.isActive && partner.isAvailable ? 'bg-green-500' : 
                          partner.isActive ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {partner.firstName} {partner.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{partner.phone}</p>
                      </div>
                    </div>
                    {getStatusBadge(partner)}
                  </div>

                  {/* Partner Details */}
                  <div className="space-y-3">
                    {/* Vehicle Info */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">{getVehicleIcon(partner.vehicleType)}</span>
                          <span className="text-sm font-medium text-blue-700 capitalize">{partner.vehicleType}</span>
                        </div>
                        {partner.vehicleNumber && (
                          <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {partner.vehicleNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating */}
                    {partner.rating && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm font-medium text-yellow-700">Rating</span>
                          </div>
                          <span className="text-lg font-bold text-yellow-800">{partner.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}

                    {/* Join Date */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-600">Joined</span>
                        </div>
                        <span className="text-sm text-gray-800">{formatDate(partner.createdAt)}</span>
                      </div>
                    </div>

                    {/* Delivery Stats */}
                    {partner.totalDeliveries !== undefined && (
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-green-700">Deliveries</span>
                          </div>
                          <span className="text-lg font-bold text-green-800">{partner.totalDeliveries || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex space-x-2">
                    <Link
                      to={`/partners/${partner._id}`}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View Details</span>
                    </Link>
                    {user?.role === 'restaurant_manager' && (
                      <button
                        onClick={() => {/* Add contact functionality */}}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                        title="Contact Partner"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerList; 