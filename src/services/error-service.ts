/**
 * Centralized Error Handling Service
 * Provides consistent error handling, logging, and user notifications
 */

import config from '../config/environment';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  API = 'API',
  WEBRTC = 'WEBRTC',
  AI = 'AI',
  GITHUB = 'GITHUB',
  SUPABASE = 'SUPABASE',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ApplicationError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: Date;
  userMessage: string;
  actionable: boolean;
  retryable: boolean;
  context?: Record<string, any>;
}

export interface ErrorHandlerOptions {
  notify?: boolean;
  log?: boolean;
  report?: boolean;
  showToUser?: boolean;
}

class ErrorService {
  private errors: ApplicationError[] = [];
  private maxErrorHistory = 100;
  private listeners: ((error: ApplicationError) => void)[] = [];

  /**
   * Create a standardized error object
   */
  createError(
    type: ErrorType,
    message: string,
    details?: any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): ApplicationError {
    const error: ApplicationError = {
      id: this.generateErrorId(),
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      userMessage: this.getUserMessage(type, message),
      actionable: this.isActionable(type),
      retryable: this.isRetryable(type),
      context
    };

    return error;
  }

  /**
   * Handle an error with various options
   */
  handleError(
    error: ApplicationError | Error | string,
    options: ErrorHandlerOptions = {}
  ): ApplicationError {
    const standardError = this.standardizeError(error);
    
    // Store error in history
    this.addToHistory(standardError);

    // Default options
    const opts = {
      notify: true,
      log: true,
      report: config.isProduction,
      showToUser: standardError.severity !== ErrorSeverity.LOW,
      ...options
    };

    // Log error
    if (opts.log) {
      this.logError(standardError);
    }

    // Notify listeners
    if (opts.notify) {
      this.notifyListeners(standardError);
    }

    // Report to external service (in production)
    if (opts.report && config.analytics.sentry.isConfigured) {
      this.reportError(standardError);
    }

    return standardError;
  }

  /**
   * Handle network errors specifically
   */
  handleNetworkError(error: any, endpoint?: string): ApplicationError {
    const networkError = this.createError(
      ErrorType.NETWORK,
      `Network request failed${endpoint ? ` to ${endpoint}` : ''}`,
      error,
      ErrorSeverity.MEDIUM,
      { endpoint }
    );

    return this.handleError(networkError);
  }

  /**
   * Handle WebRTC connection errors
   */
  handleWebRTCError(error: any, peerId?: string): ApplicationError {
    const webrtcError = this.createError(
      ErrorType.WEBRTC,
      'WebRTC connection failed',
      error,
      ErrorSeverity.HIGH,
      { peerId }
    );

    return this.handleError(webrtcError);
  }

  /**
   * Handle AI service errors
   */
  handleAIError(error: any, operation?: string): ApplicationError {
    const aiError = this.createError(
      ErrorType.AI,
      `AI service error${operation ? ` during ${operation}` : ''}`,
      error,
      ErrorSeverity.MEDIUM,
      { operation }
    );

    return this.handleError(aiError);
  }

  /**
   * Handle GitHub API errors
   */
  handleGitHubError(error: any, operation?: string): ApplicationError {
    const githubError = this.createError(
      ErrorType.GITHUB,
      `GitHub API error${operation ? ` during ${operation}` : ''}`,
      error,
      ErrorSeverity.MEDIUM,
      { operation }
    );

    return this.handleError(githubError);
  }

  /**
   * Add error listener
   */
  addErrorListener(listener: (error: ApplicationError) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: (error: ApplicationError) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(type?: ErrorType, limit = 50): ApplicationError[] {
    let errors = this.errors;
    
    if (type) {
      errors = errors.filter(error => error.type === type);
    }
    
    return errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    Object.values(ErrorType).forEach(type => {
      stats[type] = this.errors.filter(error => error.type === type).length;
    });
    
    return stats;
  }

  // Private methods
  private standardizeError(error: ApplicationError | Error | string): ApplicationError {
    if (typeof error === 'string') {
      return this.createError(ErrorType.UNKNOWN, error);
    }

    if (error instanceof Error) {
      return this.createError(
        this.determineErrorType(error),
        error.message,
        error,
        ErrorSeverity.MEDIUM
      );
    }

    return error as ApplicationError;
  }

  private determineErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorType.AUTHENTICATION;
    }
    
    if (message.includes('webrtc') || message.includes('peer')) {
      return ErrorType.WEBRTC;
    }
    
    if (message.includes('github')) {
      return ErrorType.GITHUB;
    }
    
    if (message.includes('supabase')) {
      return ErrorType.SUPABASE;
    }
    
    return ErrorType.UNKNOWN;
  }

  private getUserMessage(type: ErrorType, message: string): string {
    const userMessages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Connection failed. Please check your internet connection.',
      [ErrorType.AUTHENTICATION]: 'Authentication failed. Please sign in again.',
      [ErrorType.VALIDATION]: 'Invalid input. Please check your data.',
      [ErrorType.PERMISSION]: 'Permission denied. You don\'t have access to this resource.',
      [ErrorType.API]: 'Service temporarily unavailable. Please try again later.',
      [ErrorType.WEBRTC]: 'Connection to peer failed. Please try reconnecting.',
      [ErrorType.AI]: 'AI service is currently unavailable.',
      [ErrorType.GITHUB]: 'GitHub integration error. Please check your connection.',
      [ErrorType.SUPABASE]: 'Database connection error. Please try again.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred.'
    };

    return userMessages[type] || message;
  }

  private isActionable(type: ErrorType): boolean {
    return [
      ErrorType.AUTHENTICATION,
      ErrorType.VALIDATION,
      ErrorType.WEBRTC
    ].includes(type);
  }

  private isRetryable(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.API,
      ErrorType.WEBRTC,
      ErrorType.AI,
      ErrorType.GITHUB,
      ErrorType.SUPABASE
    ].includes(type);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(error: ApplicationError): void {
    this.errors.push(error);
    
    if (this.errors.length > this.maxErrorHistory) {
      this.errors.shift();
    }
  }

  private logError(error: ApplicationError): void {
    const logMethod = this.getLogMethod(error.severity);
    
    logMethod(`[${error.type}] ${error.message}`, {
      id: error.id,
      severity: error.severity,
      details: error.details,
      context: error.context,
      timestamp: error.timestamp
    });
  }

  private getLogMethod(severity: ErrorSeverity): (...args: any[]) => void {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.debug;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private notifyListeners(error: ApplicationError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  private reportError(error: ApplicationError): void {
    // Integration with Sentry or other error reporting service
    if (config.analytics.sentry.isConfigured) {
      // This would integrate with Sentry SDK
      console.log('Would report error to Sentry:', error);
    }
  }
}

export const errorService = new ErrorService();
export default errorService;
