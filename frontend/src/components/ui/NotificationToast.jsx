import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
  ShoppingBagIcon,
  TruckIcon,
  ClockIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

const NOTIFICATION_ICONS = {
  order_created: ShoppingBagIcon,
  order_updated: ClockIcon,
  order_assigned: TruckIcon,
  partner_assigned: TruckIcon,
  partner_status_changed: TruckIcon,
  system: BellIcon,
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
};

const NOTIFICATION_STYLES = {
  order_created: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200'
  },
  order_updated: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-800 dark:text-yellow-200'
  },
  order_assigned: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-800 dark:text-green-200'
  },
  partner_assigned: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400',
    text: 'text-purple-800 dark:text-purple-200'
  },
  partner_status_changed: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: 'text-indigo-600 dark:text-indigo-400',
    text: 'text-indigo-800 dark:text-indigo-200'
  },
  system: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
    text: 'text-gray-800 dark:text-gray-200'
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    text: 'text-green-800 dark:text-green-200'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    text: 'text-red-800 dark:text-red-200'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    text: 'text-yellow-800 dark:text-yellow-200'
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-800 dark:text-blue-200'
  }
};

const NotificationToast = ({ 
  notification, 
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  const IconComponent = NOTIFICATION_ICONS[notification.type] || BellIcon;
  const styles = NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.info;

  // Auto close timer
  React.useEffect(() => {
    if (autoClose && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.(notification.id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, notification.id, onClose]);

  const handleAction = (action) => {
    if (action.handler) {
      action.handler();
    }
    onClose?.(notification.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden",
        styles.bg,
        styles.border
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <IconComponent className={cn("h-6 w-6", styles.icon)} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={cn("text-sm font-medium", styles.text)}>
              {notification.title}
            </p>
            {notification.message && (
              <p className={cn("mt-1 text-sm", styles.text, "opacity-80")}>
                {notification.message}
              </p>
            )}
            {notification.data && (
              <div className="mt-2 text-xs opacity-70">
                {notification.type === 'order_created' && (
                  <div className={cn("space-y-1", styles.text)}>
                    <p>Order ID: #{notification.data.orderId}</p>
                    <p>Customer: {notification.data.customerName}</p>
                    <p>Amount: ₹{notification.data.amount}</p>
                  </div>
                )}
                {notification.type === 'order_assigned' && (
                  <div className={cn("space-y-1", styles.text)}>
                    <p>Order ID: #{notification.data.orderId}</p>
                    <p>Partner: {notification.data.partnerName}</p>
                    <p>ETA: {notification.data.eta}</p>
                  </div>
                )}
                {notification.type === 'partner_status_changed' && (
                  <div className={cn("space-y-1", styles.text)}>
                    <p>Partner: {notification.data.partnerName}</p>
                    <p>Status: {notification.data.status}</p>
                  </div>
                )}
              </div>
            )}
            {notification.actions && notification.actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action)}
                    className={cn(
                      "text-xs font-medium px-3 py-1 rounded-md transition-colors",
                      action.primary ? 
                        "bg-red-600 hover:bg-red-700 text-white" :
                        cn("border", styles.border, styles.text, "hover:bg-black hover:bg-opacity-5")
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onClose?.(notification.id)}
              className={cn(
                "rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500",
                styles.text,
                "opacity-60 hover:opacity-80"
              )}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Progress bar for auto-close */}
      {autoClose && duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          className="h-1 bg-current opacity-30"
        />
      )}
    </motion.div>
  );
};

export default NotificationToast; 