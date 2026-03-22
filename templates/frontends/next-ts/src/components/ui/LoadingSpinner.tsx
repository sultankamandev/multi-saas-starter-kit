'use client';

import React from 'react';

interface LoadingSpinnerProps {
  /** Size: 'sm' (inline/buttons), 'md' (cards), 'lg' (full page) */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label below spinner */
  label?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5 -ml-1 mr-3',
  md: 'h-12 w-12 mx-auto',
  lg: 'h-12 w-12 mx-auto',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label, className = '' }) => {
  return (
    <div className={`text-center ${className}`}>
      <svg
        className={`animate-spin text-indigo-600 ${sizeClasses[size]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && <p className="mt-4 text-gray-600">{label}</p>}
    </div>
  );
};
