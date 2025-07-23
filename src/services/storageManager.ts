import { 
  QuotaInfo, 
  StorageError, 
  STORAGE_ERROR_CODES,
  TemplateSyncStorage,
  TemplateLocalStorage 
} from '../model/template';

export class StorageManager {
  private static instance: StorageManager;
  private syncCache: Map<string, any> = new Map();
  private localCache: Map<string, any> = new Map();
  private cacheTimeout = 60000; // 1 minute
  private lastCacheUpdate: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async getSyncData<T>(key: string): Promise<T | null> {
    try {
      // Check cache first
      if (this.isCacheValid(key, 'sync')) {
        return this.syncCache.get(key) as T || null;
      }

      const result = await chrome.storage.sync.get(key);
      const data = result[key] || null;
      
      // Update cache
      this.syncCache.set(key, data);
      this.lastCacheUpdate.set(`sync_${key}`, Date.now());
      
      return data;
    } catch (error) {
      console.error(`Failed to get sync data for key ${key}:`, error);
      throw new StorageError(
        STORAGE_ERROR_CODES.SYNC_READ_FAILED, 
        `Failed to read sync data for key ${key}`,
        error as Error
      );
    }
  }

  async setSyncData<T>(key: string, data: T): Promise<void> {
    try {
      // Check sync quota before writing
      await this.checkSyncQuota(key, data);
      
      await chrome.storage.sync.set({ [key]: data });
      
      // Update cache
      this.syncCache.set(key, data);
      this.lastCacheUpdate.set(`sync_${key}`, Date.now());
      
      console.log(`Successfully set sync data for key: ${key}`);
    } catch (error) {
      console.error(`Failed to set sync data for key ${key}:`, error);
      throw new StorageError(
        STORAGE_ERROR_CODES.SYNC_WRITE_FAILED,
        `Failed to write sync data for key ${key}`,
        error as Error
      );
    }
  }

  async getLocalData<T>(key: string): Promise<T | null> {
    try {
      // Check cache first
      if (this.isCacheValid(key, 'local')) {
        return this.localCache.get(key) as T || null;
      }

      const result = await chrome.storage.local.get(key);
      const data = result[key] || null;
      
      // Update cache
      this.localCache.set(key, data);
      this.lastCacheUpdate.set(`local_${key}`, Date.now());
      
      return data;
    } catch (error) {
      console.error(`Failed to get local data for key ${key}:`, error);
      throw new StorageError(
        STORAGE_ERROR_CODES.LOCAL_READ_FAILED,
        `Failed to read local data for key ${key}`,
        error as Error
      );
    }
  }

  async setLocalData<T>(key: string, data: T): Promise<void> {
    try {
      // Check local quota before writing
      await this.checkLocalQuota(key, data);
      
      await chrome.storage.local.set({ [key]: data });
      
      // Update cache
      this.localCache.set(key, data);
      this.lastCacheUpdate.set(`local_${key}`, Date.now());
      
      console.log(`Successfully set local data for key: ${key}`);
    } catch (error) {
      console.error(`Failed to set local data for key ${key}:`, error);
      throw new StorageError(
        STORAGE_ERROR_CODES.LOCAL_WRITE_FAILED,
        `Failed to write local data for key ${key}`,
        error as Error
      );
    }
  }

  async removeSyncData(key: string): Promise<void> {
    try {
      await chrome.storage.sync.remove(key);
      this.syncCache.delete(key);
      this.lastCacheUpdate.delete(`sync_${key}`);
      console.log(`Successfully removed sync data for key: ${key}`);
    } catch (error) {
      console.error(`Failed to remove sync data for key ${key}:`, error);
      throw new StorageError(
        STORAGE_ERROR_CODES.SYNC_WRITE_FAILED,
        `Failed to remove sync data for key ${key}`,
        error as Error
      );
    }
  }

  async removeLocalData(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
      this.localCache.delete(key);
      this.lastCacheUpdate.delete(`local_${key}`);
      console.log(`Successfully removed local data for key: ${key}`);
    } catch (error) {
      console.error(`Failed to remove local data for key ${key}:`, error);
      throw new StorageError(
        STORAGE_ERROR_CODES.LOCAL_WRITE_FAILED,
        `Failed to remove local data for key ${key}`,
        error as Error
      );
    }
  }

  async getSyncQuotaInfo(): Promise<QuotaInfo> {
    try {
      const bytesInUse = await chrome.storage.sync.getBytesInUse();
      const maxBytes = 102400; // 100KB
      return {
        used: bytesInUse,
        available: maxBytes,
        percentUsed: (bytesInUse / maxBytes) * 100,
        nearLimit: (bytesInUse / maxBytes) > 0.8
      };
    } catch (error) {
      console.error('Failed to get sync quota info:', error);
      throw new StorageError(
        STORAGE_ERROR_CODES.SYNC_READ_FAILED,
        'Failed to get sync quota information',
        error as Error
      );
    }
  }

  async getLocalQuotaInfo(): Promise<QuotaInfo> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const maxBytes = 10485760; // 10MB (can be unlimited with permission)
      return {
        used: bytesInUse,
        available: maxBytes,
        percentUsed: (bytesInUse / maxBytes) * 100,
        nearLimit: (bytesInUse / maxBytes) > 0.8
      };
    } catch (error) {
      console.error('Failed to get local quota info:', error);
      throw new StorageError(
        STORAGE_ERROR_CODES.LOCAL_READ_FAILED,
        'Failed to get local quota information',
        error as Error
      );
    }
  }

  async clearCache(): Promise<void> {
    this.syncCache.clear();
    this.localCache.clear();
    this.lastCacheUpdate.clear();
    console.log('Storage cache cleared');
  }

  private async checkSyncQuota<T>(key: string, data: T): Promise<void> {
    const dataSize = this.estimateDataSize(data);
    const syncQuota = await this.getSyncQuotaInfo();
    
    // Check if writing this data would exceed 80% of sync quota
    if (syncQuota.used + dataSize > syncQuota.available * 0.8) {
      throw new StorageError(
        STORAGE_ERROR_CODES.SYNC_QUOTA_EXCEEDED,
        `Writing ${dataSize} bytes would exceed 80% of sync quota (${syncQuota.used + dataSize}/${syncQuota.available})`
      );
    }

    // Check Chrome's per-item limit (8KB)
    if (dataSize > 8192) {
      throw new StorageError(
        STORAGE_ERROR_CODES.SYNC_QUOTA_EXCEEDED,
        `Data size ${dataSize} bytes exceeds Chrome sync storage per-item limit of 8KB`
      );
    }
  }

  private async checkLocalQuota<T>(key: string, data: T): Promise<void> {
    const dataSize = this.estimateDataSize(data);
    const localQuota = await this.getLocalQuotaInfo();
    
    // Check if writing this data would exceed 80% of local quota
    if (localQuota.used + dataSize > localQuota.available * 0.8) {
      console.warn(`Writing ${dataSize} bytes would exceed 80% of local quota, attempting emergency cleanup`);
      
      // Attempt emergency cleanup
      const cleaned = await this.emergencyCleanup();
      if (!cleaned) {
        throw new StorageError(
          STORAGE_ERROR_CODES.LOCAL_QUOTA_EXCEEDED,
          `Writing ${dataSize} bytes would exceed local storage quota (${localQuota.used + dataSize}/${localQuota.available})`
        );
      }
    }
  }

  private estimateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (error) {
      // Fallback estimation if Blob fails
      const jsonString = JSON.stringify(data);
      return new TextEncoder().encode(jsonString).length;
    }
  }

  private isCacheValid(key: string, storageType: 'sync' | 'local'): boolean {
    const cacheKey = `${storageType}_${key}`;
    const lastUpdate = this.lastCacheUpdate.get(cacheKey);
    
    if (!lastUpdate) {
      return false;
    }
    
    return (Date.now() - lastUpdate) < this.cacheTimeout;
  }

  private async emergencyCleanup(): Promise<boolean> {
    try {
      console.log('Attempting emergency cleanup of local storage');
      
      // Get current local data
      const localData = await this.getLocalData<TemplateLocalStorage>('xpensabl.templates.local');
      if (!localData) {
        return false;
      }

      let cleanedSize = 0;
      
      // Clean old execution history (keep only last 50 records per template)
      for (const templateId in localData.templates) {
        const template = localData.templates[templateId];
        const originalHistoryLength = template.executionHistory.length;
        
        if (template.executionHistory.length > 50) {
          template.executionHistory = template.executionHistory
            .sort((a, b) => b.executedAt - a.executedAt)
            .slice(0, 50);
          
          cleanedSize += (originalHistoryLength - 50) * 200; // Rough estimate
        }
      }

      // Remove failed executions older than 7 days
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const originalQueueLength = localData.executionQueue.length;
      
      localData.executionQueue = localData.executionQueue.filter(execution => {
        return execution.scheduledAt > sevenDaysAgo || execution.status === 'pending';
      });
      
      cleanedSize += (originalQueueLength - localData.executionQueue.length) * 100; // Rough estimate

      // Save cleaned data if we cleaned anything
      if (cleanedSize > 0) {
        await chrome.storage.local.set({ 'xpensabl.templates.local': localData });
        console.log(`Emergency cleanup freed approximately ${cleanedSize} bytes`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return false;
    }
  }

  async getStorageUsageStats(): Promise<{sync: QuotaInfo, local: QuotaInfo}> {
    const [syncQuota, localQuota] = await Promise.all([
      this.getSyncQuotaInfo(),
      this.getLocalQuotaInfo()
    ]);

    return { sync: syncQuota, local: localQuota };
  }

  onStorageChanged(callback: (changes: {[key: string]: chrome.storage.StorageChange}, areaName: string) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      // Clear relevant cache entries when storage changes
      for (const key in changes) {
        if (areaName === 'sync') {
          this.syncCache.delete(key);
          this.lastCacheUpdate.delete(`sync_${key}`);
        } else if (areaName === 'local') {
          this.localCache.delete(key);
          this.lastCacheUpdate.delete(`local_${key}`);
        }
      }
      
      callback(changes, areaName);
    });
  }
}