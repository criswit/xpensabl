import {
  OptimizedSchedulingEngine,
  MasterAlarmManager,
  JITAuthenticationManager,
  RetryManager,
  ErrorCategory,
  ScheduledExecution,
  ExecutionQueue,
  AuthenticationCache,
} from '../services/schedulingEngine';
import { ExpenseTemplate, DayOfWeek } from '../model/template';
import { ExpenseCreatePayload, ExpenseResponse } from '../model/expense';
import { TemplateManager } from '../services/templateManager';
import { ExpenseManager } from '../services/expenseManager';
import { NotificationManager } from '../services/notificationManager';

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    },
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
  notifications: {
    create: jest.fn(),
  },
};

// Set up global Chrome mock
(global as any).chrome = mockChrome;

// Mock TemplateManager
jest.mock('../services/templateManager', () => ({
  TemplateManager: {
    getInstance: jest.fn(() => ({
      getTemplate: jest.fn(),
      updateTemplate: jest.fn(),
    })),
  },
}));

// Mock ExpenseManager
jest.mock('../services/expenseManager', () => ({
  ExpenseManager: {
    createExpense: jest.fn(),
  },
}));

// Mock NotificationManager
jest.mock('../services/notificationManager', () => ({
  NotificationManager: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(),
      sendSuccessNotification: jest.fn(),
      sendFailureNotification: jest.fn(),
      sendAuthNotification: jest.fn(),
    })),
  },
}));

// Define interfaces for mock objects
interface MockTemplateManager {
  getTemplate: jest.MockedFunction<(templateId: string) => Promise<ExpenseTemplate | null>>;
  updateTemplate: jest.MockedFunction<
    (templateId: string, updates: Partial<ExpenseTemplate>) => Promise<void>
  >;
}

interface MockExpenseManager {
  createExpense: jest.MockedFunction<(payload: ExpenseCreatePayload) => Promise<ExpenseResponse>>;
}

interface MockNotificationManager {
  initialize: jest.MockedFunction<() => Promise<void>>;
  sendSuccessNotification: jest.MockedFunction<
    (title: string, message: string, metadata?: Record<string, unknown>) => Promise<string | null>
  >;
  sendFailureNotification: jest.MockedFunction<
    (title: string, message: string, metadata?: Record<string, unknown>) => Promise<string | null>
  >;
  sendAuthNotification: jest.MockedFunction<(message?: string) => Promise<string | null>>;
}

describe('OptimizedSchedulingEngine', () => {
  let schedulingEngine: OptimizedSchedulingEngine;
  let mockTemplateManager: MockTemplateManager;
  let mockExpenseManager: MockExpenseManager;
  let mockNotificationManager: MockNotificationManager;

  // Mock template used across tests
  const mockTemplate: ExpenseTemplate = {
    id: 'template-1',
    name: 'Test Template',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    expenseData: {
      merchantAmount: 100,
      merchantCurrency: 'USD',
      policy: 'default',
      merchant: {
        name: 'Test Merchant',
        category: 'other',
        categoryGroup: 'OTHER',
        description: '',
        formattedAddress: '',
        online: true,
        perDiem: false,
        timeZone: 'America/Los_Angeles',
      },
      details: {
        description: 'Test expense',
        personal: false,
        participants: [],
        customFieldValues: [],
        taxDetails: {
          country: 'US',
          noTax: true,
          reverseCharge: false,
          taxRateDecimal: false,
        },
      },
      reportingData: {
        billTo: 'test-bill-to',
        department: 'Engineering',
        region: 'US',
        subsidiary: 'Main',
      },
    },
    scheduling: {
      enabled: true,
      interval: 'daily',
      startDate: Date.now(),
      executionTime: { hour: 23, minute: 59, timeZone: 'America/Los_Angeles' }, // Use late time to ensure it's in future
      intervalConfig: {},
      nextExecution: Date.now() + 60000,
      paused: false,
    },
    metadata: {
      createdFrom: 'manual' as const,
      tags: [],
      favorite: false,
      useCount: 0,
      scheduledUseCount: 0,
    },
    executionHistory: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the singleton instance
    (OptimizedSchedulingEngine as any).instance = null;

    // Reset storage mocks
    mockChrome.storage.local.get.mockImplementation((keys) => {
      const result: Record<string, unknown> = {};
      const keysArray = Array.isArray(keys) ? keys : [keys];

      keysArray.forEach((key) => {
        if (key === 'xpensabl.scheduling.queue') {
          result[key] = { executions: [], lastProcessed: 0 };
        } else if (key === 'xpensabl.scheduling.auth_cache') {
          result[key] = { isValid: true, lastChecked: Date.now(), validUntil: Date.now() + 300000 };
        } else if (key === 'bearerToken') {
          result[key] = 'mock-token';
        } else {
          result[key] = null;
        }
      });

      return Promise.resolve(result);
    });

    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.alarms.create.mockResolvedValue(undefined);
    mockChrome.alarms.clear.mockResolvedValue(undefined);
    mockChrome.notifications.create.mockResolvedValue(undefined);

    // Mock TemplateManager
    mockTemplateManager = {
      getTemplate: jest.fn(),
      updateTemplate: jest.fn(),
    };
    (TemplateManager.getInstance as jest.Mock).mockReturnValue(mockTemplateManager);

    // Mock ExpenseManager
    mockExpenseManager = {
      createExpense: jest.fn(),
    };
    (ExpenseManager as any).createExpense = mockExpenseManager.createExpense;

    // Mock NotificationManager
    mockNotificationManager = {
      initialize: jest.fn(),
      sendSuccessNotification: jest.fn(),
      sendFailureNotification: jest.fn(),
      sendAuthNotification: jest.fn(),
    };
    (NotificationManager.getInstance as jest.Mock).mockReturnValue(mockNotificationManager);

    // Get fresh instance
    schedulingEngine = OptimizedSchedulingEngine.getInstance();
  });

  describe('Initialization', () => {
    test('should initialize successfully with all dependencies', async () => {
      await schedulingEngine.initialize();

      expect(mockChrome.alarms.create).toHaveBeenCalledWith('xpensabl_master_scheduler', {
        delayInMinutes: 1,
        periodInMinutes: 1,
      });
      expect(mockChrome.alarms.onAlarm.addListener).toHaveBeenCalled();
    });

    test('should not initialize twice', async () => {
      // Reset the instance to ensure clean state
      (OptimizedSchedulingEngine as any).instance = null;
      schedulingEngine = OptimizedSchedulingEngine.getInstance();

      await schedulingEngine.initialize();
      await schedulingEngine.initialize();

      // Should only create alarm once
      expect(mockChrome.alarms.create).toHaveBeenCalledTimes(1);
    });

    test('should handle initialization errors gracefully', async () => {
      // Reset the instance to ensure clean state
      (OptimizedSchedulingEngine as any).instance = null;
      schedulingEngine = OptimizedSchedulingEngine.getInstance();

      mockChrome.alarms.create.mockRejectedValue(new Error('Alarm creation failed'));

      await expect(schedulingEngine.initialize()).rejects.toThrow('Alarm creation failed');
    });
  });

  describe('Template Scheduling', () => {
    beforeEach(async () => {
      await schedulingEngine.initialize();
    });

    test('should schedule template successfully', async () => {
      // Use a complete mock template for this test
      const testTemplate = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
          nextExecution: Date.now() + 60000,
        },
      };
      mockTemplateManager.getTemplate.mockResolvedValue(testTemplate);

      const result = await schedulingEngine.scheduleTemplate('template-1');

      expect(result).toBe(true);
      expect(mockTemplateManager.getTemplate).toHaveBeenCalledWith('template-1');
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should fail to schedule template when not found', async () => {
      mockTemplateManager.getTemplate.mockResolvedValue(null);

      const result = await schedulingEngine.scheduleTemplate('nonexistent');

      expect(result).toBe(false);
    });

    test('should fail to schedule template when scheduling disabled', async () => {
      const disabledTemplate = {
        ...mockTemplate,
        scheduling: { ...mockTemplate.scheduling!, enabled: false },
      };
      mockTemplateManager.getTemplate.mockResolvedValue(disabledTemplate);

      const result = await schedulingEngine.scheduleTemplate('template-1');

      expect(result).toBe(false);
    });

    test('should unschedule template successfully', async () => {
      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.scheduling.queue': {
          executions: [
            {
              templateId: 'template-1',
              id: 'exec-1',
              scheduledAt: Date.now(),
              retryCount: 0,
              status: 'pending',
            },
          ],
          lastProcessed: 0,
        },
      });

      const result = await schedulingEngine.unscheduleTemplate('template-1');

      expect(result).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should pause template scheduling', async () => {
      const testTemplate = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
          paused: false,
        },
      };
      mockTemplateManager.getTemplate.mockResolvedValue(testTemplate);
      mockTemplateManager.updateTemplate.mockResolvedValue(undefined);

      const result = await schedulingEngine.pauseTemplate('template-1');

      expect(result).toBe(true);
      expect(mockTemplateManager.updateTemplate).toHaveBeenCalled();
    });

    test('should resume template scheduling', async () => {
      const pausedTemplate = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
          paused: true,
          pausedAt: Date.now() - 60000,
          executionTime: { hour: 23, minute: 59, timeZone: 'America/Los_Angeles' },
        },
      };
      mockTemplateManager.getTemplate.mockResolvedValue(pausedTemplate);
      mockTemplateManager.updateTemplate.mockResolvedValue(undefined);

      const result = await schedulingEngine.resumeTemplate('template-1');

      expect(result).toBe(true);
      expect(mockTemplateManager.updateTemplate).toHaveBeenCalled();
    });
  });

  describe('Schedule Calculation', () => {
    beforeEach(async () => {
      await schedulingEngine.initialize();
    });

    test('should calculate daily execution correctly', async () => {
      const template = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
          interval: 'daily' as const,
          executionTime: { hour: 23, minute: 59, timeZone: 'America/Los_Angeles' },
        },
      };

      mockTemplateManager.getTemplate.mockResolvedValue(template);

      const result = await schedulingEngine.scheduleTemplate('template-1');
      expect(result).toBe(true);
    });

    test('should calculate weekly execution correctly', async () => {
      const template = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
          interval: 'weekly' as const,
          intervalConfig: { daysOfWeek: ['monday', 'friday'] as DayOfWeek[] },
          executionTime: { hour: 23, minute: 59, timeZone: 'America/Los_Angeles' },
        },
      };

      mockTemplateManager.getTemplate.mockResolvedValue(template);

      const result = await schedulingEngine.scheduleTemplate('template-1');
      expect(result).toBe(true);
    });

    test('should calculate monthly execution correctly', async () => {
      const template = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
          interval: 'monthly' as const,
          intervalConfig: { dayOfMonth: 15 },
          executionTime: { hour: 23, minute: 59, timeZone: 'America/Los_Angeles' },
        },
      };

      mockTemplateManager.getTemplate.mockResolvedValue(template);

      const result = await schedulingEngine.scheduleTemplate('template-1');
      expect(result).toBe(true);
    });

    test('should handle last day of month correctly', async () => {
      const template = {
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
          interval: 'monthly' as const,
          intervalConfig: { dayOfMonth: 'last' as const },
          executionTime: { hour: 23, minute: 59, timeZone: 'America/Los_Angeles' },
        },
      };

      mockTemplateManager.getTemplate.mockResolvedValue(template);

      const result = await schedulingEngine.scheduleTemplate('template-1');
      expect(result).toBe(true);
    });
  });

  describe('Execution Processing', () => {
    beforeEach(async () => {
      await schedulingEngine.initialize();
    });

    test('should process ready executions successfully', async () => {
      const mockExecution: ScheduledExecution = {
        id: 'exec-1',
        templateId: 'template-1',
        scheduledAt: Date.now() - 1000, // 1 second ago
        retryCount: 0,
        status: 'pending',
      };

      const mockQueue: ExecutionQueue = {
        executions: [mockExecution],
        lastProcessed: 0,
      };

      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.scheduling.queue': mockQueue,
        'xpensabl.scheduling.auth_cache': {
          isValid: true,
          lastChecked: Date.now(),
          validUntil: Date.now() + 300000,
        },
        bearerToken: 'mock-token',
      });

      const mockTemplate: ExpenseTemplate = {
        id: 'template-1',
        name: 'Test Template',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        expenseData: {
          merchantAmount: 100,
          merchantCurrency: 'USD',
          policy: 'default',
          merchant: {
            name: 'Test Merchant',
            category: 'other',
            categoryGroup: 'OTHER',
            description: '',
            formattedAddress: '',
            online: true,
            perDiem: false,
            timeZone: 'America/Los_Angeles',
          },
          details: {
            description: 'Test expense',
            personal: false,
            participants: [],
            customFieldValues: [],
            taxDetails: {
              country: 'US',
              noTax: true,
              reverseCharge: false,
              taxRateDecimal: false,
            },
          },
          reportingData: {
            billTo: 'test-bill-to',
            department: 'Engineering',
            region: 'US',
            subsidiary: 'Main',
          },
        },
        scheduling: {
          enabled: true,
          interval: 'daily',
          startDate: Date.now(),
          executionTime: { hour: 23, minute: 59, timeZone: 'America/Los_Angeles' },
          intervalConfig: {},
          nextExecution: null,
          paused: false,
        },
        metadata: {
          createdFrom: 'manual' as const,
          tags: [],
          favorite: false,
          useCount: 0,
          scheduledUseCount: 0,
        },
        executionHistory: [],
      };

      mockTemplateManager.getTemplate.mockResolvedValue(mockTemplate);
      mockTemplateManager.updateTemplate.mockResolvedValue(undefined);
      mockExpenseManager.createExpense.mockResolvedValue({
        data: { uuid: 'expense-uuid-1' } as any,
      });

      await schedulingEngine.processMasterAlarm();

      expect(mockExpenseManager.createExpense).toHaveBeenCalled();
      expect(mockTemplateManager.updateTemplate).toHaveBeenCalled();
      expect(mockNotificationManager.sendSuccessNotification).toHaveBeenCalled();
    });

    test('should handle authentication failure during execution', async () => {
      const mockExecution: ScheduledExecution = {
        id: 'exec-1',
        templateId: 'template-1',
        scheduledAt: Date.now() - 1000,
        retryCount: 0,
        status: 'pending',
      };

      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.scheduling.queue': { executions: [mockExecution], lastProcessed: 0 },
        'xpensabl.scheduling.auth_cache': {
          isValid: false,
          lastChecked: Date.now(),
          validUntil: 0,
        },
        bearerToken: null,
      });

      mockTemplateManager.getTemplate.mockResolvedValue(null);

      await schedulingEngine.processMasterAlarm();

      // Should send auth notification and schedule retry
      expect(mockNotificationManager.sendAuthNotification).toHaveBeenCalled();
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('should handle expense creation failure with retry', async () => {
      const mockExecution: ScheduledExecution = {
        id: 'exec-1',
        templateId: 'template-1',
        scheduledAt: Date.now() - 1000,
        retryCount: 0,
        status: 'pending',
      };

      mockChrome.storage.local.get.mockResolvedValue({
        'xpensabl.scheduling.queue': { executions: [mockExecution], lastProcessed: 0 },
        'xpensabl.scheduling.auth_cache': {
          isValid: true,
          lastChecked: Date.now(),
          validUntil: Date.now() + 300000,
        },
        bearerToken: 'mock-token',
      });

      mockTemplateManager.getTemplate.mockResolvedValue({
        ...mockTemplate,
        scheduling: {
          ...mockTemplate.scheduling!,
          enabled: true,
        },
      });

      mockExpenseManager.createExpense.mockRejectedValue(new Error('Network error'));

      await schedulingEngine.processMasterAlarm();

      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });
  });
});

describe('MasterAlarmManager', () => {
  let alarmManager: MasterAlarmManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.alarms.create.mockResolvedValue(undefined);
    mockChrome.alarms.clear.mockResolvedValue(undefined);
    alarmManager = new MasterAlarmManager();
  });

  test('should initialize successfully', async () => {
    await alarmManager.initialize();

    expect(mockChrome.alarms.clear).toHaveBeenCalledWith('xpensabl_master_scheduler');
    expect(mockChrome.alarms.create).toHaveBeenCalledWith('xpensabl_master_scheduler', {
      delayInMinutes: 1,
      periodInMinutes: 1,
    });
  });

  test('should handle Chrome API unavailability gracefully', async () => {
    (global as any).chrome.alarms = undefined;
    alarmManager = new MasterAlarmManager();

    await expect(alarmManager.initialize()).resolves.not.toThrow();
  });
});

describe('JITAuthenticationManager', () => {
  let authManager: JITAuthenticationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    authManager = new JITAuthenticationManager();
  });

  test('should return cached valid authentication', async () => {
    const validCache: AuthenticationCache = {
      isValid: true,
      lastChecked: Date.now() - 60000, // 1 minute ago
      validUntil: Date.now() + 240000, // Valid for 4 more minutes
    };

    mockChrome.storage.local.get.mockResolvedValue({
      'xpensabl.scheduling.auth_cache': validCache,
    });

    const result = await authManager.validateAuthentication();
    expect(result).toBe(true);
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['xpensabl.scheduling.auth_cache']);
  });

  test('should validate authentication when cache expired', async () => {
    const expiredCache: AuthenticationCache = {
      isValid: true,
      lastChecked: Date.now() - 360000, // 6 minutes ago
      validUntil: Date.now() - 60000, // Expired 1 minute ago
    };

    mockChrome.storage.local.get
      .mockResolvedValueOnce({ 'xpensabl.scheduling.auth_cache': expiredCache })
      .mockResolvedValueOnce({ bearerToken: 'valid-token' });

    const result = await authManager.validateAuthentication();
    expect(result).toBe(true);
    expect(mockChrome.storage.local.set).toHaveBeenCalled();
  });

  test('should return false when no token available', async () => {
    mockChrome.storage.local.get
      .mockResolvedValueOnce({ 'xpensabl.scheduling.auth_cache': null })
      .mockResolvedValueOnce({ bearerToken: null });

    const result = await authManager.validateAuthentication();
    expect(result).toBe(false);
  });
});

describe('RetryManager', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  test('should categorize network errors correctly', () => {
    const networkError = new Error('Network request failed');
    const result = retryManager.categorizeError(networkError);

    expect(result.category).toBe(ErrorCategory.NETWORK);
    expect(result.retryable).toBe(true);
    expect(result.retryDelay).toBe(30000);
  });

  test('should categorize authentication errors correctly', () => {
    const authError = new Error('Authentication required');
    const result = retryManager.categorizeError(authError);

    expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
    expect(result.retryable).toBe(true);
    expect(result.retryDelay).toBe(60000);
  });

  test('should categorize validation errors as non-retryable', () => {
    const validationError = new Error('Invalid data provided');
    const result = retryManager.categorizeError(validationError);

    expect(result.category).toBe(ErrorCategory.VALIDATION);
    expect(result.retryable).toBe(false);
  });

  test('should categorize rate limit errors correctly', () => {
    const rateLimitError = new Error('Too many requests');
    const result = retryManager.categorizeError(rateLimitError);

    expect(result.category).toBe(ErrorCategory.RATE_LIMIT);
    expect(result.retryable).toBe(true);
    expect(result.retryDelay).toBe(300000);
  });

  test('should calculate exponential backoff correctly', () => {
    const error = { category: ErrorCategory.SYSTEM, message: 'System error', retryable: true };

    const delay1 = retryManager.calculateRetryDelay(0, error);
    const delay2 = retryManager.calculateRetryDelay(1, error);
    const delay3 = retryManager.calculateRetryDelay(2, error);

    expect(delay2).toBe(delay1 * 2);
    expect(delay3).toBe(delay1 * 4);
  });

  test('should respect maximum delay limit', () => {
    const error = { category: ErrorCategory.SYSTEM, message: 'System error', retryable: true };

    const delay = retryManager.calculateRetryDelay(10, error); // High retry count
    expect(delay).toBeLessThanOrEqual(300000); // 5 minutes max
  });

  test('should use error-specific delay when provided', () => {
    const error = {
      category: ErrorCategory.NETWORK,
      message: 'Network error',
      retryable: true,
      retryDelay: 45000,
    };

    const delay = retryManager.calculateRetryDelay(0, error);
    expect(delay).toBe(45000);
  });
});
