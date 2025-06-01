import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { counterAnimation } from '../../utils/animations';

const Counter = ({
  value = 0,
  duration = 2,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
  animate = true,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [previousValue, setPreviousValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    setPreviousValue(displayValue);
    
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;

    const updateCounter = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = startValue + (difference * easeOutQuart);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(endValue);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [value, duration, animate]);

  const formatNumber = (num) => {
    const rounded = Number(num.toFixed(decimals));
    const parts = rounded.toString().split('.');
    
    // Add thousand separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    
    return parts.join('.');
  };

  const formattedValue = formatNumber(displayValue);

  if (!animate) {
    return (
      <span className={cn('tabular-nums', className)} {...props}>
        {prefix}{formatNumber(value)}{suffix}
      </span>
    );
  }

  return (
    <motion.span
      className={cn('tabular-nums inline-block', className)}
      initial={counterAnimation.initial}
      animate={counterAnimation.animate}
      transition={counterAnimation.transition}
      {...props}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={formattedValue}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {prefix}{formattedValue}{suffix}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
};

// Preset counter components for common use cases
export const CurrencyCounter = ({ value, currency = '₹', ...props }) => (
  <Counter
    value={value}
    prefix={currency}
    decimals={0}
    separator=","
    {...props}
  />
);

export const PercentageCounter = ({ value, ...props }) => (
  <Counter
    value={value}
    suffix="%"
    decimals={1}
    {...props}
  />
);

export const DecimalCounter = ({ value, decimals = 2, ...props }) => (
  <Counter
    value={value}
    decimals={decimals}
    {...props}
  />
);

Counter.displayName = 'Counter';

export default Counter; 