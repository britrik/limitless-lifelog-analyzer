
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-4 text-gray-300">
      <div 
        className={`animate-spin rounded-full ${sizeClasses[size]} border-purple-400 border-t-transparent`}
      ></div>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
};
