import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricCard as MetricCardType } from '../../types';

export const MetricCard: React.FC<MetricCardType> = ({ 
  title, 
  value, 
  change, 
  icon,
  trend
}) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={16} className="text-success-500" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-error-500" />;
    return <Minus size={16} className="text-neutral-500" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success-600';
    if (trend === 'down') return 'text-error-600';
    return 'text-neutral-600';
  };

  const getChangePrefix = () => {
    if (trend === 'up') return '+';
    if (trend === 'down') return '';  // The negative sign will be included in the number
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-6 transition-all hover:shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <p className="text-neutral-500 text-sm font-medium">{title}</p>
        <div className="p-2 rounded-full bg-primary-50 text-primary-500">
          {icon}
        </div>
      </div>
      
      <div className="flex flex-col">
        <p className="text-2xl font-semibold text-neutral-900 mb-1">{value}</p>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {getChangePrefix()}{change}%
          </span>
          <span className="text-xs text-neutral-500">vs last 30 days</span>
        </div>
      </div>
    </div>
  );
};