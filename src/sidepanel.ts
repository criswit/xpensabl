let currentToken: string | null = null;
let isMasked = true;
let currentExpenses: any[] = [];

// Import types we'll need (based on actual API response)
interface ExpenseData {
  id?: string;
  accountAmount?: number;
  accountCurrency?: string;
  authorizationDate?: string;
  instant?: string;
  merchant?: {
    name?: string;
  };
  prettyMerchantName?: string;
  policyName?: string;
  policyType?: string;
  expenseProperties?: {
    status?: string;
    dateSubmitted?: string;
    dateApproved?: string;
    reimbursementMethod?: string;
  };
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Side panel loaded');
  
  // Get DOM elements
  const tokenText = document.getElementById('tokenText') as HTMLSpanElement;
  const copyButton = document.getElementById('copyToken') as HTMLButtonElement;
  const refreshButton = document.getElementById('refreshToken') as HTMLButtonElement;
  const toggleMaskButton = document.getElementById('toggleMask') as HTMLButtonElement;
  const tokenStatus = document.getElementById('tokenStatus') as HTMLDivElement;
  
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
  
  // Function to mask token (show first 20 and last 10 characters)
  function maskToken(token: string): string {
    if (token.length <= 35) {
      return token;
    }
    const start = token.substring(0, 20);
    const end = token.substring(token.length - 10);
    return `${start}...${end}`;
  }
  
  // Function to display token
  function displayToken(token: string | null) {
    currentToken = token;
    
    if (token) {
      tokenText.textContent = isMasked ? maskToken(token) : token;
      copyButton.disabled = false;
      toggleMaskButton.style.display = 'inline-block';
      toggleMaskButton.textContent = isMasked ? 'Show Full' : 'Hide';
      tokenStatus.textContent = `Token captured at ${new Date().toLocaleTimeString()}`;
      tokenStatus.className = 'token-status success';
    } else {
      tokenText.textContent = 'No token captured yet';
      copyButton.disabled = true;
      toggleMaskButton.style.display = 'none';
      tokenStatus.textContent = 'Visit app.navan.com to capture your auth token';
      tokenStatus.className = 'token-status';
    }
  }
  
  // Function to load token from storage
  function loadToken() {
    if (!chrome?.storage?.local) {
      console.error('Chrome storage API not available');
      displayToken(null);
      return;
    }
    
    chrome.storage.local.get(['bearerToken'], (result) => {
      displayToken(result.bearerToken || null);
    });
  }

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
    console.log('DisplayExpenses called with:', expenses);
    
    if (!expenses || expenses.length === 0) {
      expensesList.innerHTML = '<div class="empty-state">No expenses found</div>';
      expensesList.style.display = 'block';
      expensesStatus.textContent = 'No expenses to display';
      expensesStatus.className = 'expenses-status';
      return;
    }

    try {
      const expensesHtml = expenses.map((expense, index) => {
        // Log each expense for debugging
        console.log(`Processing expense ${index}:`, expense);
        
        try {
          // Add defensive programming with fallbacks based on actual API structure
          const status = expense.expenseProperties?.status || 'unknown';
          const statusClass = status.toLowerCase();
          const amount = expense.accountAmount ?? 0;
          const currency = expense.accountCurrency || 'USD';
          const formattedAmount = `${currency} ${amount.toFixed(2)}`;
          const date = expense.authorizationDate || expense.instant || new Date().toISOString();
          const formattedDate = new Date(date).toLocaleDateString();
          const merchantName = expense.prettyMerchantName || expense.merchant?.name || 'Unknown Merchant';
          const policy = expense.policyName || expense.policyType || 'Other';
          
          // Debug the expense ID
          console.log(`Expense ${index} ID:`, expense.id);
          const expenseId = expense.id || `expense-${index}`;
          
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
          console.error(`Error processing expense item ${index}:`, itemError, expense);
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
      }).join('');

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
          item.addEventListener('click', async () => {
            console.log('Expense item clicked, ID:', expenseId);
            try {
              await showExpenseDetailsView(expenseId);
            } catch (error) {
              console.error('Error showing expense details:', error);
            }
          });
        }
      });
    } catch (error) {
      console.error('Error in displayExpenses:', error);
      displayExpensesError('Failed to display expenses: ' + (error as Error).message);
    }
  }

  function displayExpensesError(error: string) {
    expensesList.innerHTML = `<div class="empty-state">Error loading expenses</div>`;
    expensesList.style.display = 'block';
    expensesStatus.textContent = error;
    expensesStatus.className = 'expenses-status error';
  }

  // Global function for onclick handlers
  (window as any).showExpenseDetails = async (expenseId: string) => {
    console.log('Showing expense details for:', expenseId);
    await showExpenseDetailsView(expenseId);
  };

  async function showExpenseDetailsView(expenseId: string) {
    try {
      // Fetch detailed expense data
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ 
          action: 'fetchExpense', 
          selectedTxn: { id: expenseId } 
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });

      if (response.success) {
        console.log('Fetch expense details response:', response);
        console.log('Response data structure:', response.data);
        console.log('Expense detail data:', response.data?.data);
        
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
    } catch (error: any) {
      console.error('Error fetching expense details:', error);
      expensesStatus.textContent = 'Error loading expense details';
      expensesStatus.className = 'expenses-status error';
    }
  }

  function displayExpenseDetail(expense: any) {
    console.log('Displaying expense detail:', expense);
    
    // Handle different API response structures
    // Single expense API uses different field names than list API
    const status = expense.status || 'unknown';
    const amount = expense.accountAmount ?? expense.amount ?? 0;
    const currency = expense.accountCurrency || expense.currency || 'USD';
    const formattedAmount = `${currency} ${amount.toFixed(2)}`;
    const date = expense.authorizationDate || expense.instant || expense.dateCreated || '';
    const formattedDate = new Date(date).toLocaleDateString();
    const merchantName = expense.prettyMerchantName || expense.merchant?.name || 'Unknown Merchant';
    const policy = expense.policyName || expense.policy || 'Other';
    const submittedDate = expense.dateSubmitted ? 
      new Date(expense.dateSubmitted).toLocaleDateString() : 'N/A';
    const approvedDate = expense.dateApproved ? 
      new Date(expense.dateApproved).toLocaleDateString() : 'N/A';
    
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
        <div class="detail-value" style="font-family: monospace; font-size: 12px;">${expense.uuid || expense.id || 'N/A'}</div>
      </div>
    `;
    
    // Store the expense data for duplication
    duplicateExpenseButton.setAttribute('data-expense-data', JSON.stringify(expense));
    
    // Also store the expense ID for reference
    duplicateExpenseButton.setAttribute('data-expense-id', expense.uuid || expense.id || 'unknown');
  }

  function showDetailView() {
    expensesList.parentElement!.style.display = 'none';
    expenseDetail.style.display = 'block';
  }

  function showListView() {
    expenseDetail.style.display = 'none';
    expensesList.parentElement!.style.display = 'block';
  }

  async function fetchExpenses() {
    try {
      setLoadingState(true);
      
      // Send message to background script to fetch expenses
      const response = await new Promise<any>((resolve, reject) => {
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
        console.log('Fetch expenses response:', response);
        console.log('Response data structure:', response.data);
        
        // Extract expenses from the nested API response structure
        let expenseData: any[] = [];
        
        if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          // Handle paginated response structure: data.data[0]._embedded.transactions
          const paginatedResponse = response.data.data[0];
          if (paginatedResponse?._embedded?.transactions) {
            expenseData = paginatedResponse._embedded.transactions;
            console.log('Extracted expenses from _embedded.transactions:', expenseData);
          }
        }
        
        displayExpenses(expenseData);
      } else {
        console.error('Fetch expenses failed:', response);
        displayExpensesError(response.error || 'Failed to fetch expenses');
      }
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      displayExpensesError(error.message || 'Failed to fetch expenses');
    } finally {
      setLoadingState(false);
    }
  }
  
  // Load token on initialization
  loadToken();
  
  // Listen for storage changes
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.bearerToken) {
        displayToken(changes.bearerToken.newValue || null);
      }
    });
  }
  
  // Copy button click handler
  copyButton.addEventListener('click', async () => {
    if (currentToken) {
      try {
        await navigator.clipboard.writeText(currentToken);
        tokenStatus.textContent = 'Token copied to clipboard!';
        tokenStatus.className = 'token-status success';
        setTimeout(() => {
          tokenStatus.textContent = `Token captured at ${new Date().toLocaleTimeString()}`;
        }, 2000);
      } catch (err) {
        tokenStatus.textContent = 'Failed to copy token';
        tokenStatus.className = 'token-status error';
      }
    }
  });
  
  // Refresh button click handler
  refreshButton.addEventListener('click', () => {
    loadToken();
    tokenStatus.textContent = 'Token refreshed';
    tokenStatus.className = 'token-status success';
    setTimeout(() => {
      if (currentToken) {
        tokenStatus.textContent = `Token captured at ${new Date().toLocaleTimeString()}`;
      }
    }, 1000);
  });
  
  // Toggle mask button click handler
  toggleMaskButton.addEventListener('click', () => {
    isMasked = !isMasked;
    if (currentToken) {
      tokenText.textContent = isMasked ? maskToken(currentToken) : currentToken;
      toggleMaskButton.textContent = isMasked ? 'Show Full' : 'Hide';
    }
  });

  async function duplicateExpense() {
    try {
      const expenseDataStr = duplicateExpenseButton.getAttribute('data-expense-data');
      if (!expenseDataStr) {
        throw new Error('No expense data available for duplication');
      }
      
      const originalExpense = JSON.parse(expenseDataStr);
      console.log('Duplicating expense:', originalExpense);
      
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
          name: originalExpense.merchant?.name || originalExpense.prettyMerchantName || 'Unknown Merchant',
          online: originalExpense.merchant?.online || true,
          perDiem: originalExpense.merchant?.perDiem || false,
          timeZone: originalExpense.merchant?.timeZone || 'Z'
        },
        merchantAmount: originalExpense.merchantAmount || originalExpense.accountAmount || 0,
        merchantCurrency: originalExpense.merchantCurrency || originalExpense.accountCurrency || 'USD',
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
              uuid: originalExpense.user?.uuid || ''
            }
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
            vatNumber: originalExpense.details?.taxDetails?.vatNumber || null
          }
        },
        reportingData: {
          billTo: originalExpense.reportingData?.billTo || null,
          department: originalExpense.reportingData?.department || null,
          region: originalExpense.reportingData?.region || null,
          subsidiary: originalExpense.reportingData?.subsidiary || null
        }
      };
      
      console.log('Creating new expense with data:', newExpenseData);
      
      // Disable button and show loading
      duplicateExpenseButton.disabled = true;
      duplicateExpenseButton.innerHTML = '<span class="loading-spinner"></span>Creating...';
      
      console.log('📤 Sidepanel: Sending createExpense message to background...');
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ 
          action: 'createExpense', 
          expenseData: newExpenseData 
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('❌ Sidepanel: Chrome runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          console.log('📨 Sidepanel: Received response from background:', response);
          resolve(response);
        });
      });
      
      if (response.success) {
        // Show success message
        expensesStatus.textContent = 'Expense duplicated successfully!';
        expensesStatus.className = 'expenses-status success';
        
        // Go back to list view and refresh expenses
        showListView();
        await fetchExpenses();
      } else {
        throw new Error(response.error || 'Failed to create duplicate expense');
      }
      
    } catch (error: any) {
      console.error('Error duplicating expense:', error);
      expensesStatus.textContent = `Failed to duplicate expense: ${error.message}`;
      expensesStatus.className = 'expenses-status error';
    } finally {
      // Reset button
      duplicateExpenseButton.disabled = false;
      duplicateExpenseButton.innerHTML = 'Duplicate Expense';
    }
  }

  // Expense button event handlers
  fetchExpensesButton.addEventListener('click', async () => {
    try {
      await fetchExpenses();
    } catch (error) {
      console.error('Error in fetch expenses button handler:', error);
    }
  });

  refreshExpensesButton.addEventListener('click', async () => {
    try {
      await fetchExpenses();
    } catch (error) {
      console.error('Error in refresh expenses button handler:', error);
    }
  });
  
  // Detail view event handlers
  backToListButton.addEventListener('click', () => {
    showListView();
  });
  
  duplicateExpenseButton.addEventListener('click', async () => {
    try {
      await duplicateExpense();
    } catch (error) {
      console.error('Error in duplicate expense button handler:', error);
    }
  });
});