import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  UserIcon,
  MapPinIcon,
  ClockIcon,
  StarIcon,
  TruckIcon,
  WifiIcon,
  SignalIcon,
  UserPlusIcon,
  PhoneIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import Loading from './ui/Loading';
import toast from 'react-hot-toast';
import partnerService from '../services/partnerService';
import orderService from '../services/orderService';

const AssignPartnerModal = ({ isOpen, onClose, order, onAssign }) => {
  const [availablePartners, setAvailablePartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const { onlinePartners, emitOrderAssigned } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && order) {
      loadAvailablePartners();
    }
  }, [isOpen, order, onlinePartners]);

  const loadAvailablePartners = async () => {
    try {
      setLoading(true);
      console.log('👥 Loading available partners for order:', order.orderId);
      
      // Try backend API first
      try {
        console.log('🔄 Fetching partners from backend API...');
        const response = await partnerService.getAvailablePartners();
        
        if (response.success && response.data && response.data.length > 0) {
          console.log('✅ Backend API returned:', response.data.length, 'partners');
          
          // Process backend partners
          const partnersWithRealTimeData = response.data.map(partner => {
            const onlinePartner = onlinePartners.find(op => op.id === partner._id);
            return {
              ...partner,
              isOnline: partner.isAvailable || !!onlinePartner,
              lastSeen: onlinePartner?.lastSeen || new Date(),
              locationText: partner.address || 'Location not specified',
              estimatedArrival: Math.floor(Math.random() * 15) + 10, // 10-25 minutes
              status: partner.isAvailable ? 'available' : 'offline',
              rating: partner.stats?.rating || 4.5,
              completedDeliveries: partner.stats?.totalDeliveries || 0
            };
          });
          
          setAvailablePartners(partnersWithRealTimeData);
          console.log('✅ Available partners loaded from backend:', partnersWithRealTimeData.length);
          return;
        }
      } catch (backendError) {
        console.log('⚠️ Backend API failed:', backendError.message);
      }
      
      // Fallback to localStorage if backend fails
      console.log('📱 Falling back to localStorage...');
      let allPartners = JSON.parse(localStorage.getItem('registered_partners') || '[]');
      
      // If no partners exist, show message
      if (allPartners.length === 0) {
        console.log('ℹ️ No partners found in any source');
        setAvailablePartners([]);
        return;
      }
      
      // Filter available partners
      const availablePartnersData = allPartners.filter(partner => {
        const hasBasicInfo = partner.name && partner.phone;
        const isAvailable = partner.status === 'available' || partner.isAvailable;
        const hasNoCurrentOrder = !partner.currentOrder;
        
        return hasBasicInfo && isAvailable && hasNoCurrentOrder;
      });
      
      // Add real-time data
      const partnersWithRealTimeData = availablePartnersData.map(partner => {
        const onlinePartner = onlinePartners.find(op => op.id === partner._id);
        return {
          ...partner,
          isOnline: !!onlinePartner || partner.status === 'available',
          lastSeen: onlinePartner?.lastSeen || new Date(),
          locationText: partner.location || partner.address || 'Location not specified',
          estimatedArrival: Math.floor(Math.random() * 15) + 10
        };
      });
      
      setAvailablePartners(partnersWithRealTimeData);
      console.log('✅ Available partners loaded from localStorage:', partnersWithRealTimeData.length);
      
    } catch (error) {
      console.error('❌ Error loading available partners:', error);
      toast.error('Failed to load available partners');
      setAvailablePartners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPartner = async (partner) => {
    try {
      setAssigning(true);
      console.log('👤 Assigning partner:', partner.name, 'to order:', order.orderId);
      
      // Use backend API for assignment
      const response = await orderService.assignPartnerToOrder(order._id, partner._id);
      
      if (response.success) {
        console.log('✅ Partner assigned successfully via backend API');
        
        // Show success notification
        toast.success(`✅ Order ${order.orderId} assigned to ${partner.name}`, {
          duration: 4000,
          position: 'top-right'
        });
        
        // Call parent callback to update orders list
        if (onAssign) {
          onAssign(order._id, partner);
        }
        
        console.log('🎉 Order assignment completed successfully!');
        onClose();
      } else {
        throw new Error(response.message || 'Failed to assign partner');
      }
      
    } catch (error) {
      console.error('❌ Error assigning partner:', error);
      toast.error('Failed to assign partner: ' + error.message);
    } finally {
      setAssigning(false);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Assign Delivery Partner</h2>
                <p className="text-red-100 text-sm">
                  Order: #{order?.orderId} • Customer: {order?.customerName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-red-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loading size="lg" text="Finding available partners..." />
              </div>
            ) : availablePartners.length === 0 ? (
              <div className="text-center py-12">
                <TruckIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Available Partners
                </h3>
                <p className="text-gray-600 mb-6">
                  All partners are currently busy or offline. Please try again later or add new partners.
                </p>
                <Button
                  onClick={loadAvailablePartners}
                  variant="secondary"
                  className="mx-auto"
                >
                  Refresh Partners
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Available Partners ({availablePartners.length})
                  </h3>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center text-green-600 text-sm">
                      <WifiIcon className="h-4 w-4 mr-1" />
                      Live Status
                    </div>
                    <Button
                      onClick={loadAvailablePartners}
                      variant="secondary"
                      size="sm"
                    >
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-3">
                  {availablePartners.map((partner, index) => (
                    <motion.div
                      key={partner._id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 bg-white"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg">
                                {partner.name.charAt(0)}
                              </span>
                            </div>
                            {/* Status indicator */}
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                              partner.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                          </div>

                          {/* Partner Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">{partner.name}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                partner.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {partner.isOnline ? 'Available' : 'Offline'}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                              <div className="flex items-center">
                                <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                                <span>{partner.rating}</span>
                              </div>
                              <div className="flex items-center">
                                <TruckIcon className="h-4 w-4 mr-1" />
                                <span>{partner.completedDeliveries} deliveries</span>
                              </div>
                              <div className="flex items-center">
                                <PhoneIcon className="h-4 w-4 mr-1" />
                                <span>{partner.phone}</span>
                              </div>
                              <div className="flex items-center">
                                <UserIcon className="h-4 w-4 mr-1" />
                                <span>{partner.vehicleType}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center mt-1 text-xs text-gray-500">
                              <MapPinIcon className="h-3 w-3 mr-1" />
                              <span>{partner.locationText}</span>
                              <span className="mx-2">•</span>
                              <ClockIcon className="h-3 w-3 mr-1" />
                              <span>~{partner.estimatedArrival}min</span>
                            </div>
                          </div>
                        </div>

                        {/* Assign Button */}
                        <Button
                          onClick={() => handleAssignPartner(partner)}
                          loading={assigning}
                          size="sm"
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        >
                          Assign
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AssignPartnerModal; 