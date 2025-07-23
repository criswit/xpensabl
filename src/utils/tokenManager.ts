import { TokenData, TokenStorage, TokenStatistics, LogLevel } from '../types';

export class TokenManager {
  private static readonly STORAGE_KEY = 'tokenStorage';
  private static readonly TOKEN_HISTORY_LIMIT = 10;
  private static readonly TOKEN_EXPIRY_HOURS = 24; // Default expiry time

  // Logger function
  private static log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(logEntry, data || '');
        break;
      case LogLevel.WARN:
        console.warn(logEntry, data || '');
        break;
      case LogLevel.INFO:
        console.info(logEntry, data || '');
        break;
      case LogLevel.DEBUG:
        console.log(logEntry, data || '');
        break;
    }
  }

  // Validate token format
  static validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check if token starts with expected prefix
    if (!token.startsWith('TripActions')) {
      return false;
    }

    // Check minimum length (adjust based on actual token format)
    if (token.length < 50) {
      return false;
    }

    // Additional validation can be added here
    return true;
  }

  // Create token data object
  static createTokenData(
    token: string,
    source: string,
    metadata?: any
  ): TokenData {
    const now = Date.now();
    const expiresAt = now + (this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    return {
      token,
      capturedAt: now,
      lastUsed: now,
      expiresAt,
      source,
      isValid: true,
      metadata
    };
  }

  // Check if token is expired
  static isTokenExpired(tokenData: TokenData): boolean {
    if (!tokenData.expiresAt) {
      return false;
    }
    return Date.now() > tokenData.expiresAt;
  }

  // Get storage
  static async getStorage(): Promise<TokenStorage> {
    try {
      if (!chrome?.storage?.local) {
        this.log(LogLevel.ERROR, 'Chrome storage API not available');
        throw new Error('Chrome storage API not available');
      }
      
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      if (result[this.STORAGE_KEY]) {
        return result[this.STORAGE_KEY];
      }
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to get storage', error);
    }

    // Return default storage
    return {
      tokenHistory: [],
      statistics: {
        totalCaptured: 0,
        totalUsed: 0,
        captureFailures: 0
      }
    };
  }

  // Save storage
  static async saveStorage(storage: TokenStorage): Promise<void> {
    try {
      if (!chrome?.storage?.local) {
        this.log(LogLevel.ERROR, 'Chrome storage API not available');
        throw new Error('Chrome storage API not available');
      }
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: storage });
      this.log(LogLevel.DEBUG, 'Storage saved successfully');
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to save storage', error);
      throw error;
    }
  }

  // Save new token
  static async saveToken(
    token: string,
    source: string,
    metadata?: any
  ): Promise<boolean> {
    try {
      // Validate token
      if (!this.validateToken(token)) {
        this.log(LogLevel.WARN, 'Invalid token format', { token: token.substring(0, 20) + '...' });
        const storage = await this.getStorage();
        storage.statistics.captureFailures++;
        await this.saveStorage(storage);
        return false;
      }

      // Get current storage
      const storage = await this.getStorage();

      // Check if token already exists
      if (storage.currentToken?.token === token) {
        this.log(LogLevel.INFO, 'Token already captured, updating last used time');
        storage.currentToken.lastUsed = Date.now();
        await this.saveStorage(storage);
        return true;
      }

      // Create new token data
      const tokenData = this.createTokenData(token, source, metadata);

      // Move current token to history if exists
      if (storage.currentToken) {
        storage.tokenHistory.unshift(storage.currentToken);
        
        // Limit history size
        if (storage.tokenHistory.length > this.TOKEN_HISTORY_LIMIT) {
          storage.tokenHistory = storage.tokenHistory.slice(0, this.TOKEN_HISTORY_LIMIT);
        }
      }

      // Set new current token
      storage.currentToken = tokenData;
      storage.statistics.totalCaptured++;
      storage.statistics.lastCaptureTime = Date.now();

      // Save storage
      await this.saveStorage(storage);

      // Also save to legacy format for backward compatibility
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ bearerToken: token });
      }

      this.log(LogLevel.INFO, 'Token saved successfully', {
        source,
        capturedAt: new Date(tokenData.capturedAt).toISOString()
      });

      return true;
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to save token', error);
      return false;
    }
  }

  // Get current valid token
  static async getCurrentToken(): Promise<TokenData | null> {
    const storage = await this.getStorage();
    
    if (!storage.currentToken) {
      return null;
    }

    // Check if expired
    if (this.isTokenExpired(storage.currentToken)) {
      this.log(LogLevel.WARN, 'Current token is expired');
      storage.currentToken.isValid = false;
      await this.saveStorage(storage);
      return null;
    }

    // Update last used time
    storage.currentToken.lastUsed = Date.now();
    storage.statistics.totalUsed++;
    await this.saveStorage(storage);

    return storage.currentToken;
  }

  // Clear all tokens
  static async clearTokens(): Promise<void> {
    try {
      if (!chrome?.storage?.local) {
        this.log(LogLevel.ERROR, 'Chrome storage API not available');
        throw new Error('Chrome storage API not available');
      }
      
      await chrome.storage.local.remove([this.STORAGE_KEY, 'bearerToken']);
      this.log(LogLevel.INFO, 'All tokens cleared');
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to clear tokens', error);
      throw error;
    }
  }

  // Export token data
  static async exportTokenData(): Promise<string> {
    const storage = await this.getStorage();
    return JSON.stringify(storage, null, 2);
  }

  // Import token data
  static async importTokenData(jsonData: string): Promise<boolean> {
    try {
      const storage = JSON.parse(jsonData) as TokenStorage;
      await this.saveStorage(storage);
      this.log(LogLevel.INFO, 'Token data imported successfully');
      return true;
    } catch (error) {
      this.log(LogLevel.ERROR, 'Failed to import token data', error);
      return false;
    }
  }
}