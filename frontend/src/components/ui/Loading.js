import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const LoadingSpinner = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    white: 'border-white',
    gray: 'border-gray-500',
    green: 'border-green-500',
    red: 'border-red-500',
    amber: 'border-amber-500'
  };

  return (
    <motion.div
      className={cn(
        'border-2 border-t-transparent rounded-full',
        sizeClasses[size],
        colorClasses[color]
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
  );
};

const LoadingDots = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    white: 'bg-white',
    gray: 'bg-gray-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500'
  };

  const dotVariants = {
    start: { y: "0%" },
    end: { y: "100%" }
  };

  const containerVariants = {
    start: {
      transition: {
        staggerChildren: 0.2
      }
    },
    end: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <motion.div
      className="flex space-x-1"
      variants={containerVariants}
      initial="start"
      animate="end"
    >
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn(
            'rounded-full',
            sizeClasses[size],
            colorClasses[color]
          )}
          variants={dotVariants}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  );
};

const LoadingPulse = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    white: 'bg-white',
    gray: 'bg-gray-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500'
  };

  return (
    <motion.div
      className={cn(
        'rounded-full',
        sizeClasses[size],
        colorClasses[color]
      )}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.8, 1]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

const LoadingBars = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: { width: 'w-0.5', height: 'h-4' },
    md: { width: 'w-1', height: 'h-6' },
    lg: { width: 'w-1.5', height: 'h-8' },
    xl: { width: 'w-2', height: 'h-12' }
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    white: 'bg-white',
    gray: 'bg-gray-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500'
  };

  const barVariants = {
    start: { scaleY: 0.5 },
    end: { scaleY: 1 }
  };

  const containerVariants = {
    start: {
      transition: {
        staggerChildren: 0.1
      }
    },
    end: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      className="flex items-end space-x-1"
      variants={containerVariants}
      initial="start"
      animate="end"
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className={cn(
            'rounded-sm origin-bottom',
            sizeClasses[size].width,
            sizeClasses[size].height,
            colorClasses[color]
          )}
          variants={barVariants}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  );
};

const Loading = ({ 
  variant = 'spinner',
  size = 'md',
  color = 'blue',
  text,
  fullscreen = false,
  overlay = false,
  className
}) => {
  const renderLoadingAnimation = () => {
    switch (variant) {
      case 'dots':
        return <LoadingDots size={size} color={color} />;
      case 'pulse':
        return <LoadingPulse size={size} color={color} />;
      case 'bars':
        return <LoadingBars size={size} color={color} />;
      case 'spinner':
      default:
        return <LoadingSpinner size={size} color={color} />;
    }
  };

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-3',
      className
    )}>
      {renderLoadingAnimation()}
      {text && (
        <motion.p
          className="text-sm font-medium text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <motion.div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          overlay ? 'bg-black bg-opacity-50' : 'bg-white'
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
};

Loading.displayName = 'Loading';

export default Loading; 