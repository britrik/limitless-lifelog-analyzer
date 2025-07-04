
import React from 'react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  isCorsError?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry, isCorsError }) => {
  return (
    <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-300 p-4 rounded-lg shadow-md" role="alert">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-3 text-red-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="font-semibold">Error{isCorsError ? ": API Configuration Issue" : ""}</p>
      </div>
      <p className="mt-2 text-sm">{message}</p>
      
      {isCorsError && (
        <div className="mt-3 text-xs p-3 bg-yellow-900 bg-opacity-40 border border-yellow-700 rounded-md text-yellow-300">
          <p className="font-semibold mb-1">Developer Note (CORS):</p>
          <p>This "Failed to fetch" error usually means the API server (api.limitless.ai) is not configured to allow requests from this web application's origin (e.g., localhost or the domain where it's hosted).</p>
          <p className="mt-1">To resolve for local development:</p>
          <ul className="list-disc list-inside ml-2 mt-1 space-y-0.5">
            <li>Use a CORS proxy server as an intermediary.</li>
            <li>If you control the API server, configure it to send `Access-Control-Allow-Origin` headers.</li>
            <li>Temporarily use a browser extension that disables CORS checks (<strong>for testing only</strong>, as this disables important security features).</li>
          </ul>
          <p className="mt-1">Simply retrying will not fix this type of issue.</p>
        </div>
      )}

      {onRetry && ( // onRetry will be undefined if App.tsx determines it's a CORS error
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-150"
        >
          Try Again
        </button>
      )}
    </div>
  );
};