import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import orderService from '../../services/orderService';
import partnerService from '../../services/partnerService';
import { ORDER_STATUS, STATUS_COLORS } from '../../utils/constants';
import { formatDateTime, formatCurrency, formatOrderId } from '../../utils/helpers';
import toast from 'react-hot-toast';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchOrders();
    fetchPartners();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('orderUpdated', handleOrderUpdate);
      socket.on('newOrder', handleNewOrder);
      
      return () => {
        socket.off('orderUpdated');
        socket.off('newOrder');
      };
    }
  }, [socket]);

  const fetchOrders = async () => {
    try {
      const response = await orderService.getAllOrders();
      setOrders(response.data.orders);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await partnerService.getAllPartners();
      setPartners(response.data.partners);
    } catch (error) {
      toast.error('Failed to fetch partners');
    }
  };

  const handleOrderUpdate = (updatedOrder) => {
    setOrders(prev => prev.map(order => 
      order._id === updatedOrder._id ? updatedOrder : order
    ));
  };

  const handleNewOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    toast.success('New order received!');
  };

  const handleAssignPartner = async (partnerId) => {
    try {
      await orderService.assignPartner(selectedOrder._id, partnerId);
      toast.success('Partner assigned successfully!');
      setShowAssignModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign partner');
    }
  };

  const getAvailablePartners = () => {
    return partners.filter(partner => 
      partner.availability === 'AVAILABLE' && !partner.currentOrder
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        <p className="text-gray-600">Manage restaurant orders and assign delivery partners</p>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
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
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatOrderId(order._id)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(order.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.customerName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customerPhone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.assignedPartner ? (
                      <div className="text-sm text-gray-900">
                        {order.assignedPartner.name}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === ORDER_STATUS.PREP && !order.assignedPartner && (
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowAssignModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
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
      </div>

      {/* Assign Partner Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assign Partner to {formatOrderId(selectedOrder._id)}
              </h3>
              
              <div className="space-y-3">
                {getAvailablePartners().length > 0 ? (
                  getAvailablePartners().map(partner => (
                    <div
                      key={partner._id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium">{partner.name}</div>
                        <div className="text-sm text-gray-500">{partner.phone}</div>
                      </div>
                      <button
                        onClick={() => handleAssignPartner(partner._id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                      >
                        Assign
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No available partners at the moment
                  </p>
                )}
              </div>

              <div className="flex justify-end mt-4 space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedOrder(null);
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement; 