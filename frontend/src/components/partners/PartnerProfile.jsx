import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const PartnerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { error: showError, success } = useToast();
  const { user } = useAuth();

  const [partner, setPartner] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    avgRating: 0,
    totalEarnings: 0,
    onTimeDeliveryRate: 0
  });

  useEffect(() => {
    if (id) {
      fetchPartnerDetails();
      fetchPartnerOrders();
    }
  }, [id]);

  const fetchPartnerDetails = async () => {
    try {
      const response = await axios.get(`/api/partners/${id}`);
      if (response.data.success) {
        setPartner(response.data.data);
        calculateStats(response.data.data);
      }
    } catch (error) {
      showError('Failed to fetch partner details');
      navigate('/partners');
    }
  };

  const fetchPartnerOrders = async () => {
    try {
      const response = await axios.get(`/api/orders?partnerId=${id}&limit=50`);
      if (response.data.success) {
        setOrders(response.data.data.orders || []);
      }
    } catch (error) {
      console.error('Failed to fetch partner orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (partnerData) => {
    // This would ideally come from the backend
    setStats({
      totalOrders: partnerData.totalDeliveries || 0,
      completedOrders: partnerData.completedDeliveries || 0,
      avgRating: partnerData.rating || 0,
      totalEarnings: partnerData.totalEarnings || 0,
      onTimeDeliveryRate: partnerData.onTimeDeliveryRate || 0
    });
  };

  const updatePartnerStatus = async (isActive) => {
    try {
      await axios.put(`/api/partners/${id}/status`, { isActive });
      success(`Partner ${isActive ? 'activated' : 'deactivated'} successfully`);
      setPartner(prev => ({ ...prev, isActive }));
    } catch (error) {
      showError('Failed to update partner status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PREP: 'bg-blue-100 text-blue-800',
      READY: 'bg-purple-100 text-purple-800',
      PICKED: 'bg-indigo-100 text-indigo-800',
      ON_ROUTE: 'bg-orange-100 text-orange-800',
      DELIVERED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`status-badge ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace('_', ' ')}
      </span>
    );
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

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
          <span className="ml-3 text-gray-600">Loading partner details...</span>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="card p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Partner not found</h3>
          <p className="text-gray-500 mb-4">The requested partner could not be found.</p>
          <Link to="/partners" className="btn-primary">
            Back to Partners
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/partners')}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Partner Profile</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed information and performance metrics
              </p>
            </div>
          </div>
          
          {user?.role === 'restaurant_manager' && (
            <div className="flex space-x-3">
              <button
                onClick={() => updatePartnerStatus(!partner.isActive)}
                className={`btn-secondary ${partner.isActive ? 'text-red-600' : 'text-green-600'}`}
              >
                {partner.isActive ? 'Deactivate' : 'Activate'} Partner
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Partner Header Card */}
      <div className="card mb-8 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="h-20 w-20 bg-gradient-to-br from-zomato-500 to-zomato-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {partner.firstName?.charAt(0)}{partner.lastName?.charAt(0)}
              </span>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {partner.firstName} {partner.lastName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Partner ID: {partner._id.slice(-8).toUpperCase()}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-medium">{partner.rating?.toFixed(1) || 'New'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getVehicleIcon(partner.vehicleType)}</span>
                  <span className="capitalize">{partner.vehicleType}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex flex-col space-y-2">
              {partner.isActive ? (
                partner.isAvailable ? (
                  <span className="status-badge bg-green-100 text-green-800">Available</span>
                ) : (
                  <span className="status-badge bg-yellow-100 text-yellow-800">Busy</span>
                )
              ) : (
                <span className="status-badge bg-red-100 text-red-800">Inactive</span>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Joined {formatDate(partner.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalOrders}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Orders</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">{stats.completedOrders}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.avgRating.toFixed(1)}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-1">{formatCurrency(stats.totalEarnings)}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
        </div>
        
        <div className="card p-6 text-center">
          <div className="text-2xl font-bold text-indigo-600 mb-1">{stats.onTimeDeliveryRate}%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">On-Time Rate</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'orders', label: 'Order History' },
              { id: 'performance', label: 'Performance' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-zomato-500 text-zomato-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="font-medium text-gray-900 dark:text-white">{partner.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                <span className="font-medium text-gray-900 dark:text-white">{partner.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Vehicle Type:</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {partner.vehicleType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">License Number:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {partner.licenseNumber || 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Vehicle Number:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {partner.vehicleNumber || 'Not provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Order #{order._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.orderPlacedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No recent orders found
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{order._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {order.customerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(order.orderPlacedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/orders/${order._id}`}
                        className="text-zomato-600 hover:text-zomato-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No orders found for this partner</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Metrics */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ 
                      width: `${stats.totalOrders > 0 ? (stats.completedOrders / stats.totalOrders) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Average Rating</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.avgRating.toFixed(1)}/5.0
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(stats.avgRating / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.onTimeDeliveryRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${stats.onTimeDeliveryRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings Summary */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Earnings Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Earnings:</span>
                <span className="font-bold text-green-600">{formatCurrency(stats.totalEarnings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Avg per Order:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalOrders > 0 ? stats.totalEarnings / stats.totalOrders : 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">This Month:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalEarnings * 0.3)} {/* Example calculation */}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerProfile; 