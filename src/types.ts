// Token data structure for enhanced token management
export interface TokenData {
  token: string;
  capturedAt: number; // timestamp
  lastUsed: number; // timestamp
  expiresAt?: number; // timestamp if known
  source: string; // URL where token was captured
  isValid: boolean;
  metadata?: {
    userAgent?: string;
    requestUrl?: string;
    method?: string;
  };
}

// Token storage structure
export interface TokenStorage {
  currentToken?: TokenData;
  tokenHistory: TokenData[];
  statistics: TokenStatistics;
}

// Token statistics
export interface TokenStatistics {
  totalCaptured: number;
  totalUsed: number;
  lastCaptureTime?: number;
  captureFailures: number;
}

// Message types for background script
export interface BackgroundMessage {
  action: string;
  payload?: any;
  selectedTxn?: { id: string };
  expenseData?: any;
}

// Notification types
export interface TokenNotification {
  type: 'captured' | 'expired' | 'invalid' | 'refreshed';
  message: string;
  timestamp: number;
}

// Logger levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}