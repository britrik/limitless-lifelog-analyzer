import React, { useState } from 'react';
import { configService } from '../services/configService';

export const ApiDebugger: React.FC = () => {
  interface TestResult {
    success: boolean;
    error?: string;
    debugInfo: {
      apiKey?: string;
      endpoint?: string;
      headers?: Record<string, any>;
      error?: string;
      timestamp: string;
    };
  }

  interface TestResults {
    limitless?: TestResult;
    gemini?: TestResult;
  }

  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResults>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleGetDebugInfo = () => {
    const info = configService.getDebugInfo();
    setDebugInfo(info);
  };

  const handleTestConnection = async (service: 'limitless' | 'gemini') => {
    setIsLoading(true);
    try {
      const result = await configService.testConnectionWithDebug(service);
      setTestResults((prev: TestResults) => ({
        ...prev,
        [service]: result
      }));
    } catch (error: any) {
      setTestResults((prev: TestResults) => ({
        ...prev,
        [service]: {
          success: false,
          error: error.message,
          debugInfo: {
            error: 'Failed to execute test',
            timestamp: new Date().toISOString()
          }
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>API Connection Debugger</span>
      </h2>

      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={handleGetDebugInfo}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Get Debug Info
          </button>
          <button
            onClick={() => handleTestConnection('limitless')}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test Limitless API'}
          </button>
          <button
            onClick={() => handleTestConnection('gemini')}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test Gemini API'}
          </button>
        </div>

        {debugInfo && (
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Debug Information:</h3>
            <pre className="text-slate-300 text-sm overflow-x-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {testResults && (
          <div className="bg-slate-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Test Results:</h3>
            <pre className="text-slate-300 text-sm overflow-x-auto">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
          <h3 className="text-yellow-400 font-medium mb-2">Troubleshooting Tips:</h3>
          <ul className="text-yellow-300 text-sm space-y-1">
            <li>• Make sure your API key starts with 'sk-' for Limitless</li>
            <li>• Check that your API key is correctly set in environment variables</li>
            <li>• Verify your API key is active and has the correct permissions</li>
            <li>• Check the browser's Network tab for detailed error responses</li>
            <li>• CORS errors indicate the API server needs to allow your domain</li>
          </ul>
        </div>
      </div>
    </div>
  );
};