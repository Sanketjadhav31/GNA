import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  headerContent,
  footerContent,
  padding = 'p-6',
  hover = false,
  shadow = 'shadow-sm',
  border = 'border border-gray-200',
  background = 'bg-white'
}) => {
  const baseClasses = `rounded-lg overflow-hidden transition-all duration-200 ${background} ${border} ${shadow}`;
  const hoverClasses = hover ? 'hover:shadow-md hover:-translate-y-1' : '';
  const cardClasses = `${baseClasses} ${hoverClasses} ${className}`;

  return (
    <div className={cardClasses}>
      {headerContent && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          {headerContent}
        </div>
      )}
      
      <div className={padding}>
        {children}
      </div>
      
      {footerContent && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footerContent}
        </div>
      )}
    </div>
  );
};

// Specialized card variants
export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = '#EF4444', 
  trend, 
  trendValue,
  className = '' 
}) => (
  <Card 
    className={`border-l-4 ${className}`} 
    style={{ borderLeftColor: color }}
    hover={true}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {trend && (
          <div className="flex items-center mt-2">
            <span className={`text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? '↗' : '↘'} {trendValue}%
            </span>
            <span className="text-xs text-gray-500 ml-1">vs last period</span>
          </div>
        )}
      </div>
      {Icon && (
        <div 
          className="p-3 rounded-full"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      )}
    </div>
  </Card>
);

export const MetricCard = ({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  color = 'text-blue-600',
  background = 'bg-blue-50'
}) => (
  <Card hover={true}>
    <div className="flex items-center">
      {Icon && (
        <div className={`p-2 rounded-lg ${background} mr-4`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  </Card>
);

export const ProgressCard = ({ 
  title, 
  current, 
  total, 
  color = 'bg-blue-600',
  subtitle 
}) => {
  const percentage = (current / total) * 100;
  
  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">{current}/{total}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
      </div>
    </Card>
  );
};

export const ActionCard = ({ 
  title, 
  description, 
  buttonText, 
  onAction,
  icon: Icon,
  variant = 'primary' 
}) => {
  const variants = {
    primary: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
  };

  return (
    <Card padding="p-6" hover={true}>
      <div className="text-center space-y-4">
        {Icon && (
          <div className="mx-auto w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-red-600" />
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        
        <button
          onClick={onAction}
          className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${variants[variant]}`}
        >
          {buttonText}
        </button>
      </div>
    </Card>
  );
};

export default Card; 