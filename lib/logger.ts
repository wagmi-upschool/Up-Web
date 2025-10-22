/**
 * Production Logger Utility
 * Provides structured logging for production environments with proper metadata
 */

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

    // Always log to console
    console.log(JSON.stringify(logEntry));
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
