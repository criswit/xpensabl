/**
 * Chrome Extension Logger Service
 *
 * A centralized logging service for Chrome extensions that provides:
 * - Configurable log levels (DEBUG, INFO, WARN, ERROR)
 * - Chrome storage integration for persistent logs
 * - Automatic context detection (background, content, popup, sidepanel)
 * - Security features for token/PII sanitization
 * - Chrome DevTools integration
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  logLevel: LogLevel;
  persistLogs: boolean;
  maxLogEntries: number;
}

class ChromeLogger {
  private static instance: ChromeLogger;
  private config: LoggerConfig = {
    logLevel: LogLevel.INFO,
    persistLogs: true,
    maxLogEntries: 1000,
  };
  private context: string;
  private logBuffer: LogEntry[] = [];
  private isInitialized = false;

  private constructor() {
    this.context = this.detectContext();
    void this.initialize();
  }

  public static getInstance(): ChromeLogger {
    if (!ChromeLogger.instance) {
      ChromeLogger.instance = new ChromeLogger();
    }
    return ChromeLogger.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Load configuration from Chrome storage
      const stored = await chrome.storage.sync.get(['loggerConfig']);
      if (stored && stored.loggerConfig) {
        this.config = { ...this.config, ...stored.loggerConfig };
      }

      // Load existing logs from storage if persistence is enabled
      if (this.config.persistLogs) {
        const storedLogs = await chrome.storage.local.get(['logs']);
        if (storedLogs && storedLogs.logs) {
          this.logBuffer = storedLogs.logs;
        }
      }

      this.isInitialized = true;
    } catch (error) {
      // Use console.error here since logger is not yet initialized
      // eslint-disable-next-line no-console
      console.error('Failed to initialize ChromeLogger:', error);
    }
  }

  private detectContext(): string {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Check if we're in a service worker (background script)
      // Service workers don't have access to window or document
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return 'background';
      }

      if (location.protocol === 'chrome-extension:') {
        const pathname = location.pathname;
        if (pathname.includes('popup.html')) return 'popup';
        if (pathname.includes('sidepanel.html')) return 'sidepanel';
        if (pathname.includes('options.html')) return 'options';
      } else {
        // We're in a content script
        return 'content';
      }
    }
    return 'unknown';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.logLevel;
  }

  private sanitizeData(data: unknown): unknown {
    if (!data) return data;

    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Recursively sanitize object properties
    const sanitizeObject = (obj: Record<string, unknown>): unknown => {
      if (typeof obj !== 'object' || obj === null) return obj;

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();

          // Sanitize sensitive fields
          if (
            lowerKey.includes('token') ||
            lowerKey.includes('password') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('authorization') ||
            lowerKey.includes('bearer')
          ) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = sanitizeObject(obj[key] as Record<string, unknown>);
          }
        }
      }
      return obj;
    };

    return sanitizeObject(sanitized as Record<string, unknown>);
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    if (!this.config.persistLogs) return;

    try {
      // Add to buffer
      this.logBuffer.push(entry);

      // Implement circular buffer - remove oldest entries if exceeding max
      if (this.logBuffer.length > this.config.maxLogEntries) {
        this.logBuffer = this.logBuffer.slice(-this.config.maxLogEntries);
      }

      // Debounced storage write to avoid excessive writes
      if (!this.persistTimeout) {
        this.persistTimeout = setTimeout(() => {
          void (async () => {
            try {
              await chrome.storage.local.set({ logs: this.logBuffer });
            } catch (error) {
              // Use internal logging to avoid circular dependency
              // This is an acceptable use of console since we're in the logger itself
              // eslint-disable-next-line no-console
              console.error('Failed to persist logs:', error);
            }
            this.persistTimeout = null;
          })();
        }, 1000);
      }
    } catch (error) {
      // Use console.error to avoid circular dependency in logger
      // eslint-disable-next-line no-console
      console.error('Failed to persist log entry:', error);
    }
  }

  private persistTimeout: NodeJS.Timeout | null = null;

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context: this.context,
      message,
      data: data ? this.sanitizeData(data) : undefined,
    };

    // Output to console with appropriate method
    const consoleMethod = this.getConsoleMethod(level);
    const prefix = `[${this.context}] [${LogLevel[level]}]`;

    if (data) {
      consoleMethod(prefix, message, data);
    } else {
      consoleMethod(prefix, message);
    }

    // Persist log entry
    void this.persistLog(entry);
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        return console.debug;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        return console.info;
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        return console.warn;
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        return console.error;
      default:
        // eslint-disable-next-line no-console
        return console.log;
    }
  }

  public debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, data);
  }

  public async setLogLevel(level: LogLevel): Promise<void> {
    this.config.logLevel = level;
    await this.saveConfig();
  }

  public async setPersistence(enabled: boolean): Promise<void> {
    this.config.persistLogs = enabled;
    await this.saveConfig();
  }

  public async setMaxLogEntries(max: number): Promise<void> {
    this.config.maxLogEntries = max;
    await this.saveConfig();
  }

  private async saveConfig(): Promise<void> {
    try {
      await chrome.storage.sync.set({ loggerConfig: this.config });
    } catch (error) {
      // Use console.error to avoid circular dependency in logger
      // eslint-disable-next-line no-console
      console.error('Failed to save logger config:', error);
    }
  }

  public async getLogs(filter?: {
    level?: LogLevel;
    context?: string;
    limit?: number;
  }): Promise<LogEntry[]> {
    await this.waitForInitialization();

    let logs = [...this.logBuffer];

    if (filter) {
      if (filter.level !== undefined) {
        logs = logs.filter((log) => log.level >= filter.level!);
      }
      if (filter.context) {
        logs = logs.filter((log) => log.context === filter.context);
      }
      if (filter.limit) {
        logs = logs.slice(-filter.limit);
      }
    }

    return logs;
  }

  public async clearLogs(): Promise<void> {
    this.logBuffer = [];
    if (this.config.persistLogs) {
      await chrome.storage.local.remove(['logs']);
    }
  }

  private async waitForInitialization(): Promise<void> {
    while (!this.isInitialized) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  public async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
}

// Export singleton instance
export const logger = ChromeLogger.getInstance();

// Export convenience methods
export const debug = (message: string, data?: unknown) => logger.debug(message, data);
export const info = (message: string, data?: unknown) => logger.info(message, data);
export const warn = (message: string, data?: unknown) => logger.warn(message, data);
export const error = (message: string, data?: unknown) => logger.error(message, data);
