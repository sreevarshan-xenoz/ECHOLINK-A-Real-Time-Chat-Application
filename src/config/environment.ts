/**
 * Environment Configuration Service
 * Centralized configuration management for the application
 */

export interface GitHubConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  isConfigured: boolean;
  redirectUri: string;
  scope: string;
}

export interface SupabaseConfig {
  url: string | undefined;
  anonKey: string | undefined;
  isConfigured: boolean;
}

export interface AIConfig {
  huggingFace: {
    token: string | undefined;
    isConfigured: boolean;
  };
  openai: {
    apiKey: string | undefined;
    isConfigured: boolean;
  };
  gemini: {
    apiKey: string | undefined;
    isConfigured: boolean;
  };
}

export interface ServerConfig {
  port: number;
  serverPort: number;
  signalingUrl: string;
  wsUrl: string;
}

export interface FeatureFlags {
  aiChat: boolean;
  githubIntegration: boolean;
  voiceMessages: boolean;
  fileSharing: boolean;
  codeExecution: boolean;
  collaborativeWhiteboard: boolean;
}

export interface AnalyticsConfig {
  sentry: {
    dsn: string | undefined;
    isConfigured: boolean;
  };
  googleAnalytics: {
    trackingId: string | undefined;
    isConfigured: boolean;
  };
}

class EnvironmentConfig {
  public readonly isDevelopment: boolean;
  public readonly isProduction: boolean;
  public readonly isTest: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isTest = process.env.NODE_ENV === 'test';
  }

  // GitHub Configuration
  get github() {
    return {
      clientId: process.env.REACT_APP_GITHUB_CLIENT_ID,
      clientSecret: process.env.REACT_APP_GITHUB_CLIENT_SECRET,
      isConfigured: !!(process.env.REACT_APP_GITHUB_CLIENT_ID && process.env.REACT_APP_GITHUB_CLIENT_SECRET),
      redirectUri: `${window.location.origin}/auth/callback`,
      scope: 'repo user'
    };
  }

  // Supabase Configuration
  get supabase() {
    return {
      url: process.env.REACT_APP_SUPABASE_URL,
      anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
      isConfigured: !!(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY)
    };
  }

  // AI Service Configuration
  get ai() {
    return {
      huggingFace: {
        token: process.env.REACT_APP_HF_TOKEN,
        isConfigured: !!process.env.REACT_APP_HF_TOKEN
      },
      openai: {
        apiKey: process.env.REACT_APP_OPENAI_API_KEY,
        isConfigured: !!process.env.REACT_APP_OPENAI_API_KEY
      },
      gemini: {
        apiKey: process.env.REACT_APP_GEMINI_API_KEY,
        isConfigured: !!process.env.REACT_APP_GEMINI_API_KEY
      }
    };
  }

  // Server Configuration
  get server() {
    const hostname = window.location.hostname;
    const serverPort = process.env.SERVER_PORT || 5000;
    
    return {
      port: process.env.PORT || 3000,
      serverPort,
      signalingUrl: this.isDevelopment 
        ? `http://${hostname}:${serverPort}`
        : `https://${hostname}`,
      wsUrl: this.isDevelopment
        ? `ws://${hostname}:${serverPort}`
        : `wss://${hostname}`
    };
  }

  // Feature Flags
  get features() {
    return {
      aiChat: this.ai.openai.isConfigured || this.ai.gemini.isConfigured || this.ai.huggingFace.isConfigured,
      githubIntegration: this.github.isConfigured,
      voiceMessages: true,
      fileSharing: true,
      codeExecution: true,
      collaborativeWhiteboard: true
    };
  }

  // Analytics & Monitoring
  get analytics() {
    return {
      sentry: {
        dsn: process.env.REACT_APP_SENTRY_DSN,
        isConfigured: !!process.env.REACT_APP_SENTRY_DSN
      },
      googleAnalytics: {
        trackingId: process.env.REACT_APP_GA_TRACKING_ID,
        isConfigured: !!process.env.REACT_APP_GA_TRACKING_ID
      }
    };
  }

  // Validation methods
  validateRequiredConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.supabase.isConfigured) {
      errors.push('Supabase configuration is missing (REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY)');
    }

    if (errors.length > 0) {
      console.error('Configuration errors:', errors);
      if (this.isProduction) {
        throw new Error(`Critical configuration missing: ${errors.join(', ')}`);
      }
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [] };
  }

  // Initialize and validate configuration on startup
  init(): void {
    const validation = this.validateRequiredConfig();
    if (!validation.isValid && this.isProduction) {
      throw new Error('Application cannot start with missing configuration');
    }
  }

  // Get configuration summary for debugging
  getConfigSummary() {
    return {
      environment: process.env.NODE_ENV,
      features: this.features,
      services: {
        supabase: this.supabase.isConfigured,
        github: this.github.isConfigured,
        ai: {
          openai: this.ai.openai.isConfigured,
          gemini: this.ai.gemini.isConfigured,
          huggingFace: this.ai.huggingFace.isConfigured
        }
      },
      analytics: {
        sentry: this.analytics.sentry.isConfigured,
        googleAnalytics: this.analytics.googleAnalytics.isConfigured
      }
    };
  }
}

// Export singleton instance
export const config = new EnvironmentConfig();
export default config;
