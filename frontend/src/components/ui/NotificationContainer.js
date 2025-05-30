import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNotifications } from '../../context/NotificationContext';
import NotificationToast from './NotificationToast';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();

  // Create portal root if it doesn't exist
  const getPortalRoot = () => {
    let portalRoot = document.getElementById('notification-portal');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'notification-portal';
      portalRoot.className = 'fixed inset-0 pointer-events-none z-50';
      document.body.appendChild(portalRoot);
    }
    return portalRoot;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const NotificationList = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="fixed top-4 right-4 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            layout
            className="pointer-events-auto"
          >
            <NotificationToast
              notification={notification}
              onClose={removeNotification}
              autoClose={notification.autoClose !== false}
              duration={notification.duration || 5000}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  // Render nothing if no notifications
  if (!notifications.length) {
    return null;
  }

  // Use portal to render notifications outside the normal component tree
  return createPortal(<NotificationList />, getPortalRoot());
};

export default NotificationContainer; 
