/**
 * Production-ready logger utility
 * Replaces console.log statements with proper logging
 */

const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level,
      message,
      ...meta,
      environment: process.env.NODE_ENV
    };
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      const logEntry = this.formatMessage('info', message, meta);
      if (isProduction) {
        console.log(JSON.stringify(logEntry));
      } else {
        console.log(`[INFO] ${message}`, meta);
      }
    }
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      const logEntry = this.formatMessage('error', message, meta);
      if (isProduction) {
        console.error(JSON.stringify(logEntry));
      } else {
        console.error(`[ERROR] ${message}`, meta);
      }
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      const logEntry = this.formatMessage('warn', message, meta);
      if (isProduction) {
        console.warn(JSON.stringify(logEntry));
      } else {
        console.warn(`[WARN] ${message}`, meta);
      }
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      const logEntry = this.formatMessage('debug', message, meta);
      if (isProduction) {
        console.log(JSON.stringify(logEntry));
      } else {
        console.log(`[DEBUG] ${message}`, meta);
      }
    }
  }

  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }
}

export const logger = new Logger();
