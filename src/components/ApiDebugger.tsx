import React, { useState } from 'react';
import { configService, DetailedConnectionResult } from '../services/configService';
import { LoadingSpinner } from './LoadingSpinner';

export const ApiDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<{
    limitless?: DetailedConnectionResult;
    gemini?: DetailedConnectionResult;
  }>({});
  const [networkDiagnostics, setNetworkDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);

  const handleGetDebugInfo = () => {
    const info = configService.getDebugInfo();
    setDebugInfo(info);
  };

  const handleTestConnection = async (service: 'limitless' | 'gemini') => {
    setIsLoading(true);
    setActiveTest(service);
    try {
      const result = await configService.testConnectionWithDebug(service);
      setTestResults((prev) => ({
        ...prev,
        [service]: result
      }));
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          success: false,
          error: error.message,
          debugInfo: {
            apiKey: 'ERROR',
            endpoint: 'ERROR',
            headers: {},
            timestamp: new Date().toISOString(),
            method: 'GET',
            proxyUsed: false
          }
        }
      }));
    } finally {
      setIsLoading(false);
      setActiveTest(null);
    }
  };

  const handleNetworkDiagnostics = async () => {
    setIsLoading(true);
    setActiveTest('network');
    try {
      const diagnostics = await configService.getNetworkDiagnostics();
      setNetworkDiagnostics(diagnostics);
    } catch (error: any) {
      setNetworkDiagnostics({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      setActiveTest(null);
    }
  };

  const handleTestAllConnections = async () => {
    setIsLoading(true);
    setActiveTest('all');
    try {
      const [limitlessResult, geminiResult] = await Promise.all([
        configService.testConnectionWithDebug('limitless'),
        configService.testConnectionWithDebug('gemini')
      ]);
      
      setTestResults({
        limitless: limitlessResult,
        gemini: geminiResult
      });
    } catch (error: any) {
      console.error('Error testing all connections:', error);
    } finally {
      setIsLoading(false);
      setActiveTest(null);
    }
  };

  const getStatusIcon = (success: boolean) => {
    if (success) {
      return (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
  };

  const formatResponseTime = (time?: number) => {
    if (!time) return 'N/A';
    return `${time}ms`;
  };

  return (
    <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>API Connection Debugger</span>
      </h2>

      <div className="space-y-6">
        {/* Control Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={handleGetDebugInfo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
          >
            Get Debug Info
          </button>
          <button
            onClick={() => handleTestConnection('limitless')}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50 text-sm flex items-center justify-center space-x-1"
          >
            {isLoading && activeTest === 'limitless' ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span>Test Limitless</span>
            )}
          </button>
          <button
            onClick={() => handleTestConnection('gemini')}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 text-sm flex items-center justify-center space-x-1"
          >
            {isLoading && activeTest === 'gemini' ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span>Test Gemini</span>
            )}
          </button>
          <button
            onClick={handleTestAllConnections}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50 text-sm flex items-center justify-center space-x-1"
          >
            {isLoading && activeTest === 'all' ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span>Test All</span>
            )}
          </button>
          <button
            onClick={handleNetworkDiagnostics}
            disabled={isLoading}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition-colors disabled:opacity-50 text-sm flex items-center justify-center space-x-1"
          >
            {isLoading && activeTest === 'network' ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span>Network Test</span>
            )}
          </button>
        </div>

        {/* Test Results Summary */}
        {(testResults.limitless || testResults.gemini) && (
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3 flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Connection Test Results</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testResults.limitless && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-purple-400 font-medium">Limitless API</h4>
                    {getStatusIcon(testResults.limitless.success)}
                  </div>
                  <div className="text-sm text-slate-300 space-y-1">
                    <div>Status: <span className={testResults.limitless.success ? 'text-green-400' : 'text-red-400'}>
                      {testResults.limitless.success ? 'Connected' : 'Failed'}
                    </span></div>
                    <div>Response Time: {formatResponseTime(testResults.limitless.responseTime)}</div>
                    {testResults.limitless.statusCode && (
                      <div>Status Code: {testResults.limitless.statusCode}</div>
                    )}
                    {testResults.limitless.error && (
                      <div className="text-red-400 text-xs mt-1">Error: {testResults.limitless.error}</div>
                    )}
                  </div>
                </div>
              )}
              {testResults.gemini && (
                <div className="bg-slate-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-green-400 font-medium">Gemini API</h4>
                    {getStatusIcon(testResults.gemini.success)}
                  </div>
                  <div className="text-sm text-slate-300 space-y-1">
                    <div>Status: <span className={testResults.gemini.success ? 'text-green-400' : 'text-red-400'}>
                      {testResults.gemini.success ? 'Connected' : 'Failed'}
                    </span></div>
                    <div>Response Time: {formatResponseTime(testResults.gemini.responseTime)}</div>
                    {testResults.gemini.statusCode && (
                      <div>Status Code: {testResults.gemini.statusCode}</div>
                    )}
                    {testResults.gemini.error && (
                      <div className="text-red-400 text-xs mt-1">Error: {testResults.gemini.error}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debug Information */}
        {debugInfo && (
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Debug Information</span>
            </h3>
            <pre className="text-slate-300 text-sm overflow-x-auto bg-slate-800 p-3 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Network Diagnostics */}
        {networkDiagnostics && (
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span>Network Diagnostics</span>
            </h3>
            <pre className="text-slate-300 text-sm overflow-x-auto bg-slate-800 p-3 rounded">
              {JSON.stringify(networkDiagnostics, null, 2)}
            </pre>
          </div>
        )}

        {/* Detailed Test Results */}
        {(testResults.limitless || testResults.gemini) && (
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Detailed Test Results</span>
            </h3>
            <pre className="text-slate-300 text-sm overflow-x-auto bg-slate-800 p-3 rounded">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        {/* Troubleshooting Tips */}
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-3 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Troubleshooting Tips</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-yellow-300 text-sm">
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Common Issues:</h4>
              <ul className="space-y-1">
                <li>• "Failed to fetch" = Proxy/CORS issue</li>
                <li>• 401/403 = Invalid API key</li>
                <li>• 429 = Rate limit exceeded</li>
                <li>• Network timeout = Connection issue</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-yellow-400 mb-2">Solutions:</h4>
              <ul className="space-y-1">
                <li>• Restart development server</li>
                <li>• Check API key format (sk- / AIza)</li>
                <li>• Verify .env.local file exists</li>
                <li>• Check browser Network tab</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};