// Basic test file for template storage system
// Note: This is a simplified test setup for Chrome extension environment

import { TemplateManager } from '../services/templateManager';
import { StorageManager } from '../services/storageManager';
import { MigrationManager } from '../services/migrationManager';
import { 
  CreateTemplateRequest, 
  ExpenseTemplate,
  TemplateExpenseData 
} from '../model/template';

// Mock Chrome storage API for testing
const mockChromeStorage = {
  sync: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    getBytesInUse: jest.fn().mockResolvedValue(1024),
    onChanged: {
      addListener: jest.fn()
    }
  },
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    getBytesInUse: jest.fn().mockResolvedValue(5120),
    onChanged: {
      addListener: jest.fn()
    }
  },
  onChanged: {
    addListener: jest.fn()
  }
};

// Setup global chrome mock
beforeAll(() => {
  (global as any).chrome = {
    storage: mockChromeStorage
  };
});

// Mock TextEncoder for Node.js environment
if (typeof TextEncoder === 'undefined') {
  (global as any).TextEncoder = class {
    encode(str: string) {
      return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
    }
  };
}

// Mock expense data for tests
const mockExpenseData: TemplateExpenseData = {
  merchantAmount: 100,
  merchantCurrency: 'USD',
  policy: 'default',
  merchant: {
    category: 'Restaurant',
    categoryGroup: 'Meals',
    description: 'Test Restaurant',
    formattedAddress: '123 Test St, Test City',
    name: 'Test Restaurant',
    online: false,
    perDiem: false,
    timeZone: 'America/New_York'
  },
  details: {
    description: 'Test expense',
    personal: false,
    participants: [],
    customFieldValues: [],
    taxDetails: {
      country: 'US',
      noTax: false,
      reverseCharge: false,
      taxRateDecimal: true
    }
  },
  reportingData: {
    department: 'Engineering'
  }
};

describe('Template Storage System', () => {
  let templateManager: TemplateManager;
  let storageManager: StorageManager;
  let migrationManager: MigrationManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get instances
    templateManager = TemplateManager.getInstance();
    storageManager = StorageManager.getInstance();
    migrationManager = MigrationManager.getInstance();
  });

  describe('StorageManager', () => {
    test('should save and retrieve sync data', async () => {
      const testData = { test: 'value' };
      mockChromeStorage.sync.get.mockResolvedValue({ testKey: testData });
      
      await storageManager.setSyncData('testKey', testData);
      const retrieved = await storageManager.getSyncData('testKey');
      
      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith({ testKey: testData });
      expect(retrieved).toEqual(testData);
    });

    test('should save and retrieve local data', async () => {
      const testData = { test: 'value' };
      mockChromeStorage.local.get.mockResolvedValue({ testKey: testData });
      
      await storageManager.setLocalData('testKey', testData);
      const retrieved = await storageManager.getLocalData('testKey');
      
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({ testKey: testData });
      expect(retrieved).toEqual(testData);
    });

    test('should get quota information', async () => {
      const quotaInfo = await storageManager.getSyncQuotaInfo();
      
      expect(quotaInfo).toHaveProperty('used');
      expect(quotaInfo).toHaveProperty('available');
      expect(quotaInfo).toHaveProperty('percentUsed');
      expect(quotaInfo).toHaveProperty('nearLimit');
      expect(mockChromeStorage.sync.getBytesInUse).toHaveBeenCalled();
    });
  });

  describe('TemplateManager', () => {
    test('should create a template', async () => {
      // Mock empty storage initially
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.sync.get.mockResolvedValue({});

      const createRequest: CreateTemplateRequest = {
        name: 'Test Template',
        expenseData: mockExpenseData,
        createdFrom: 'manual'
      };

      const template = await templateManager.createTemplate(createRequest);

      expect(template).toHaveProperty('id');
      expect(template.name).toBe('Test Template');
      expect(template.expenseData).toEqual(mockExpenseData);
      expect(template.metadata.createdFrom).toBe('manual');
    });

    test('should validate template data', async () => {
      const invalidRequest: CreateTemplateRequest = {
        name: '', // Invalid empty name
        expenseData: mockExpenseData
      };

      await expect(templateManager.createTemplate(invalidRequest))
        .rejects
        .toThrow('Template name is required');
    });

    test('should enforce template limit', async () => {
      // Clear cache and create fresh manager instance
      await storageManager.clearCache();
      
      // Mock storage with maximum templates
      const mockTemplates: any = {};
      for (let i = 0; i < 5; i++) {
        mockTemplates[`template_${i}`] = {
          id: `template_${i}`,
          name: `Template ${i}`,
          expenseData: mockExpenseData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
          scheduling: null,
          executionHistory: [],
          metadata: {
            createdFrom: 'manual',
            tags: [],
            favorite: false,
            useCount: 0,
            scheduledUseCount: 0
          }
        };
      }

      // Reset mocks for this test
      jest.clearAllMocks();
      
      // Mock the get calls to return templates and preferences
      mockChromeStorage.local.get.mockImplementation((key: string) => {
        if (key === 'xpensabl.templates.local') {
          return Promise.resolve({
            'xpensabl.templates.local': {
              templates: mockTemplates,
              executionQueue: [],
              migrationState: { currentVersion: 1, pendingMigrations: [] }
            }
          });
        }
        return Promise.resolve({});
      });

      mockChromeStorage.sync.get.mockImplementation((key: string) => {
        if (key === 'xpensabl.templates.sync') {
          return Promise.resolve({
            'xpensabl.templates.sync': {
              version: 1,
              preferences: { 
                maxTemplates: 5,
                defaultTimeZone: 'UTC',
                notificationEnabled: true,
                autoCleanupDays: 90
              },
              templateIndex: []
            }
          });
        }
        return Promise.resolve({});
      });

      const createRequest: CreateTemplateRequest = {
        name: 'Sixth Template',
        expenseData: mockExpenseData
      };

      await expect(templateManager.createTemplate(createRequest))
        .rejects
        .toThrow('Maximum 5 templates allowed');
    });
  });

  describe('MigrationManager', () => {
    test('should initialize schema when no data exists', async () => {
      // Clear storage cache to ensure fresh state
      await storageManager.clearCache();
      
      // Clear previous mocks and set up for this specific test
      jest.clearAllMocks();
      mockChromeStorage.local.get.mockImplementation((key: string) => {
        if (key === 'xpensabl.templates.local') {
          return Promise.resolve({}); // No data exists - empty object means key not found
        }
        return Promise.resolve({});
      });

      const migrated = await migrationManager.migrateIfNeeded();

      expect(migrated).toBe(true);
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith({
        'xpensabl.templates.local': expect.objectContaining({
          templates: {},
          executionQueue: [],
          migrationState: expect.objectContaining({
            currentVersion: 1
          })
        })
      });
    });

    test('should validate schema version', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        'xpensabl.templates.local': {
          templates: {},
          executionQueue: [],
          migrationState: { currentVersion: 1, pendingMigrations: [] }
        }
      });

      const isValid = await migrationManager.validateSchemaVersion();
      expect(isValid).toBe(true);
    });

    test('should generate data integrity report', async () => {
      mockChromeStorage.local.get.mockResolvedValue({
        'xpensabl.templates.local': {
          templates: {},
          executionQueue: [],
          migrationState: { currentVersion: 1, pendingMigrations: [] }
        }
      });

      const report = await migrationManager.getDataIntegrityReport();

      expect(report).toHaveProperty('isValid');
      expect(report).toHaveProperty('version');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('suggestions');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete template lifecycle', async () => {
      // Mock empty storage initially
      mockChromeStorage.local.get.mockResolvedValue({});
      mockChromeStorage.sync.get.mockResolvedValue({});

      // Initialize migration
      await migrationManager.migrateIfNeeded();

      // Create template
      const createRequest: CreateTemplateRequest = {
        name: 'Integration Test Template',
        expenseData: mockExpenseData,
        createdFrom: 'manual'
      };

      const template = await templateManager.createTemplate(createRequest);
      expect(template).toBeDefined();

      // Update template
      const updatedTemplate = await templateManager.updateTemplate(template.id, {
        name: 'Updated Template Name'
      });
      expect(updatedTemplate.name).toBe('Updated Template Name');

      // Delete template
      await templateManager.deleteTemplate(template.id);

      // Verify deletion
      const deletedTemplate = await templateManager.getTemplate(template.id);
      expect(deletedTemplate).toBeNull();
    });

    test('should handle storage quota management', async () => {
      const quotaStats = await storageManager.getStorageUsageStats();

      expect(quotaStats).toHaveProperty('sync');
      expect(quotaStats).toHaveProperty('local');
      expect(quotaStats.sync).toHaveProperty('used');
      expect(quotaStats.local).toHaveProperty('used');
    });
  });
});

// Helper function to run tests manually in Chrome extension environment
export function runManualTests(): void {
  console.log('Starting manual template storage tests...');
  
  // This function can be called from the extension's popup or side panel
  // to test the storage system in a real Chrome extension environment
  
  const templateManager = TemplateManager.getInstance();
  const migrationManager = MigrationManager.getInstance();
  
  // Test basic functionality
  Promise.resolve()
    .then(() => migrationManager.migrateIfNeeded())
    .then(() => console.log('✓ Migration check completed'))
    .then(() => templateManager.getTemplatePreferences())
    .then(prefs => console.log('✓ Template preferences loaded:', prefs))
    .then(() => templateManager.getAllTemplates())
    .then(templates => console.log('✓ Templates loaded:', templates.length))
    .catch(error => console.error('✗ Manual test failed:', error));
}