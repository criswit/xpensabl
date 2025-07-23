/**
 * Enhanced Notification Manager for Chrome Extension
 * Provides cross-site notification capabilities with action handling and persistence
 */

import { logger } from './chromeLogger';

export interface NotificationData {
  id?: string;
  type: 'success' | 'failure' | 'auth' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  metadata?: {
    templateId?: string;
    templateName?: string;
    expenseId?: string;
    errorDetails?: string;
    actionUrl?: string;
    requiresAction?: boolean;
  };
  actions?: NotificationAction[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface NotificationHistory {
  notifications: NotificationData[];
  lastCleanup: number;
}

export enum NotificationActionType {
  OPEN_NAVAN = 'open_navan',
  VIEW_EXPENSE = 'view_expense',
  VIEW_TEMPLATE = 'view_template',
  RETRY_OPERATION = 'retry_operation',
  DISMISS = 'dismiss',
}

export class NotificationManager {
  private static instance: NotificationManager | null = null;
  private static readonly STORAGE_KEY = 'xpensabl.notifications';
  private static readonly MAX_HISTORY_SIZE = 50;
  private static readonly HISTORY_RETENTION_DAYS = 7;
  private static readonly NOTIFICATION_TIMEOUT = 10000; // 10 seconds
  private listenersSetup = false;

  // Notification icons
  private static readonly ICONS: Record<string, string> = {
    success: 'expense-icon.png',
    failure: 'expense-icon.png',
    auth: 'expense-icon.png',
    info: 'expense-icon.png',
    warning: 'expense-icon.png',
  };

  private constructor() {
    this.setupNotificationListeners();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Initialize notification system
   */
  public async initialize(): Promise<void> {
    try {
      // Clean up old notifications on startup
      await this.cleanupOldNotifications();

      // Register notification listeners
      this.setupNotificationListeners();

      logger.info('NotificationManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize NotificationManager:', error);
      throw error;
    }
  }

  /**
   * Send success notification
   */
  public async sendSuccessNotification(
    title: string,
    message: string,
    metadata?: NotificationData['metadata']
  ): Promise<string | null> {
    return this.sendNotification({
      type: 'success',
      title,
      message,
      timestamp: Date.now(),
      metadata,
      actions: metadata?.expenseId
        ? [{ action: NotificationActionType.VIEW_EXPENSE, title: 'View Expense' }]
        : undefined,
    });
  }

  /**
   * Send failure notification
   */
  public async sendFailureNotification(
    title: string,
    message: string,
    metadata?: NotificationData['metadata']
  ): Promise<string | null> {
    return this.sendNotification({
      type: 'failure',
      title,
      message,
      timestamp: Date.now(),
      metadata,
      actions: [
        { action: NotificationActionType.RETRY_OPERATION, title: 'Retry' },
        { action: NotificationActionType.DISMISS, title: 'Dismiss' },
      ],
    });
  }

  /**
   * Send authentication required notification
   */
  public async sendAuthNotification(message?: string): Promise<string | null> {
    return this.sendNotification({
      type: 'auth',
      title: 'Authentication Required',
      message:
        message || 'Please visit app.navan.com to authenticate for scheduled expense creation',
      timestamp: Date.now(),
      metadata: {
        requiresAction: true,
        actionUrl: 'https://app.navan.com',
      },
      actions: [{ action: NotificationActionType.OPEN_NAVAN, title: 'Open Navan' }],
    });
  }

  /**
   * Send info notification
   */
  public async sendInfoNotification(
    title: string,
    message: string,
    metadata?: NotificationData['metadata']
  ): Promise<string | null> {
    return this.sendNotification({
      type: 'info',
      title,
      message,
      timestamp: Date.now(),
      metadata,
    });
  }

  /**
   * Send warning notification
   */
  public async sendWarningNotification(
    title: string,
    message: string,
    metadata?: NotificationData['metadata']
  ): Promise<string | null> {
    return this.sendNotification({
      type: 'warning',
      title,
      message,
      timestamp: Date.now(),
      metadata,
    });
  }

  /**
   * Core notification sending logic
   */
  private async sendNotification(notificationData: NotificationData): Promise<string | null> {
    if (!chrome.notifications?.create) {
      logger.warn('Chrome notifications API not available');
      return null;
    }

    try {
      // Generate notification ID
      const notificationId = `xpensabl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      notificationData.id = notificationId;

      // Create Chrome notification options
      const iconUrl = NotificationManager.ICONS[notificationData.type] ?? 'expense-icon.png';
      const baseOptions = {
        type: 'basic' as const,
        iconUrl,
        title: notificationData.title,
        message: notificationData.message,
        priority: (notificationData.type === 'auth' || notificationData.type === 'failure'
          ? 2
          : 1) as 0 | 1 | 2,
        requireInteraction: notificationData.metadata?.requiresAction || false,
      };

      // Add buttons if actions are specified (max 2 buttons in Chrome)
      const options =
        notificationData.actions && notificationData.actions.length > 0
          ? {
              ...baseOptions,
              buttons: notificationData.actions.slice(0, 2).map((action) => ({
                title: action.title,
              })),
            }
          : baseOptions;

      // Create notification
      await new Promise<string>((resolve) => {
        chrome.notifications.create(notificationId, options, (createdId: string) => {
          resolve(createdId);
        });
      });

      // Store in history
      await this.addToHistory(notificationData);

      // Set auto-dismiss timeout if not requiring interaction
      if (!notificationData.metadata?.requiresAction) {
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, NotificationManager.NOTIFICATION_TIMEOUT);
      }

      return notificationId;
    } catch (error) {
      logger.error('Error sending notification:', error);
      return null;
    }
  }

  /**
   * Setup notification event listeners
   */
  private setupNotificationListeners(): void {
    if (!chrome.notifications) {
      logger.warn('Chrome notifications API not available');
      return;
    }

    if (this.listenersSetup) {
      return; // Avoid setting up listeners multiple times
    }

    // Handle notification clicks
    chrome.notifications.onClicked.addListener((notificationId) => {
      void this.handleNotificationClick(notificationId);
    });

    // Handle button clicks
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      void this.handleNotificationButtonClick(notificationId, buttonIndex);
    });

    // Handle notification closed
    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      if (byUser) {
        logger.info(`Notification ${notificationId} dismissed by user`);
      }
    });

    this.listenersSetup = true;
  }

  /**
   * Handle notification click
   */
  private async handleNotificationClick(notificationId: string): Promise<void> {
    try {
      // Get notification data from history
      const history = await this.getHistory();
      const notification = history.notifications.find((n) => n.id === notificationId);

      if (!notification) {
        return;
      }

      // Handle based on notification type and metadata
      if (notification.metadata?.actionUrl) {
        await chrome.tabs.create({ url: notification.metadata.actionUrl });
      } else if (notification.metadata?.expenseId) {
        await chrome.tabs.create({
          url: `https://app.navan.com/expenses/${notification.metadata.expenseId}`,
        });
      } else if (notification.type === 'auth') {
        await chrome.tabs.create({ url: 'https://app.navan.com' });
      }

      // Clear the notification
      await chrome.notifications.clear(notificationId);
    } catch (error) {
      logger.error('Error handling notification click:', error);
    }
  }

  /**
   * Handle notification button click
   */
  private async handleNotificationButtonClick(
    notificationId: string,
    buttonIndex: number
  ): Promise<void> {
    try {
      // Get notification data from history
      const history = await this.getHistory();
      const notification = history.notifications.find((n) => n.id === notificationId);

      if (!notification || !notification.actions) {
        return;
      }

      const action = notification.actions[buttonIndex];
      if (!action) {
        return;
      }

      // Handle action based on type
      switch (action.action) {
        case NotificationActionType.OPEN_NAVAN:
          await chrome.tabs.create({ url: 'https://app.navan.com' });
          break;

        case NotificationActionType.VIEW_EXPENSE:
          if (notification.metadata?.expenseId) {
            await chrome.tabs.create({
              url: `https://app.navan.com/expenses/${notification.metadata.expenseId}`,
            });
          }
          break;

        case NotificationActionType.VIEW_TEMPLATE:
          // Open side panel to template view
          await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
          // Send message to side panel to navigate to template
          if (notification.metadata?.templateId) {
            await chrome.runtime.sendMessage({
              type: 'navigate_to_template',
              templateId: notification.metadata.templateId,
            });
          }
          break;

        case NotificationActionType.RETRY_OPERATION:
          // Send retry message to background script
          await chrome.runtime.sendMessage({
            type: 'retry_template_execution',
            templateId: notification.metadata?.templateId,
          });
          break;

        case NotificationActionType.DISMISS:
          // Just clear the notification
          break;
      }

      // Clear the notification
      await chrome.notifications.clear(notificationId);
    } catch (error) {
      logger.error('Error handling notification button click:', error);
    }
  }

  /**
   * Add notification to history
   */
  private async addToHistory(notification: NotificationData): Promise<void> {
    try {
      const history = await this.getHistory();

      // Add new notification
      history.notifications.unshift(notification);

      // Trim to max size
      if (history.notifications.length > NotificationManager.MAX_HISTORY_SIZE) {
        history.notifications = history.notifications.slice(
          0,
          NotificationManager.MAX_HISTORY_SIZE
        );
      }

      // Save updated history
      await chrome.storage.local.set({
        [NotificationManager.STORAGE_KEY]: history,
      });
    } catch (error) {
      logger.error('Error adding notification to history:', error);
    }
  }

  /**
   * Get notification history
   */
  public async getHistory(): Promise<NotificationHistory> {
    try {
      const result = await chrome.storage.local.get([NotificationManager.STORAGE_KEY]);
      return (
        result[NotificationManager.STORAGE_KEY] || {
          notifications: [],
          lastCleanup: Date.now(),
        }
      );
    } catch (error) {
      logger.error('Error getting notification history:', error);
      return { notifications: [], lastCleanup: Date.now() };
    }
  }

  /**
   * Clean up old notifications
   */
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const history = await this.getHistory();
      const now = Date.now();
      const retentionPeriod = NotificationManager.HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

      // Filter out old notifications
      history.notifications = history.notifications.filter(
        (n) => now - n.timestamp < retentionPeriod
      );

      history.lastCleanup = now;

      // Save updated history
      await chrome.storage.local.set({
        [NotificationManager.STORAGE_KEY]: history,
      });
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
    }
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      await chrome.notifications.getAll((notifications) => {
        void (async () => {
          for (const notificationId in notifications) {
            if (notificationId.startsWith('xpensabl_')) {
              await chrome.notifications.clear(notificationId);
            }
          }
        })();
      });
    } catch (error) {
      logger.error('Error clearing all notifications:', error);
    }
  }

  /**
   * Get notification statistics
   */
  public async getStatistics(): Promise<{
    total: number;
    byType: Record<string, number>;
    recentCount: number;
  }> {
    const history = await this.getHistory();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const stats = {
      total: history.notifications.length,
      byType: {} as Record<string, number>,
      recentCount: 0,
    };

    history.notifications.forEach((n) => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      if (n.timestamp > oneDayAgo) {
        stats.recentCount++;
      }
    });

    return stats;
  }
}
