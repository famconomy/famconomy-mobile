import React from 'react';
import logoUrl from '../../../Logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  if (variant === 'icon') {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center`}>
        <img 
          src={logoUrl} 
          alt="FamConomy Logo" 
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className={`${sizeClasses[size]} flex items-center justify-center`}>
        <img 
          src={logoUrl} 
          alt="FamConomy Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      <span className={`ml-3 font-semibold bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 bg-clip-text text-transparent ${textSizeClasses[size]}`}>
        FamConomy
      </span>
    </div>
  );
};