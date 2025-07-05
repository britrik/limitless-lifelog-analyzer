import React from 'react';

interface ErrorDisplayProps {
  message: string;
  title?: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  dismissText?: string;
  className?: string;
  showIcon?: boolean;
  fullWidth?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  title,
  type = 'error',
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  dismissText = 'Dismiss',
  className = '',
  showIcon = true,
  fullWidth = false,
}) => {
  const typeStyles = {
    error: {
      container: 'bg-red-900/20 border-red-700 text-red-100',
      icon: 'text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      container: 'bg-yellow-900/20 border-yellow-700 text-yellow-100',
      icon: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      container: 'bg-blue-900/20 border-blue-700 text-blue-100',
      icon: 'text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const styles = typeStyles[type];

  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        rounded-lg border p-4 
        ${styles.container}
        ${fullWidth ? 'w-full' : 'max-w-md'}
        ${className}
      `}
    >
      <div className="flex items-start space-x-3">
        {showIcon && (
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {getIcon()}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-sm font-semibold mb-1">
              {title}
            </h3>
          )}
          
          <p className="text-sm leading-relaxed">
            {message}
          </p>
          
          {(onRetry || onDismiss) && (
            <div className="flex items-center space-x-3 mt-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`
                    px-3 py-1.5 rounded text-sm font-medium transition-colors
                    ${styles.button}
                  `}
                >
                  {retryText}
                </button>
              )}
              
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 rounded text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {dismissText}
                </button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-slate-400 hover:text-slate-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Convenience components for common error types
export const ApiErrorDisplay: React.FC<{
  message: string;
  onRetry?: () => void;
  className?: string;
}> = ({ message, onRetry, className }) => (
  <ErrorDisplay
    title="API Error"
    message={message}
    type="error"
    onRetry={onRetry}
    className={className}
  />
);

export const NetworkErrorDisplay: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorDisplay
    title="Connection Error"
    message="Unable to connect to the server. Please check your internet connection and try again."
    type="error"
    onRetry={onRetry}
    className={className}
  />
);

export const NotFoundErrorDisplay: React.FC<{
  resource?: string;
  className?: string;
}> = ({ resource = 'resource', className }) => (
  <ErrorDisplay
    title="Not Found"
    message={`The ${resource} you're looking for could not be found.`}
    type="warning"
    className={className}
  />
);

export const PermissionErrorDisplay: React.FC<{
  action?: string;
  className?: string;
}> = ({ action = 'perform this action', className }) => (
  <ErrorDisplay
    title="Permission Denied"
    message={`You don't have permission to ${action}. Please check your API keys and try again.`}
    type="error"
    className={className}
  />
);