import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
import AssignPartnerModal from '../components/AssignPartnerModal';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Initialize with empty orders - no mock data
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [availablePartners, setAvailablePartners] = useState([]);
  const [socket, setSocket] = useState(null);
  const [newOrder, setNewOrder] = useState({
    orderId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [{ name: '', quantity: 1, price: 0 }],
    prepTime: 15, // minutes
    specialInstructions: ''
  });

  useEffect(() => {
    // Load orders from backend API only
    loadOrders();
    loadAvailablePartners();
  }, []);

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

  // Initialize Socket.IO connection
  useEffect(() => {
    if (user && user.role === 'manager') {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      // Join manager room
      newSocket.emit('join_room', {
        role: 'manager',
        userId: user._id || user.id,
        userEmail: user.email
      });

      // Listen for order assignment confirmations
      newSocket.on('order_assigned', (data) => {
        console.log('📦 Order assignment confirmed:', data);
        
        // Update local orders state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === data.order?._id 
              ? { ...order, assignedPartner: data.partnerId, assignedPartnerName: data.partnerName }
              : order
          )
        );
        
        toast.success(`✅ Order ${data.order?.orderId} assigned to ${data.partnerName}`);
      });

      // Listen for order status updates
      newSocket.on('order_status_updated', (data) => {
        console.log('📝 Order status updated:', data);
        
        // Update local orders state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === data.order?._id 
              ? { ...order, status: data.newStatus }
              : order
          )
        );
        
        toast.success(`📝 Order ${data.order?.orderId} status: ${data.newStatus}`);
      });

      // Listen for partner status updates
      newSocket.on('order_status_update', (data) => {
        console.log('🔄 Partner status update received:', data);
        
        // Update local orders state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === data.orderId 
              ? { 
                  ...order, 
                  status: data.status,
                  lastUpdated: data.updatedAt || new Date().toISOString()
                }
              : order
          )
        );
        
        // Show notification with partner info
        toast.success(
          `📦 Order ${data.orderNumber} → ${data.status} by ${data.partnerName}`,
          { duration: 4000 }
        );
      });

      // Listen for manager notifications
      newSocket.on('notify_managers', (data) => {
        console.log('📢 Manager notification:', data);
        
        if (data.type === 'order_status_updated') {
          // Update local orders state
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order._id === data.orderId 
                ? { 
                    ...order, 
                    status: data.newStatus,
                    lastUpdated: data.timestamp
                  }
                : order
            )
          );
          
          // Show detailed notification
          toast.success(
            <div className="space-y-1">
              <div className="font-medium">Order Status Updated</div>
              <div className="text-sm">
                Order #{data.orderNumber} → {data.newStatus}
              </div>
              <div className="text-xs text-gray-600">
                By {data.partnerName} • {data.customerName}
              </div>
            </div>,
            { duration: 5000 }
          );
        }
      });

      // Listen for partner availability updates
      newSocket.on('partner_available', (data) => {
        console.log('👥 Partner available:', data);
        
        // Update partners state
        setPartners(prevPartners => 
          prevPartners.map(partner => 
            partner._id === data.partnerId 
              ? { ...partner, status: 'available', currentOrder: null }
              : partner
          )
        );
        
        toast.success(`🟢 ${data.partnerName} is now available`);
      });

      // Listen for partner order requests
      newSocket.on('partner_order_request', (data) => {
        console.log('📝 Partner order request received:', data);
        
        const { orderId, partnerId, partnerName, partnerEmail, message } = data;
        
        // Show notification with action buttons
        toast.custom(
          (t) => (
            <div className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">🚚</span>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Partner Request
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {partnerName} wants order #{orderId}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={async () => {
                          toast.dismiss(t.id);
                          // Find the order and assign it
                          const order = orders.find(o => o.orderId === orderId);
                          if (order && !order.assignedPartner) {
                            try {
                              const response = await orderService.assignPartnerToOrder(order._id, partnerId);
                              if (response.success) {
                                toast.success(`✅ Order assigned to ${partnerName}!`);
                                loadOrders(); // Refresh orders
                              } else {
                                toast.error('Failed to assign order');
                              }
                            } catch (error) {
                              toast.error('Error assigning order: ' + error.message);
                            }
                          } else {
                            toast.error('Order not available for assignment');
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium"
                      >
                        ✅ Assign
                      </button>
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-xs font-medium"
                      >
                        ❌ Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
          {
            duration: 15000, // Show for 15 seconds
            position: 'top-right',
          }
        );
      });

      setSocket(newSocket);

      console.log('🔌 Socket.IO connected for real-time order management');

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  // Listen for real-time Socket.IO events only
  useEffect(() => {
    // Refresh orders when status changes
    const handleRefreshOrders = () => {
      loadOrders();
    };

    // Add event listeners for order updates
    window.addEventListener('order-updated', handleRefreshOrders);
    window.addEventListener('order-assigned', handleRefreshOrders);

    return () => {
      window.removeEventListener('order-updated', handleRefreshOrders);
      window.removeEventListener('order-assigned', handleRefreshOrders);
    };
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading orders from backend API...');
      
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await orderService.getAllOrders(params);
      if (response.success) {
        setOrders(response.data.orders || []);
        console.log('✅ Orders loaded from backend:', response.data.orders?.length || 0);
      } else {
        console.error('❌ Failed to load orders:', response.message);
        toast.error('Failed to load orders');
        setOrders([]);
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      toast.error('Failed to load orders: ' + error.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePartners = async () => {
    try {
      setLoadingPartners(true);
      console.log('👥 Loading partners from all sources...');
      
      let allPartners = [];
      
      // 1. Try backend API first
      try {
        console.log('🔄 Trying backend API...');
        const backendResponse = await partnerService.getAvailablePartners();
        if (backendResponse.success && backendResponse.data) {
          allPartners = backendResponse.data;
          console.log('✅ Backend API returned:', allPartners.length, 'partners');
        }
      } catch (backendError) {
        console.log('⚠️ Backend API failed:', backendError.message);
      }
      
      // 2. If no backend data, try localStorage sources
      if (allPartners.length === 0) {
        console.log('📱 Loading from localStorage...');
        
        // Check 'manager_partners' (from PartnersPage.jsx)
        const managerPartners = JSON.parse(localStorage.getItem('manager_partners') || '[]');
        console.log('📊 Found in manager_partners:', managerPartners.length);
        
        // Check 'registered_partners' (from previous system)
        const registeredPartners = JSON.parse(localStorage.getItem('registered_partners') || '[]');
        console.log('📊 Found in registered_partners:', registeredPartners.length);
        
        // Combine both sources and remove duplicates
        const combinedPartners = [...managerPartners, ...registeredPartners];
        
        // Remove duplicates based on phone number
        const uniquePartners = combinedPartners.filter((partner, index, self) => 
          index === self.findIndex(p => p.phone === partner.phone)
        );
        
        allPartners = uniquePartners;
        console.log('📊 Total unique partners from localStorage:', allPartners.length);
      }
      
      // 3. Filter to show valid partners (removed demo partner filtering)
      const validPartners = allPartners.filter(partner => {
        // Must have basic required info
        const hasBasicInfo = partner.name && 
                            partner.phone && 
                            partner.name.trim().length > 0 &&
                            partner.phone.trim().length > 0;
        
        // Only filter out obviously fake/test data
        const isInvalidPartner = partner.name === 'Test Partner' ||
                                partner.name === 'Demo User' ||
                                partner.phone === '0000000000' ||
                                partner.phone === '1234567890';
        
        console.log(`🔍 Partner ${partner.name}: hasBasicInfo=${hasBasicInfo}, isInvalidPartner=${isInvalidPartner}`);
        
        return hasBasicInfo && !isInvalidPartner;
      });
      
      console.log('✅ Valid partners after filtering:', validPartners.length);
      
      // 4. Add display data and prepare for assignment
      const partnersToShow = validPartners.map(partner => ({
        ...partner,
        // Ensure we have an _id
        _id: partner._id || partner.id || `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        // Add display data
        lastSeen: new Date(),
        estimatedArrival: Math.floor(Math.random() * 15) + 10,
        isOnline: ['available', 'online', 'ONLINE', true].includes(partner.status || partner.availability || partner.isAvailable),
        locationText: partner.location || partner.address || 'Location not specified',
        status: partner.status || partner.availability || (partner.isAvailable ? 'available' : 'offline'),
        // Ensure rating and deliveries
        rating: partner.rating || partner.avgRating || partner.stats?.rating || 4.5,
        completedDeliveries: partner.completedDeliveries || partner.totalDeliveries || partner.todayDeliveries || partner.stats?.completedOrders || 0,
        vehicleType: partner.vehicleType || 'bike'
      }));
      
      setAvailablePartners(partnersToShow);
      
      console.log('✅ Partners loaded for assignment:');
      partnersToShow.forEach(partner => {
        console.log(`- ${partner.name} (${partner.phone}) - Status: ${partner.status} - Available: ${partner.isOnline}`);
      });
      
      if (partnersToShow.length === 0) {
        console.log('ℹ️ No partners available. Check:');
        console.log('1. Partners added in Partners page');
        console.log('2. Backend API connection');
        console.log('3. Partner data structure');
        toast.info('No partners available. Please add partners first.');
      }
      
    } catch (error) {
      console.error('❌ Error loading partners:', error);
      toast.error('Failed to load partners');
      setAvailablePartners([]);
    } finally {
      setLoadingPartners(false);
    }
  };

  const filterOrders = () => {
    // Ensure orders is always an array
    let filtered = orders || [];

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleCreateOrder = async () => {
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

    try {
      const orderData = {
      orderId: newOrder.orderId || generateOrderId(),
      ...newOrder,
        totalAmount: calculateTotalAmount(newOrder.items)
      };

      console.log('📦 Creating order via backend API...');
      const response = await orderService.createOrder(orderData);
      
      if (response.success) {
        console.log('✅ Order created successfully:', response.data.orderId);
        
        // Add to local state
        setOrders(prevOrders => [response.data, ...prevOrders]);
        
        // Reset form
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
        
    toast.success('📦 Order created successfully!');
        
        // Refresh orders list
        loadOrders();
      } else {
        throw new Error(response.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('❌ Error creating order:', error);
      toast.error('Failed to create order: ' + error.message);
    }
  };

  const handleAssignPartner = async (partnerId) => {
    const partner = availablePartners.find(p => p._id === partnerId);
    if (!partner) {
      toast.error('Partner not found');
      return;
    }

    try {
      console.log('🔄 Assigning partner via backend API...');
      console.log('📋 Order:', selectedOrder.orderId, 'Partner:', partner.name);
      
      const response = await orderService.assignPartnerToOrder(selectedOrder._id, partnerId);
      
      if (response.success) {
          console.log('✅ Partner assigned successfully via backend');
          
          // Update local state with backend response
        const updatedOrder = response.data;
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === selectedOrder._id ? updatedOrder : order
          )
        );
        
        setShowAssignModal(false);
        setSelectedOrder(null);
        toast.success(`✅ Partner ${partner.name} assigned successfully!`);
        
        // Refresh orders list
        loadOrders();
      } else {
        throw new Error(response.message || 'Failed to assign partner');
      }
      
    } catch (error) {
      console.error('❌ Error assigning partner:', error);
      toast.error('Failed to assign partner: ' + error.message);
    }
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
              {(filteredOrders || []).map((order) => (
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
                        {(order.items || []).map((item, idx) => (
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
                        <div className="text-sm font-medium text-gray-900">{order.assignedPartnerName}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === 'PREP' && !order.assignedPartner && user?.role === 'manager' && (
                      <button
                        onClick={async () => {
                          setSelectedOrder(order);
                          setShowAssignModal(true);
                          // Load partners in real-time when modal opens
                          await loadAvailablePartners();
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

        {(filteredOrders || []).length === 0 && (
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
              {loadingPartners && (
                <div className="mt-2 text-sm text-blue-600 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Loading available partners...
                </div>
              )}
            </div>

            {loadingPartners ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availablePartners.map((partner) => (
                  <div
                    key={partner._id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleAssignPartner(partner._id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-gray-900">{partner.name}</div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            partner.status === 'available' 
                              ? 'bg-green-100 text-green-800' 
                              : partner.status === 'offline'
                              ? 'bg-gray-100 text-gray-800'
                              : partner.status === 'online'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {partner.status === 'available' ? '🟢 Available' : 
                             partner.status === 'online' ? '🔵 Online' :
                             partner.status === 'offline' ? '⚫ Offline' : '🔴 Busy'}
                          </span>
                          {partner.isOnline && partner.status !== 'available' && partner.status !== 'online' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              🔵 Online
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{partner.phone}</div>
                        <div className="text-xs text-gray-400">{partner.locationText}</div>
                        <div className="text-xs text-green-600 mt-1">
                          ETA: ~{partner.estimatedArrival} minutes
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">★ {partner.rating || 4.5}</div>
                        <div className="text-xs text-gray-500">{partner.completedDeliveries || partner.totalDeliveries || 0} deliveries</div>
                        <div className="text-xs text-blue-600">{partner.vehicleType || 'bike'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingPartners && availablePartners.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-lg mb-2">👥</div>
                <div className="font-medium">No delivery partners available</div>
                <div className="text-sm mb-4">Add delivery partners to assign orders</div>
                
                {/* Debug Information */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left text-xs">
                  <div className="font-medium mb-2">🔍 Debug Info:</div>
                  <div>manager_partners: {JSON.parse(localStorage.getItem('manager_partners') || '[]').length} partners</div>
                  <div>registered_partners: {JSON.parse(localStorage.getItem('registered_partners') || '[]').length} partners</div>
                  <div className="mt-2">
                    <div className="font-medium">Manager Partners:</div>
                    {JSON.parse(localStorage.getItem('manager_partners') || '[]').map((p, i) => (
                      <div key={i} className="ml-2">• {p.name} ({p.phone}) - {p.availability || p.status}</div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <div className="font-medium">Registered Partners:</div>
                    {JSON.parse(localStorage.getItem('registered_partners') || '[]').map((p, i) => (
                      <div key={i} className="ml-2">• {p.name} ({p.phone}) - {p.availability || p.status}</div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      // Navigate to partners page to add new partners
                      navigate('/partners');
                    }}
                    className="block mx-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    ➕ Add Delivery Partners
                  </button>
                  <button
                    onClick={loadAvailablePartners}
                    className="block mx-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    🔄 Refresh Partners
                  </button>
                  <button
                    onClick={() => {
                      console.log('🧪 Testing localStorage assignment...');
                      console.log('Available partners:', availablePartners);
                      console.log('Selected order:', selectedOrder);
                      console.log('Current user:', user);
                      toast.success('Check console for debug info');
                    }}
                    className="block mx-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    🧪 Debug Info
                  </button>
                </div>
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