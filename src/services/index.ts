/**
 * Services Index
 * Central export point for all services
 */

// Core Services
export { default as config } from '../config/environment';
export { default as aiService } from './ai-service';
export { default as errorService } from './error-service';
export { default as logger } from './logger-service';

// Legacy JavaScript Services (to be converted)
export { webrtcService } from './webrtc-service';
export { githubService } from './github-service';
export * from './supabase-service';
export { fileService } from './file-service';

// Re-export types
export type { ApplicationError, ErrorType, ErrorSeverity } from './error-service';
export type { LogLevel, LogEntry } from './logger-service';
