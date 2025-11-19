import React from 'react';
import { Loader } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <Loader className={`animate-spin text-brand ${sizeClasses[size]} ${className}`} />
);

export const FullPageSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px]">
    <Spinner size="lg" />
    <p className="mt-4 text-gray-600">{message}</p>
  </div>
);
