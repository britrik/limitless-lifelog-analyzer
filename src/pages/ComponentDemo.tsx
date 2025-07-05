import React, { useState } from 'react';
import { LoadingSpinner, SmallSpinner, MediumSpinner, LargeSpinner, FullScreenSpinner } from '../components/LoadingSpinner';
import { ErrorDisplay, ApiErrorDisplay, NetworkErrorDisplay, NotFoundErrorDisplay, PermissionErrorDisplay } from '../components/ErrorDisplay';

export const ComponentDemo: React.FC = () => {
  const [showFullScreenSpinner, setShowFullScreenSpinner] = useState(false);
  const [showError, setShowError] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Component Demo</h1>
        <p className="text-slate-400">Testing our essential UI components</p>
      </div>

      {/* Loading Spinners */}
      <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Loading Spinners</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Small</h3>
            <SmallSpinner text="Loading..." />
          </div>
          
          <div className="text-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Medium</h3>
            <MediumSpinner text="Processing..." />
          </div>
          
          <div className="text-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Large</h3>
            <LargeSpinner text="Analyzing..." />
          </div>
          
          <div className="text-center">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Variants</h3>
            <div className="space-y-3">
              <LoadingSpinner variant="spinner" size="sm" />
              <LoadingSpinner variant="dots" size="sm" />
              <LoadingSpinner variant="pulse" size="sm" />
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowFullScreenSpinner(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Show Full Screen Spinner
          </button>
        </div>
        
        {showFullScreenSpinner && (
          <FullScreenSpinner text="Loading full screen demo..." />
        )}
      </section>

      {/* Error Displays */}
      <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Error Displays</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Basic Error</h3>
            <ErrorDisplay
              title="Something went wrong"
              message="This is a basic error message with retry functionality."
              onRetry={() => console.log('Retry clicked')}
              onDismiss={() => console.log('Dismiss clicked')}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Warning</h3>
            <ErrorDisplay
              title="Warning"
              message="This is a warning message to alert users about potential issues."
              type="warning"
              onDismiss={() => console.log('Warning dismissed')}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Info</h3>
            <ErrorDisplay
              title="Information"
              message="This is an informational message to provide helpful context."
              type="info"
              onDismiss={() => console.log('Info dismissed')}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Specialized Error Types</h3>
            <div className="space-y-3">
              <ApiErrorDisplay
                message="Failed to connect to the Limitless API. Please check your API key."
                onRetry={() => console.log('API retry')}
              />
              
              <NetworkErrorDisplay
                onRetry={() => console.log('Network retry')}
              />
              
              <NotFoundErrorDisplay resource="transcript" />
              
              <PermissionErrorDisplay action="access this transcript" />
            </div>
          </div>
        </div>
      </section>

      {/* Error Boundary Test */}
      <section className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-semibold text-slate-100 mb-4">Error Boundary Test</h2>
        <p className="text-slate-400 mb-4">
          Click the button below to trigger an error and test the ErrorBoundary component.
        </p>
        
        <button
          onClick={() => setShowError(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Trigger Error
        </button>
        
        {showError && <ThrowError />}
      </section>

      {/* Auto-hide full screen spinner */}
      {showFullScreenSpinner && (
        <div className="hidden">
          {setTimeout(() => setShowFullScreenSpinner(false), 3000)}
        </div>
      )}
    </div>
  );
};

// Component that throws an error for testing ErrorBoundary
const ThrowError: React.FC = () => {
  throw new Error('This is a test error to demonstrate the ErrorBoundary component!');
};