import React, { useState, useEffect } from 'react';
import { configService, ConnectionStatus } from '../services/configService';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  onTestConnection?: () => void | Promise<void>;
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = false,
  onTestConnection,
  className = ''
}) => {
  const [status, setStatus] = useState<ConnectionStatus>(configService.getConnectionStatus());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update status periodically
    const interval = setInterval(() => {
      setStatus(configService.getConnectionStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = async () => {
    if (onTestConnection) {
      setIsLoading(true);
      try {
        await onTestConnection();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getStatusColor = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'connected': return 'text-green-400';
      case 'testing': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'connected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'testing':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const isConnected = status.limitless === 'connected' && status.gemini === 'connected';
  const hasErrors = status.limitless === 'error' || status.gemini === 'error';

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`flex items-center space-x-1 ${isConnected ? 'text-green-400' : hasErrors ? 'text-red-400' : 'text-slate-400'}`}>
          {getStatusIcon(isConnected ? 'connected' : hasErrors ? 'error' : 'disconnected')}
          <span className="text-sm font-medium">
            {isConnected ? 'Connected' : hasErrors ? 'Connection Error' : 'Disconnected'}
          </span>
        </div>

        {onTestConnection && (
          <button
            onClick={handleTestConnection}
            disabled={isLoading}
            className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Connection Status</h3>
        {onTestConnection && (
          <button
            onClick={handleTestConnection}
            disabled={isLoading}
            className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test All'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={getStatusColor(status.limitless)}>
              {getStatusIcon(status.limitless)}
            </div>
            <span className="text-sm text-slate-300">Limitless API</span>
          </div>
          <span className={`text-xs ${getStatusColor(status.limitless)}`}>
            {status.limitless === 'connected' ? 'Connected' : 
             status.limitless === 'testing' ? 'Testing...' :
             status.limitless === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={getStatusColor(status.gemini)}>
              {getStatusIcon(status.gemini)}
            </div>
            <span className="text-sm text-slate-300">Gemini API</span>
          </div>
          <span className={`text-xs ${getStatusColor(status.gemini)}`}>
            {status.gemini === 'connected' ? 'Connected' : 
             status.gemini === 'testing' ? 'Testing...' :
             status.gemini === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>

        {status.lastChecked && (
          <div className="text-xs text-slate-500 mt-2">
            Last checked: {status.lastChecked.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

interface ApiKeyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isValid?: boolean;
  error?: string;
  helpText?: string;
  onTest?: () => void;
  isTestingConnection?: boolean;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  isValid,
  error,
  helpText,
  onTest,
  isTestingConnection
}) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-20 bg-slate-700 border rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent ${
            error 
              ? 'border-red-500 focus:ring-red-500' 
              : isValid 
                ? 'border-green-500 focus:ring-green-500' 
                : 'border-slate-600 focus:ring-purple-500'
          }`}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title={showKey ? 'Hide key' : 'Show key'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showKey ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              )}
            </svg>
          </button>
          
          {onTest && (
            <button
              type="button"
              onClick={onTest}
              disabled={!value || isTestingConnection}
              className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              title="Test connection"
            >
              <svg className={`w-4 h-4 ${isTestingConnection ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-sm flex items-center space-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {helpText && !error && (
        <div className="text-slate-400 text-sm">
          {helpText}
        </div>
      )}
    </div>
  );
};