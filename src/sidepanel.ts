import { logger } from './services/chromeLogger';
import {
  ExpenseTemplate,
  TemplateExecution,
  TemplateScheduling,
  DayOfWeek,
} from './model/template';
import { ExpenseData } from './model/expense';

// Response type definitions
interface ChromeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ExpenseResponse extends ChromeResponse {
  data?: {
    data?: ExpenseData;
  };
}

interface ExpenseListResponse extends ChromeResponse {
  data?: {
    data?: Array<{
      _embedded?: {
        transactions?: ExpenseData[];
      };
    }>;
  };
}

interface TemplateResponse extends ChromeResponse<ExpenseTemplate> {}
interface TemplateListResponse extends ChromeResponse<ExpenseTemplate[]> {}

let currentExpenses: ExpenseData[] = [];
let currentTemplates: ExpenseTemplate[] = [];
let selectedTemplate: ExpenseTemplate | null = null;

// Type declarations removed - unused function

// Help section functionality
function initializeHelpSection() {
  const helpHeader = document.getElementById('helpHeader') as HTMLDivElement;
  const helpContent = document.getElementById('helpContent') as HTMLDivElement;
  const helpToggle = document.getElementById('helpToggle') as HTMLSpanElement;

  if (!helpHeader || !helpContent || !helpToggle) {
    logger.warn('Help section elements not found');
    return;
  }

  // Load saved state from storage
  void chrome.storage.local.get(['helpSectionExpanded'], (result) => {
    const isExpanded = result.helpSectionExpanded || false;
    updateHelpSection(isExpanded);
  });

  // Add click handler
  helpHeader.addEventListener('click', () => {
    const isCurrentlyExpanded = helpContent.style.display !== 'none';
    const newState = !isCurrentlyExpanded;

    updateHelpSection(newState);

    // Save state to storage
    void chrome.storage.local.set({ helpSectionExpanded: newState });

    logger.debug('Help section toggled', { expanded: newState });
  });

  function updateHelpSection(isExpanded: boolean) {
    if (isExpanded) {
      helpContent.style.display = 'block';
      helpToggle.classList.add('expanded');
    } else {
      helpContent.style.display = 'none';
      helpToggle.classList.remove('expanded');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  logger.debug('Side panel loaded');

  // Initialize help section
  initializeHelpSection();

  // Get DOM elements
  // Expense elements
  const fetchExpensesButton = document.getElementById('fetchExpenses') as HTMLButtonElement;
  const refreshExpensesButton = document.getElementById('refreshExpenses') as HTMLButtonElement;
  const expensesStatus = document.getElementById('expensesStatus') as HTMLDivElement;
  const expensesList = document.getElementById('expensesList') as HTMLDivElement;

  // Expense detail elements
  const expenseDetail = document.getElementById('expenseDetail') as HTMLDivElement;
  const expenseDetailContent = document.getElementById('expenseDetailContent') as HTMLDivElement;
  const backToListButton = document.getElementById('backToList') as HTMLButtonElement;
  const duplicateExpenseButton = document.getElementById('duplicateExpense') as HTMLButtonElement;

  // Expense management functions
  function setLoadingState(isLoading: boolean) {
    fetchExpensesButton.disabled = isLoading;
    refreshExpensesButton.disabled = isLoading;

    if (isLoading) {
      fetchExpensesButton.innerHTML = '<span class="loading-spinner"></span>Loading...';
      expensesStatus.textContent = 'Fetching expenses...';
      expensesStatus.className = 'expenses-status';
    } else {
      fetchExpensesButton.innerHTML = 'Fetch Expenses';
    }
  }

  function displayExpenses(expenses: ExpenseData[]) {
    currentExpenses = expenses;

    // Add debugging to understand the data structure
    logger.debug('DisplayExpenses called with:', expenses);

    if (!expenses || expenses.length === 0) {
      expensesList.innerHTML = '<div class="empty-state">No expenses found</div>';
      expensesList.style.display = 'block';
      expensesStatus.textContent = 'No expenses to display';
      expensesStatus.className = 'expenses-status';
      return;
    }

    try {
      const expensesHtml = expenses
        .map((expense, index) => {
          // Log each expense for debugging
          logger.debug(`Processing expense ${index}:`, expense);

          try {
            // Add defensive programming with fallbacks based on actual API structure
            const status = expense.status || 'unknown';
            const statusClass = status.toLowerCase();
            const amount = expense.accountAmount ?? 0;
            const currency = expense.accountCurrency || 'USD';
            const formattedAmount = `${currency} ${amount.toFixed(2)}`;
            const date = expense.authorizationDate || expense.instant || new Date().toISOString();
            const formattedDate = new Date(date).toLocaleDateString();
            const merchantName =
              expense.prettyMerchantName || expense.merchant?.name || 'Unknown Merchant';
            const policy = expense.policyName || 'Other';

            // Debug the expense ID
            logger.debug(`Expense ${index} ID:`, expense.uuid);
            const expenseId = expense.uuid || `expense-${index}`;

            return `
            <div class="expense-item" data-expense-id="${expenseId}">
              <div class="expense-main">
                <div class="expense-merchant">${merchantName}</div>
                <div class="expense-details">${formattedDate} • ${policy}</div>
                <span class="expense-status ${statusClass}">${status.toUpperCase()}</span>
              </div>
              <div class="expense-amount">${formattedAmount}</div>
              <div class="expense-arrow">›</div>
            </div>
          `;
          } catch (itemError) {
            logger.error(`Error processing expense item ${index}:`, { error: itemError, expense });
            // Return a fallback item for problematic expenses
            return `
            <div class="expense-item">
              <div class="expense-main">
                <div class="expense-merchant">Error loading expense</div>
                <div class="expense-details">Data error • Check console</div>
                <span class="expense-status unknown">ERROR</span>
              </div>
              <div class="expense-amount">--</div>
            </div>
          `;
          }
        })
        .join('');

      expensesList.innerHTML = expensesHtml;
      expensesList.style.display = 'block';
      expensesStatus.textContent = `${expenses.length} expense${expenses.length === 1 ? '' : 's'} loaded`;
      expensesStatus.className = 'expenses-status success';
      refreshExpensesButton.style.display = 'inline-block';

      // Add click event listeners to expense items after HTML is inserted
      const expenseItems = expensesList.querySelectorAll('.expense-item');
      expenseItems.forEach((item) => {
        const expenseId = item.getAttribute('data-expense-id');
        if (expenseId) {
          item.addEventListener('click', () => {
            logger.debug('Expense item clicked, ID:', expenseId);
            void showExpenseDetailsView(expenseId).catch((error) => {
              logger.error('Error showing expense details:', error);
            });
          });
        }
      });
    } catch (error) {
      logger.error('Error in displayExpenses:', error);
      displayExpensesError(`Failed to display expenses: ${(error as Error).message}`);
    }
  }

  function displayExpensesError(error: string) {
    expensesList.innerHTML = `<div class="empty-state">Error loading expenses</div>`;
    expensesList.style.display = 'block';
    expensesStatus.textContent = error;
    expensesStatus.className = 'expenses-status error';
  }

  async function showExpenseDetailsView(expenseId: string) {
    try {
      // Fetch detailed expense data
      const response = await new Promise<ExpenseResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'fetchExpense',
            selectedTxn: { id: expenseId },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        logger.debug('Fetch expense details response:', response);
        logger.debug('Response data structure:', response.data);
        logger.debug('Expense detail data:', response.data?.data);

        // Use consistent data structure - both APIs now return data in response.data.data
        const expenseDetail = response.data?.data;

        if (expenseDetail) {
          displayExpenseDetail(expenseDetail);
          showDetailView();
        } else {
          expensesStatus.textContent = 'No expense details found in response';
          expensesStatus.className = 'expenses-status error';
        }
      } else {
        expensesStatus.textContent = 'Failed to load expense details';
        expensesStatus.className = 'expenses-status error';
      }
    } catch (error) {
      logger.error('Error fetching expense details:', error);
      expensesStatus.textContent = 'Error loading expense details';
      expensesStatus.className = 'expenses-status error';
    }
  }

  function displayExpenseDetail(expense: ExpenseData) {
    logger.debug('Displaying expense detail:', expense);

    // Handle different API response structures
    // Single expense API uses different field names than list API
    const status = expense.status || 'unknown';
    const amount = expense.accountAmount ?? 0;
    const currency = expense.accountCurrency || 'USD';
    const formattedAmount = `${currency} ${amount.toFixed(2)}`;
    const date = expense.authorizationDate || expense.instant || expense.dateCreated || '';
    const formattedDate = new Date(date).toLocaleDateString();
    const merchantName = expense.prettyMerchantName || expense.merchant?.name || 'Unknown Merchant';
    const policy = expense.policyName || 'Other';
    const submittedDate = expense.dateSubmitted
      ? new Date(expense.dateSubmitted).toLocaleDateString()
      : 'N/A';
    const approvedDate = expense.dateApproved
      ? new Date(expense.dateApproved).toLocaleDateString()
      : 'N/A';

    expenseDetailContent.innerHTML = `
      <div class="detail-field">
        <div class="detail-label">Merchant:</div>
        <div class="detail-value highlight">${merchantName}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Amount:</div>
        <div class="detail-value highlight">${formattedAmount}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Date:</div>
        <div class="detail-value">${formattedDate}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Status:</div>
        <div class="detail-value"><span class="expense-status ${status.toLowerCase()}">${status.toUpperCase()}</span></div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Policy:</div>
        <div class="detail-value">${policy}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Submitted:</div>
        <div class="detail-value">${submittedDate}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Approved:</div>
        <div class="detail-value">${approvedDate}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Expense ID:</div>
        <div class="detail-value" style="font-family: monospace; font-size: 12px;">${expense.uuid || 'N/A'}</div>
      </div>
    `;

    // Store the expense data for duplication
    duplicateExpenseButton.setAttribute('data-expense-data', JSON.stringify(expense));

    // Also store the expense ID for reference
    duplicateExpenseButton.setAttribute('data-expense-id', expense.uuid || 'unknown');
  }

  function showDetailView() {
    expensesList.parentElement!.style.display = 'none';
    expenseDetail.style.display = 'block';

    // Scroll the expense detail into view for better user experience
    expenseDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showListView() {
    expenseDetail.style.display = 'none';
    expensesList.parentElement!.style.display = 'block';
  }

  async function fetchExpenses() {
    try {
      setLoadingState(true);

      // Send message to background script to fetch expenses
      const response = await new Promise<ExpenseListResponse>((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getSampledExpenses' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });

      if (response.success) {
        // Log the full response for debugging
        logger.debug('Fetch expenses response:', response);
        logger.debug('Response data structure:', response.data);

        // Extract expenses from the nested API response structure
        let expenseData: ExpenseData[] = [];

        if (
          response.data?.data &&
          Array.isArray(response.data.data) &&
          response.data.data.length > 0
        ) {
          // Handle paginated response structure: data.data[0]._embedded.transactions
          const paginatedResponse = response.data.data[0];
          if (paginatedResponse?._embedded?.transactions) {
            expenseData = paginatedResponse._embedded.transactions;
            logger.debug('Extracted expenses from _embedded.transactions:', expenseData);
          }
        }

        displayExpenses(expenseData);
      } else {
        logger.error('Fetch expenses failed:', response);
        displayExpensesError(response.error || 'Failed to fetch expenses');
      }
    } catch (error) {
      logger.error('Error fetching expenses:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch expenses';
      displayExpensesError(errorMessage);
    } finally {
      setLoadingState(false);
    }
  }

  // Template management functions
  function setTemplatesLoadingState(isLoading: boolean) {
    const templatesStatus = document.getElementById('templatesStatus') as HTMLDivElement;

    if (isLoading) {
      templatesStatus.textContent = 'Loading templates...';
      templatesStatus.className = 'templates-status';
    }
  }

  function displayTemplates(templates: ExpenseTemplate[]) {
    currentTemplates = templates;

    const templatesStatus = document.getElementById('templatesStatus') as HTMLDivElement;
    const templateList = document.getElementById('templateList') as HTMLDivElement;
    const templateListContent = document.getElementById('templateListContent') as HTMLDivElement;

    if (!templates || templates.length === 0) {
      templateListContent.innerHTML =
        '<div class="template-empty"><h4>No Templates Yet</h4><p>Create templates from your expenses to reuse them later.</p></div>';
      templateList.style.display = 'block';
      templatesStatus.textContent =
        'No templates found. Create your first template from an expense.';
      templatesStatus.className = 'templates-status';
      return;
    }

    try {
      const templatesHtml = templates
        .map((template) => {
          const lastUsed = template.metadata?.lastUsed
            ? new Date(template.metadata.lastUsed).toLocaleDateString()
            : 'Never used';
          const manualCount = template.metadata?.useCount || 0;
          const scheduledCount = template.metadata?.scheduledUseCount || 0;
          const useCount = manualCount + scheduledCount;
          const amount = template.expenseData?.merchantAmount || 0;
          const currency = template.expenseData?.merchantCurrency || 'USD';
          const merchantName = template.expenseData?.merchant?.name || 'Unknown Merchant';

          // Determine scheduling status
          let schedulingIndicator = '';
          if (template.scheduling?.enabled) {
            if (template.scheduling.paused) {
              schedulingIndicator = `
              <div class="scheduling-info">
                <span class="scheduling-indicator paused">
                  <span class="icon-clock"></span>
                  Paused
                </span>
              </div>
            `;
            } else if (template.scheduling.nextExecution) {
              const nextDate = new Date(template.scheduling.nextExecution);
              schedulingIndicator = `
              <div class="scheduling-info">
                <span class="scheduling-indicator active">
                  <span class="icon-clock"></span>
                  Next: ${nextDate.toLocaleDateString()}
                </span>
              </div>
            `;
            } else {
              schedulingIndicator = `
              <div class="scheduling-info">
                <span class="scheduling-indicator active">
                  <span class="icon-clock"></span>
                  Scheduled
                </span>
              </div>
            `;
            }
          } else {
            schedulingIndicator = `
            <div class="scheduling-info">
              <span class="scheduling-indicator inactive">
                <span class="icon-clock-outline"></span>
                No schedule
              </span>
            </div>
          `;
          }

          // Determine last execution status
          let executionStatus = 'none';
          let executionStatusText = 'No recent activity';
          if (template.executionHistory && template.executionHistory.length > 0) {
            const lastExecution = template.executionHistory[0];
            executionStatus = lastExecution.status;
            const executedDate = new Date(lastExecution.executedAt).toLocaleDateString();
            switch (lastExecution.status) {
              case 'success':
                executionStatusText = `Last success: ${executedDate}`;
                break;
              case 'failed':
                executionStatusText = `Last failed: ${executedDate}`;
                break;
              case 'pending':
                executionStatusText = 'Execution pending';
                break;
              default:
                executionStatusText = `Last: ${executedDate}`;
            }
          }

          return `
          <div class="template-item" data-template-id="${template.id}">
            <div class="template-header">
              <div class="template-name">${template.name}</div>
              <div class="template-actions">
                <button class="btn-icon edit-btn" aria-label="Edit template" data-template-id="${template.id}">
                  ✏️
                </button>
                <button class="btn-icon delete-btn" aria-label="Delete template" data-template-id="${template.id}">
                  🗑️
                </button>
              </div>
            </div>
            
            <div class="template-details">
              <div class="template-merchant">${merchantName}</div>
              <div class="template-amount">${currency} ${amount.toFixed(2)}</div>
              <div class="template-meta">
                <span class="last-used">Last used: ${lastUsed}</span>
                <span class="use-count" title="Includes manual and scheduled uses">Used ${useCount} times</span>
              </div>
              ${schedulingIndicator}
            </div>
            
            <div class="template-footer">
              <button class="btn btn-primary apply-template" data-template-id="${template.id}">Apply Template</button>
              <div class="execution-status ${executionStatus}">
                <span class="status-indicator"></span>
                ${executionStatusText}
              </div>
            </div>
          </div>
        `;
        })
        .join('');

      templateListContent.innerHTML = templatesHtml;
      templateList.style.display = 'block';
      templatesStatus.textContent = `${templates.length} template${templates.length === 1 ? '' : 's'} found`;
      templatesStatus.className = 'templates-status success';

      // Add click event listeners to template items
      const templateItems = templateListContent.querySelectorAll('.template-item');
      templateItems.forEach((item) => {
        const templateId = item.getAttribute('data-template-id');
        if (templateId) {
          item.addEventListener('click', (e) => {
            // Only show details if not clicking on action buttons
            if (
              !(e.target as HTMLElement).closest('.template-actions') &&
              !(e.target as HTMLElement).closest('.template-footer')
            ) {
              void enhancedShowTemplateDetail(templateId);
            }
          });
        }
      });

      // Add event listeners to action buttons
      const editButtons = templateListContent.querySelectorAll('.edit-btn');
      editButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const templateId = button.getAttribute('data-template-id');
          if (templateId) {
            void enhancedShowTemplateEditForm(templateId);
          }
        });
      });

      const deleteButtons = templateListContent.querySelectorAll('.delete-btn');
      deleteButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const templateId = button.getAttribute('data-template-id');
          if (templateId) {
            void deleteTemplate(templateId);
          }
        });
      });

      const applyButtons = templateListContent.querySelectorAll('.apply-template');
      applyButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const templateId = button.getAttribute('data-template-id');
          if (templateId) {
            void applyTemplate(templateId);
          }
        });
      });
    } catch (error) {
      logger.error('Error in displayTemplates:', error);
      displayTemplatesError(`Failed to display templates: ${(error as Error).message}`);
    }
  }

  function displayTemplatesError(error: string) {
    const templateList = document.getElementById('templateList') as HTMLDivElement;
    const templateListContent = document.getElementById('templateListContent') as HTMLDivElement;
    const templatesStatus = document.getElementById('templatesStatus') as HTMLDivElement;

    templateListContent.innerHTML =
      '<div class="template-empty"><h4>Error Loading Templates</h4><p>Please try again later.</p></div>';
    templateList.style.display = 'block';
    templatesStatus.textContent = error;
    templatesStatus.className = 'templates-status error';
  }

  async function loadTemplates() {
    try {
      setTemplatesLoadingState(true);

      const response = await new Promise<TemplateListResponse>((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getTemplates' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });

      if (response.success) {
        displayTemplates(response.data || []);
      } else {
        displayTemplatesError(response.error || 'Failed to load templates');
      }
    } catch (error) {
      logger.error('Error loading templates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load templates';
      displayTemplatesError(errorMessage);
    } finally {
      setTemplatesLoadingState(false);
    }
  }

  function showTemplateDetail(templateId: string) {
    const template = currentTemplates.find((t) => t.id === templateId);
    if (!template) return;

    selectedTemplate = template;

    const templateList = document.getElementById('templateList') as HTMLDivElement;
    const templateDetail = document.getElementById('templateDetail') as HTMLDivElement;
    const templateDetailTitle = document.getElementById(
      'templateDetailTitle'
    ) as HTMLHeadingElement;
    const templateDetailContent = document.getElementById(
      'templateDetailContent'
    ) as HTMLDivElement;

    templateList.style.display = 'none';
    templateDetail.style.display = 'block';
    templateDetailTitle.textContent = template.name;

    const createdDate = new Date(template.createdAt).toLocaleDateString();
    const updatedDate = new Date(template.updatedAt).toLocaleDateString();
    const lastUsed = template.metadata?.lastUsed
      ? new Date(template.metadata.lastUsed).toLocaleDateString()
      : 'Never';
    const manualCount = template.metadata?.useCount || 0;
    const scheduledCount = template.metadata?.scheduledUseCount || 0;
    const useCount = manualCount + scheduledCount;
    const amount = template.expenseData?.merchantAmount || 0;
    const currency = template.expenseData?.merchantCurrency || 'USD';
    const merchantName = template.expenseData?.merchant?.name || 'Unknown Merchant';
    const description = template.expenseData?.details?.description || 'No description';

    // Add scheduling information
    let schedulingInfo = '';
    if (template.scheduling?.enabled) {
      const intervalText =
        template.scheduling.interval.charAt(0).toUpperCase() +
        template.scheduling.interval.slice(1);
      const statusText = template.scheduling.paused ? 'Paused' : 'Active';
      const nextExecutionText = template.scheduling.nextExecution
        ? new Date(template.scheduling.nextExecution).toLocaleString()
        : 'Not calculated';

      schedulingInfo = `
        <div class="detail-field">
          <div class="detail-label">Scheduling:</div>
          <div class="detail-value">${statusText} - ${intervalText}</div>
        </div>
        <div class="detail-field">
          <div class="detail-label">Next Execution:</div>
          <div class="detail-value">${nextExecutionText}</div>
        </div>
      `;
    } else {
      schedulingInfo = `
        <div class="detail-field">
          <div class="detail-label">Scheduling:</div>
          <div class="detail-value">Not scheduled</div>
        </div>
      `;
    }

    templateDetailContent.innerHTML = `
      <div class="detail-field">
        <div class="detail-label">Template Name:</div>
        <div class="detail-value highlight">${template.name}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Merchant:</div>
        <div class="detail-value highlight">${merchantName}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Amount:</div>
        <div class="detail-value highlight">${currency} ${amount.toFixed(2)}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Description:</div>
        <div class="detail-value">${description}</div>
      </div>
      ${schedulingInfo}
      <div class="detail-field">
        <div class="detail-label">Total Usage:</div>
        <div class="detail-value" title="Manual: ${manualCount}, Scheduled: ${scheduledCount}">${useCount} times</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Last Used:</div>
        <div class="detail-value">${lastUsed}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Created:</div>
        <div class="detail-value">${createdDate}</div>
      </div>
      <div class="detail-field">
        <div class="detail-label">Updated:</div>
        <div class="detail-value">${updatedDate}</div>
      </div>
    `;
  }

  function showTemplateEditForm(templateId: string) {
    const template = currentTemplates.find((t) => t.id === templateId);
    if (!template) return;

    selectedTemplate = template;
    showTemplateDetail(templateId);

    const templateDetailContent = document.getElementById(
      'templateDetailContent'
    ) as HTMLDivElement;
    const templateEditForm = document.getElementById('templateEditForm') as HTMLDivElement;
    const toggleEditButton = document.getElementById('toggleTemplateEdit') as HTMLButtonElement;

    // Populate form with template data
    const templateNameInput = document.getElementById('templateName') as HTMLInputElement;
    const templateMerchantInput = document.getElementById('templateMerchant') as HTMLInputElement;
    const templateAmountInput = document.getElementById('templateAmount') as HTMLInputElement;
    const templateCurrencySelect = document.getElementById('templateCurrency') as HTMLSelectElement;
    const templateDescriptionTextarea = document.getElementById(
      'templateDescription'
    ) as HTMLTextAreaElement;

    templateNameInput.value = template.name;
    templateMerchantInput.value = template.expenseData?.merchant?.name || '';
    templateAmountInput.value = (template.expenseData?.merchantAmount || 0).toString();
    templateCurrencySelect.value = template.expenseData?.merchantCurrency || 'USD';
    templateDescriptionTextarea.value = template.expenseData?.details?.description || '';

    // Show edit form
    templateDetailContent.style.display = 'none';
    templateEditForm.style.display = 'block';
    toggleEditButton.textContent = 'Cancel';
  }

  async function _saveTemplate() {
    if (!selectedTemplate) return;
    const currentTemplate = selectedTemplate; // Capture the value for TypeScript

    const templateNameInput = document.getElementById('templateName') as HTMLInputElement;
    const templateMerchantInput = document.getElementById('templateMerchant') as HTMLInputElement;
    const templateAmountInput = document.getElementById('templateAmount') as HTMLInputElement;
    const templateCurrencySelect = document.getElementById('templateCurrency') as HTMLSelectElement;
    const templateDescriptionTextarea = document.getElementById(
      'templateDescription'
    ) as HTMLTextAreaElement;

    // Validate form
    const errors: Record<string, string> = {};

    if (!templateNameInput.value.trim()) {
      errors.templateName = 'Template name is required';
    }

    if (!templateMerchantInput.value.trim()) {
      errors.templateMerchant = 'Merchant name is required';
    }

    const amount = parseFloat(templateAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      errors.templateAmount = 'Valid amount is required';
    }

    if (Object.keys(errors).length > 0) {
      showFormErrors(errors);
      return;
    }

    // Clear any previous errors
    clearFormErrors();

    try {
      const saveButton = document.getElementById('saveTemplate') as HTMLButtonElement;
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';

      const updatedTemplate = {
        ...selectedTemplate,
        name: templateNameInput.value.trim(),
        expenseData: {
          ...selectedTemplate.expenseData,
          merchant: {
            ...selectedTemplate.expenseData.merchant,
            name: templateMerchantInput.value.trim(),
          },
          merchantAmount: amount,
          merchantCurrency: templateCurrencySelect.value,
          details: {
            ...selectedTemplate.expenseData.details,
            description: templateDescriptionTextarea.value.trim(),
          },
        },
      };

      const response = await new Promise<TemplateResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'updateTemplate',
            templateId: currentTemplate.id,
            templateData: updatedTemplate,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        // Update local template data
        const templateIndex = currentTemplates.findIndex((t) => t.id === currentTemplate.id);
        if (templateIndex !== -1 && response.data) {
          currentTemplates[templateIndex] = response.data;
        }

        // Show success and return to detail view
        showTemplatesSuccess('Template updated successfully');
        cancelTemplateEdit();
        showTemplateDetail(currentTemplate.id);

        // Refresh template list
        void loadTemplates();
      } else {
        throw new Error(response.error || 'Failed to update template');
      }
    } catch (error) {
      logger.error('Error saving template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showTemplatesError(`Failed to save template: ${errorMessage}`);
    } finally {
      const saveButton = document.getElementById('saveTemplate') as HTMLButtonElement;
      saveButton.disabled = false;
      saveButton.textContent = 'Save Changes';
    }
  }

  function cancelTemplateEdit() {
    const templateDetailContent = document.getElementById(
      'templateDetailContent'
    ) as HTMLDivElement;
    const templateEditForm = document.getElementById('templateEditForm') as HTMLDivElement;
    const toggleEditButton = document.getElementById('toggleTemplateEdit') as HTMLButtonElement;

    templateEditForm.style.display = 'none';
    templateDetailContent.style.display = 'block';
    toggleEditButton.textContent = 'Edit';

    clearFormErrors();
  }

  async function deleteTemplate(templateId: string) {
    const template = currentTemplates.find((t) => t.id === templateId);
    if (!template) return;

    if (
      !confirm(
        `Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await new Promise<ChromeResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'deleteTemplate',
            templateId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        showTemplatesSuccess('Template deleted successfully');
        // Return to template list view
        showTemplateListView();
        // Refresh templates
        void loadTemplates();
      } else {
        throw new Error(response.error || 'Failed to delete template');
      }
    } catch (error) {
      logger.error('Error deleting template:', error);
      showTemplatesError(`Failed to delete template: ${(error as Error).message}`);
    }
  }

  async function applyTemplate(templateId: string) {
    const template = currentTemplates.find((t) => t.id === templateId);
    if (!template) return;

    try {
      const applyButton = document.querySelector(
        `[data-template-id="${templateId}"].apply-template`
      ) as HTMLButtonElement;
      if (applyButton) {
        applyButton.disabled = true;
        applyButton.textContent = 'Applying...';
      }

      // Transform template data to ExpenseCreatePayload structure
      const expenseData = {
        date: new Date().toISOString(),
        merchant: template.expenseData.merchant,
        merchantAmount: template.expenseData.merchantAmount,
        merchantCurrency: template.expenseData.merchantCurrency,
        policy: template.expenseData.policy,
        details: template.expenseData.details,
        reportingData: template.expenseData.reportingData,
      };

      const response = await new Promise<ChromeResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'createExpense',
            expenseData,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        showTemplatesSuccess('Expense created from template successfully!');

        // Update template usage statistics
        await new Promise<ChromeResponse>((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              action: 'updateTemplateUsage',
              templateId,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              resolve(response);
            }
          );
        });

        // Refresh templates to show updated usage count
        void loadTemplates();

        // Refresh expenses list if visible
        if (currentExpenses.length > 0) {
          void fetchExpenses();
        }
      } else {
        throw new Error(response.error || 'Failed to create expense from template');
      }
    } catch (error) {
      logger.error('Error applying template:', error);
      showTemplatesError(`Failed to create expense from template: ${(error as Error).message}`);
    } finally {
      const applyButton = document.querySelector(
        `[data-template-id="${templateId}"].apply-template`
      ) as HTMLButtonElement;
      if (applyButton) {
        applyButton.disabled = false;
        applyButton.textContent = 'Apply Template';
      }
    }
  }

  function showTemplateListView() {
    const templateList = document.getElementById('templateList') as HTMLDivElement;
    const templateDetail = document.getElementById('templateDetail') as HTMLDivElement;

    templateDetail.style.display = 'none';
    templateList.style.display = 'block';
    selectedTemplate = null;
  }

  function showFormErrors(errors: Record<string, string>) {
    Object.keys(errors).forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      const formGroup = field?.closest('.form-group');
      const errorElement = document.getElementById(`${fieldName}Error`);

      if (formGroup && errorElement) {
        formGroup.classList.add('has-error');
        errorElement.textContent = errors[fieldName];
      }
    });
  }

  function clearFormErrors() {
    const formGroups = document.querySelectorAll('.form-group.has-error');
    formGroups.forEach((group) => {
      group.classList.remove('has-error');
      const errorElement = group.querySelector('.error-message');
      if (errorElement) {
        errorElement.textContent = '';
      }
    });
  }

  function showTemplatesSuccess(message: string) {
    const templatesStatus = document.getElementById('templatesStatus') as HTMLDivElement;
    templatesStatus.textContent = message;
    templatesStatus.className = 'templates-status success';

    setTimeout(() => {
      if (currentTemplates.length > 0) {
        templatesStatus.textContent = `${currentTemplates.length} template${currentTemplates.length === 1 ? '' : 's'} found`;
      } else {
        templatesStatus.textContent = 'No templates found';
        templatesStatus.className = 'templates-status';
      }
    }, 3000);
  }

  function showTemplatesError(message: string) {
    const templatesStatus = document.getElementById('templatesStatus') as HTMLDivElement;
    templatesStatus.textContent = message;
    templatesStatus.className = 'templates-status error';
  }

  // Load templates on initialization
  void loadTemplates();

  async function duplicateExpense() {
    try {
      const expenseDataStr = duplicateExpenseButton.getAttribute('data-expense-data');
      if (!expenseDataStr) {
        throw new Error('No expense data available for duplication');
      }

      const originalExpense = JSON.parse(expenseDataStr);
      logger.debug('Duplicating expense:', originalExpense);

      // Create new expense payload with proper API structure
      const today = new Date();
      const newExpenseData = {
        date: today.toISOString(), // Full ISO string as per API example
        merchant: {
          category: originalExpense.merchant?.category || 'other',
          categoryGroup: originalExpense.merchant?.categoryGroup || 'OTHER',
          description: originalExpense.merchant?.description || '',
          formattedAddress: originalExpense.merchant?.formattedAddress || '',
          logo: originalExpense.merchant?.logo || undefined,
          name:
            originalExpense.merchant?.name ||
            originalExpense.prettyMerchantName ||
            'Unknown Merchant',
          online: originalExpense.merchant?.online || true,
          perDiem: originalExpense.merchant?.perDiem || false,
          timeZone: originalExpense.merchant?.timeZone || 'Z',
        },
        merchantAmount: originalExpense.merchantAmount || originalExpense.accountAmount || 0,
        merchantCurrency:
          originalExpense.merchantCurrency || originalExpense.accountCurrency || 'USD',
        policy: originalExpense.policy || 'OTHER',
        details: {
          customFieldValues: originalExpense.details?.customFieldValues || [],
          description: `Duplicate of ${originalExpense.prettyMerchantName || 'expense'}`,
          participants: originalExpense.details?.participants || [
            {
              email: originalExpense.user?.email || '',
              familyName: originalExpense.user?.familyName || '',
              fullName: originalExpense.user?.fullName || '',
              givenName: originalExpense.user?.givenName || '',
              guest: false,
              picture: null,
              pictureHash: null,
              uuid: originalExpense.user?.uuid || '',
            },
          ],
          personal: originalExpense.details?.personal || false,
          personalMerchantAmount: originalExpense.details?.personalMerchantAmount || null,
          taxDetails: {
            address: originalExpense.details?.taxDetails?.address || null,
            country: originalExpense.details?.taxDetails?.country || 'US',
            grossAmount: originalExpense.details?.taxDetails?.grossAmount || null,
            ledgerMerchantName: originalExpense.details?.taxDetails?.ledgerMerchantName || null,
            netAmount: originalExpense.details?.taxDetails?.netAmount || null,
            noTax: originalExpense.details?.taxDetails?.noTax || false,
            reverseCharge: originalExpense.details?.taxDetails?.reverseCharge || false,
            syncedFromLedger: originalExpense.details?.taxDetails?.syncedFromLedger || false,
            tax: originalExpense.details?.taxDetails?.tax || null,
            taxLines: originalExpense.details?.taxDetails?.taxLines || [],
            taxRateDecimal: originalExpense.details?.taxDetails?.taxRateDecimal || false,
            vatNumber: originalExpense.details?.taxDetails?.vatNumber || null,
          },
        },
        reportingData: {
          billTo: originalExpense.reportingData?.billTo || null,
          department: originalExpense.reportingData?.department || null,
          region: originalExpense.reportingData?.region || null,
          subsidiary: originalExpense.reportingData?.subsidiary || null,
        },
      };

      logger.debug('Creating new expense with data:', newExpenseData);

      // Disable button and show loading
      duplicateExpenseButton.disabled = true;
      duplicateExpenseButton.innerHTML = '<span class="loading-spinner"></span>Creating...';

      logger.debug('📤 Sidepanel: Sending createExpense message to background...');
      const response = await new Promise<ChromeResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'createExpense',
            expenseData: newExpenseData,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              logger.error('❌ Sidepanel: Chrome runtime error:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            logger.debug('📨 Sidepanel: Received response from background:', response);
            resolve(response);
          }
        );
      });

      if (response.success) {
        // Show success message
        expensesStatus.textContent = 'Expense duplicated successfully!';
        expensesStatus.className = 'expenses-status success';

        // Go back to list view and refresh expenses
        showListView();
        void fetchExpenses();
      } else {
        throw new Error(response.error || 'Failed to create duplicate expense');
      }
    } catch (error) {
      logger.error('Error duplicating expense:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      expensesStatus.textContent = `Failed to duplicate expense: ${errorMessage}`;
      expensesStatus.className = 'expenses-status error';
    } finally {
      // Reset button
      duplicateExpenseButton.disabled = false;
      duplicateExpenseButton.innerHTML = 'Duplicate Expense';
    }
  }

  // Expense button event handlers
  fetchExpensesButton.addEventListener('click', () => {
    void fetchExpenses().catch((error) => {
      logger.error('Error in fetch expenses button handler:', error);
    });
  });

  refreshExpensesButton.addEventListener('click', () => {
    void fetchExpenses().catch((error) => {
      logger.error('Error in refresh expenses button handler:', error);
    });
  });

  // Detail view event handlers
  backToListButton.addEventListener('click', () => {
    showListView();
  });

  duplicateExpenseButton.addEventListener('click', () => {
    void duplicateExpense().catch((error) => {
      logger.error('Error in duplicate expense button handler:', error);
    });
  });

  // Template event handlers
  const backToTemplatesButton = document.getElementById('backToTemplates') as HTMLButtonElement;
  const toggleTemplateEditButton = document.getElementById(
    'toggleTemplateEdit'
  ) as HTMLButtonElement;
  const saveTemplateButton = document.getElementById('saveTemplate') as HTMLButtonElement;
  const cancelTemplateEditButton = document.getElementById(
    'cancelTemplateEdit'
  ) as HTMLButtonElement;
  const applyTemplateButton = document.getElementById('applyTemplate') as HTMLButtonElement;
  const duplicateTemplateButton = document.getElementById('duplicateTemplate') as HTMLButtonElement;
  const deleteTemplateButton = document.getElementById('deleteTemplate') as HTMLButtonElement;

  backToTemplatesButton.addEventListener('click', () => {
    showTemplateListView();
  });

  toggleTemplateEditButton.addEventListener('click', () => {
    if (selectedTemplate) {
      const templateEditForm = document.getElementById('templateEditForm') as HTMLDivElement;
      if (templateEditForm.style.display === 'block') {
        cancelTemplateEdit();
      } else {
        enhancedShowTemplateEditForm(selectedTemplate.id);
      }
    }
  });

  saveTemplateButton.addEventListener('click', () => {
    void enhancedSaveTemplate().catch((error) => {
      logger.error('Error in save template button handler:', error);
    });
  });

  cancelTemplateEditButton.addEventListener('click', () => {
    cancelTemplateEdit();
  });

  applyTemplateButton.addEventListener('click', () => {
    if (selectedTemplate) {
      void applyTemplate(selectedTemplate.id).catch((error) => {
        logger.error('Error in apply template button handler:', error);
      });
    }
  });

  duplicateTemplateButton.addEventListener('click', () => {
    if (selectedTemplate) {
      const currentTemplate = selectedTemplate; // Capture the value for TypeScript
      void (async () => {
        try {
          // Create a copy of the template with a new name
          const newTemplateName = `${currentTemplate.name} (Copy)`;

          const response = await new Promise<TemplateResponse>((resolve, reject) => {
            chrome.runtime.sendMessage(
              {
                action: 'createTemplate',
                templateData: {
                  name: newTemplateName,
                  expenseData: currentTemplate.expenseData,
                },
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }
                resolve(response);
              }
            );
          });

          if (response.success) {
            showTemplatesSuccess('Template duplicated successfully');
            void loadTemplates();
          } else {
            throw new Error(response.error || 'Failed to duplicate template');
          }
        } catch (error) {
          logger.error('Error duplicating template:', error);
          showTemplatesError(`Failed to duplicate template: ${(error as Error).message}`);
        }
      })();
    }
  });

  deleteTemplateButton.addEventListener('click', () => {
    if (selectedTemplate) {
      void deleteTemplate(selectedTemplate.id).catch((error) => {
        logger.error('Error in delete template button handler:', error);
      });
    }
  });

  // Template creation dialog handlers
  const saveAsTemplateButton = document.getElementById('saveAsTemplate') as HTMLButtonElement;
  const templateCreationDialog = document.getElementById(
    'templateCreationDialog'
  ) as HTMLDivElement;
  const closeTemplateDialogButton = document.getElementById(
    'closeTemplateDialog'
  ) as HTMLButtonElement;
  const createTemplateButton = document.getElementById('createTemplate') as HTMLButtonElement;
  const cancelTemplateCreationButton = document.getElementById(
    'cancelTemplateCreation'
  ) as HTMLButtonElement;

  saveAsTemplateButton.addEventListener('click', () => {
    const expenseDataStr = duplicateExpenseButton.getAttribute('data-expense-data');
    if (expenseDataStr) {
      const expenseData = JSON.parse(expenseDataStr);
      showTemplateCreationDialog(expenseData);
    }
  });

  closeTemplateDialogButton.addEventListener('click', () => {
    hideTemplateCreationDialog();
  });

  cancelTemplateCreationButton.addEventListener('click', () => {
    hideTemplateCreationDialog();
  });

  createTemplateButton.addEventListener('click', () => {
    void createTemplateFromExpense().catch((error) => {
      logger.error('Error in create template button handler:', error);
    });
  });

  // Dialog overlay click to close
  templateCreationDialog.addEventListener('click', (e) => {
    if (
      e.target === templateCreationDialog ||
      (e.target as HTMLElement).classList.contains('dialog-overlay')
    ) {
      hideTemplateCreationDialog();
    }
  });

  function showTemplateCreationDialog(expenseData: ExpenseData) {
    const templatePreview = document.getElementById('templatePreview') as HTMLDivElement;
    const newTemplateNameInput = document.getElementById('newTemplateName') as HTMLInputElement;

    // Clear previous data
    newTemplateNameInput.value = '';
    clearFormErrors();

    // Populate preview
    const merchantName =
      expenseData.prettyMerchantName || expenseData.merchant?.name || 'Unknown Merchant';
    const amount = expenseData.merchantAmount || expenseData.accountAmount || 0;
    const currency = expenseData.merchantCurrency || expenseData.accountCurrency || 'USD';
    const description = expenseData.details?.description || 'No description';

    templatePreview.innerHTML = `
      <h4>Template Preview</h4>
      <div class="preview-field">
        <strong>Merchant:</strong> ${merchantName}
      </div>
      <div class="preview-field">
        <strong>Amount:</strong> ${currency} ${amount.toFixed(2)}
      </div>
      <div class="preview-field">
        <strong>Description:</strong> ${description}
      </div>
      <div class="preview-field">
        <strong>Policy:</strong> ${expenseData.policy || 'OTHER'}
      </div>
    `;

    // Store expense data for template creation
    templateCreationDialog.setAttribute('data-expense-data', JSON.stringify(expenseData));

    // Show dialog
    templateCreationDialog.style.display = 'block';
    newTemplateNameInput.focus();
  }

  function hideTemplateCreationDialog() {
    templateCreationDialog.style.display = 'none';
    clearFormErrors();
  }

  async function createTemplateFromExpense() {
    const newTemplateNameInput = document.getElementById('newTemplateName') as HTMLInputElement;
    const expenseDataStr = templateCreationDialog.getAttribute('data-expense-data');

    if (!expenseDataStr) {
      showTemplatesError('No expense data available for template creation');
      return;
    }

    const templateName = newTemplateNameInput.value.trim();
    if (!templateName) {
      showFormErrors({ newTemplateName: 'Template name is required' });
      return;
    }

    try {
      createTemplateButton.disabled = true;
      createTemplateButton.textContent = 'Creating...';

      const expenseData = JSON.parse(expenseDataStr);

      const response = await new Promise<TemplateResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'createTemplate',
            templateData: {
              name: templateName,
              expenseData,
            },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        hideTemplateCreationDialog();
        showTemplatesSuccess('Template created successfully!');
        void loadTemplates();
      } else {
        throw new Error(response.error || 'Failed to create template');
      }
    } catch (error) {
      logger.error('Error creating template:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('maximum')) {
        showFormErrors({
          newTemplateName: 'Maximum 5 templates allowed. Please delete an existing template first.',
        });
      } else {
        showTemplatesError(`Failed to create template: ${(error as Error).message}`);
      }
    } finally {
      createTemplateButton.disabled = false;
      createTemplateButton.textContent = 'Create Template';
    }
  }

  // Scheduling Configuration Functions
  function initializeSchedulingEventHandlers() {
    const enableSchedulingCheckbox = document.getElementById(
      'enableScheduling'
    ) as HTMLInputElement;
    const schedulingConfig = document.getElementById('schedulingConfig') as HTMLDivElement;
    const frequencyRadios = document.querySelectorAll(
      'input[name="frequency"]'
    ) as NodeListOf<HTMLInputElement>;
    const weeklySettings = document.querySelector('.weekly-settings') as HTMLDivElement;
    const monthlySettings = document.querySelector('.monthly-settings') as HTMLDivElement;
    const customSettings = document.querySelector('.custom-settings') as HTMLDivElement;
    const hourSelect = document.getElementById('hour') as HTMLSelectElement;
    const minuteSelect = document.getElementById('minute') as HTMLSelectElement;
    const ampmSelect = document.getElementById('ampm') as HTMLSelectElement;
    const dayOfMonthSelect = document.getElementById('dayOfMonth') as HTMLSelectElement;
    const customIntervalInput = document.getElementById('customInterval') as HTMLInputElement;
    const pauseScheduleButton = document.getElementById('pauseSchedule') as HTMLButtonElement;
    const resumeScheduleButton = document.getElementById('resumeSchedule') as HTMLButtonElement;

    enableSchedulingCheckbox.addEventListener('change', (e) => {
      const isEnabled = (e.target as HTMLInputElement).checked;
      schedulingConfig.style.display = isEnabled ? 'block' : 'none';
      updateNextExecutionPreview();
      updatePauseResumeButtons();
    });

    frequencyRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const frequency = (e.target as HTMLInputElement).value;

        // Hide all frequency-specific settings
        weeklySettings.style.display = 'none';
        monthlySettings.style.display = 'none';
        customSettings.style.display = 'none';

        // Show relevant settings based on frequency
        switch (frequency) {
          case 'weekly':
            weeklySettings.style.display = 'block';
            break;
          case 'monthly':
            monthlySettings.style.display = 'block';
            break;
          case 'custom':
            customSettings.style.display = 'block';
            break;
        }

        // Update time label based on frequency
        const timeLabel = document.getElementById('timeSettingsLabel') as HTMLLabelElement;
        if (frequency === 'custom') {
          timeLabel.textContent = 'Start Time (first execution)';
        } else {
          timeLabel.textContent = 'Execution Time';
        }

        updateNextExecutionPreview();
      });
    });

    // Time change handlers
    [hourSelect, minuteSelect, ampmSelect].forEach((select) => {
      select.addEventListener('change', updateNextExecutionPreview);
    });

    // Day/interval change handlers
    dayOfMonthSelect.addEventListener('change', updateNextExecutionPreview);
    customIntervalInput.addEventListener('input', updateNextExecutionPreview);

    // Interval unit change handler
    const intervalUnitSelect = document.getElementById('intervalUnit') as HTMLSelectElement;
    const intervalHelpText = document.getElementById('intervalHelpText') as HTMLElement;

    function updateIntervalValidation() {
      const unit = intervalUnitSelect.value;
      const currentValue = parseInt(customIntervalInput.value) || 0;

      if (unit === 'hours') {
        customIntervalInput.min = '1';
        customIntervalInput.max = '8760'; // 1 year in hours
        intervalHelpText.textContent = 'Enter interval between executions (minimum 1 hour)';

        // Convert minutes to hours if switching from minutes and current value represents minutes
        if (currentValue >= 60 && currentValue % 60 === 0) {
          customIntervalInput.value = (currentValue / 60).toString();
        } else if (currentValue < 1) {
          customIntervalInput.value = '1';
        }
      } else {
        customIntervalInput.min = '5';
        customIntervalInput.max = '525600'; // 1 year in minutes
        intervalHelpText.textContent = 'Enter interval between executions (minimum 5 minutes)';

        // Convert hours to minutes if switching from hours
        if (currentValue >= 1 && currentValue <= 8760) {
          const minutes = currentValue * 60;
          if (minutes >= 5) {
            customIntervalInput.value = minutes.toString();
          }
        } else if (currentValue < 5) {
          customIntervalInput.value = '5';
        }
      }

      updateNextExecutionPreview();
    }

    intervalUnitSelect.addEventListener('change', updateIntervalValidation);

    // Day of week checkbox handlers
    const dayCheckboxes = document.querySelectorAll(
      '.day-checkboxes input[type="checkbox"]'
    ) as NodeListOf<HTMLInputElement>;
    dayCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', updateNextExecutionPreview);
    });

    // Pause/Resume handlers
    pauseScheduleButton.addEventListener('click', () => {
      if (selectedTemplate) {
        void pauseTemplateScheduling(selectedTemplate.id);
      }
    });

    resumeScheduleButton.addEventListener('click', () => {
      if (selectedTemplate) {
        void resumeTemplateScheduling(selectedTemplate.id);
      }
    });
  }

  function updateNextExecutionPreview() {
    const enableSchedulingCheckbox = document.getElementById(
      'enableScheduling'
    ) as HTMLInputElement;
    const nextExecutionPreview = document.getElementById('nextExecutionPreview') as HTMLSpanElement;

    if (!enableSchedulingCheckbox.checked) {
      nextExecutionPreview.textContent = '-';
      return;
    }

    const schedulingData = getCurrentSchedulingConfiguration();
    if (!schedulingData) {
      nextExecutionPreview.textContent = 'Invalid configuration';
      return;
    }

    const nextExecution = calculateNextExecution(schedulingData);
    if (nextExecution) {
      const date = new Date(nextExecution);
      nextExecutionPreview.textContent = date.toLocaleString();
    } else {
      nextExecutionPreview.textContent = 'Unable to calculate';
    }
  }

  function getCurrentSchedulingConfiguration() {
    const enableSchedulingCheckbox = document.getElementById(
      'enableScheduling'
    ) as HTMLInputElement;
    if (!enableSchedulingCheckbox.checked) return null;

    const frequencyRadios = document.querySelectorAll(
      'input[name="frequency"]:checked'
    ) as NodeListOf<HTMLInputElement>;
    if (frequencyRadios.length === 0) return null;

    const frequency = frequencyRadios[0].value as 'daily' | 'weekly' | 'monthly' | 'custom';
    const hourSelect = document.getElementById('hour') as HTMLSelectElement;
    const minuteSelect = document.getElementById('minute') as HTMLSelectElement;
    const ampmSelect = document.getElementById('ampm') as HTMLSelectElement;

    let hour = parseInt(hourSelect.value);
    if (ampmSelect.value === 'PM' && hour !== 12) {
      hour += 12;
    } else if (ampmSelect.value === 'AM' && hour === 12) {
      hour = 0;
    }

    const scheduling: Partial<TemplateScheduling> & { enabled: boolean } = {
      enabled: true,
      interval: frequency,
      startDate: Date.now(),
      executionTime: {
        hour,
        minute: parseInt(minuteSelect.value),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      intervalConfig: {},
      paused: false,
    };

    switch (frequency) {
      case 'weekly':
        const dayCheckboxes = document.querySelectorAll(
          '.day-checkboxes input[type="checkbox"]:checked'
        ) as NodeListOf<HTMLInputElement>;
        if (scheduling.intervalConfig) {
          scheduling.intervalConfig.daysOfWeek = Array.from(dayCheckboxes).map(
            (cb) => cb.value as DayOfWeek
          );
        }
        break;
      case 'monthly':
        const dayOfMonthSelect = document.getElementById('dayOfMonth') as HTMLSelectElement;
        const dayValue = dayOfMonthSelect.value;
        if (scheduling.intervalConfig) {
          scheduling.intervalConfig.dayOfMonth = dayValue === 'last' ? 'last' : parseInt(dayValue);
        }
        break;
      case 'custom':
        const customIntervalInput = document.getElementById('customInterval') as HTMLInputElement;
        const intervalUnitSelect = document.getElementById('intervalUnit') as HTMLSelectElement;
        const intervalValue = parseInt(customIntervalInput.value);
        const intervalUnit = intervalUnitSelect.value;

        // Convert to milliseconds based on unit
        let intervalMs: number;
        if (intervalUnit === 'hours') {
          intervalMs = intervalValue * 60 * 60 * 1000; // hours to ms
        } else {
          intervalMs = intervalValue * 60 * 1000; // minutes to ms
        }

        if (scheduling.intervalConfig) {
          scheduling.intervalConfig.customIntervalMs = intervalMs;
        }
        break;
    }

    return scheduling;
  }

  function calculateNextExecution(scheduling: Partial<TemplateScheduling>): number | null {
    if (!scheduling.executionTime) {
      return null;
    }
    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(scheduling.executionTime.hour, scheduling.executionTime.minute, 0, 0);

    switch (scheduling.interval) {
      case 'daily':
        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }
        return targetTime.getTime();

      case 'weekly':
        if (
          !scheduling.intervalConfig?.daysOfWeek ||
          scheduling.intervalConfig.daysOfWeek.length === 0
        ) {
          return null;
        }

        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const currentDay = now.getDay();
        const targetDays = scheduling.intervalConfig?.daysOfWeek?.map((day: string) =>
          dayNames.indexOf(day)
        );

        let nextDay = targetDays.find(
          (day: number) => day > currentDay || (day === currentDay && targetTime > now)
        );
        if (nextDay === undefined) {
          nextDay = Math.min(...targetDays);
          targetTime.setDate(targetTime.getDate() + 7 - currentDay + nextDay);
        } else if (nextDay === currentDay) {
          // Same day, time hasn't passed yet
        } else {
          targetTime.setDate(targetTime.getDate() + nextDay - currentDay);
        }

        return targetTime.getTime();

      case 'monthly':
        const dayOfMonth = scheduling.intervalConfig?.dayOfMonth;
        if (dayOfMonth === 'last') {
          const lastDay = new Date(
            targetTime.getFullYear(),
            targetTime.getMonth() + 1,
            0
          ).getDate();
          targetTime.setDate(lastDay);
        } else if (typeof dayOfMonth === 'number') {
          targetTime.setDate(dayOfMonth);
        }

        if (targetTime <= now) {
          // Move to next month
          targetTime.setMonth(targetTime.getMonth() + 1);
          if (dayOfMonth === 'last') {
            const lastDay = new Date(
              targetTime.getFullYear(),
              targetTime.getMonth() + 1,
              0
            ).getDate();
            targetTime.setDate(lastDay);
          }
        }

        return targetTime.getTime();

      case 'custom':
        const intervalMs = scheduling.intervalConfig?.customIntervalMs;
        if (!intervalMs) return null;

        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + Math.ceil(intervalMs / (24 * 60 * 60 * 1000)));
        }

        return targetTime.getTime();

      default:
        return null;
    }
  }

  function populateSchedulingForm(template: ExpenseTemplate) {
    const scheduling = template.scheduling;
    const enableSchedulingCheckbox = document.getElementById(
      'enableScheduling'
    ) as HTMLInputElement;
    const schedulingConfig = document.getElementById('schedulingConfig') as HTMLDivElement;

    if (!scheduling || !scheduling.enabled) {
      enableSchedulingCheckbox.checked = false;
      schedulingConfig.style.display = 'none';
      return;
    }

    enableSchedulingCheckbox.checked = true;
    schedulingConfig.style.display = 'block';

    // Set frequency
    const frequencyRadio = document.querySelector(
      `input[name="frequency"][value="${scheduling.interval}"]`
    ) as HTMLInputElement;
    if (frequencyRadio) {
      frequencyRadio.checked = true;

      // Show appropriate settings
      const weeklySettings = document.querySelector('.weekly-settings') as HTMLDivElement;
      const monthlySettings = document.querySelector('.monthly-settings') as HTMLDivElement;
      const customSettings = document.querySelector('.custom-settings') as HTMLDivElement;

      weeklySettings.style.display = scheduling.interval === 'weekly' ? 'block' : 'none';
      monthlySettings.style.display = scheduling.interval === 'monthly' ? 'block' : 'none';
      customSettings.style.display = scheduling.interval === 'custom' ? 'block' : 'none';

      // Update time label based on interval
      const timeLabel = document.getElementById('timeSettingsLabel') as HTMLLabelElement;
      if (scheduling.interval === 'custom') {
        timeLabel.textContent = 'Start Time (first execution)';
      } else {
        timeLabel.textContent = 'Execution Time';
      }
    }

    // Set execution time
    if (scheduling.executionTime) {
      let hour = scheduling.executionTime.hour;
      let ampm = 'AM';

      if (hour === 0) {
        hour = 12;
      } else if (hour === 12) {
        ampm = 'PM';
      } else if (hour > 12) {
        hour -= 12;
        ampm = 'PM';
      }

      const hourSelect = document.getElementById('hour') as HTMLSelectElement;
      const minuteSelect = document.getElementById('minute') as HTMLSelectElement;
      const ampmSelect = document.getElementById('ampm') as HTMLSelectElement;

      hourSelect.value = hour.toString();
      minuteSelect.value = scheduling.executionTime.minute.toString();
      ampmSelect.value = ampm;
    }

    // Set interval-specific configuration
    if (scheduling.intervalConfig) {
      switch (scheduling.interval) {
        case 'weekly':
          if (scheduling.intervalConfig?.daysOfWeek) {
            const dayCheckboxes = document.querySelectorAll(
              '.day-checkboxes input[type="checkbox"]'
            ) as NodeListOf<HTMLInputElement>;
            dayCheckboxes.forEach((checkbox) => {
              checkbox.checked =
                scheduling.intervalConfig?.daysOfWeek?.includes(checkbox.value as DayOfWeek) ||
                false;
            });
          }
          break;
        case 'monthly':
          if (scheduling.intervalConfig?.dayOfMonth !== undefined) {
            const dayOfMonthSelect = document.getElementById('dayOfMonth') as HTMLSelectElement;
            dayOfMonthSelect.value = scheduling.intervalConfig?.dayOfMonth?.toString() || '';
          }
          break;
        case 'custom':
          if (scheduling.intervalConfig?.customIntervalMs) {
            const customIntervalInput = document.getElementById(
              'customInterval'
            ) as HTMLInputElement;
            const intervalUnitSelect = document.getElementById('intervalUnit') as HTMLSelectElement;

            const totalMinutes = Math.round(
              (scheduling.intervalConfig?.customIntervalMs || 0) / (60 * 1000)
            );

            // Determine best unit to display (hours if evenly divisible by 60 and >= 60)
            if (totalMinutes >= 60 && totalMinutes % 60 === 0) {
              const hours = totalMinutes / 60;
              customIntervalInput.value = hours.toString();
              intervalUnitSelect.value = 'hours';
            } else {
              customIntervalInput.value = totalMinutes.toString();
              intervalUnitSelect.value = 'minutes';
            }
          }
          break;
      }
    }

    updateNextExecutionPreview();
    updatePauseResumeButtons();
  }

  function updatePauseResumeButtons() {
    const pauseScheduleButton = document.getElementById('pauseSchedule') as HTMLButtonElement;
    const resumeScheduleButton = document.getElementById('resumeSchedule') as HTMLButtonElement;
    const enableSchedulingCheckbox = document.getElementById(
      'enableScheduling'
    ) as HTMLInputElement;

    if (!enableSchedulingCheckbox.checked || !selectedTemplate?.scheduling?.enabled) {
      pauseScheduleButton.style.display = 'none';
      resumeScheduleButton.style.display = 'none';
      return;
    }

    const isPaused = selectedTemplate.scheduling?.paused || false;
    pauseScheduleButton.style.display = isPaused ? 'none' : 'inline-block';
    resumeScheduleButton.style.display = isPaused ? 'inline-block' : 'none';
  }

  async function pauseTemplateScheduling(templateId: string) {
    try {
      const pauseButton = document.getElementById('pauseSchedule') as HTMLButtonElement;
      pauseButton.disabled = true;
      pauseButton.textContent = 'Pausing...';

      const response = await new Promise<ChromeResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'pauseTemplateScheduling',
            templateId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        if (selectedTemplate && selectedTemplate.scheduling) {
          selectedTemplate.scheduling.paused = true;
        }
        updatePauseResumeButtons();
        showTemplatesSuccess('Template scheduling paused');
      } else {
        throw new Error(response.error || 'Failed to pause template scheduling');
      }
    } catch (error) {
      logger.error('Error pausing template scheduling:', error);
      showTemplatesError(`Failed to pause scheduling: ${(error as Error).message}`);
    } finally {
      const pauseButton = document.getElementById('pauseSchedule') as HTMLButtonElement;
      pauseButton.disabled = false;
      pauseButton.textContent = 'Pause';
    }
  }

  async function resumeTemplateScheduling(templateId: string) {
    try {
      const resumeButton = document.getElementById('resumeSchedule') as HTMLButtonElement;
      resumeButton.disabled = true;
      resumeButton.textContent = 'Resuming...';

      const response = await new Promise<ChromeResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'resumeTemplateScheduling',
            templateId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        if (selectedTemplate && selectedTemplate.scheduling) {
          selectedTemplate.scheduling.paused = false;
        }
        updatePauseResumeButtons();
        updateNextExecutionPreview();
        showTemplatesSuccess('Template scheduling resumed');
      } else {
        throw new Error(response.error || 'Failed to resume template scheduling');
      }
    } catch (error) {
      logger.error('Error resuming template scheduling:', error);
      showTemplatesError(`Failed to resume scheduling: ${(error as Error).message}`);
    } finally {
      const resumeButton = document.getElementById('resumeSchedule') as HTMLButtonElement;
      resumeButton.disabled = false;
      resumeButton.textContent = 'Resume';
    }
  }

  function displayExecutionHistory(template: ExpenseTemplate) {
    const executionHistory = document.getElementById('executionHistory') as HTMLDivElement;
    const historyBody = document.getElementById('historyBody') as HTMLDivElement;

    if (!template.executionHistory || template.executionHistory.length === 0) {
      executionHistory.style.display = 'none';
      return;
    }

    executionHistory.style.display = 'block';

    const historyRows = template.executionHistory
      .map((execution: TemplateExecution) => {
        const executedDate = new Date(execution.executedAt).toLocaleString();
        const statusClass = execution.status;
        const statusText = execution.status.charAt(0).toUpperCase() + execution.status.slice(1);

        let expenseColumn = '';

        if (execution.status === 'success' && execution.expenseId) {
          expenseColumn = `<a href="#" class="view-expense-link" data-expense-id="${execution.expenseId}">View Expense</a>`;
        } else if (execution.error) {
          expenseColumn = execution.error.message;
        }

        return `
          <div class="history-row">
            <div class="col-datetime">${executedDate}</div>
            <div class="col-status">
              <span class="status-indicator ${statusClass}"></span>
              ${statusText}
            </div>
            <div class="col-expense">${expenseColumn}</div>
          </div>
        `;
      })
      .join('');

    historyBody.innerHTML = historyRows;

    // Add event listeners for View Expense links after populating content
    const viewExpenseLinks = historyBody.querySelectorAll('.view-expense-link');
    viewExpenseLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const expenseId = (event.target as HTMLElement).getAttribute('data-expense-id');
        if (expenseId) {
          logger.debug('View expense link clicked from execution history:', expenseId);
          void showExpenseDetailsView(expenseId).catch((error) => {
            logger.error('Error showing expense details from execution history:', error);
          });
        }
      });
    });
  }

  // Initialize scheduling event handlers when editing templates
  function enhancedShowTemplateEditForm(templateId: string) {
    showTemplateEditForm(templateId);
    const template = currentTemplates.find((t) => t.id === templateId);
    if (template) {
      populateSchedulingForm(template);
      initializeSchedulingEventHandlers();
    }
  }

  // Override the existing showTemplateDetail to include execution history
  const originalShowTemplateDetail = showTemplateDetail;
  function enhancedShowTemplateDetail(templateId: string) {
    originalShowTemplateDetail(templateId);
    const template = currentTemplates.find((t) => t.id === templateId);
    if (template) {
      displayExecutionHistory(template);
    }
  }

  // Enhanced save template function with scheduling data
  async function enhancedSaveTemplate() {
    if (!selectedTemplate) return;

    const schedulingData = getCurrentSchedulingConfiguration();

    // Calculate next execution if scheduling is enabled
    if (schedulingData) {
      schedulingData.nextExecution = calculateNextExecution(schedulingData);
    }

    const templateNameInput = document.getElementById('templateName') as HTMLInputElement;
    const templateMerchantInput = document.getElementById('templateMerchant') as HTMLInputElement;
    const templateAmountInput = document.getElementById('templateAmount') as HTMLInputElement;
    const templateCurrencySelect = document.getElementById('templateCurrency') as HTMLSelectElement;
    const templateDescriptionTextarea = document.getElementById(
      'templateDescription'
    ) as HTMLTextAreaElement;

    // Validate form including scheduling
    const errors: Record<string, string> = {};

    if (!templateNameInput.value.trim()) {
      errors.templateName = 'Template name is required';
    }

    if (!templateMerchantInput.value.trim()) {
      errors.templateMerchant = 'Merchant name is required';
    }

    const amount = parseFloat(templateAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      errors.templateAmount = 'Valid amount is required';
    }

    // Validate scheduling configuration
    if (schedulingData) {
      if (
        schedulingData.interval === 'weekly' &&
        (!schedulingData.intervalConfig?.daysOfWeek ||
          schedulingData.intervalConfig.daysOfWeek.length === 0)
      ) {
        errors.scheduling = 'Please select at least one day of the week';
      }

      if (schedulingData.interval === 'custom') {
        const intervalUnitSelect = document.getElementById('intervalUnit') as HTMLSelectElement;
        const intervalUnit = intervalUnitSelect.value;

        if (
          !schedulingData.intervalConfig?.customIntervalMs ||
          schedulingData.intervalConfig.customIntervalMs < 300000
        ) {
          if (intervalUnit === 'hours') {
            errors.scheduling = 'Custom interval must be at least 1 hour';
          } else {
            errors.scheduling = 'Custom interval must be at least 5 minutes';
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      showFormErrors(errors);
      return;
    }

    // Clear any previous errors
    clearFormErrors();

    try {
      const saveButton = document.getElementById('saveTemplate') as HTMLButtonElement;
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';

      const updatedTemplate = {
        ...selectedTemplate,
        name: templateNameInput.value.trim(),
        expenseData: {
          ...selectedTemplate.expenseData,
          merchant: {
            ...selectedTemplate.expenseData.merchant,
            name: templateMerchantInput.value.trim(),
          },
          merchantAmount: amount,
          merchantCurrency: templateCurrencySelect.value,
          details: {
            ...selectedTemplate.expenseData.details,
            description: templateDescriptionTextarea.value.trim(),
          },
        },
        scheduling: schedulingData,
      };

      const response = await new Promise<TemplateResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'updateTemplate',
            templateId: selectedTemplate!.id,
            templateData: updatedTemplate,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(response);
          }
        );
      });

      if (response.success) {
        // Update local template data
        const templateIndex = currentTemplates.findIndex((t) => t.id === selectedTemplate!.id);
        if (templateIndex !== -1 && response.data) {
          currentTemplates[templateIndex] = response.data;
          selectedTemplate = response.data;
        }

        // Hide edit form and show updated detail
        cancelTemplateEdit();
        if (selectedTemplate) {
          enhancedShowTemplateDetail(selectedTemplate.id);
        }

        showTemplatesSuccess('Template updated successfully!');
        void loadTemplates();
      } else {
        throw new Error(response.error || 'Failed to update template');
      }
    } catch (error) {
      logger.error('Error updating template:', error);
      showTemplatesError(`Failed to update template: ${(error as Error).message}`);
    } finally {
      const saveButton = document.getElementById('saveTemplate') as HTMLButtonElement;
      saveButton.disabled = false;
      saveButton.textContent = 'Save Changes';
    }
  }

  // Event handlers have been updated above to use enhanced functions

  // Initialize on load
  initializeSchedulingEventHandlers();
});
