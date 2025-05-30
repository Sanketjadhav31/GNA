import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { buttonHover, buttonTap } from '../../utils/animations';

const buttonVariants = {
  // Primary button with gradient background
  primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 disabled:from-gray-400 disabled:to-gray-500',
  
  // Secondary button with outline
  secondary: 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 focus:ring-4 focus:ring-blue-100 disabled:border-gray-300 disabled:text-gray-400',
  
  // Success button
  success: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:from-green-600 hover:to-green-700 focus:ring-4 focus:ring-green-300 disabled:from-gray-400 disabled:to-gray-500',
  
  // Warning button
  warning: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:from-amber-600 hover:to-amber-700 focus:ring-4 focus:ring-amber-300 disabled:from-gray-400 disabled:to-gray-500',
  
  // Danger button
  danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700 focus:ring-4 focus:ring-red-300 disabled:from-gray-400 disabled:to-gray-500',
  
  // Ghost button (transparent)
  ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 disabled:text-gray-400',
  
  // Link style button
  link: 'text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline focus:ring-2 focus:ring-blue-300 rounded-md disabled:text-gray-400'
};

const buttonSizes = {
  xs: 'px-2.5 py-1.5 text-xs font-medium',
  sm: 'px-3 py-2 text-sm font-medium',
  md: 'px-4 py-2.5 text-sm font-medium',
  lg: 'px-5 py-3 text-base font-medium',
  xl: 'px-6 py-3.5 text-lg font-semibold'
};

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  rounded = true,
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const baseClasses = cn(
    // Base styles
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    
    // Rounded corners
    rounded && 'rounded-lg',
    
    // Full width
    fullWidth && 'w-full',
    
    // Variant styles
    buttonVariants[variant],
    
    // Size styles
    buttonSizes[size],
    
    // Custom classes
    className
  );

  const iconClasses = cn(
    'flex-shrink-0',
    size === 'xs' && 'w-3 h-3',
    size === 'sm' && 'w-4 h-4',
    size === 'md' && 'w-4 h-4',
    size === 'lg' && 'w-5 h-5',
    size === 'xl' && 'w-6 h-6'
  );

  const LoadingSpinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn(iconClasses, 'border-2 border-current border-t-transparent rounded-full')}
    />
  );

  return (
    <motion.button
      ref={ref}
      type={type}
      className={baseClasses}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={!disabled && !loading ? buttonHover : {}}
      whileTap={!disabled && !loading ? buttonTap : {}}
      {...props}
    >
      {/* Loading state */}
      {loading && (
        <LoadingSpinner />
      )}
      
      {/* Icon on the left */}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={cn(iconClasses, children && 'mr-2')} />
      )}
      
      {/* Button content */}
      {children && (
        <span className={loading ? 'ml-2' : ''}>
          {children}
        </span>
      )}
      
      {/* Icon on the right */}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={cn(iconClasses, children && 'ml-2')} />
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button; 