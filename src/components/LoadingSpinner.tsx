import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  className = '',
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const SpinnerIcon = () => (
    <svg
      className={`animate-spin ${sizeClasses[size]} text-blue-500`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const DotsIcon = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
    </div>
  );

  const PulseIcon = () => (
    <div
      className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}
      style={{ animationDuration: '2s' }}
    />
  );

  const renderIcon = () => {
    switch (variant) {
      case 'dots':
        return <DotsIcon />;
      case 'pulse':
        return <PulseIcon />;
      case 'spinner':
      default:
        return <SpinnerIcon />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderIcon()}
      {text && (
        <p className={`text-slate-400 ${textSizeClasses[size]} font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-8 shadow-xl border border-slate-700">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Convenience components for common use cases
export const SmallSpinner: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <LoadingSpinner size="sm" text={text} className={className} />
);

export const MediumSpinner: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <LoadingSpinner size="md" text={text} className={className} />
);

export const LargeSpinner: React.FC<{ text?: string; className?: string }> = ({ text, className }) => (
  <LoadingSpinner size="lg" text={text} className={className} />
);

export const FullScreenSpinner: React.FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner fullScreen text={text} />
);