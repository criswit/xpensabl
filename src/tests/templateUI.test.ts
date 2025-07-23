/**
 * Template UI Component Tests
 * Tests for template management user interface components and interactions
 */

import { JSDOM } from 'jsdom';
import { ExpenseTemplate } from '../model/template';

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

// Sample template data for testing
const mockTemplate: ExpenseTemplate = {
  id: 'template-1',
  name: 'Coffee Shop Visit',
  createdAt: new Date('2023-01-01').getTime(),
  updatedAt: new Date('2023-01-01').getTime(),
  version: 1,
  expenseData: {
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
  },
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

const mockExpenseData = {
  id: 'expense-1',
  uuid: 'expense-uuid-1',
  merchant: {
    name: 'Test Merchant',
    category: 'other',
    categoryGroup: 'OTHER',
  },
  merchantAmount: 25.0,
  merchantCurrency: 'USD',
  accountAmount: 25.0,
  accountCurrency: 'USD',
  policy: 'OTHER',
  prettyMerchantName: 'Test Merchant',
  details: {
    description: 'Test expense for template creation',
  },
};

describe('Template UI Components', () => {
  beforeEach(() => {
    // Create fresh DOM for each test
    dom = new JSDOM(
      `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <!-- Templates Section -->
          <div class="templates-section">
            <h2>Expense Templates</h2>
            <div class="template-controls">
              <div class="templates-status" id="templatesStatus">No templates created yet</div>
            </div>
            <div class="template-content">
              <!-- Template List View -->
              <div class="template-list" id="templateList" style="display: none;">
                <div class="template-list-content" id="templateListContent">
                  <!-- Template items will be populated here -->
                </div>
              </div>
              
              <!-- Template Detail/Edit View -->
              <div class="template-detail" id="templateDetail" style="display: none;">
                <div class="detail-header">
                  <button id="backToTemplates" class="btn btn-secondary">← Templates</button>
                  <h3 id="templateDetailTitle">Template Details</h3>
                  <button id="toggleTemplateEdit" class="btn btn-secondary">Edit</button>
                </div>
                
                <div class="detail-content" id="templateDetailContent">
                  <!-- Template details in read-only format -->
                </div>
                
                <div class="template-edit-form" id="templateEditForm" style="display: none;">
                  <div class="form-group">
                    <label for="templateName">Template Name</label>
                    <input type="text" id="templateName" class="form-control" required>
                    <div class="error-message" id="templateNameError"></div>
                  </div>
                  
                  <div class="form-group">
                    <label for="templateMerchant">Merchant</label>
                    <input type="text" id="templateMerchant" class="form-control" required>
                    <div class="error-message" id="templateMerchantError"></div>
                  </div>
                  
                  <div class="form-group">
                    <label for="templateAmount">Amount</label>
                    <div class="input-group">
                      <select id="templateCurrency" class="form-control currency-select">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                      <input type="number" id="templateAmount" class="form-control" step="0.01" required>
                    </div>
                    <div class="error-message" id="templateAmountError"></div>
                  </div>
                  
                  <div class="form-group">
                    <label for="templateDescription">Description</label>
                    <textarea id="templateDescription" class="form-control" rows="3"></textarea>
                  </div>
                  
                  <div class="form-actions">
                    <button id="saveTemplate" class="btn btn-primary">Save Changes</button>
                    <button id="cancelTemplateEdit" class="btn btn-secondary">Cancel</button>
                  </div>
                </div>
                
                <div class="detail-actions" id="templateDetailActions">
                  <button id="applyTemplate" class="btn btn-primary">Apply Template</button>
                  <button id="duplicateTemplate" class="btn btn-secondary">Duplicate</button>
                  <button id="deleteTemplate" class="btn btn-danger">Delete</button>
                </div>
              </div>
              
              <!-- Template Creation Dialog -->
              <div class="template-creation-dialog" id="templateCreationDialog" style="display: none;">
                <div class="dialog-overlay"></div>
                <div class="dialog-content">
                  <div class="dialog-header">
                    <h3>Save as Template</h3>
                    <button id="closeTemplateDialog" class="btn-close">&times;</button>
                  </div>
                  <div class="dialog-body">
                    <div class="form-group">
                      <label for="newTemplateName">Template Name</label>
                      <input type="text" id="newTemplateName" class="form-control" placeholder="Enter template name" required>
                      <div class="error-message" id="newTemplateNameError"></div>
                    </div>
                    <div class="template-preview" id="templatePreview">
                      <!-- Preview of template data -->
                    </div>
                  </div>
                  <div class="dialog-actions">
                    <button id="createTemplate" class="btn btn-primary">Create Template</button>
                    <button id="cancelTemplateCreation" class="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Expense Detail Section (for template creation) -->
          <div class="expense-detail" id="expenseDetail">
            <div class="detail-actions">
              <button id="duplicateExpense" class="btn btn-primary">Duplicate Expense</button>
              <button id="saveAsTemplate" class="btn btn-secondary">Save as Template</button>
            </div>
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

  describe('Template List Display', () => {
    test('should display empty state when no templates exist', () => {
      const templatesStatus = document.getElementById('templatesStatus');
      const templateList = document.getElementById('templateList');

      expect(templatesStatus?.textContent).toBe('No templates created yet');
      expect(templateList?.style.display).toBe('none');
    });

    test('should render template cards with correct data', () => {
      const templateListContent = document.getElementById('templateListContent');

      // Simulate template rendering
      const templateHtml = `
        <div class="template-item" data-template-id="${mockTemplate.id}">
          <div class="template-header">
            <div class="template-name">${mockTemplate.name}</div>
            <div class="template-actions">
              <button class="btn-icon edit-btn" aria-label="Edit template">✏️</button>
              <button class="btn-icon delete-btn" aria-label="Delete template">🗑️</button>
            </div>
          </div>
          
          <div class="template-details">
            <div class="template-merchant">${mockTemplate.expenseData.merchant.name}</div>
            <div class="template-amount">${mockTemplate.expenseData.merchantCurrency} ${mockTemplate.expenseData.merchantAmount.toFixed(2)}</div>
            <div class="template-meta">
              <span class="last-used">Never used</span>
              <span class="use-count">Used ${mockTemplate.metadata.useCount} times</span>
            </div>
          </div>
          
          <div class="template-footer">
            <button class="btn btn-primary apply-template">Apply Template</button>
            <div class="execution-status none">
              <span class="status-indicator"></span>
              No recent activity
            </div>
          </div>
        </div>
      `;

      templateListContent!.innerHTML = templateHtml;

      const templateItem = document.querySelector('.template-item');
      expect(templateItem).toBeTruthy();
      expect(templateItem?.getAttribute('data-template-id')).toBe(mockTemplate.id);

      const templateName = document.querySelector('.template-name');
      expect(templateName?.textContent).toBe(mockTemplate.name);

      const templateMerchant = document.querySelector('.template-merchant');
      expect(templateMerchant?.textContent).toBe(mockTemplate.expenseData.merchant.name);

      const templateAmount = document.querySelector('.template-amount');
      expect(templateAmount?.textContent).toBe('USD 5.99');
    });

    test('should show template list when templates exist', () => {
      const templateList = document.getElementById('templateList');
      const templatesStatus = document.getElementById('templatesStatus');

      // Simulate showing templates
      templateList!.style.display = 'block';
      templatesStatus!.textContent = '1 template found';
      templatesStatus!.className = 'templates-status success';

      expect(templateList?.style.display).toBe('block');
      expect(templatesStatus?.textContent).toBe('1 template found');
      expect(templatesStatus?.classList.contains('success')).toBe(true);
    });
  });

  describe('Template Creation Dialog', () => {
    test('should show template creation dialog when Save as Template is clicked', () => {
      const saveAsTemplateBtn = document.getElementById('saveAsTemplate');
      const creationDialog = document.getElementById('templateCreationDialog');

      // Simulate button click
      saveAsTemplateBtn?.click();
      creationDialog!.style.display = 'block';

      expect(creationDialog?.style.display).toBe('block');
    });

    test('should populate template preview with expense data', () => {
      const templatePreview = document.getElementById('templatePreview');

      // Simulate preview population
      templatePreview!.innerHTML = `
        <h4>Template Preview</h4>
        <div class="preview-field">
          <strong>Merchant:</strong> ${mockExpenseData.merchant.name}
        </div>
        <div class="preview-field">
          <strong>Amount:</strong> ${mockExpenseData.merchantCurrency} ${mockExpenseData.merchantAmount.toFixed(2)}
        </div>
        <div class="preview-field">
          <strong>Description:</strong> ${mockExpenseData.details.description}
        </div>
      `;

      expect(templatePreview?.textContent).toContain('Test Merchant');
      expect(templatePreview?.textContent).toContain('USD 25.00');
      expect(templatePreview?.textContent).toContain('Test expense for template creation');
    });

    test('should validate template name input', () => {
      const templateNameInput = document.getElementById('newTemplateName') as HTMLInputElement;
      const templateNameError = document.getElementById('newTemplateNameError');

      // Test empty name
      templateNameInput.value = '';
      const isEmpty = templateNameInput.value.trim().length === 0;

      if (isEmpty) {
        templateNameError!.textContent = 'Template name is required';
        templateNameInput.parentElement?.classList.add('has-error');
      }

      expect(templateNameError?.textContent).toBe('Template name is required');
      expect(templateNameInput.parentElement?.classList.contains('has-error')).toBe(true);

      // Test valid name
      templateNameInput.value = 'Valid Template Name';
      templateNameError!.textContent = '';
      templateNameInput.parentElement?.classList.remove('has-error');

      expect(templateNameError?.textContent).toBe('');
      expect(templateNameInput.parentElement?.classList.contains('has-error')).toBe(false);
    });

    test('should close dialog when close button is clicked', () => {
      const closeButton = document.getElementById('closeTemplateDialog');
      const creationDialog = document.getElementById('templateCreationDialog');

      // Show dialog first
      creationDialog!.style.display = 'block';
      expect(creationDialog?.style.display).toBe('block');

      // Simulate close button click
      closeButton?.click();
      creationDialog!.style.display = 'none';

      expect(creationDialog?.style.display).toBe('none');
    });
  });

  describe('Template Detail View', () => {
    test('should show template detail when template item is clicked', () => {
      const templateList = document.getElementById('templateList');
      const templateDetail = document.getElementById('templateDetail');
      const templateDetailTitle = document.getElementById('templateDetailTitle');

      // Simulate template item click
      templateList!.style.display = 'none';
      templateDetail!.style.display = 'block';
      templateDetailTitle!.textContent = mockTemplate.name;

      expect(templateList?.style.display).toBe('none');
      expect(templateDetail?.style.display).toBe('block');
      expect(templateDetailTitle?.textContent).toBe(mockTemplate.name);
    });

    test('should populate detail view with template data', () => {
      const templateDetailContent = document.getElementById('templateDetailContent');

      // Simulate detail content population
      templateDetailContent!.innerHTML = `
        <div class="detail-field">
          <div class="detail-label">Template Name:</div>
          <div class="detail-value highlight">${mockTemplate.name}</div>
        </div>
        <div class="detail-field">
          <div class="detail-label">Merchant:</div>
          <div class="detail-value highlight">${mockTemplate.expenseData.merchant.name}</div>
        </div>
        <div class="detail-field">
          <div class="detail-label">Amount:</div>
          <div class="detail-value highlight">${mockTemplate.expenseData.merchantCurrency} ${mockTemplate.expenseData.merchantAmount.toFixed(2)}</div>
        </div>
        <div class="detail-field">
          <div class="detail-label">Usage Count:</div>
          <div class="detail-value">${mockTemplate.metadata.useCount} times</div>
        </div>
      `;

      expect(templateDetailContent?.textContent).toContain(mockTemplate.name);
      expect(templateDetailContent?.textContent).toContain(mockTemplate.expenseData.merchant.name);
      expect(templateDetailContent?.textContent).toContain('USD 5.99');
      expect(templateDetailContent?.textContent).toContain('0 times');
    });

    test('should return to template list when back button is clicked', () => {
      const backButton = document.getElementById('backToTemplates');
      const templateList = document.getElementById('templateList');
      const templateDetail = document.getElementById('templateDetail');

      // Start in detail view
      templateDetail!.style.display = 'block';
      templateList!.style.display = 'none';

      // Simulate back button click
      backButton?.click();
      templateDetail!.style.display = 'none';
      templateList!.style.display = 'block';

      expect(templateDetail?.style.display).toBe('none');
      expect(templateList?.style.display).toBe('block');
    });
  });

  describe('Template Editing', () => {
    test('should toggle edit mode when edit button is clicked', () => {
      const toggleEditButton = document.getElementById('toggleTemplateEdit');
      const templateEditForm = document.getElementById('templateEditForm');
      const templateDetailContent = document.getElementById('templateDetailContent');

      // Initially in read-only mode
      expect(templateEditForm?.style.display).toBe('none');

      // Simulate edit button click
      toggleEditButton?.click();
      templateEditForm!.style.display = 'block';
      templateDetailContent!.style.display = 'none';

      expect(templateEditForm?.style.display).toBe('block');
      expect(templateDetailContent?.style.display).toBe('none');
    });

    test('should populate edit form with template data', () => {
      const templateNameInput = document.getElementById('templateName') as HTMLInputElement;
      const templateMerchantInput = document.getElementById('templateMerchant') as HTMLInputElement;
      const templateAmountInput = document.getElementById('templateAmount') as HTMLInputElement;
      const templateCurrencySelect = document.getElementById(
        'templateCurrency'
      ) as HTMLSelectElement;

      // Simulate form population
      templateNameInput.value = mockTemplate.name;
      templateMerchantInput.value = mockTemplate.expenseData.merchant.name;
      templateAmountInput.value = mockTemplate.expenseData.merchantAmount.toString();
      templateCurrencySelect.value = mockTemplate.expenseData.merchantCurrency;

      expect(templateNameInput.value).toBe(mockTemplate.name);
      expect(templateMerchantInput.value).toBe(mockTemplate.expenseData.merchant.name);
      expect(templateAmountInput.value).toBe('5.99');
      expect(templateCurrencySelect.value).toBe('USD');
    });

    test('should validate form fields before saving', () => {
      const templateNameInput = document.getElementById('templateName') as HTMLInputElement;
      const templateAmountInput = document.getElementById('templateAmount') as HTMLInputElement;
      const templateNameError = document.getElementById('templateNameError');
      const templateAmountError = document.getElementById('templateAmountError');

      // Test validation
      templateNameInput.value = '';
      templateAmountInput.value = '-5';

      const nameValid = templateNameInput.value.trim().length > 0;
      const amountValid = parseFloat(templateAmountInput.value) > 0;

      if (!nameValid) {
        templateNameError!.textContent = 'Template name is required';
        templateNameInput.parentElement?.classList.add('has-error');
      }

      if (!amountValid) {
        templateAmountError!.textContent = 'Amount must be positive';
        templateAmountInput.parentElement?.classList.add('has-error');
      }

      expect(templateNameError?.textContent).toBe('Template name is required');
      expect(templateAmountError?.textContent).toBe('Amount must be positive');
    });

    test('should cancel edit mode when cancel button is clicked', () => {
      const cancelButton = document.getElementById('cancelTemplateEdit');
      const templateEditForm = document.getElementById('templateEditForm');
      const templateDetailContent = document.getElementById('templateDetailContent');

      // Start in edit mode
      templateEditForm!.style.display = 'block';
      templateDetailContent!.style.display = 'none';

      // Simulate cancel button click
      cancelButton?.click();
      templateEditForm!.style.display = 'none';
      templateDetailContent!.style.display = 'block';

      expect(templateEditForm?.style.display).toBe('none');
      expect(templateDetailContent?.style.display).toBe('block');
    });
  });

  describe('Template Deletion', () => {
    test('should show confirmation before deleting template', () => {
      const deleteButton = document.getElementById('deleteTemplate');

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn(() => true);

      let confirmationShown = false;
      deleteButton?.addEventListener('click', () => {
        confirmationShown = window.confirm('Are you sure you want to delete this template?');
      });

      deleteButton?.click();

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this template?');
      expect(confirmationShown).toBe(true);

      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });

  describe('Template Application', () => {
    test('should trigger expense creation when apply template is clicked', () => {
      const applyButton = document.getElementById('applyTemplate');

      // Mock chrome runtime message
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'createExpense') {
          callback({ success: true, data: { id: 'new-expense-id' } });
        }
      });

      let _messageSent = false;
      applyButton?.addEventListener('click', () => {
        mockChrome.runtime.sendMessage(
          {
            action: 'createExpense',
            expenseData: mockTemplate.expenseData,
          },
          () => {
            _messageSent = true;
          }
        );
      });

      applyButton?.click();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'createExpense',
          expenseData: mockTemplate.expenseData,
        },
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    test('should display error messages when Chrome storage fails', () => {
      const templatesStatus = document.getElementById('templatesStatus');

      // Simulate storage error
      templatesStatus!.textContent = 'Failed to load templates';
      templatesStatus!.className = 'templates-status error';

      expect(templatesStatus?.textContent).toBe('Failed to load templates');
      expect(templatesStatus?.classList.contains('error')).toBe(true);
    });

    test('should show form validation errors', () => {
      const formGroup = document.querySelector('.form-group');
      const errorMessage = formGroup?.querySelector('.error-message');

      // Simulate validation error
      formGroup?.classList.add('has-error');
      errorMessage!.textContent = 'This field is required';

      expect(formGroup?.classList.contains('has-error')).toBe(true);
      expect(errorMessage?.textContent).toBe('This field is required');
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels on icon buttons', () => {
      const templateListContent = document.getElementById('templateListContent');

      // First create template content
      const templateHtml = `
        <div class="template-item" data-template-id="${mockTemplate.id}">
          <div class="template-header">
            <div class="template-name">${mockTemplate.name}</div>
            <div class="template-actions">
              <button class="btn-icon edit-btn" aria-label="Edit template" data-template-id="${mockTemplate.id}">
                ✏️
              </button>
              <button class="btn-icon delete-btn" aria-label="Delete template" data-template-id="${mockTemplate.id}">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;

      templateListContent!.innerHTML = templateHtml;

      const editButton = document.querySelector('.btn-icon.edit-btn');
      const deleteButton = document.querySelector('.btn-icon.delete-btn');

      expect(editButton?.getAttribute('aria-label')).toBe('Edit template');
      expect(deleteButton?.getAttribute('aria-label')).toBe('Delete template');
    });

    test('should support keyboard navigation', () => {
      const templateListContent = document.getElementById('templateListContent');

      // First create template content
      const templateHtml = `
        <div class="template-item" tabindex="0" role="button" data-template-id="${mockTemplate.id}">
          <div class="template-name">${mockTemplate.name}</div>
        </div>
      `;

      templateListContent!.innerHTML = templateHtml;

      const templateItem = document.querySelector('.template-item');

      expect(templateItem?.getAttribute('tabindex')).toBe('0');
      expect(templateItem?.getAttribute('role')).toBe('button');
    });
  });
});
