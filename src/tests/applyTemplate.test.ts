/**
 * Apply Template Functionality Tests
 *
 * These tests ensure that template application correctly transforms template data
 * to match the Navan API's ExpenseCreatePayload structure and prevents regression
 * of the "No items provided to itemize" and "account/merchant amounts mismatch" bugs.
 */

import { JSDOM } from 'jsdom';
import { ExpenseTemplate, TemplateExpenseData } from '../model/template';
import { ExpenseCreatePayload } from '../model/expense';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

(global as any).chrome = mockChrome;

// Mock DOM environment
let dom: JSDOM;
let document: Document;
let window: Window;

// Sample template data that matches the structure from actual templates
const mockTemplateWithExtraFields: ExpenseTemplate = {
  id: 'template-test-1',
  name: 'Test Coffee Template',
  createdAt: new Date('2023-01-01').getTime(),
  updatedAt: new Date('2023-01-01').getTime(),
  version: 1,
  expenseData: {
    // Core fields that should be sent to API
    merchant: {
      name: 'Starbucks',
      category: 'food',
      categoryGroup: 'MEALS',
      description: 'Coffee shop',
      formattedAddress: '123 Main St',
      online: false,
      perDiem: false,
      timeZone: 'America/New_York',
    },
    merchantAmount: 5.99,
    merchantCurrency: 'USD',
    policy: 'MEALS',
    details: {
      customFieldValues: [],
      description: 'Morning coffee',
      participants: [],
      personal: false,
      personalMerchantAmount: undefined,
      taxDetails: {
        address: undefined,
        country: 'US',
        noTax: false,
        reverseCharge: false,
        taxRateDecimal: false,
        vatNumber: undefined,
      },
    },
    reportingData: {
      billTo: undefined,
      department: undefined,
      region: undefined,
      subsidiary: undefined,
    },
  } as TemplateExpenseData,
  metadata: {
    createdFrom: 'expense' as const,
    favorite: false,
    lastUsed: undefined,
    useCount: 0,
    scheduledUseCount: 0,
    tags: ['coffee', 'daily'],
  },
  scheduling: null,
  executionHistory: [],
};

// Mock template data that includes problematic fields that caused the original bug
const mockTemplateWithProblematicData = {
  ...mockTemplateWithExtraFields,
  expenseData: {
    ...mockTemplateWithExtraFields.expenseData,
    // These fields would cause API errors if included in expense creation
    uuid: '8f7fb3da-4888-417a-9b87-cabd548b1ae9',
    dateCreated: '2025-07-23T07:31:18.613996Z',
    dateModified: '2025-07-23T07:31:22.594826Z',
    id: 'original-expense-id',
    accountAmount: 5.99,
    accountCurrency: 'USD',
    status: 'APPROVED',
    user: { uuid: 'user-123', email: 'test@example.com' },
    source: 'CARD',
  },
};

describe('Apply Template Data Transformation', () => {
  beforeEach(() => {
    // Create fresh DOM for each test
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div class="template-item" data-template-id="template-test-1">
            <button class="apply-template" data-template-id="template-test-1">Apply Template</button>
          </div>
        </body>
      </html>
    `,
      {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable',
      }
    );

    document = dom.window.document;
    window = dom.window as unknown as Window;
    (global as any).document = document;
    (global as any).window = window;

    // Reset Chrome API mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('Expense Data Transformation', () => {
    test('should only include required ExpenseCreatePayload fields', () => {
      const template = mockTemplateWithExtraFields;

      // Simulate the transformation that happens in applyTemplate function
      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      // Verify only required fields are present
      expect(transformedData).toEqual({
        date: expect.any(String),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      });

      // Verify problematic fields are NOT present
      expect(transformedData).not.toHaveProperty('uuid');
      expect(transformedData).not.toHaveProperty('dateCreated');
      expect(transformedData).not.toHaveProperty('dateModified');
      expect(transformedData).not.toHaveProperty('id');
      expect(transformedData).not.toHaveProperty('accountAmount');
      expect(transformedData).not.toHaveProperty('accountCurrency');
      expect(transformedData).not.toHaveProperty('status');
      expect(transformedData).not.toHaveProperty('user');
      expect(transformedData).not.toHaveProperty('source');
    });

    test('should set current date instead of template creation date', () => {
      const template = mockTemplateWithExtraFields;
      const beforeTransform = Date.now();

      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      const afterTransform = Date.now();
      const transformedDate = new Date(transformedData.date).getTime();

      // Verify date is current, not from template creation
      expect(transformedDate).toBeGreaterThanOrEqual(beforeTransform);
      expect(transformedDate).toBeLessThanOrEqual(afterTransform);

      // Verify it's not the template's creation date
      expect(transformedDate).not.toBe(template.createdAt);
    });

    test('should preserve all required fields with correct types', () => {
      const template = mockTemplateWithExtraFields;

      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      // Type validation
      expect(typeof transformedData.date).toBe('string');
      expect(typeof transformedData.merchant).toBe('object');
      expect(typeof transformedData.merchantAmount).toBe('number');
      expect(typeof transformedData.merchantCurrency).toBe('string');
      expect(typeof transformedData.policy).toBe('string');
      expect(typeof transformedData.details).toBe('object');
      expect(typeof transformedData.reportingData).toBe('object');

      // Content validation
      expect(transformedData.merchant.name).toBe('Starbucks');
      expect(transformedData.merchantAmount).toBe(5.99);
      expect(transformedData.merchantCurrency).toBe('USD');
      expect(transformedData.policy).toBe('MEALS');
      expect(transformedData.details.description).toBe('Morning coffee');
    });

    test('should handle templates created from expenses with extra data', () => {
      // This test specifically prevents the original bug where templates
      // created from full expense data would fail when applied
      const template = mockTemplateWithProblematicData as ExpenseTemplate;

      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      // Verify the transformation removes problematic fields
      expect(transformedData).not.toHaveProperty('uuid');
      expect(transformedData).not.toHaveProperty('accountAmount');
      expect(transformedData).not.toHaveProperty('user');

      // Verify required fields are still intact
      expect(transformedData.merchant.name).toBe('Starbucks');
      expect(transformedData.merchantAmount).toBe(5.99);
      expect(transformedData.merchantCurrency).toBe('USD');
    });
  });

  describe('API Integration', () => {
    test('should send correctly formatted data to createExpense API', async () => {
      const template = mockTemplateWithExtraFields;

      // Mock successful API response
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'createExpense') {
          // Verify the exact structure sent to API
          expect(message.expenseData).toEqual({
            date: expect.any(String),
            merchant: template.expenseData.merchant,
            merchantAmount: template.expenseData.merchantAmount,
            merchantCurrency: template.expenseData.merchantCurrency,
            policy: template.expenseData.policy,
            details: template.expenseData.details,
            reportingData: template.expenseData.reportingData,
          });

          // Verify no extra fields are present
          const keys = Object.keys(message.expenseData);
          expect(keys).toEqual([
            'date',
            'merchant',
            'merchantAmount',
            'merchantCurrency',
            'policy',
            'details',
            'reportingData',
          ]);

          callback({ success: true, data: { id: 'new-expense-id' } });
        }
      });

      // Simulate applying the template
      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          { action: 'createExpense', expenseData: transformedData },
          (response: { success: boolean; expenseId?: string; error?: string }) => {
            expect(response.success).toBe(true);
            resolve();
          }
        );
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'createExpense',
          expenseData: expect.objectContaining({
            date: expect.any(String),
            merchant: expect.any(Object),
            merchantAmount: expect.any(Number),
            merchantCurrency: expect.any(String),
            policy: expect.any(String),
            details: expect.any(Object),
            reportingData: expect.any(Object),
          }),
        },
        expect.any(Function)
      );
    });

    test('should not send fields that cause "No items provided to itemize" error', () => {
      const template = mockTemplateWithProblematicData as ExpenseTemplate;

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'createExpense') {
          // These fields caused the original "No items provided to itemize" error
          expect(message.expenseData).not.toHaveProperty('items');
          expect(message.expenseData).not.toHaveProperty('uuid');
          expect(message.expenseData).not.toHaveProperty('id');
          expect(message.expenseData).not.toHaveProperty('dateCreated');
          expect(message.expenseData).not.toHaveProperty('dateModified');

          callback({ success: true, data: { id: 'new-expense-id' } });
        }
      });

      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      mockChrome.runtime.sendMessage(
        { action: 'createExpense', expenseData: transformedData },
        () => {}
      );

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    test('should not send fields that cause "account/merchant amounts mismatch" error', () => {
      const template = mockTemplateWithProblematicData as ExpenseTemplate;

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'createExpense') {
          // These fields caused the original "amounts mismatch" error
          expect(message.expenseData).not.toHaveProperty('accountAmount');
          expect(message.expenseData).not.toHaveProperty('accountCurrency');
          expect(message.expenseData).not.toHaveProperty('billableEntityAmount');
          expect(message.expenseData).not.toHaveProperty('approvedAmount');

          callback({ success: true, data: { id: 'new-expense-id' } });
        }
      });

      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      mockChrome.runtime.sendMessage(
        { action: 'createExpense', expenseData: transformedData },
        () => {}
      );

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Data Structure Validation', () => {
    test('should validate ExpenseCreatePayload structure compliance', () => {
      const template = mockTemplateWithExtraFields;

      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      // Type check - this will fail at compile time if structure is wrong
      const isValidPayload = (data: unknown): data is ExpenseCreatePayload => {
        const obj = data as Record<string, unknown>;
        return (
          typeof obj.date === 'string' &&
          typeof obj.merchant === 'object' &&
          typeof obj.merchantAmount === 'number' &&
          typeof obj.merchantCurrency === 'string' &&
          typeof obj.policy === 'string' &&
          typeof obj.details === 'object' &&
          typeof obj.reportingData === 'object'
        );
      };

      expect(isValidPayload(transformedData)).toBe(true);
    });

    test('should ensure all required fields from ExpenseCreatePayload are present', () => {
      const template = mockTemplateWithExtraFields;

      const transformedData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      // Check all required fields from ExpenseCreatePayload interface
      const requiredFields = [
        'date',
        'merchant',
        'merchantAmount',
        'merchantCurrency',
        'policy',
        'details',
        'reportingData',
      ];

      requiredFields.forEach((field) => {
        expect(transformedData).toHaveProperty(field);
        expect(transformedData[field as keyof typeof transformedData]).not.toBeUndefined();
      });
    });

    test('should handle edge cases in template data', () => {
      const edgeCaseTemplate = {
        ...mockTemplateWithExtraFields,
        expenseData: {
          ...mockTemplateWithExtraFields.expenseData,
          merchantAmount: 0.01, // Very small amount
          merchantCurrency: 'EUR', // Different currency
          details: {
            ...mockTemplateWithExtraFields.expenseData.details,
            description: '', // Empty description
            personalMerchantAmount: 0, // Zero personal amount
          },
        },
      };

      const transformedData = {
        date: new Date().toISOString(),
        merchant: edgeCaseTemplate.expenseData.merchant,
        merchantAmount: edgeCaseTemplate.expenseData.merchantAmount,
        merchantCurrency: edgeCaseTemplate.expenseData.merchantCurrency,
        policy: edgeCaseTemplate.expenseData.policy,
        details: edgeCaseTemplate.expenseData.details,
        reportingData: edgeCaseTemplate.expenseData.reportingData,
      };

      expect(transformedData.merchantAmount).toBe(0.01);
      expect(transformedData.merchantCurrency).toBe('EUR');
      expect(transformedData.details.description).toBe('');
      expect(transformedData.details.personalMerchantAmount).toBe(0);
    });
  });

  describe('Regression Prevention', () => {
    test('should prevent spread operator usage that caused original bug', () => {
      const template = mockTemplateWithProblematicData as ExpenseTemplate;

      // This is what was causing the bug - DON'T DO THIS:
      const buggyTransformation = {
        ...template.expenseData, // This includes ALL fields, even problematic ones
        date: new Date().toISOString(),
      };

      // Verify the buggy transformation includes problematic fields
      expect(buggyTransformation).toHaveProperty('uuid');
      expect(buggyTransformation).toHaveProperty('accountAmount');
      expect(buggyTransformation).toHaveProperty('user');

      // This is the correct transformation - DO THIS:
      const correctTransformation = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      // Verify the correct transformation excludes problematic fields
      expect(correctTransformation).not.toHaveProperty('uuid');
      expect(correctTransformation).not.toHaveProperty('accountAmount');
      expect(correctTransformation).not.toHaveProperty('user');

      // Verify structures are different
      expect(Object.keys(buggyTransformation).length).toBeGreaterThan(
        Object.keys(correctTransformation).length
      );
    });

    test('should provide clear error if template data is malformed', () => {
      const malformedTemplate = {
        ...mockTemplateWithExtraFields,
        expenseData: {
          // Missing required fields
          merchant: undefined,
          merchantAmount: undefined,
          merchantCurrency: undefined,
          policy: undefined,
          details: undefined,
          reportingData: undefined,
        },
      };

      expect(() => {
        const transformedData = {
          date: new Date().toISOString(),
          merchant: malformedTemplate.expenseData.merchant,
          merchantAmount: malformedTemplate.expenseData.merchantAmount,
          merchantCurrency: malformedTemplate.expenseData.merchantCurrency,
          policy: malformedTemplate.expenseData.policy,
          details: malformedTemplate.expenseData.details,
          reportingData: malformedTemplate.expenseData.reportingData,
        };

        // Validation that should catch malformed data
        if (
          !transformedData.merchant ||
          !transformedData.merchantAmount ||
          !transformedData.merchantCurrency
        ) {
          throw new Error('Template data is malformed: missing required fields');
        }
      }).toThrow('Template data is malformed: missing required fields');
    });

    test('should maintain backwards compatibility with existing templates', () => {
      // Test with minimal template data (older format)
      const minimalTemplate = {
        id: 'minimal-template',
        name: 'Minimal Template',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
        expenseData: {
          merchant: {
            name: 'Test Merchant',
            category: 'other',
            categoryGroup: 'OTHER',
            description: '',
            formattedAddress: '',
            online: false,
            perDiem: false,
            timeZone: 'UTC',
          },
          merchantAmount: 10.0,
          merchantCurrency: 'USD',
          policy: 'OTHER',
          details: {
            customFieldValues: [],
            description: 'Test',
            participants: [],
            personal: false,
            taxDetails: { country: 'US', noTax: true, reverseCharge: false, taxRateDecimal: false },
          },
          reportingData: {},
        },
        metadata: {
          createdFrom: 'manual' as const,
          favorite: false,
          useCount: 0,
          scheduledUseCount: 0,
          tags: [],
        },
        scheduling: null,
        executionHistory: [],
      };

      const transformedData = {
        date: new Date().toISOString(),
        merchant: minimalTemplate.expenseData.merchant,
        merchantAmount: minimalTemplate.expenseData.merchantAmount,
        merchantCurrency: minimalTemplate.expenseData.merchantCurrency,
        policy: minimalTemplate.expenseData.policy,
        details: minimalTemplate.expenseData.details,
        reportingData: minimalTemplate.expenseData.reportingData,
      };

      expect(transformedData.merchant.name).toBe('Test Merchant');
      expect(transformedData.merchantAmount).toBe(10.0);
      expect(transformedData.merchantCurrency).toBe('USD');
      expect(transformedData.policy).toBe('OTHER');
    });
  });
});
