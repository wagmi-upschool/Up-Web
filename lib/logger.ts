/**
 * Production Logger Utility
 * Provides structured logging for production environments with proper metadata
 */

import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export enum LogCategory {
  QUIZ_ACCESS = 'QUIZ_ACCESS',
  MIXPANEL_ACCESS = 'MIXPANEL_ACCESS',
  AUTH = 'AUTH',
  API = 'API',
  SYSTEM = 'SYSTEM',
}

interface LogMetadata {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  environment: string;
  requestId?: string;
  userId?: string;
  userEmail?: string;
  userGroup?: string;
  [key: string]: unknown;
}

interface LogEntry {
  metadata: LogMetadata;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

class ProductionLogger {
  private isProduction: boolean;
  private logFilePath: string;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logFilePath = path.join(process.cwd(), 'production.log');
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    const logEntry: LogEntry = {
      metadata: {
        timestamp: new Date().toISOString(),
        level,
        category,
        environment: process.env.NODE_ENV || 'development',
        ...data,
      },
      message,
    };

    if (data) {
      logEntry.data = data;
    }

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    // Console output with emoji prefixes (for development)
    if (!this.isProduction) {
      const emoji = this.getEmojiForLevel(level);
      console.log(`${emoji} [${category}] ${message}`, data || '');
      if (error) {
        console.error(error);
      }
    }

    // Structured JSON output for production
    const jsonLog = JSON.stringify(logEntry);

    if (this.isProduction) {
      // Write to production log file
      this.writeToFile(jsonLog);
    } else {
      // Also log structured JSON in development for testing
      console.log('📋 Structured log:', jsonLog);
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(logEntry: string): void {
    try {
      fs.appendFileSync(this.logFilePath, logEntry + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Get emoji prefix for log level
   */
  private getEmojiForLevel(level: LogLevel): string {
    const emojiMap = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: '📡',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
    };
    return emojiMap[level] || '📝';
  }

  // Generic logging methods
  debug(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: LogCategory, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: LogCategory, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  // Quiz Access specific logging methods
  quizAccess = {
    checkStarted: (userEmail: string, userGroup: string, requestId?: string) => {
      this.info(LogCategory.QUIZ_ACCESS, 'Quiz access check started', {
        userEmail,
        userGroup,
        requestId,
      });
    },

    configLoadSuccess: (source: string, groupCount: number) => {
      this.info(LogCategory.QUIZ_ACCESS, `Quiz config loaded successfully from ${source}`, {
        source,
        groupCount,
      });
    },

    configLoadFailed: (source: string, error: Error) => {
      this.error(LogCategory.QUIZ_ACCESS, `Failed to load quiz config from ${source}`, error, {
        source,
      });
    },

    accessGranted: (userEmail: string, userGroup: string, testId: string, testUrl: string) => {
      this.info(LogCategory.QUIZ_ACCESS, 'Quiz access granted', {
        userEmail,
        userGroup,
        testId,
        testUrl,
        accessGranted: true,
      });
    },

    accessDenied: (userEmail: string, userGroup: string, reason: string) => {
      this.warn(LogCategory.QUIZ_ACCESS, 'Quiz access denied', {
        userEmail,
        userGroup,
        reason,
        accessGranted: false,
      });
    },

    validationError: (errorType: string, details: string) => {
      this.warn(LogCategory.QUIZ_ACCESS, 'Quiz access validation error', {
        errorType,
        details,
      });
    },

    systemError: (error: Error, context?: Record<string, unknown>) => {
      this.error(LogCategory.QUIZ_ACCESS, 'Quiz access system error', error, context);
    },
  };

  // Mixpanel Access specific logging methods
  mixpanelAccess = {
    checkStarted: (userEmail: string, requestId?: string) => {
      this.info(LogCategory.MIXPANEL_ACCESS, 'Mixpanel access check started', {
        userEmail,
        requestId,
      });
    },

    configLoadSuccess: (source: string, orgCount: number) => {
      this.info(LogCategory.MIXPANEL_ACCESS, `Mixpanel config loaded successfully from ${source}`, {
        source,
        orgCount,
      });
    },

    configLoadFailed: (source: string, error: Error) => {
      this.error(LogCategory.MIXPANEL_ACCESS, `Failed to load Mixpanel config from ${source}`, error, {
        source,
      });
    },

    accessGranted: (userEmail: string, organization: string, dashboardUrl: string) => {
      this.info(LogCategory.MIXPANEL_ACCESS, 'Mixpanel access granted', {
        userEmail,
        organization,
        dashboardUrl,
        accessGranted: true,
      });
    },

    accessDenied: (userEmail: string, reason: string) => {
      this.warn(LogCategory.MIXPANEL_ACCESS, 'Mixpanel access denied', {
        userEmail,
        reason,
        accessGranted: false,
      });
    },

    validationError: (errorType: string, details: string) => {
      this.warn(LogCategory.MIXPANEL_ACCESS, 'Mixpanel access validation error', {
        errorType,
        details,
      });
    },

    systemError: (error: Error, context?: Record<string, unknown>) => {
      this.error(LogCategory.MIXPANEL_ACCESS, 'Mixpanel access system error', error, context);
    },
  };
}

// Export singleton instance
export const logger = new ProductionLogger();
