import {
  NotificationManager,
  NotificationData,
  NotificationActionType,
  NotificationHistory,
} from '../services/notificationManager';

// Mock Chrome APIs
const mockChrome = {
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    getAll: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
    onButtonClicked: {
      addListener: jest.fn(),
    },
    onClosed: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tabs: {
    create: jest.fn().mockResolvedValue({}),
  },
  sidePanel: {
    open: jest.fn().mockResolvedValue(undefined),
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(undefined),
  },
  windows: {
    WINDOW_ID_CURRENT: -2,
  },
};

// Set up global Chrome mock
(global as any).chrome = mockChrome;

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;
  let _mockClickHandler: (notificationId: string) => void;
  let _mockButtonClickHandler: (notificationId: string, buttonIndex: number) => void;

  let _mockClosedHandler: (notificationId: string, byUser: boolean) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (NotificationManager as any).instance = null;

    // Create a shared storage object to simulate persistent storage
    const sharedStorage: Record<string, any> = {
      'xpensabl.notifications': {
        notifications: [],
        lastCleanup: Date.now(),
      },
    };

    // Capture event handlers
    mockChrome.notifications.onClicked.addListener.mockImplementation(
      (handler: (notificationId: string) => void) => {
        _mockClickHandler = handler;
      }
    );

    mockChrome.notifications.onButtonClicked.addListener.mockImplementation(
      (handler: (notificationId: string, buttonIndex: number) => void) => {
        _mockButtonClickHandler = handler;
      }
    );

    mockChrome.notifications.onClosed.addListener.mockImplementation(
      (handler: (notificationId: string, byUser: boolean) => void) => {
        _mockClosedHandler = handler;
      }
    );

    // Mock storage to use shared storage object
    mockChrome.storage.local.get.mockImplementation(async (key) => {
      if (typeof key === 'string') {
        return { [key]: sharedStorage[key] };
      } else if (Array.isArray(key)) {
        const result: Record<string, any> = {};
        key.forEach((k) => {
          result[k] = sharedStorage[k];
        });
        return result;
      }
      return sharedStorage;
    });

    mockChrome.storage.local.set.mockImplementation(async (data) => {
      Object.assign(sharedStorage, data);
      return undefined;
    });

    mockChrome.notifications.create.mockImplementation((id, options, callback) => {
      if (callback) callback(id);
      return Promise.resolve(id);
    });
    mockChrome.notifications.clear.mockResolvedValue(true);
    mockChrome.notifications.getAll.mockImplementation((callback) => callback({}));

    // Reset Chrome API mocks
    mockChrome.tabs.create.mockClear();
    mockChrome.sidePanel.open.mockClear();
    mockChrome.runtime.sendMessage.mockClear();

    notificationManager = NotificationManager.getInstance();

    // Reset listeners setup flag to allow new setup
    (notificationManager as any).listenersSetup = false;
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await notificationManager.initialize();

      expect(mockChrome.notifications.onClicked.addListener).toHaveBeenCalled();
      expect(mockChrome.notifications.onButtonClicked.addListener).toHaveBeenCalled();
      expect(mockChrome.notifications.onClosed.addListener).toHaveBeenCalled();
    });

    test('should clean up old notifications on initialization', async () => {
      const oldNotification: NotificationData = {
        id: 'old_notification',
        type: 'info',
        title: 'Old Notification',
        message: 'This is old',
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days old
      };

      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.notifications': {
          notifications: [oldNotification],
          lastCleanup: Date.now() - 2 * 24 * 60 * 60 * 1000,
        },
      });

      await notificationManager.initialize();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        'xpensabl.notifications': {
          notifications: [],
          lastCleanup: expect.any(Number),
        },
      });
    });
  });

  describe('Success Notifications', () => {
    test('should send success notification', async () => {
      const notificationId = await notificationManager.sendSuccessNotification(
        'Template Executed',
        'Monthly expense created successfully',
        { templateName: 'Monthly Subscription', expenseId: 'exp-123' }
      );

      expect(notificationId).toBeTruthy();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('xpensabl_'),
        expect.objectContaining({
          type: 'basic',
          iconUrl: 'expense-icon.png',
          title: 'Template Executed',
          message: 'Monthly expense created successfully',
          priority: 1,
          requireInteraction: false,
          buttons: [{ title: 'View Expense' }],
        }),
        expect.any(Function)
      );
    });

    test('should store notification in history', async () => {
      await notificationManager.sendSuccessNotification('Success', 'Operation completed');

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        'xpensabl.notifications': expect.objectContaining({
          notifications: expect.arrayContaining([
            expect.objectContaining({
              type: 'success',
              title: 'Success',
              message: 'Operation completed',
            }),
          ]),
        }),
      });
    });
  });

  describe('Failure Notifications', () => {
    test('should send failure notification with retry action', async () => {
      const notificationId = await notificationManager.sendFailureNotification(
        'Template Execution Failed',
        'Network error occurred',
        { templateId: 'template-1', errorDetails: 'Connection timeout' }
      );

      expect(notificationId).toBeTruthy();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('xpensabl_'),
        expect.objectContaining({
          type: 'basic',
          title: 'Template Execution Failed',
          message: 'Network error occurred',
          priority: 2,
          buttons: [{ title: 'Retry' }, { title: 'Dismiss' }],
        }),
        expect.any(Function)
      );
    });
  });

  describe('Authentication Notifications', () => {
    test('should send auth notification with custom message', async () => {
      const notificationId = await notificationManager.sendAuthNotification(
        'Your session has expired. Please log in again.'
      );

      expect(notificationId).toBeTruthy();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('xpensabl_'),
        expect.objectContaining({
          type: 'basic',
          title: 'Authentication Required',
          message: 'Your session has expired. Please log in again.',
          priority: 2,
          requireInteraction: true,
          buttons: [{ title: 'Open Navan' }],
        }),
        expect.any(Function)
      );
    });

    test('should send auth notification with default message', async () => {
      const notificationId = await notificationManager.sendAuthNotification();

      expect(notificationId).toBeTruthy();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('xpensabl_'),
        expect.objectContaining({
          message: 'Please visit app.navan.com to authenticate for scheduled expense creation',
        }),
        expect.any(Function)
      );
    });
  });

  describe('Info and Warning Notifications', () => {
    test('should send info notification', async () => {
      const notificationId = await notificationManager.sendInfoNotification(
        'Scheduled Task',
        'Next expense will be created tomorrow at 9:00 AM'
      );

      expect(notificationId).toBeTruthy();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('xpensabl_'),
        expect.objectContaining({
          type: 'basic',
          title: 'Scheduled Task',
          message: 'Next expense will be created tomorrow at 9:00 AM',
          priority: 1,
        }),
        expect.any(Function)
      );
    });

    test('should send warning notification', async () => {
      const notificationId = await notificationManager.sendWarningNotification(
        'Storage Limit',
        'You have reached 80% of your template storage limit'
      );

      expect(notificationId).toBeTruthy();
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(
        expect.stringContaining('xpensabl_'),
        expect.objectContaining({
          type: 'basic',
          title: 'Storage Limit',
          message: 'You have reached 80% of your template storage limit',
        }),
        expect.any(Function)
      );
    });
  });

  describe('Notification Click Handling', () => {
    test('should handle notification click with action URL', async () => {
      // Initialize NotificationManager to ensure listeners are set up
      await notificationManager.initialize();

      // Create notification with action URL
      const notificationId = await notificationManager.sendAuthNotification();
      expect(notificationId).not.toBeNull();

      // Verify notification was stored
      const history = await notificationManager.getHistory();
      const storedNotification = history.notifications.find((n) => n.id === notificationId);
      expect(storedNotification).toBeDefined();

      // Simulate click by calling the private method directly
      await (notificationManager as any).handleNotificationClick(notificationId!);

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://app.navan.com',
      });
      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(notificationId);
    });

    test('should handle notification click with expense ID', async () => {
      // Initialize NotificationManager to ensure listeners are set up
      await notificationManager.initialize();

      // Create notification with expense ID
      const notificationId = await notificationManager.sendSuccessNotification(
        'Success',
        'Expense created',
        { expenseId: 'exp-456' }
      );
      expect(notificationId).not.toBeNull();

      // Simulate click by calling the private method directly
      await (notificationManager as any).handleNotificationClick(notificationId!);

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://app.navan.com/expenses/exp-456',
      });
    });

    test('should handle unknown notification click gracefully', async () => {
      await (notificationManager as any).handleNotificationClick('unknown_notification_id');

      expect(mockChrome.tabs.create).not.toHaveBeenCalled();
    });
  });

  describe('Button Click Handling', () => {
    test('should handle Open Navan button click', async () => {
      // Initialize NotificationManager to ensure listeners are set up
      await notificationManager.initialize();

      const notificationId = await notificationManager.sendAuthNotification();
      expect(notificationId).not.toBeNull();

      // Simulate button click by calling the private method directly (index 0 = Open Navan)
      await (notificationManager as any).handleNotificationButtonClick(notificationId!, 0);

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://app.navan.com',
      });
      expect(mockChrome.notifications.clear).toHaveBeenCalledWith(notificationId);
    });

    test('should handle View Expense button click', async () => {
      // Initialize NotificationManager to ensure listeners are set up
      await notificationManager.initialize();

      const notificationId = await notificationManager.sendSuccessNotification(
        'Success',
        'Expense created',
        { expenseId: 'exp-789' }
      );
      expect(notificationId).not.toBeNull();

      // Simulate button click by calling the private method directly (index 0 = View Expense)
      await (notificationManager as any).handleNotificationButtonClick(notificationId!, 0);

      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://app.navan.com/expenses/exp-789',
      });
    });

    test('should handle Retry button click', async () => {
      // Initialize NotificationManager to ensure listeners are set up
      await notificationManager.initialize();

      const notificationId = await notificationManager.sendFailureNotification(
        'Failed',
        'Error occurred',
        { templateId: 'template-123' }
      );
      expect(notificationId).not.toBeNull();

      // Simulate button click by calling the private method directly (index 0 = Retry)
      await (notificationManager as any).handleNotificationButtonClick(notificationId!, 0);

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'retry_template_execution',
        templateId: 'template-123',
      });
    });

    test('should handle View Template button click', async () => {
      // Initialize NotificationManager to ensure listeners are set up
      await notificationManager.initialize();

      // Create a notification with view template action
      const notificationData: NotificationData = {
        type: 'info',
        title: 'Template Updated',
        message: 'Your template has been modified',
        timestamp: Date.now(),
        metadata: { templateId: 'template-456' },
        actions: [{ action: NotificationActionType.VIEW_TEMPLATE, title: 'View Template' }],
      };

      // Store notification first
      await mockChrome.storage.local.set({
        'xpensabl.notifications': {
          notifications: [{ ...notificationData, id: 'test_notification' }],
          lastCleanup: Date.now(),
        },
      });

      // Update mock to return stored notification
      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.notifications': {
          notifications: [{ ...notificationData, id: 'test_notification' }],
          lastCleanup: Date.now(),
        },
      });

      // Simulate button click by calling the private method directly
      await (notificationManager as any).handleNotificationButtonClick('test_notification', 0);

      expect(mockChrome.sidePanel.open).toHaveBeenCalledWith({
        windowId: mockChrome.windows.WINDOW_ID_CURRENT,
      });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'navigate_to_template',
        templateId: 'template-456',
      });
    });
  });

  describe('Notification History', () => {
    test('should retrieve notification history', async () => {
      const mockHistory: NotificationHistory = {
        notifications: [
          {
            id: 'notif1',
            type: 'success',
            title: 'Success',
            message: 'Test message',
            timestamp: Date.now(),
          },
        ],
        lastCleanup: Date.now(),
      };

      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.notifications': mockHistory,
      });

      const history = await notificationManager.getHistory();

      expect(history).toEqual(mockHistory);
    });

    test('should limit history size', async () => {
      // Create more than MAX_HISTORY_SIZE notifications
      for (let i = 0; i < 60; i++) {
        await notificationManager.sendInfoNotification(`Notification ${i}`, 'Test');
      }

      const lastCall =
        mockChrome.storage.local.set.mock.calls[mockChrome.storage.local.set.mock.calls.length - 1];
      const savedHistory = lastCall[0]['xpensabl.notifications'];

      expect(savedHistory.notifications.length).toBe(50); // MAX_HISTORY_SIZE
    });
  });

  describe('Statistics', () => {
    test('should calculate notification statistics', async () => {
      const now = Date.now();
      const mockHistory: NotificationHistory = {
        notifications: [
          { id: '1', type: 'success', title: '', message: '', timestamp: now },
          { id: '2', type: 'success', title: '', message: '', timestamp: now - 1000 },
          { id: '3', type: 'failure', title: '', message: '', timestamp: now - 2000 },
          { id: '4', type: 'auth', title: '', message: '', timestamp: now - 25 * 60 * 60 * 1000 }, // > 24h old
        ],
        lastCleanup: now,
      };

      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.notifications': mockHistory,
      });

      const stats = await notificationManager.getStatistics();

      expect(stats).toEqual({
        total: 4,
        byType: {
          success: 2,
          failure: 1,
          auth: 1,
        },
        recentCount: 3, // Only notifications within 24h
      });
    });
  });

  describe('Clear Notifications', () => {
    test('should clear all xpensabl notifications', async () => {
      const mockNotifications = {
        xpensabl_123: {},
        xpensabl_456: {},
        other_notification: {},
      };

      mockChrome.notifications.getAll.mockImplementation((callback) => callback(mockNotifications));

      await notificationManager.clearAllNotifications();

      expect(mockChrome.notifications.clear).toHaveBeenCalledWith('xpensabl_123');
      expect(mockChrome.notifications.clear).toHaveBeenCalledWith('xpensabl_456');
      expect(mockChrome.notifications.clear).not.toHaveBeenCalledWith('other_notification');
    });
  });

  describe('Edge Cases', () => {
    test('should handle Chrome API unavailability', async () => {
      const originalNotifications = (global as any).chrome.notifications;
      (global as any).chrome.notifications = undefined;

      const notificationId = await notificationManager.sendInfoNotification('Test', 'Message');

      expect(notificationId).toBeNull();

      // Restore for other tests
      (global as any).chrome.notifications = originalNotifications;
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const history = await notificationManager.getHistory();

      expect(history).toEqual({
        notifications: [],
        lastCleanup: expect.any(Number),
      });
    });

    test('should handle notification creation errors', async () => {
      mockChrome.notifications.create.mockImplementation(() => {
        throw new Error('Creation failed');
      });

      const notificationId = await notificationManager.sendInfoNotification('Test', 'Message');

      expect(notificationId).toBeNull();
    });
  });
});
