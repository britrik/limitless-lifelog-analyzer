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
    }

    // Validate Gemini API key
    if (!config.geminiApiKey) {
      errors.push('Gemini API key is required');
    } else if (!config.geminiApiKey.startsWith('AIza')) {
      warnings.push('Gemini API key should start with "AIza"');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test Limitless API connection
   */
  async testLimitlessConnection(apiKey?: string): Promise<{ success: boolean; error?: string }> {
    const keyToTest = apiKey || this.config.limitlessApiKey;

    if (!keyToTest) {
      return { success: false, error: 'No API key provided' };
    }

    this.connectionStatus.limitless = 'testing';

    try {
      // Use the proxy endpoint with the correct v1 path
      const response = await fetch('/api/limitless/v1/lifelogs?limit=1', {
        method: 'GET',
        headers: {
          'X-API-Key': keyToTest,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        this.connectionStatus.limitless = 'connected';
        this.connectionStatus.lastChecked = new Date();
        return { success: true };
      } else {
        const errorText = await response.text();
        this.connectionStatus.limitless = 'error';
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText || response.statusText}`
        };
      }
    } catch (error: any) {
      this.connectionStatus.limitless = 'error';
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Test Gemini API connection
   */
  async testGeminiConnection(apiKey?: string): Promise<{ success: boolean; error?: string }> {
    const keyToTest = apiKey || this.config.geminiApiKey;
    
    if (!keyToTest) {
      return { success: false, error: 'No API key provided' };
    }

    this.connectionStatus.gemini = 'testing';

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${keyToTest}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        this.connectionStatus.gemini = 'connected';
        this.connectionStatus.lastChecked = new Date();
        return { success: true };
      } else {
        const errorText = await response.text();
        this.connectionStatus.gemini = 'error';
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText || response.statusText}` 
        };
      }
    } catch (error: any) {
      this.connectionStatus.gemini = 'error';
      return { 
        success: false, 
        error: `Network error: ${error.message}` 
      };
    }
  }

  /**
   * Test all connections
   */
  async testAllConnections(): Promise<void> {
    await Promise.all([
      this.testLimitlessConnection(),
      this.testGeminiConnection()
    ]);
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
        geminiKeyFormat: config.geminiApiKey ? (config.geminiApiKey.startsWith('AIza') ? 'Correct (AIza)' : 'Incorrect format') : 'Not set'
      }
    };
  }

  /**
   * Test connection with detailed logging
   */
  async testConnectionWithDebug(service: 'limitless' | 'gemini'): Promise<{
    success: boolean;
    error?: string;
    debugInfo: {
      apiKey: string;
      endpoint: string;
      headers: Record<string, string>;
      timestamp: string;
    };
  }> {
    const config = this.getConfig();
    const timestamp = new Date().toISOString();

    if (service === 'limitless') {
      const apiKey = config.limitlessApiKey;
      const endpoint = '/api/limitless/v1/lifelogs?limit=1';
      const headers = {
        'X-API-Key': apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT_SET',
        'Accept': 'application/json'
      };

      const result = await this.testLimitlessConnection();
      return {
        ...result,
        debugInfo: {
          apiKey: apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT_SET',
          endpoint,
          headers,
          timestamp
        }
      };
    } else {
      const apiKey = config.geminiApiKey;
      const endpoint = 'https://generativelanguage.googleapis.com/v1/models';
      const headers = {
        'Authorization': apiKey ? 'Bearer ' + apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT_SET'
      };

      const result = await this.testGeminiConnection();
      return {
        ...result,
        debugInfo: {
          apiKey: apiKey ? apiKey.substring(0, 8) + '...' + apiKey.slice(-4) : 'NOT_SET',
          endpoint,
          headers,
          timestamp
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
      `
    };
  }
}

export const configService = ConfigService.getInstance();
export default configService;