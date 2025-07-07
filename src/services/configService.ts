// Configuration service for managing API keys and settings
export interface ApiConfig {
  limitlessApiKey: string;
  geminiApiKey: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectionStatus {
  limitless: 'connected' | 'disconnected' | 'testing' | 'error';
  gemini: 'connected' | 'disconnected' | 'testing' | 'error';
  lastChecked: Date | null;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  statusCode?: number;
  responseTime?: number;
  details?: any;
}

export interface DetailedConnectionResult extends ConnectionTestResult {
  debugInfo: {
    apiKey: string;
    endpoint: string;
    headers: Record<string, string>;
    timestamp: string;
    method: string;
    proxyUsed?: boolean;
  };
}

class ConfigService {
  private static instance: ConfigService;
  private config: ApiConfig = { limitlessApiKey: '', geminiApiKey: '' };
  public connectionStatus: ConnectionStatus = {
    limitless: 'disconnected',
    gemini: 'disconnected',
    lastChecked: null
  };

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): void {
    // In a real app, you'd load from secure storage
    // For now, we'll use environment variables
    this.config = {
      limitlessApiKey: (import.meta as any).env?.VITE_LIMITLESS_API_KEY || '',
      geminiApiKey: (import.meta as any).env?.VITE_API_KEY || ''
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: ApiConfig): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Limitless API key
    if (!config.limitlessApiKey) {
      errors.push('Limitless API key is required');
    } else if (!config.limitlessApiKey.startsWith('sk-')) {
      warnings.push('Limitless API key should start with "sk-"');
    } else if (config.limitlessApiKey.length < 20) {
      warnings.push('Limitless API key seems too short');
    }

    // Validate Gemini API key
    if (!config.geminiApiKey) {
      errors.push('Gemini API key is required');
    } else if (!config.geminiApiKey.startsWith('AIza')) {
      warnings.push('Gemini API key should start with "AIza"');
    } else if (config.geminiApiKey.length < 30) {
      warnings.push('Gemini API key seems too short');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test Limitless API connection with enhanced diagnostics
   */
  async testLimitlessConnection(apiKey?: string): Promise<ConnectionTestResult> {
    const keyToTest = apiKey || this.config.limitlessApiKey;

    if (!keyToTest) {
      return { success: false, error: 'No API key provided' };
    }

    this.connectionStatus.limitless = 'testing';
    const startTime = Date.now();

    try {
      // First, try the proxy endpoint
      const proxyResponse = await this.testLimitlessProxy(keyToTest);
      const responseTime = Date.now() - startTime;

      if (proxyResponse.success) {
        this.connectionStatus.limitless = 'connected';
        this.connectionStatus.lastChecked = new Date();
        return { ...proxyResponse, responseTime };
      }

      // If proxy fails, try direct connection (will likely fail due to CORS)
      console.warn('Proxy connection failed, attempting direct connection...');
      const directResponse = await this.testLimitlessDirect(keyToTest);
      
      this.connectionStatus.limitless = directResponse.success ? 'connected' : 'error';
      if (directResponse.success) {
        this.connectionStatus.lastChecked = new Date();
      }

      return { 
        ...directResponse, 
        responseTime: Date.now() - startTime,
        details: {
          proxyAttempt: proxyResponse,
          directAttempt: directResponse
        }
      };

    } catch (error: any) {
      this.connectionStatus.limitless = 'error';
      return {
        success: false,
        error: `Connection test failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        details: { originalError: error }
      };
    }
  }

  /**
   * Test Limitless API via proxy
   */
  private async testLimitlessProxy(apiKey: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('/api/limitless/v1/lifelogs?limit=1', {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          success: true, 
          statusCode: response.status,
          details: { method: 'proxy', dataReceived: !!data }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText || response.statusText}`,
          statusCode: response.status,
          details: { method: 'proxy', responseText: errorText }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Proxy error: ${error.message}`,
        details: { method: 'proxy', originalError: error.message }
      };
    }
  }

  /**
   * Test Limitless API directly (will likely fail due to CORS)
   */
  private async testLimitlessDirect(apiKey: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('https://api.limitless.ai/v1/lifelogs?limit=1', {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { 
          success: true, 
          statusCode: response.status,
          details: { method: 'direct', dataReceived: !!data }
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText || response.statusText}`,
          statusCode: response.status,
          details: { method: 'direct', responseText: errorText }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Direct connection error (likely CORS): ${error.message}`,
        details: { method: 'direct', originalError: error.message, likelyCORS: true }
      };
    }
  }

  /**
   * Test Gemini API connection
   */
  async testGeminiConnection(apiKey?: string): Promise<ConnectionTestResult> {
    const keyToTest = apiKey || this.config.geminiApiKey;
    
    if (!keyToTest) {
      return { success: false, error: 'No API key provided' };
    }

    this.connectionStatus.gemini = 'testing';
    const startTime = Date.now();

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${keyToTest}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        this.connectionStatus.gemini = 'connected';
        this.connectionStatus.lastChecked = new Date();
        const data = await response.json();
        return { 
          success: true, 
          statusCode: response.status,
          responseTime,
          details: { modelsCount: data.models?.length || 0 }
        };
      } else {
        const errorText = await response.text();
        this.connectionStatus.gemini = 'error';
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText || response.statusText}`,
          statusCode: response.status,
          responseTime,
          details: { responseText: errorText }
        };
      }
    } catch (error: any) {
      this.connectionStatus.gemini = 'error';
      return { 
        success: false, 
        error: `Network error: ${error.message}`,
        responseTime: Date.now() - startTime,
        details: { originalError: error.message }
      };
    }
  }

  /**
   * Test all connections
   */
  async testAllConnections(): Promise<{
    limitless: ConnectionTestResult;
    gemini: ConnectionTestResult;
  }> {
    const [limitlessResult, geminiResult] = await Promise.all([
      this.testLimitlessConnection(),
      this.testGeminiConnection()
    ]);

    return {
      limitless: limitlessResult,
      gemini: geminiResult
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Get configuration status
   */
  getConfigurationStatus(): {
    configured: boolean;
    limitlessConfigured: boolean;
    geminiConfigured: boolean;
  } {
    const validation = this.validateConfig(this.config);
    return {
      configured: validation.isValid,
      limitlessConfigured: !!this.config.limitlessApiKey && this.config.limitlessApiKey.startsWith('sk-'),
      geminiConfigured: !!this.config.geminiApiKey && this.config.geminiApiKey.startsWith('AIza')
    };
  }

  /**
   * Get detailed debugging information for API connections
   */
  getDebugInfo(): {
    config: ApiConfig;
    validation: ConfigValidationResult;
    connectionStatus: ConnectionStatus;
    environment: {
      hasLimitlessKey: boolean;
      hasGeminiKey: boolean;
      limitlessKeyFormat: string;
      geminiKeyFormat: string;
      proxyEndpoint: string;
      isDevelopment: boolean;
    };
  } {
    const config = this.getConfig();
    return {
      config: {
        limitlessApiKey: config.limitlessApiKey ? config.limitlessApiKey.substring(0, 8) + '...' + config.limitlessApiKey.slice(-4) : '',
        geminiApiKey: config.geminiApiKey ? config.geminiApiKey.substring(0, 8) + '...' + config.geminiApiKey.slice(-4) : ''
      },
      validation: this.validateConfig(config),
      connectionStatus: this.connectionStatus,
      environment: {
        hasLimitlessKey: !!config.limitlessApiKey,
        hasGeminiKey: !!config.geminiApiKey,
        limitlessKeyFormat: config.limitlessApiKey ? (config.limitlessApiKey.startsWith('sk-') ? 'Correct (sk-)' : 'Incorrect format') : 'Not set',
        geminiKeyFormat: config.geminiApiKey ? (config.geminiApiKey.startsWith('AIza') ? 'Correct (AIza)' : 'Incorrect format') : 'Not set',
        proxyEndpoint: '/api/limitless',
        isDevelopment: import.meta.env.DEV
      }
    };
  }

  /**
   * Test connection with detailed logging
   */
  async testConnectionWithDebug(service: 'limitless' | 'gemini'): Promise<DetailedConnectionResult> {
    const config = this.getConfig();
    const timestamp = new Date().toISOString();

    if (service === 'limitless') {
      const apiKey = config.limitlessApiKey;
      const endpoint = '/api/limitless/v1/lifelogs?limit=1';
      const headers = {
        'X-API-Key': apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT_SET',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      const result = await this.testLimitlessConnection();
      return {
        ...result,
        debugInfo: {
          apiKey: apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT_SET',
          endpoint,
          headers,
          timestamp,
          method: 'GET',
          proxyUsed: true
        }
      };
    } else {
      const apiKey = config.geminiApiKey;
      const endpoint = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey ? '***' : 'NOT_SET'}`;
      const headers = {
        'Accept': 'application/json'
      };

      const result = await this.testGeminiConnection();
      return {
        ...result,
        debugInfo: {
          apiKey: apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT_SET',
          endpoint,
          headers,
          timestamp,
          method: 'GET',
          proxyUsed: false
        }
      };
    }
  }

  /**
   * Get configuration help text
   */
  getConfigurationHelp(): {
    limitless: string;
    gemini: string;
    general: string;
    troubleshooting: string;
  } {
    return {
      limitless: `
        1. Go to your Limitless AI dashboard
        2. Navigate to API settings
        3. Create a new API key or use an existing one
        4. Add it to your .env.local file as VITE_LIMITLESS_API_KEY
      `,
      gemini: `
        1. Go to Google AI Studio (https://aistudio.google.com/)
        2. Sign in with your Google account
        3. Create a new API key or use an existing one
        4. Add it to your .env.local file as VITE_API_KEY
      `,
      general: `
        Make sure your .env.local file is in the project root and contains:
        VITE_LIMITLESS_API_KEY=your_limitless_key_here
        VITE_API_KEY=your_gemini_key_here
        
        Restart your development server after making changes.
      `,
      troubleshooting: `
        Common issues and solutions:
        
        1. "Failed to fetch" error:
           - Check if the development server is running
           - Verify the proxy configuration in vite.config.ts
           - Try restarting the development server
        
        2. CORS errors:
           - This is expected for direct API calls
           - Use the proxy endpoint (/api/limitless) instead
        
        3. 401/403 errors:
           - Verify your API key is correct
           - Check if the API key has the necessary permissions
        
        4. Network timeouts:
           - Check your internet connection
           - The API service might be temporarily unavailable
      `
    };
  }

  /**
   * Get network diagnostics
   */
  async getNetworkDiagnostics(): Promise<{
    proxyAvailable: boolean;
    internetConnection: boolean;
    limitlessApiReachable: boolean;
    geminiApiReachable: boolean;
    details: any;
  }> {
    const results = {
      proxyAvailable: false,
      internetConnection: false,
      limitlessApiReachable: false,
      geminiApiReachable: false,
      details: {} as any
    };

    try {
      // Test internet connection with a simple request
      const internetTest = await fetch('https://httpbin.org/get', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      results.internetConnection = internetTest.ok;
      results.details.internetTest = { status: internetTest.status, ok: internetTest.ok };
    } catch (error: any) {
      results.details.internetTest = { error: error.message };
    }

    try {
      // Test proxy availability
      const proxyTest = await fetch('/api/limitless/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      results.proxyAvailable = true; // If we get any response, proxy is working
      results.details.proxyTest = { status: proxyTest.status, ok: proxyTest.ok };
    } catch (error: any) {
      results.details.proxyTest = { error: error.message };
    }

    try {
      // Test Limitless API reachability (will likely fail due to CORS)
      const limitlessTest = await fetch('https://api.limitless.ai/health', { 
        method: 'GET',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      results.limitlessApiReachable = true;
      results.details.limitlessTest = { status: limitlessTest.status, ok: limitlessTest.ok };
    } catch (error: any) {
      results.details.limitlessTest = { error: error.message };
    }

    try {
      // Test Gemini API reachability
      const geminiTest = await fetch('https://generativelanguage.googleapis.com/v1/models', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      results.geminiApiReachable = geminiTest.status === 400; // 400 means API is reachable but needs auth
      results.details.geminiTest = { status: geminiTest.status, ok: geminiTest.ok };
    } catch (error: any) {
      results.details.geminiTest = { error: error.message };
    }

    return results;
  }
}

export const configService = ConfigService.getInstance();
export default configService;