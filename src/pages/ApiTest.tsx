import React, { useState, useEffect } from 'react';
import { configService } from '../services/configService';

export const ApiTest: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState<string>('');

  useEffect(() => {
    // Load current API key
    const config = configService.getConfig();
    setApiKey(config.limitlessApiKey || '');
  }, []);

  const testDirectApiCall = async () => {
    if (!apiKey) {
      setTestResult({ error: 'Please enter an API key' });
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    setRawResponse('');

    try {
      console.log('Testing API key:', apiKey.substring(0, 8) + '...' + apiKey.slice(-4));

      // Test both direct and proxy calls
      const results = {
        direct: null as any,
        proxy: null as any
      };

      // Test direct API call (will likely fail due to CORS)
      try {
        const directResponse = await fetch('https://api.limitless.ai/v1/lifelogs?limit=1', {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        const directResponseText = await directResponse.text();
        results.direct = {
          success: directResponse.ok,
          status: directResponse.status,
          statusText: directResponse.statusText,
          headers: Object.fromEntries(directResponse.headers.entries()),
          body: directResponseText
        };
      } catch (error: any) {
        results.direct = {
          success: false,
          error: error.message,
          type: 'Network/CORS Error'
        };
      }

      // Test proxy API call
      try {
        const proxyResponse = await fetch('/api/limitless/v1/lifelogs?limit=1', {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        const proxyResponseText = await proxyResponse.text();
        results.proxy = {
          success: proxyResponse.ok,
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: Object.fromEntries(proxyResponse.headers.entries()),
          body: proxyResponseText
        };
      } catch (error: any) {
        results.proxy = {
          success: false,
          error: error.message,
          type: 'Proxy Error'
        };
      }

      setTestResult(results);
      setRawResponse(JSON.stringify(results, null, 2));

    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        error: error.message,
        stack: error.stack
      });
      setRawResponse(error.toString());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-4">API Connection Test</h1>

        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-medium text-blue-400 mb-2">How This Test Works</h2>
          <div className="text-sm text-slate-300 space-y-1">
            <p><strong>Direct API Call:</strong> Tests direct connection to Limitless API (will fail due to CORS - this is expected)</p>
            <p><strong>Proxy API Call:</strong> Tests connection through Vite proxy (this should succeed)</p>
            <p><strong>Success Criteria:</strong> Proxy connection working = API integration is functional ✅</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Limitless API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={testDirectApiCall}
            disabled={isLoading || !apiKey}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
          >
            {isLoading ? 'Testing...' : 'Test API Connection'}
          </button>
        </div>

        {testResult && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-3">Test Result:</h3>
            <div className={`p-4 rounded-lg ${testResult.proxy?.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'}`}>
              <div className={`font-medium mb-2 ${testResult.proxy?.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.proxy?.success ? '✅ Success (Proxy Connection Working)' : '❌ Failed'}
              </div>
              <div className="text-sm text-slate-400 mb-3">
                <strong>Direct API:</strong> {testResult.direct?.success ? '✅ Connected' : '❌ Blocked by CORS (Expected)'}<br/>
                <strong>Proxy API:</strong> {testResult.proxy?.success ? '✅ Connected' : '❌ Failed'}
              </div>
              <pre className="text-sm text-slate-300 overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {rawResponse && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-3">Raw Response:</h3>
            <div className="bg-slate-900 p-4 rounded-lg">
              <pre className="text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {rawResponse}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <h3 className="text-blue-400 font-medium mb-2">Debug Information:</h3>
          <div className="text-sm text-blue-300 space-y-1">
            <div>API Endpoint: https://api.limitless.ai/lifelogs?limit=1</div>
            <div>Authentication: X-API-Key header</div>
            <div>Expected Key Format: sk-...</div>
            <div>Current Key: {apiKey ? `${apiKey.substring(0, 8)}...${apiKey.slice(-4)}` : 'Not set'}</div>
            <div>Key Format Valid: {apiKey ? (apiKey.startsWith('sk-') ? '✅ Yes' : '❌ No') : 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};