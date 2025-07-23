import { TokenManager } from './utils/tokenManager';
import { BackgroundMessage, LogLevel } from './types';
import { ExpenseManager } from './services/expenseManager';

// Initialize token capture
if (chrome.webRequest) {
    chrome.webRequest.onBeforeSendHeaders.addListener(
        function (details) {
            try {
                // Process headers
                for (const header of details.requestHeaders!) {
                    const name = header.name.toLowerCase();
                    const value = header.value;
                    
                    if (value !== undefined && name === 'authorization' && value.startsWith('TripActions')) {
                        // Capture metadata
                        const metadata = {
                            requestUrl: details.url,
                            method: details.method,
                            timestamp: details.timeStamp
                        };

                        // Save token using TokenManager (don't await in sync context)
                        TokenManager.saveToken(value, details.url, metadata).then((saved) => {
                            if (saved) {
                                // Show notification if permission granted
                                if (chrome.notifications) {
                                    chrome.notifications.create({
                                        type: 'basic',
                                        iconUrl: 'expense-icon.png',
                                        title: 'Xpensabl',
                                        message: 'Authorization token captured successfully!'
                                    });
                                }
                            }
                        }).catch((error) => {
                            console.error('Error saving token:', error);
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing request headers:', error);
            }
            
            return { requestHeaders: details.requestHeaders };
        },
        { urls: ["https://app.navan.com/api/*"] },
        ["requestHeaders"]
    );
}

// Handle messages from popup and other parts of the extension
chrome.runtime.onMessage.addListener((request: BackgroundMessage, sender, sendResponse) => {
    // Handle async responses
    (async () => {
        try {
            switch (request.action) {
                case 'openSidePanel':
                    await handleOpenSidePanel(sendResponse);
                    break;
                    
                case 'getTokenStatus':
                    const token = await TokenManager.getCurrentToken();
                    sendResponse({ 
                        success: true, 
                        hasToken: !!token,
                        isExpired: token ? TokenManager.isTokenExpired(token) : false,
                        capturedAt: token?.capturedAt
                    });
                    break;
                    
                case 'clearTokens':
                    await TokenManager.clearTokens();
                    sendResponse({ success: true });
                    break;
                    
                case 'exportTokens':
                    const exportData = await TokenManager.exportTokenData();
                    sendResponse({ success: true, data: exportData });
                    break;
                    
                case 'importTokens':
                    const imported = await TokenManager.importTokenData(request.payload);
                    sendResponse({ success: imported });
                    break;
                    
                case 'getStatistics':
                    const storage = await TokenManager.getStorage();
                    sendResponse({ success: true, statistics: storage.statistics });
                    break;
                    
                // Expense management operations
                case 'fetchExpense':
                    if (!request.selectedTxn?.id) {
                        sendResponse({ success: false, error: 'Expense ID is required' });
                        break;
                    }
                    const expenseData = await ExpenseManager.fetchExpense(request.selectedTxn.id);
                    sendResponse({ success: true, data: expenseData });
                    break;
                    
                case 'getSampledExpenses':
                    const expensesList = await ExpenseManager.getSampledExpenses(request.payload);
                    sendResponse({ success: true, data: expensesList });
                    break;
                    
                case 'createExpense':
                    console.log('🎯 Background: createExpense action received', request);
                    if (!request.expenseData) {
                        console.error('❌ Background: No expenseData provided');
                        sendResponse({ success: false, error: 'Expense data is required' });
                        break;
                    }
                    
                    console.log('✅ Background: expenseData received:', request.expenseData);
                    
                    // Validate expense data before creation
                    console.log('🔍 Background: Validating expense data...');
                    const validation = ExpenseManager.validateExpenseData(request.expenseData);
                    if (!validation.isValid) {
                        console.error('❌ Background: Validation failed:', validation.errors);
                        sendResponse({ 
                            success: false, 
                            error: 'Validation failed', 
                            details: validation.errors 
                        });
                        break;
                    }
                    
                    console.log('✅ Background: Validation passed, calling ExpenseManager.createExpense...');
                    const createdExpense = await ExpenseManager.createExpense(request.expenseData);
                    console.log('✅ Background: ExpenseManager.createExpense completed:', createdExpense);
                    sendResponse({ success: true, data: createdExpense });
                    break;
                    
                case 'searchTransactions':
                    const searchResults = await ExpenseManager.searchTransactions(request.payload);
                    sendResponse({ success: true, data: searchResults });
                    break;
                    
                case 'getExpenseCategories':
                    const categories = await ExpenseManager.getExpenseCategories();
                    sendResponse({ success: true, data: categories });
                    break;
                    
                case 'getExpenseStats':
                    const stats = await ExpenseManager.getExpenseStats(request.payload);
                    sendResponse({ success: true, data: stats });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error: any) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();
    
    // Return true to indicate async response
    return true;
});

// Handle side panel opening
async function handleOpenSidePanel(sendResponse: (response: any) => void) {
    try {
        console.log('Attempting to open side panel...');
        
        // Check if sidePanel API is available
        if (!chrome.sidePanel || !chrome.sidePanel.open) {
            const errorMsg = 'Chrome sidePanel API not available';
            console.error(errorMsg);
            sendResponse({ success: false, error: errorMsg });
            return;
        }

        // Get the current active tab to open the side panel
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('Found tabs:', tabs.length);
        
        if (tabs[0]?.id) {
            console.log('Opening side panel for tab:', tabs[0].id);
            console.log('Tab details:', { id: tabs[0].id, url: tabs[0].url, active: tabs[0].active });
            
            // Use callback-based approach for better compatibility
            chrome.sidePanel.open({ tabId: tabs[0].id }, () => {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError) || 'Unknown error opening side panel';
                    console.error('Error opening side panel with tabId:', JSON.stringify(chrome.runtime.lastError, null, 2));
                    sendResponse({ success: false, error: errorMsg });
                } else {
                    console.log('Side panel opened successfully');
                    sendResponse({ success: true });
                }
            });
        } else {
            console.log('No active tab found, trying with window...');
            // Fallback: try to get current window
            const window = await chrome.windows.getCurrent();
            if (window.id) {
                console.log('Opening side panel for window:', window.id);
                
                // Use callback-based approach for better compatibility
                chrome.sidePanel.open({ windowId: window.id }, () => {
                    if (chrome.runtime.lastError) {
                        const errorMsg = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError) || 'Unknown error opening side panel';
                        console.error('Error opening side panel with windowId:', JSON.stringify(chrome.runtime.lastError, null, 2));
                        sendResponse({ success: false, error: errorMsg });
                    } else {
                        console.log('Side panel opened successfully for window');
                        sendResponse({ success: true });
                    }
                });
            } else {
                const errorMsg = 'Could not determine window or tab';
                console.error(errorMsg);
                sendResponse({ success: false, error: errorMsg });
            }
        }
    } catch (error: any) {
        const errorMsg = error.message || error.toString() || 'Unknown error in handleOpenSidePanel';
        console.error('Error in handleOpenSidePanel:', error);
        sendResponse({ success: false, error: errorMsg });
    }
}

// Set up alarm for token expiry checking (runs every hour)
chrome.alarms.create('checkTokenExpiry', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkTokenExpiry') {
        const token = await TokenManager.getCurrentToken();
        
        if (token && TokenManager.isTokenExpired(token)) {
            // Show notification about expired token
            if (chrome.notifications) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'expense-icon.png',
                    title: 'Xpensabl - Token Expired',
                    message: 'Your authorization token has expired. Please visit Navan to refresh.'
                });
            }
        }
    }
});

// Set up side panel behavior (alternative method)
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: true })
        .then(() => {
            console.log('Side panel behavior set to open on action click');
        })
        .catch((error) => {
            console.log('Could not set panel behavior (this is normal):', error.message);
        });
}

// Log extension startup
console.log('Xpensabl background script initialized');