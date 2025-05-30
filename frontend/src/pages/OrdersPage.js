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
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/orderService';
import partnerService from '../services/partnerService';
import toast from 'react-hot-toast';

const OrdersPage = () => {
  const { user } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading orders...');
      
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await orderService.getAllOrders(params);
      if (response.success) {
        setOrders(response.data.orders || []);
        console.log('✅ Orders loaded:', response.data.orders?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // State management
  const [partners, setPartners] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Form state for new order
  const [newOrder, setNewOrder] = useState({
    orderId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ name: '', quantity: 1, price: 0 }],
    prepTime: 15, // minutes
    specialInstructions: ''
  });

  // Mock data - In real app, this would come from API
  const mockOrders = [
    {
      _id: '1',
      orderId: 'ZO001',
      customerName: 'John Doe',
      customerPhone: '+91 9876543210',
      customerAddress: 'Sector 43, Gurugram',
      items: [
        { name: 'Butter Chicken', quantity: 2, price: 350 },
        { name: 'Naan', quantity: 4, price: 60 }
      ],
      totalAmount: 940,
      prepTime: 25,
      status: 'PREP',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      estimatedDelivery: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
      assignedPartner: null,
      specialInstructions: 'Extra spicy'
    },
    {
      _id: '2',
      orderId: 'ZO002',
      customerName: 'Jane Smith',
      customerPhone: '+91 8765432109',
      customerAddress: 'DLF Phase 2, Gurugram',
      items: [
        { name: 'Margherita Pizza', quantity: 1, price: 450 },
        { name: 'Coke', quantity: 2, price: 50 }
      ],
      totalAmount: 550,
      prepTime: 20,
      status: 'ON_ROUTE',
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      estimatedDelivery: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      assignedPartner: { _id: 'p1', name: 'Raj Kumar', phone: '+91 7654321098' },
      specialInstructions: ''
    },
    {
      _id: '3',
      orderId: 'ZO003',
      customerName: 'Mike Johnson',
      customerPhone: '+91 7543210987',
      customerAddress: 'Cyber City, Gurugram',
      items: [
        { name: 'Biryani', quantity: 1, price: 320 },
        { name: 'Raita', quantity: 1, price: 80 }
      ],
      totalAmount: 400,
      prepTime: 30,
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
      estimatedDelivery: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      assignedPartner: { _id: 'p2', name: 'Suresh Singh', phone: '+91 6543210876' },
      specialInstructions: 'Call before delivery'
    }
  ];

  const mockPartners = [
    {
      _id: 'p1',
      name: 'Raj Kumar',
      phone: '+91 7654321098',
      availability: 'BUSY',
      currentOrder: '2',
      rating: 4.8,
      totalDeliveries: 156
    },
    {
      _id: 'p2',
      name: 'Suresh Singh',
      phone: '+91 6543210876',
      availability: 'AVAILABLE',
      currentOrder: null,
      rating: 4.6,
      totalDeliveries: 143
    },
    {
      _id: 'p3',
      name: 'Amit Sharma',
      phone: '+91 5432109765',
      availability: 'AVAILABLE',
      currentOrder: null,
      rating: 4.9,
      totalDeliveries: 189
    },
    {
      _id: 'p4',
      name: 'Rohit Verma',
      phone: '+91 4321098654',
      availability: 'OFFLINE',
      currentOrder: null,
      rating: 4.4,
      totalDeliveries: 98
    }
  ];

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  // Listen for quick action events
  useEffect(() => {
    const handleOpenCreateOrderModal = () => {
      setShowCreateModal(true);
    };

    window.addEventListener('openCreateOrderModal', handleOpenCreateOrderModal);
    
    return () => {
      window.removeEventListener('openCreateOrderModal', handleOpenCreateOrderModal);
    };
  }, []);

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const generateOrderId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `ZO${timestamp}`;
  };

  const calculateTotalAmount = (items) => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const calculateDispatchTime = (prepTime) => {
    const eta = 25; // Estimated delivery time in minutes
    return prepTime + eta;
  };

  const handleCreateOrder = () => {
    if (!newOrder.customerName || !newOrder.customerPhone || !newOrder.customerAddress) {
      toast.error('Please fill all customer details');
      return;
    }

    if (newOrder.items.some(item => !item.name || item.quantity <= 0 || item.price <= 0)) {
      toast.error('Please fill all item details correctly');
      return;
    }

    if (newOrder.prepTime <= 0) {
      toast.error('Prep time must be positive');
      return;
    }

    const order = {
      _id: Date.now().toString(),
      orderId: newOrder.orderId || generateOrderId(),
      ...newOrder,
      totalAmount: calculateTotalAmount(newOrder.items),
      status: 'PREP',
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + calculateDispatchTime(newOrder.prepTime) * 60 * 1000).toISOString(),
      assignedPartner: null
    };

    setOrders(prev => [order, ...prev]);
    setShowCreateModal(false);
    setNewOrder({
      orderId: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ name: '', quantity: 1, price: 0 }],
      prepTime: 15,
      specialInstructions: ''
    });
    toast.success('Order created successfully!');
  };

  const handleAssignPartner = (partnerId) => {
    const partner = partners.find(p => p._id === partnerId);
    if (!partner || partner.availability !== 'AVAILABLE') {
      toast.error('Partner is not available');
      return;
    }

    // Update order
    const updatedOrders = orders.map(order =>
      order._id === selectedOrder._id
        ? { ...order, assignedPartner: partner }
        : order
    );

    // Update partner availability
    const updatedPartners = partners.map(p =>
      p._id === partnerId
        ? { ...p, availability: 'BUSY', currentOrder: selectedOrder._id }
        : p
    );

    setOrders(updatedOrders);
    setPartners(updatedPartners);
    setShowAssignModal(false);
    setSelectedOrder(null);
    toast.success(`Partner ${partner.name} assigned successfully!`);
  };

  const addNewItem = () => {
    setNewOrder(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (newOrder.items.length > 1) {
      setNewOrder(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index, field, value) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: field === 'quantity' || field === 'price' ? Number(value) : value } : item
      )
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PREP: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Preparing' },
      PICKED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon, text: 'Picked Up' },
      ON_ROUTE: { color: 'bg-purple-100 text-purple-800', icon: TruckIcon, text: 'On Route' },
      DELIVERED: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Delivered' },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Cancelled' }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-1" />
        {config.text}
      </span>
    );
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvailablePartners = () => {
    return partners.filter(partner => partner.availability === 'AVAILABLE');
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
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="mt-2 text-gray-600">Manage restaurant orders and assign delivery partners</p>
        </div>
        {user?.role === 'manager' && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Order
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID or Customer..."
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
              <option value="all">All Status</option>
              <option value="PREP">Preparing</option>
              <option value="PICKED">Picked Up</option>
              <option value="ON_ROUTE">On Route</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Total Orders: <span className="font-semibold ml-1">{filteredOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items & Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">#{order.orderId}</div>
                      <div className="text-xs text-gray-500">{formatTime(order.createdAt)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerPhone}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">{order.customerAddress}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-gray-900">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="truncate">
                            {item.name} x{item.quantity}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm font-bold text-gray-900 mt-1">₹{order.totalAmount}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-xs text-gray-500">Prep: {order.prepTime}min</div>
                      <div className="text-xs text-gray-500">
                        ETA: {formatTime(order.estimatedDelivery)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.assignedPartner ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.assignedPartner.name}</div>
                        <div className="text-xs text-gray-500">{order.assignedPartner.phone}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === 'PREP' && !order.assignedPartner && user?.role === 'manager' && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowAssignModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Assign Partner
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No orders found</div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Create New Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Customer Details</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order ID (Optional)</label>
                  <input
                    type="text"
                    value={newOrder.orderId}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, orderId: e.target.value }))}
                    placeholder="Auto-generated if empty"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
                  <input
                    type="text"
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customerName: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                  <input
                    type="tel"
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Address *</label>
                  <textarea
                    value={newOrder.customerAddress}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, customerAddress: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prep Time (minutes) *</label>
                  <input
                    type="number"
                    value={newOrder.prepTime}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, prepTime: Number(e.target.value) }))}
                    min="1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                  <textarea
                    value={newOrder.specialInstructions}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-900">Order Items</h4>
                  <button
                    onClick={addNewItem}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {newOrder.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                        {newOrder.items.length > 1 && (
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            min="1"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Price ₹"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                            min="0"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3">
                  <div className="text-lg font-bold text-gray-900">
                    Total: ₹{calculateTotalAmount(newOrder.items)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Estimated Dispatch: {calculateDispatchTime(newOrder.prepTime)} minutes
                  </div>
                </div>
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
                onClick={handleCreateOrder}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Partner Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-96 shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Assign Partner
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Order: <span className="font-medium">#{selectedOrder.orderId}</span>
              </p>
              <p className="text-sm text-gray-600">
                Customer: <span className="font-medium">{selectedOrder.customerName}</span>
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {getAvailablePartners().map((partner) => (
                <div
                  key={partner._id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAssignPartner(partner._id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{partner.name}</div>
                      <div className="text-sm text-gray-500">{partner.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">★ {partner.rating}</div>
                      <div className="text-xs text-gray-500">{partner.totalDeliveries} deliveries</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {getAvailablePartners().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No available partners at the moment
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage; 