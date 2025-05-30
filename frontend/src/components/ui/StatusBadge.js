import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { statusPulse, scaleIn } from '../../utils/animations';

const statusStyles = {
  // Order Status Styles
  PREP: {
    container: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    pulse: true
  },
  PICKED: {
    container: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    pulse: true
  },
  ON_ROUTE: {
    container: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
    pulse: true
  },
  DELIVERED: {
    container: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    pulse: false
  },
  CANCELLED: {
    container: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    pulse: false
  },
  
  // Partner Status Styles
  available: {
    container: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    pulse: true
  },
  busy: {
    container: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    pulse: true
  },
  offline: {
    container: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
    pulse: false
  },
  
  // Priority Styles
  high: {
    container: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    pulse: true
  },
  medium: {
    container: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    pulse: false
  },
  low: {
    container: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    pulse: false
  },
  
  // Generic Styles
  success: {
    container: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    pulse: false
  },
  warning: {
    container: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    pulse: false
  },
  error: {
    container: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    pulse: false
  },
  info: {
    container: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    pulse: false
  },
  neutral: {
    container: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
    pulse: false
  }
};

const sizeStyles = {
  sm: {
    container: 'px-2 py-1 text-xs',
    dot: 'w-1.5 h-1.5',
    gap: 'gap-1'
  },
  md: {
    container: 'px-2.5 py-1.5 text-sm',
    dot: 'w-2 h-2',
    gap: 'gap-1.5'
  },
  lg: {
    container: 'px-3 py-2 text-base',
    dot: 'w-2.5 h-2.5',
    gap: 'gap-2'
  }
};

const StatusBadge = React.forwardRef(({
  status,
  children,
  size = 'md',
  showDot = true,
  animate = true,
  className,
  ...props
}, ref) => {
  const statusConfig = statusStyles[status] || statusStyles.neutral;
  const sizeConfig = sizeStyles[size];
  
  const containerClasses = cn(
    // Base styles
    'inline-flex items-center font-medium border rounded-full',
    
    // Size styles
    sizeConfig.container,
    sizeConfig.gap,
    
    // Status styles
    statusConfig.container,
    
    // Custom classes
    className
  );

  const dotClasses = cn(
    // Base dot styles
    'rounded-full flex-shrink-0',
    
    // Size styles
    sizeConfig.dot,
    
    // Status styles
    statusConfig.dot
  );

  return (
    <motion.span
      ref={ref}
      className={containerClasses}
      initial={animate ? scaleIn.initial : false}
      animate={animate ? scaleIn.animate : false}
      transition={animate ? scaleIn.transition : false}
      {...props}
    >
      {showDot && (
        <motion.span
          className={dotClasses}
          animate={statusConfig.pulse ? {
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          } : {}}
          transition={statusConfig.pulse ? {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          } : {}}
        />
      )}
      
      {children || status?.toUpperCase?.() || status}
    </motion.span>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge; 