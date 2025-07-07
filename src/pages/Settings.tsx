import React, { useState, useEffect } from 'react';
import { configService, ApiConfig, ConfigValidationResult } from '../services/configService';
import { ConnectionStatusIndicator, ApiKeyInput } from '../components/ConnectionStatus';
import { ApiDebugger } from '../components/ApiDebugger';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<ApiConfig>({ limitlessApiKey: '', geminiApiKey: '' });
  const [validation, setValidation] = useState<ConfigValidationResult>({ isValid: false, errors: [], warnings: [] });
  const [isTestingConnections, setIsTestingConnections] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // Load current configuration
    const currentConfig = configService.getConfig();
    setConfig(currentConfig);
    setValidation(configService.validateConfig(currentConfig));
  }, []);

  const handleConfigChange = (field: keyof ApiConfig, value: string) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    setValidation(configService.validateConfig(newConfig));
    setSaveStatus('idle');
  };

  const handleSaveConfig = async () => {
    setSaveStatus('saving');

    try {
      // Validate the configuration first
      const validation = configService.validateConfig(config);

      if (!validation.isValid) {
        setSaveStatus('error');
        return;
      }

      // Update the configService with the new configuration
      configService.updateConfig(config);

      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('saved');

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveStatus('error');
    }
  };

  const handleTestLimitlessConnection = async () => {
    setIsTestingConnections(true);
    try {
      // Update the config service with current values before testing
      configService.updateConfig(config);
      await configService.testLimitlessConnection();
    } finally {
      setIsTestingConnections(false);
    }
  };

  const handleTestGeminiConnection = async () => {
    setIsTestingConnections(true);
    try {
      // Update the config service with current values before testing
      configService.updateConfig(config);
      await configService.testGeminiConnection();
    } finally {
      setIsTestingConnections(false);
    }
  };

  const handleTestAllConnections = async () => {
    setIsTestingConnections(true);
    try {
      // Update the config service with current values before testing
      configService.updateConfig(config);
      await configService.testAllConnections();
    } finally {
      setIsTestingConnections(false);
    }
  };

  const configStatus = configService.getConfigurationStatus();
  const helpText = configService.getConfigurationHelp();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
          
          <ConnectionStatusIndicator 
            onTestConnection={handleTestAllConnections}
          />
        </div>
        
        <p className="text-slate-300 text-lg">
          Configure your API keys and manage your preferences.
        </p>

        {/* Configuration Status Alert */}
        {!configStatus.configured && (
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-400 font-medium">Configuration Required</span>
            </div>
            <p className="text-yellow-300 text-sm mt-1">
              Please configure your API keys below to start using the application.
            </p>
          </div>
        )}
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Configuration */}
        <div className="lg:col-span-2 bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>API Configuration</span>
            </h2>
            
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
              title="Show help"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

          {/* Help Section */}
          {showHelp && (
            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
              <h3 className="text-blue-400 font-medium mb-3">How to get your API keys:</h3>
              <div className="space-y-3 text-sm text-blue-300">
                <div>
                  <strong>Limitless API Key:</strong>
                  <p className="mt-1 text-blue-200">{helpText.limitless.trim()}</p>
                </div>
                <div>
                  <strong>Google Gemini API Key:</strong>
                  <p className="mt-1 text-blue-200">{helpText.gemini.trim()}</p>
                </div>
                <div>
                  <strong>Environment Setup:</strong>
                  <p className="mt-1 text-blue-200">{helpText.general.trim()}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ApiKeyInput
              label="Limitless API Key"
              value={config.limitlessApiKey}
              onChange={(value) => handleConfigChange('limitlessApiKey', value)}
              placeholder="sk-..."
              isValid={configStatus.limitlessConfigured}
              error={validation.errors.find(e => e.includes('Limitless'))}
              helpText="Your Limitless AI API key (starts with 'sk-')"
              onTest={handleTestLimitlessConnection}
              isTestingConnection={isTestingConnections}
            />

            <ApiKeyInput
              label="Google Gemini API Key"
              value={config.geminiApiKey}
              onChange={(value) => handleConfigChange('geminiApiKey', value)}
              placeholder="AIza..."
              isValid={configStatus.geminiConfigured}
              error={validation.errors.find(e => e.includes('Gemini'))}
              helpText="Your Google Gemini API key (starts with 'AIza')"
              onTest={handleTestGeminiConnection}
              isTestingConnection={isTestingConnections}
            />
          </div>

          {/* Validation Messages */}
          {validation.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded">
              <div className="text-yellow-400 text-sm font-medium mb-1">Warnings:</div>
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-yellow-300 text-sm">{warning}</div>
              ))}
            </div>
          )}

          {/* Connection Status */}
          <div className="mt-6">
            <ConnectionStatusIndicator 
              showDetails={true}
              onTestConnection={handleTestAllConnections}
            />
          </div>

          {/* Save Button */}
          <div className="mt-6 flex items-center space-x-4">
            <button 
              onClick={handleSaveConfig}
              disabled={!validation.isValid || saveStatus === 'saving'}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                validation.isValid 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Configuration'}
            </button>

            {saveStatus === 'saved' && (
              <div className="flex items-center space-x-2 text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Configuration saved!</span>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="flex items-center space-x-2 text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Failed to save configuration</span>
              </div>
            )}
          </div>
        </div>

        {/* API Debugger */}
        <div className="lg:col-span-2">
          <ApiDebugger />
        </div>

        {/* Preferences */}
        <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span>Preferences</span>
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Dark Mode</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-purple-600 transition-colors">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Auto-analyze recordings</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-purple-600 transition-colors">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Email notifications</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            <span>Storage</span>
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-slate-300 mb-2">
                <span>Used Storage</span>
                <span>2.4 GB / 10 GB</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-orange-400 h-2 rounded-full" style={{ width: '24%' }}></div>
              </div>
            </div>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-md transition-colors">
              Manage Storage
            </button>
          </div>
        </div>

        {/* About */}
        <div className="lg:col-span-2 bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-xl rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>About</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span className="text-white">Today</span>
              </div>
              <div className="flex justify-between">
                <span>Build</span>
                <span className="text-white">2024.01.15</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>React</span>
                <span className="text-white">19.1.0</span>
              </div>
              <div className="flex justify-between">
                <span>TypeScript</span>
                <span className="text-white">5.7.2</span>
              </div>
              <div className="flex justify-between">
                <span>Vite</span>
                <span className="text-white">6.2.0</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Configuration</span>
                <span className={`${configStatus.configured ? 'text-green-400' : 'text-red-400'}`}>
                  {configStatus.configured ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Limitless API</span>
                <span className={`${configStatus.limitlessConfigured ? 'text-green-400' : 'text-red-400'}`}>
                  {configStatus.limitlessConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gemini API</span>
                <span className={`${configStatus.geminiConfigured ? 'text-green-400' : 'text-red-400'}`}>
                  {configStatus.geminiConfigured ? 'Configured' : 'Not Configured'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};