import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlinePartners, setOnlinePartners] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeSocket();
    }

    return () => {
      if (socket) {
        console.log('🔌 Disconnecting socket...');
        socket.disconnect();
      }
    };
  }, [user]);

  const initializeSocket = () => {
    console.log('🔌 Initializing socket connection...');
    
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setConnected(true);
      
      // Join role-based room
      if (user?.role) {
        console.log('🏠 Joining rooms for user:', user.name, 'Role:', user.role, 'ID:', user._id || user.id);
      newSocket.emit('join_room', {
          role: user.role,
          userId: user._id || user.id
        });
        
        // Confirm room joining
        setTimeout(() => {
          console.log('✅ Rooms joined successfully for:', user.role, user._id || user.id);
        }, 1000);
      }

      toast.success('🟢 Connected to real-time updates', {
        duration: 2000,
        position: 'bottom-right'
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
      toast.error('🔴 Disconnected from real-time updates', {
        duration: 2000,
          position: 'bottom-right'
        });
    });

    // Listen for partner status changes
    newSocket.on('partner_status_changed', (data) => {
      console.log('👥 Partner status changed:', data);
      updatePartnerStatus(data.partnerId, data.status, data.location);
    });

    // Listen for partner availability
    newSocket.on('partner_available', (data) => {
      console.log('✅ Partner available:', data);
      addOnlinePartner(data.partnerId);
    });

    // Listen for new orders (for partners)
    newSocket.on('new_order_available', (orderData) => {
      console.log('📦 New order available:', orderData);
      // Dispatch event for partner dashboard
      window.dispatchEvent(new CustomEvent('newOrderAvailable', {
        detail: { order: orderData }
      }));
        
      toast.success(`🔔 New order available: ${orderData.orderId}`, {
          duration: 5000,
        position: 'top-right',
        style: {
          background: '#f0f9ff',
          border: '1px solid #0ea5e9',
          color: '#0369a1'
      }
    });
    });

    // Listen for order assignments
    newSocket.on('order_assigned', (data) => {
      console.log('👤 Order assigned:', data);
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('orderAssigned', {
        detail: data
      }));
    });

    // Listen for order status updates
    newSocket.on('order_status_updated', (data) => {
      console.log('📝 Order status updated:', data);
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('orderStatusChanged', {
        detail: data
      }));
    });

    setSocket(newSocket);
  };

  const updatePartnerStatus = (partnerId, status, location) => {
    setOnlinePartners(prev => {
      const updated = prev.filter(p => p.id !== partnerId);
      
      if (status === 'available') {
        updated.push({
          id: partnerId,
          status: 'available',
          location: location,
          lastSeen: new Date()
        });
      }
      
      return updated;
    });

    // Update in localStorage as well
    const allPartners = JSON.parse(localStorage.getItem('registered_partners') || '[]');
    const updatedPartners = allPartners.map(partner => 
      partner._id === partnerId 
        ? { ...partner, status, location, lastSeen: new Date().toISOString() }
        : partner
    );
    localStorage.setItem('registered_partners', JSON.stringify(updatedPartners));
  };

  const addOnlinePartner = (partnerId) => {
    setOnlinePartners(prev => {
      const exists = prev.some(p => p.id === partnerId);
      if (exists) return prev;
      
      return [...prev, {
        id: partnerId,
        status: 'available',
        lastSeen: new Date()
      }];
    });
  };

  const removeOnlinePartner = (partnerId) => {
    setOnlinePartners(prev => prev.filter(p => p.id !== partnerId));
  };

  // Enhanced emission helpers with comprehensive data
  const emitPartnerStatusUpdate = (partnerId, status, location) => {
    if (socket) {
      socket.emit('partner_status_update', {
        partnerId,
        status,
        location,
        timestamp: new Date()
        });
    }
  };

  const emitOrderCreated = (orderData) => {
    if (socket) {
      socket.emit('order_created', {
        ...orderData,
        timestamp: new Date()
      });
    }
  };

  const emitOrderAssigned = (orderId, partnerId, partnerName, additionalData = {}) => {
    if (socket) {
      socket.emit('order_assigned', {
        orderId,
        partnerId,
        partnerName,
        ...additionalData,
        timestamp: new Date()
      });
    }
  };

  const emitOrderStatusUpdate = (orderId, status, partnerId, partnerName) => {
    if (socket) {
      socket.emit('order_status_update', {
        orderId,
        status,
        partnerId,
        partnerName,
        timestamp: new Date()
      });
      }
  };

  const emitPartnerLocationUpdate = (partnerId, location) => {
    if (socket && connected) {
      socket.emit('partner_location_update', {
        partnerId,
        location,
        timestamp: new Date()
      });
    }
  };

  const value = {
    socket,
    connected,
    onlinePartners,
    emitPartnerStatusUpdate,
    emitOrderCreated,
    emitOrderAssigned,
    emitOrderStatusUpdate,
    emitPartnerLocationUpdate,
    updatePartnerStatus,
    addOnlinePartner,
    removeOnlinePartner
  };

  useEffect(() => {
    if (socket && user) {
      // Enhanced event listeners for partners
      if (user.role === 'partner') {
        // Listen for orders assigned specifically to this partner
        socket.on('order_assigned_to_you', (data) => {
          console.log('🎯 Order assigned to me via Socket.IO:', data);
          console.log('📊 Current user:', user.name, 'ID:', user._id || user.id);
          console.log('📦 Order details:', {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            assignedBy: data.assignedBy
          });
          
          // IMMEDIATE UI notification
          toast.success(
            `🚚 Order ${data.orderNumber} assigned to you!\nCustomer: ${data.customerName}\nEmail: ${data.customerEmail || 'Not provided'}`,
            {
              duration: 6000,
              position: 'top-center',
              style: {
                background: '#f0f9ff',
                border: '2px solid #0ea5e9',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '14px'
              }
            }
          );

          // Store current order details immediately
          const orderDetails = {
            _id: data.orderId,
            orderId: data.orderNumber,
            customerName: data.customerName,
            customerEmail: data.customerEmail || 'Not provided',
            customerPhone: data.customerPhone,
            customerAddress: data.customerAddress,
            totalAmount: data.totalAmount,
            items: data.items || [],
            specialInstructions: data.specialInstructions || '',
            estimatedDeliveryTime: data.estimatedDeliveryTime || 30,
            status: 'PICKED',
            assignedAt: data.assignedAt || new Date().toISOString(),
            assignedBy: data.assignedBy,
            priority: data.priority || 'medium'
          };
          
          console.log('💾 Storing order details in SocketContext:', orderDetails);
          
          // Update partner status to busy
          localStorage.setItem('partner_status', 'busy');
          
          // Store current order details
          localStorage.setItem('current_order', JSON.stringify(orderDetails));
          
          // Update auth data
          const storedAuth = JSON.parse(localStorage.getItem('zomato_auth') || '{}');
          if (storedAuth.user) {
            storedAuth.user.orderStatus = 'PICKED';
            storedAuth.user.currentOrder = data.orderId;
            storedAuth.user.status = 'busy';
            localStorage.setItem('zomato_auth', JSON.stringify(storedAuth));
            console.log('✅ Auth data updated with current order in SocketContext');
          }

          // Dispatch event for partner dashboard to update
          console.log('📢 Dispatching orderAssignedToMe event from SocketContext');
          window.dispatchEvent(new CustomEvent('orderAssignedToMe', {
            detail: data
          }));
          
          // Also dispatch a general refresh event for immediate UI update
          window.dispatchEvent(new CustomEvent('dashboardRefresh', {
            detail: { type: 'orderAssigned', orderData: orderDetails }
          }));

          // Show notification about communication channels
          if (data.notificationsSent && data.notificationsSent.length > 0) {
            const sentChannels = data.notificationsSent
              .filter(n => n.status === 'sent')
              .map(n => n.type)
              .join(', ');
            
            if (sentChannels) {
              toast.info(`📬 Notifications sent via: ${sentChannels}`, {
          duration: 4000,
          position: 'top-right'
        });
            }
          }
        });

        // Listen for orders no longer available
        socket.on('order_no_longer_available', (data) => {
          console.log('❌ Order no longer available:', data);
          
          toast.info(`📦 Order assigned to ${data.assignedTo}`, {
          duration: 3000,
          position: 'top-right'
        });

          // Remove from available orders if exists
          window.dispatchEvent(new CustomEvent('orderNoLongerAvailable', {
            detail: data
          }));
        });

        // Listen for bulk notifications
        socket.on('bulk_notification', (data) => {
          console.log('📢 Bulk notification received:', data);
          
          const toastType = data.type === 'warning' ? toast.error : 
                           data.type === 'success' ? toast.success : 
                           toast.info;
          
          toastType(data.message, {
            duration: 5000,
            position: 'top-center'
          });
        });
      }

      // Enhanced event listeners for managers
      if (user.role === 'manager') {
        // Listen for assignment confirmations
        socket.on('order_assignment_confirmed', (data) => {
          console.log('✅ Order assignment confirmed:', data);
          
          toast.success(
            <div className="space-y-1">
              <div className="font-bold">✅ Assignment Confirmed</div>
              <div className="text-sm">
                Order #{data.orderNumber} assigned to {data.partnerName}
              </div>
              {data.notificationsSent && data.notificationsSent.length > 0 && (
                <div className="text-xs text-green-600">
                  Notifications sent: {data.notificationsSent.map(n => n.type).join(', ')}
                </div>
              )}
            </div>,
            {
              duration: 5000,
              position: 'top-right'
            }
          );

          // Update order list in real-time
          window.dispatchEvent(new CustomEvent('orderAssignmentConfirmed', {
            detail: data
          }));
        });

        // Listen for assignment success
        socket.on('assignment_success', (data) => {
          console.log('🎉 Assignment successful:', data);
          
          toast.success(data.message, {
          duration: 4000,
          position: 'top-right'
        });
    });

        // Listen for assignment errors
        socket.on('assignment_error', (data) => {
          console.error('❌ Assignment error:', data);
          
          toast.error(`Failed to assign order: ${data.error}`, {
            duration: 5000,
            position: 'top-right'
          });
        });
      }

      // Common event listeners for all users
      socket.on('order_status_changed', (data) => {
        console.log('📝 Order status changed:', data);
        
        const statusMessages = {
          'PICKED': `📦 ${data.partnerName} picked up order #${data.orderNumber}`,
          'ON_ROUTE': `🚚 ${data.partnerName} is on route with order #${data.orderNumber}`,
          'DELIVERED': `✅ Order #${data.orderNumber} delivered by ${data.partnerName}`,
          'CANCELLED': `❌ Order #${data.orderNumber} was cancelled`
        };

        if (statusMessages[data.status]) {
          toast.success(statusMessages[data.status], {
            duration: 4000,
            position: 'top-right'
          });
        }

        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('orderStatusChanged', {
          detail: data
        }));
      });

      // Listen for partner status changes
      socket.on('partner_status_changed', (data) => {
      console.log('👤 Partner status changed:', data);
        
        // Update online partners list
        setOnlinePartners(prev => {
          const updated = prev.filter(p => p.id !== data.partnerId);
          if (data.status === 'available' || data.status === 'busy') {
            updated.push({
              id: data.partnerId,
              name: data.partnerName,
              status: data.status,
              lastSeen: data.timestamp
            });
          }
          return updated;
        });

        // Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('partnerStatusChanged', {
          detail: data
        }));
      });

      // Cleanup listeners
    return () => {
        socket.off('order_assigned_to_you');
        socket.off('order_no_longer_available');
        socket.off('bulk_notification');
        socket.off('order_assignment_confirmed');
        socket.off('assignment_success');
        socket.off('assignment_error');
        socket.off('order_status_changed');
        socket.off('partner_status_changed');
      };
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 
