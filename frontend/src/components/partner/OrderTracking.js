import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import orderService from '../../services/orderService';
import { ORDER_STATUS, STATUS_COLORS } from '../../utils/constants';
import { formatDateTime, formatCurrency, formatOrderId, canTransitionStatus } from '../../utils/helpers';
import { MapPinIcon, ClockIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const OrderTracking = ({ partnerId }) => {
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchCurrentOrder();
  }, [partnerId]);

  useEffect(() => {
    if (socket) {
      socket.on('orderAssigned', handleOrderAssigned);
      socket.on('orderUpdated', handleOrderUpdate);
      
      return () => {
        socket.off('orderAssigned');
        socket.off('orderUpdated');
      };
    }
  }, [socket]);

  const fetchCurrentOrder = async () => {
    try {
      const response = await orderService.getPartnerCurrentOrder(partnerId);
      setCurrentOrder(response.data.order);
    } catch (error) {
      if (error.response?.status !== 404) {
        toast.error('Failed to fetch current order');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAssigned = (order) => {
    setCurrentOrder(order);
    toast.success('New order assigned to you!');
  };

  const handleOrderUpdate = (updatedOrder) => {
    if (currentOrder && currentOrder._id === updatedOrder._id) {
      setCurrentOrder(updatedOrder);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    if (!currentOrder || !canTransitionStatus(currentOrder.status, newStatus)) {
      toast.error('Invalid status transition');
      return;
    }

    setUpdating(true);
    try {
      await orderService.updateOrderStatus(currentOrder._id, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      
      if (newStatus === ORDER_STATUS.DELIVERED) {
        setCurrentOrder(null);
        toast.success('Order completed! You are now available for new orders.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      [ORDER_STATUS.PREP]: ORDER_STATUS.PICKED,
      [ORDER_STATUS.PICKED]: ORDER_STATUS.ON_ROUTE,
      [ORDER_STATUS.ON_ROUTE]: ORDER_STATUS.DELIVERED
    };
    return statusFlow[currentStatus];
  };

  const getStatusActions = (status) => {
    switch (status) {
      case ORDER_STATUS.PREP:
        return {
          action: 'Pick Up Order',
          description: 'Confirm you have picked up the order from the restaurant',
          nextStatus: ORDER_STATUS.PICKED
        };
      case ORDER_STATUS.PICKED:
        return {
          action: 'Start Delivery',
          description: 'Mark as on route to customer location',
          nextStatus: ORDER_STATUS.ON_ROUTE
        };
      case ORDER_STATUS.ON_ROUTE:
        return {
          action: 'Deliver Order',
          description: 'Confirm order has been delivered to customer',
          nextStatus: ORDER_STATUS.DELIVERED
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="text-center py-12">
        <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Orders</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have any active orders at the moment. New orders will appear here when assigned.
        </p>
      </div>
    );
  }

  const statusAction = getStatusActions(currentOrder.status);

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Order Header */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Current Order {formatOrderId(currentOrder._id)}
          </h2>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[currentOrder.status]}`}>
            {currentOrder.status}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Order Time</p>
              <p className="text-sm font-medium">{formatDateTime(currentOrder.createdAt)}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <CurrencyRupeeIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Order Value</p>
              <p className="text-sm font-medium">{formatCurrency(currentOrder.totalAmount)}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-500">Distance</p>
              <p className="text-sm font-medium">2.5 km</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-sm font-medium">{currentOrder.customerName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-sm font-medium">{currentOrder.customerPhone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Delivery Address</p>
            <p className="text-sm font-medium">{currentOrder.deliveryAddress}</p>
          </div>
        </div>
      </div>

      {/* Restaurant Details */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Restaurant Details</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Restaurant</p>
            <p className="text-sm font-medium">{currentOrder.restaurantName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="text-sm font-medium">{currentOrder.restaurantAddress}</p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
        <div className="space-y-3">
          {currentOrder.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center font-medium">
              <p>Total Amount</p>
              <p>{formatCurrency(currentOrder.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Actions */}
      {statusAction && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Next Action</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">{statusAction.description}</p>
              <button
                onClick={() => updateOrderStatus(statusAction.nextStatus)}
                disabled={updating}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Updating...' : statusAction.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking; 