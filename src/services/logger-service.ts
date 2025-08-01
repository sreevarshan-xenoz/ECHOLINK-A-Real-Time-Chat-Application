/**
 * Centralized Logging Service
 * Provides structured logging with different levels and contexts
 */

import config from '../config/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogHistory = 1000;
  private currentLogLevel: LogLevel;
  private sessionId: string;

  constructor() {
    this.currentLogLevel = config.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Set the minimum log level
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, context?: string, data?: any): void {
    this.log(LogLevel.FATAL, message, context, data);
  }

  /**
   * Log WebRTC events
   */
  logWebRTC(event: string, peerId?: string, data?: any): void {
    this.info(`WebRTC: ${event}`, 'WEBRTC', { peerId, ...data });
  }

  /**
   * Log AI service events
   */
  logAI(event: string, operation?: string, data?: any): void {
    this.info(`AI: ${event}`, 'AI', { operation, ...data });
  }

  /**
   * Log GitHub integration events
   */
  logGitHub(event: string, operation?: string, data?: any): void {
    this.info(`GitHub: ${event}`, 'GITHUB', { operation, ...data });
  }

  /**
   * Log user actions
   */
  logUserAction(action: string, userId?: string, data?: any): void {
    this.info(`User Action: ${action}`, 'USER', { userId, ...data });
  }

  /**
   * Log performance metrics
   */
  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.info(`Performance: ${metric}`, 'PERFORMANCE', { value, unit });
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(
    level?: LogLevel,
    context?: string,
    limit: number = 100
  ): LogEntry[] {
    let filteredLogs = this.logs;

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (context) {
      filteredLogs = filteredLogs.filter(log => log.context === context);
    }

    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Export logs for debugging or support
   */
  exportLogs(): string {
    const logsData = {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      logs: this.logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: LogLevel[log.level],
        message: log.message,
        context: log.context,
        data: log.data
      }))
    };

    return JSON.stringify(logsData, null, 2);
  }

  /**
   * Clear log history
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get log statistics
   */
  getLogStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    // Count by level
    Object.values(LogLevel).forEach(level => {
      if (typeof level === 'number') {
        stats[LogLevel[level]] = this.logs.filter(log => log.level === level).length;
      }
    });

    // Count by context
    const contexts = [...new Set(this.logs.map(log => log.context).filter(Boolean))];
    contexts.forEach(context => {
      stats[`context_${context}`] = this.logs.filter(log => log.context === context).length;
    });

    return stats;
  }

  // Private methods
  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (level < this.currentLogLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data,
      sessionId: this.sessionId
    };

    // Add to history
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogHistory) {
      this.logs.shift();
    }

    // Console output
    this.outputToConsole(logEntry);

    // In production, you might want to send logs to a remote service
    if (config.isProduction && level >= LogLevel.ERROR) {
      this.sendToRemoteLogging(logEntry);
    }
  }

  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toISOString();
    const levelName = LogLevel[logEntry.level];
    const context = logEntry.context ? `[${logEntry.context}]` : '';
    const prefix = `${timestamp} ${levelName} ${context}`;

    const consoleMethod = this.getConsoleMethod(logEntry.level);
    
    if (logEntry.data) {
      consoleMethod(`${prefix} ${logEntry.message}`, logEntry.data);
    } else {
      consoleMethod(`${prefix} ${logEntry.message}`);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private sendToRemoteLogging(logEntry: LogEntry): void {
    // In a real application, you would send logs to a service like:
    // - AWS CloudWatch
    // - Google Cloud Logging
    // - Datadog
    // - Custom logging endpoint
    
    if (config.isDevelopment) {
      console.log('Would send to remote logging:', logEntry);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const logger = new LoggerService();
export default logger;
