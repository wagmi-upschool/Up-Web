/**
 * Centralized Logging Utilities
 *
 * Purpose:
 * - apiLog: Always logs (critical for API debugging in production)
 * - clientLog: Only logs in development (silenced in production)
 * - debugLog: Development-only helper for verbose debugging
 */

type LogFunction = (...args: any[]) => void;

/**
 * API Logger - Always logs regardless of environment
 * Use for critical API operations, errors, and important state changes
 * that need to be monitored in production
 */
export const apiLog: LogFunction = (...args) => {
  console.log(...args);
};

/**
 * API Error Logger - Always logs errors
 * Use for error handling in API routes
 */
export const apiError: LogFunction = (...args) => {
  console.error(...args);
};

/**
 * API Warning Logger - Always logs warnings
 * Use for warnings in API routes
 */
export const apiWarn: LogFunction = (...args) => {
  console.warn(...args);
};

/**
 * Client Logger - Only logs in development
 * Use for client-side debugging, state changes, and non-critical information
 * that should not clutter production logs
 */
export const clientLog: LogFunction = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

/**
 * Client Error Logger - Only logs in development
 * Use for client-side error debugging
 */
export const clientError: LogFunction = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(...args);
  }
};

/**
 * Client Warning Logger - Only logs in development
 * Use for client-side warnings
 */
export const clientWarn: LogFunction = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
};

/**
 * Debug Logger - Development-only verbose logging
 * Use for detailed debugging information during development
 */
export const debugLog: LogFunction = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * Helper to check if we're in development mode
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Helper to check if we're in production mode
 */
export const isProduction = () => process.env.NODE_ENV === 'production';
