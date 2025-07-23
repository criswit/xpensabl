import {
  ExpenseTemplate,
  CreateTemplateRequest,
  TemplateScheduling,
  TemplateExecution,
  TemplatePreferences,
  TemplateIndex,
  ScheduledExecution,
  TemplateSyncStorage,
  TemplateLocalStorage,
  TemplateError,
  TEMPLATE_ERROR_CODES,
  CURRENT_SCHEMA_VERSION,
  QuotaInfo
} from '../model/template';
import { StorageManager } from './storageManager';

export class TemplateManager {
  private storageManager: StorageManager;
  private static instance: TemplateManager;

  private constructor() {
    this.storageManager = StorageManager.getInstance();
  }

  static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  async createTemplate(templateData: CreateTemplateRequest): Promise<ExpenseTemplate> {
    // Validate input
    this.validateTemplateData(templateData);
    
    // Check template limit
    await this.enforceTemplateLimit();
    
    // Create template with generated ID
    const template: ExpenseTemplate = {
      id: this.generateTemplateId(),
      name: templateData.name.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: CURRENT_SCHEMA_VERSION,
      expenseData: templateData.expenseData,
      scheduling: null,
      executionHistory: [],
      metadata: {
        sourceExpenseId: templateData.sourceExpenseId,
        createdFrom: templateData.createdFrom || 'manual',
        tags: templateData.tags || [],
        favorite: false,
        useCount: 0,
        scheduledUseCount: 0
      }
    };
    
    // Save to storage
    await this.saveTemplate(template);
    
    // Update sync index
    await this.updateTemplateIndex(template);
    
    console.log(`Created template: ${template.id} - ${template.name}`);
    return template;
  }

  async getTemplate(templateId: string): Promise<ExpenseTemplate | null> {
    if (!templateId) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_NAME, 'Template ID is required');
    }

    try {
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );
      
      return localData?.templates[templateId] || null;
    } catch (error) {
      console.error(`Failed to get template ${templateId}:`, error);
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND,
        `Failed to retrieve template ${templateId}`,
        templateId
      );
    }
  }

  async getAllTemplates(): Promise<ExpenseTemplate[]> {
    try {
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );
      
      if (!localData?.templates) {
        return [];
      }
      
      // Return templates sorted by most recently updated
      return Object.values(localData.templates)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Failed to get all templates:', error);
      return [];
    }
  }

  async updateTemplate(templateId: string, updates: Partial<ExpenseTemplate>): Promise<ExpenseTemplate> {
    const existing = await this.getTemplate(templateId);
    if (!existing) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND, `Template ${templateId} not found`);
    }

    // Validate name if being updated
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_NAME, 'Template name cannot be empty');
      }
    }

    const updated: ExpenseTemplate = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID changes
      createdAt: existing.createdAt, // Prevent creation date changes
      updatedAt: Date.now(),
      version: existing.version // Prevent version changes through this method
    };

    await this.saveTemplate(updated);
    await this.updateTemplateIndex(updated);
    
    console.log(`Updated template: ${templateId}`);
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const existing = await this.getTemplate(templateId);
    if (!existing) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND, `Template ${templateId} not found`);
    }

    // Remove from storage
    const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
      'xpensabl.templates.local'
    ) || this.getDefaultLocalStorage();

    delete localData.templates[templateId];

    // Also remove any pending executions for this template
    localData.executionQueue = localData.executionQueue.filter(
      execution => execution.templateId !== templateId
    );

    await this.storageManager.setLocalData('xpensabl.templates.local', localData);

    // Update sync index
    await this.removeFromTemplateIndex(templateId);
    
    console.log(`Deleted template: ${templateId}`);
  }

  async setTemplateScheduling(templateId: string, scheduling: TemplateScheduling): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND, `Template ${templateId} not found`);
    }

    // Validate scheduling configuration
    this.validateSchedulingConfig(scheduling);

    // Calculate next execution time
    scheduling.nextExecution = this.calculateNextExecution(scheduling);

    await this.updateTemplate(templateId, { scheduling });

    // Update execution queue if enabled
    if (scheduling.enabled && !scheduling.paused && scheduling.nextExecution) {
      await this.scheduleExecution(templateId, scheduling.nextExecution);
    } else {
      // Remove from execution queue if disabled or paused
      await this.removeFromExecutionQueue(templateId);
    }
    
    console.log(`Updated scheduling for template: ${templateId}, next execution: ${scheduling.nextExecution}`);
  }

  async addExecutionRecord(templateId: string, execution: TemplateExecution): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND, `Template ${templateId} not found`);
    }

    template.executionHistory.push(execution);

    // Update counters
    if (execution.status === 'success') {
      template.metadata.scheduledUseCount++;
    }

    // Maintain history limit (keep last 100 records)
    if (template.executionHistory.length > 100) {
      template.executionHistory = template.executionHistory
        .sort((a, b) => b.executedAt - a.executedAt)
        .slice(0, 100);
    }

    await this.saveTemplate(template);
    console.log(`Added execution record for template: ${templateId}, status: ${execution.status}`);
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.TEMPLATE_NOT_FOUND, `Template ${templateId} not found`);
    }

    template.metadata.useCount++;
    template.metadata.lastUsed = Date.now();

    await this.saveTemplate(template);
    console.log(`Incremented usage for template: ${templateId}`);
  }

  async getTemplatePreferences(): Promise<TemplatePreferences> {
    try {
      const syncData = await this.storageManager.getSyncData<TemplateSyncStorage>(
        'xpensabl.templates.sync'
      );
      
      return syncData?.preferences || this.getDefaultPreferences();
    } catch (error) {
      console.error('Failed to get template preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  async updateTemplatePreferences(preferences: Partial<TemplatePreferences>): Promise<TemplatePreferences> {
    const current = await this.getTemplatePreferences();
    const updated = { ...current, ...preferences };

    const syncData = await this.storageManager.getSyncData<TemplateSyncStorage>(
      'xpensabl.templates.sync'
    ) || this.getDefaultSyncStorage();

    syncData.preferences = updated;
    await this.storageManager.setSyncData('xpensabl.templates.sync', syncData);

    console.log('Updated template preferences');
    return updated;
  }

  async getStorageUsage(): Promise<{sync: QuotaInfo, local: QuotaInfo}> {
    return await this.storageManager.getStorageUsageStats();
  }

  async cleanupOldData(retentionDays: number = 90): Promise<number> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    try {
      const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
        'xpensabl.templates.local'
      );

      if (!localData) {
        return 0;
      }

      // Clean execution history
      for (const templateId in localData.templates) {
        const template = localData.templates[templateId];
        const originalLength = template.executionHistory.length;
        
        template.executionHistory = template.executionHistory.filter(
          execution => execution.executedAt > cutoffTime
        );
        
        cleanedCount += originalLength - template.executionHistory.length;
      }

      // Clean execution queue of old failed executions
      const originalQueueLength = localData.executionQueue.length;
      localData.executionQueue = localData.executionQueue.filter(
        execution => execution.scheduledAt > cutoffTime || execution.status === 'pending'
      );
      
      cleanedCount += originalQueueLength - localData.executionQueue.length;

      // Save cleaned data
      await this.storageManager.setLocalData('xpensabl.templates.local', localData);
      
      console.log(`Cleaned up ${cleanedCount} old records`);
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      return 0;
    }
  }

  // Private helper methods
  private validateTemplateData(data: CreateTemplateRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_NAME, 'Template name is required');
    }

    if (data.name.trim().length > 100) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_NAME, 'Template name must be 100 characters or less');
    }

    if (!data.expenseData) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_EXPENSE_DATA, 'Expense data is required');
    }

    if (!data.expenseData.merchantAmount || data.expenseData.merchantAmount <= 0) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_EXPENSE_DATA, 'Valid merchant amount is required');
    }

    if (!data.expenseData.merchantCurrency) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.INVALID_EXPENSE_DATA, 'Merchant currency is required');
    }
  }

  private validateSchedulingConfig(scheduling: TemplateScheduling): void {
    if (!scheduling.interval) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, 'Scheduling interval is required');
    }

    if (scheduling.executionTime.hour < 0 || scheduling.executionTime.hour > 23) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, 'Execution hour must be between 0 and 23');
    }

    if (scheduling.executionTime.minute < 0 || scheduling.executionTime.minute > 59) {
      throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, 'Execution minute must be between 0 and 59');
    }

    // Validate interval-specific configuration
    switch (scheduling.interval) {
      case 'weekly':
        if (!scheduling.intervalConfig.daysOfWeek || scheduling.intervalConfig.daysOfWeek.length === 0) {
          throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, 'Days of week required for weekly scheduling');
        }
        break;
      case 'monthly':
        if (!scheduling.intervalConfig.dayOfMonth) {
          throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, 'Day of month required for monthly scheduling');
        }
        break;
      case 'custom':
        if (!scheduling.intervalConfig.customIntervalMs || scheduling.intervalConfig.customIntervalMs < 3600000) {
          throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, 'Custom interval must be at least 1 hour');
        }
        break;
    }
  }

  private async enforceTemplateLimit(): Promise<void> {
    const templates = await this.getAllTemplates();
    const preferences = await this.getTemplatePreferences();

    if (templates.length >= preferences.maxTemplates) {
      throw new TemplateError(
        TEMPLATE_ERROR_CODES.TEMPLATE_LIMIT_EXCEEDED,
        `Maximum ${preferences.maxTemplates} templates allowed. Delete an existing template first.`
      );
    }
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveTemplate(template: ExpenseTemplate): Promise<void> {
    const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
      'xpensabl.templates.local'
    ) || this.getDefaultLocalStorage();

    localData.templates[template.id] = template;

    await this.storageManager.setLocalData('xpensabl.templates.local', localData);
  }

  private async updateTemplateIndex(template: ExpenseTemplate): Promise<void> {
    const syncData = await this.storageManager.getSyncData<TemplateSyncStorage>(
      'xpensabl.templates.sync'
    ) || this.getDefaultSyncStorage();

    // Update or add template in index
    const indexEntry: TemplateIndex = {
      id: template.id,
      name: template.name,
      updatedAt: template.updatedAt,
      schedulingEnabled: template.scheduling?.enabled || false,
      nextExecution: template.scheduling?.nextExecution || undefined
    };

    const existingIndex = syncData.templateIndex.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      syncData.templateIndex[existingIndex] = indexEntry;
    } else {
      syncData.templateIndex.push(indexEntry);
    }

    // Keep only the most recent templates in sync (to save space)
    syncData.templateIndex = syncData.templateIndex
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10); // Keep index for up to 10 templates

    await this.storageManager.setSyncData('xpensabl.templates.sync', syncData);
  }

  private async removeFromTemplateIndex(templateId: string): Promise<void> {
    const syncData = await this.storageManager.getSyncData<TemplateSyncStorage>(
      'xpensabl.templates.sync'
    );

    if (syncData) {
      syncData.templateIndex = syncData.templateIndex.filter(t => t.id !== templateId);
      await this.storageManager.setSyncData('xpensabl.templates.sync', syncData);
    }
  }

  private async scheduleExecution(templateId: string, executionTime: number): Promise<void> {
    const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
      'xpensabl.templates.local'
    ) || this.getDefaultLocalStorage();

    // Remove any existing scheduled execution for this template
    localData.executionQueue = localData.executionQueue.filter(
      execution => execution.templateId !== templateId
    );

    // Add new scheduled execution
    const scheduledExecution: ScheduledExecution = {
      id: `execution_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      templateId,
      scheduledAt: executionTime,
      status: 'pending',
      retryCount: 0
    };

    localData.executionQueue.push(scheduledExecution);

    await this.storageManager.setLocalData('xpensabl.templates.local', localData);
  }

  private async removeFromExecutionQueue(templateId: string): Promise<void> {
    const localData = await this.storageManager.getLocalData<TemplateLocalStorage>(
      'xpensabl.templates.local'
    );

    if (localData) {
      localData.executionQueue = localData.executionQueue.filter(
        execution => execution.templateId !== templateId
      );
      
      await this.storageManager.setLocalData('xpensabl.templates.local', localData);
    }
  }

  private calculateNextExecution(scheduling: TemplateScheduling): number | null {
    if (!scheduling.enabled || scheduling.paused) {
      return null;
    }

    const now = new Date();
    const { hour, minute } = scheduling.executionTime;

    // For this implementation, we'll use a simple calculation
    // A more sophisticated implementation would handle timezones properly
    switch (scheduling.interval) {
      case 'daily':
        return this.calculateDailyExecution(now, hour, minute);
      case 'weekly':
        return this.calculateWeeklyExecution(now, hour, minute, scheduling.intervalConfig.daysOfWeek || []);
      case 'monthly':
        return this.calculateMonthlyExecution(now, hour, minute, scheduling.intervalConfig.dayOfMonth || 1);
      case 'custom':
        return this.calculateCustomExecution(now, scheduling.intervalConfig.customIntervalMs || 86400000);
      default:
        throw new TemplateError(TEMPLATE_ERROR_CODES.SCHEDULING_ERROR, `Unsupported scheduling interval: ${scheduling.interval}`);
    }
  }

  private calculateDailyExecution(base: Date, hour: number, minute: number): number {
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (next <= base) {
      next.setDate(next.getDate() + 1);
    }

    return next.getTime();
  }

  private calculateWeeklyExecution(base: Date, hour: number, minute: number, daysOfWeek: string[]): number {
    // Simple implementation - find next occurrence of specified day
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);

    // Map day names to numbers (0 = Sunday)
    const dayMap: {[key: string]: number} = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    const targetDays = daysOfWeek.map(day => dayMap[day]).sort();
    const currentDay = base.getDay();

    // Find next target day
    let daysToAdd = 0;
    for (const targetDay of targetDays) {
      if (targetDay > currentDay || (targetDay === currentDay && next > base)) {
        daysToAdd = targetDay - currentDay;
        break;
      }
    }

    // If no day found this week, use first day of next week
    if (daysToAdd === 0) {
      daysToAdd = 7 - currentDay + targetDays[0];
    }

    next.setDate(next.getDate() + daysToAdd);
    return next.getTime();
  }

  private calculateMonthlyExecution(base: Date, hour: number, minute: number, dayOfMonth: number | 'last'): number {
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);

    if (dayOfMonth === 'last') {
      // Last day of month
      next.setMonth(next.getMonth() + 1, 0); // Set to last day of current month
      if (next <= base) {
        next.setMonth(next.getMonth() + 1, 0); // Next month if already passed
      }
    } else {
      next.setDate(dayOfMonth);
      if (next <= base) {
        next.setMonth(next.getMonth() + 1, dayOfMonth);
      }
    }

    return next.getTime();
  }

  private calculateCustomExecution(base: Date, intervalMs: number): number {
    return base.getTime() + intervalMs;
  }

  private getDefaultPreferences(): TemplatePreferences {
    return {
      maxTemplates: 5,
      defaultTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notificationEnabled: true,
      autoCleanupDays: 90
    };
  }

  private getDefaultSyncStorage(): TemplateSyncStorage {
    return {
      version: CURRENT_SCHEMA_VERSION,
      preferences: this.getDefaultPreferences(),
      templateIndex: []
    };
  }

  private getDefaultLocalStorage(): TemplateLocalStorage {
    return {
      templates: {},
      executionQueue: [],
      migrationState: {
        currentVersion: CURRENT_SCHEMA_VERSION,
        pendingMigrations: []
      }
    };
  }
}