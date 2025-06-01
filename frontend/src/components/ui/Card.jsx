import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { cardHover, fadeInUp } from '../../utils/animations';

const cardVariants = {
  default: 'bg-white border border-gray-200 shadow-sm',
  elevated: 'bg-white shadow-lg border-0',
  outlined: 'bg-white border-2 border-gray-200 shadow-none',
  ghost: 'bg-gray-50 border-0 shadow-none',
  gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-sm'
};

const Card = React.forwardRef(({
  children,
  variant = 'default',
  className,
  hover = true,
  animate = true,
  padding = 'md',
  rounded = true,
  onClick,
  ...props
}, ref) => {
  const baseClasses = cn(
    // Base styles
    'transition-all duration-200 ease-out',
    
    // Rounded corners
    rounded && 'rounded-xl',
    
    // Padding variants
    padding === 'none' && 'p-0',
    padding === 'sm' && 'p-4',
    padding === 'md' && 'p-6',
    padding === 'lg' && 'p-8',
    padding === 'xl' && 'p-10',
    
    // Variant styles
    cardVariants[variant],
    
    // Interactive styles
    onClick && 'cursor-pointer',
    
    // Custom classes
    className
  );

  const MotionCard = motion.div;

  return (
    <MotionCard
      ref={ref}
      className={baseClasses}
      onClick={onClick}
      initial={animate ? fadeInUp.initial : false}
      animate={animate ? fadeInUp.animate : false}
      transition={animate ? fadeInUp.transition : false}
      whileHover={hover && !onClick ? {} : (hover && onClick ? cardHover : {})}
      {...props}
    >
      {children}
    </MotionCard>
  );
});

// Card Header Component
const CardHeader = React.forwardRef(({
  children,
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  >
    {children}
  </div>
));

// Card Title Component
const CardTitle = React.forwardRef(({
  children,
  className,
  ...props
}, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900', className)}
    {...props}
  >
    {children}
  </h3>
));

// Card Description Component
const CardDescription = React.forwardRef(({
  children,
  className,
  ...props
}, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600', className)}
    {...props}
  >
    {children}
  </p>
));

// Card Content Component
const CardContent = React.forwardRef(({
  children,
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('pt-0', className)}
    {...props}
  >
    {children}
  </div>
));

// Card Footer Component
const CardFooter = React.forwardRef(({
  children,
  className,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  >
    {children}
  </div>
));

// Set display names
Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';

// Export all components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
};

export default Card; 