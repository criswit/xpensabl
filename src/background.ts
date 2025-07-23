import { TokenManager } from './utils/tokenManager';
import { BackgroundMessage } from './types';
import { ExpenseManager } from './services/expenseManager';
import { TemplateManager } from './services/templateManager';
import { OptimizedSchedulingEngine } from './services/schedulingEngine';
import { logger } from './services/chromeLogger';

// Initialize scheduling engine on service worker startup
let schedulingEngine: OptimizedSchedulingEngine | null = null;

async function initializeSchedulingEngine() {
  try {
    logger.info('Initializing scheduling engine...');
    schedulingEngine = OptimizedSchedulingEngine.getInstance();
    await schedulingEngine.initialize();
    logger.info('Scheduling engine initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize scheduling engine:', error);
  }
}

// Initialize on startup
void initializeSchedulingEngine();

// Re-initialize on service worker restart
chrome.runtime.onStartup.addListener(() => {
  logger.info('Service worker restarting, re-initializing scheduling engine...');
  void initializeSchedulingEngine();
});

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
              timestamp: details.timeStamp,
            };

            // Save token using TokenManager (don't await in sync context)
            TokenManager.saveToken(value, details.url, metadata)
              .then((saved) => {
                if (saved) {
                  // Show notification if permission granted
                  if (chrome.notifications) {
                    chrome.notifications.create({
                      type: 'basic',
                      iconUrl: 'expense-icon.png',
                      title: 'Xpensabl',
                      message: 'Authorization token captured successfully!',
                    });
                  }
                }
              })
              .catch((error) => {
                logger.error('Error saving token:', error);
              });
          }
        }
      } catch (error) {
        logger.error('Error processing request headers:', error);
      }

      return { requestHeaders: details.requestHeaders };
    },
    { urls: ['https://app.navan.com/api/*'] },
    ['requestHeaders']
  );
}

// Handle messages from popup and other parts of the extension
chrome.runtime.onMessage.addListener((request: BackgroundMessage, sender, sendResponse) => {
  // Handle async responses
  void (async () => {
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
            capturedAt: token?.capturedAt,
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
          logger.debug('Background: createExpense action received', request);
          if (!request.expenseData) {
            logger.error('Background: No expenseData provided');
            sendResponse({ success: false, error: 'Expense data is required' });
            break;
          }

          logger.debug('Background: expenseData received:', request.expenseData);

          // Validate expense data before creation
          logger.debug('Background: Validating expense data...');
          const validation = ExpenseManager.validateExpenseData(request.expenseData);
          if (!validation.isValid) {
            logger.error('Background: Validation failed:', validation.errors);
            sendResponse({
              success: false,
              error: 'Validation failed',
              details: validation.errors,
            });
            break;
          }

          logger.debug('Background: Validation passed, calling ExpenseManager.createExpense...');
          const createdExpense = await ExpenseManager.createExpense(request.expenseData);
          logger.debug('Background: ExpenseManager.createExpense completed:', createdExpense);
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

        // Template management operations
        case 'getTemplates':
          try {
            const templateManager = TemplateManager.getInstance();
            const templates = await templateManager.getAllTemplates();
            sendResponse({ success: true, data: templates });
          } catch (error: unknown) {
            logger.error('Error getting templates:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'createTemplate':
          try {
            if (!request.templateData) {
              sendResponse({ success: false, error: 'Template data is required' });
              break;
            }

            const templateManager = TemplateManager.getInstance();
            const template = await templateManager.createTemplate(request.templateData);
            sendResponse({ success: true, data: template });
          } catch (error: unknown) {
            logger.error('Error creating template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'updateTemplate':
          try {
            if (!request.templateId || !request.templateData) {
              sendResponse({ success: false, error: 'Template ID and data are required' });
              break;
            }

            const templateManager = TemplateManager.getInstance();
            const updatedTemplate = await templateManager.updateTemplate(
              request.templateId,
              request.templateData
            );

            // Handle scheduling if enabled
            if (
              schedulingEngine &&
              updatedTemplate.scheduling?.enabled &&
              !updatedTemplate.scheduling.paused
            ) {
              logger.info(`Auto-scheduling template ${request.templateId} after update`);
              try {
                await schedulingEngine.scheduleTemplate(request.templateId);
              } catch (scheduleError) {
                logger.error('Error auto-scheduling template after update:', scheduleError);
                // Don't fail the update operation, just log the scheduling error
              }
            } else if (
              schedulingEngine &&
              (!updatedTemplate.scheduling?.enabled || updatedTemplate.scheduling.paused)
            ) {
              // Unschedule if scheduling was disabled or paused
              logger.info(`Auto-unscheduling template ${request.templateId} after update`);
              try {
                await schedulingEngine.unscheduleTemplate(request.templateId);
              } catch (unscheduleError) {
                logger.error('Error auto-unscheduling template after update:', unscheduleError);
                // Don't fail the update operation, just log the unscheduling error
              }
            }

            sendResponse({ success: true, data: updatedTemplate });
          } catch (error: unknown) {
            logger.error('Error updating template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'deleteTemplate':
          try {
            if (!request.templateId) {
              sendResponse({ success: false, error: 'Template ID is required' });
              break;
            }

            // Unschedule template before deletion
            if (schedulingEngine) {
              logger.info(`Auto-unscheduling template ${request.templateId} before deletion`);
              try {
                await schedulingEngine.unscheduleTemplate(request.templateId);
              } catch (unscheduleError) {
                logger.error('Error auto-unscheduling template before deletion:', unscheduleError);
                // Continue with deletion even if unscheduling fails
              }
            }

            const templateManager = TemplateManager.getInstance();
            await templateManager.deleteTemplate(request.templateId);
            sendResponse({ success: true });
          } catch (error: unknown) {
            logger.error('Error deleting template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'updateTemplateUsage':
          try {
            if (!request.templateId) {
              sendResponse({ success: false, error: 'Template ID is required' });
              break;
            }

            const templateManager = TemplateManager.getInstance();
            await templateManager.incrementTemplateUsage(request.templateId);
            // Get the updated template to return
            const updatedTemplate = await templateManager.getTemplate(request.templateId);
            sendResponse({ success: true, data: updatedTemplate });
          } catch (error: unknown) {
            logger.error('Error updating template usage:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'scheduleTemplate':
          try {
            if (!request.templateId) {
              sendResponse({ success: false, error: 'Template ID is required' });
              break;
            }

            if (!schedulingEngine) {
              sendResponse({ success: false, error: 'Scheduling engine not initialized' });
              break;
            }

            const result = await schedulingEngine.scheduleTemplate(request.templateId);
            sendResponse({ success: result });
          } catch (error: unknown) {
            logger.error('Error scheduling template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'unscheduleTemplate':
          try {
            if (!request.templateId) {
              sendResponse({ success: false, error: 'Template ID is required' });
              break;
            }

            if (!schedulingEngine) {
              sendResponse({ success: false, error: 'Scheduling engine not initialized' });
              break;
            }

            const result = await schedulingEngine.unscheduleTemplate(request.templateId);
            sendResponse({ success: result });
          } catch (error: unknown) {
            logger.error('Error unscheduling template:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'pauseTemplateScheduling':
          try {
            if (!request.templateId) {
              sendResponse({ success: false, error: 'Template ID is required' });
              break;
            }

            if (!schedulingEngine) {
              sendResponse({ success: false, error: 'Scheduling engine not initialized' });
              break;
            }

            const result = await schedulingEngine.pauseTemplate(request.templateId);
            sendResponse({ success: result });
          } catch (error: unknown) {
            logger.error('Error pausing template scheduling:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        case 'resumeTemplateScheduling':
          try {
            if (!request.templateId) {
              sendResponse({ success: false, error: 'Template ID is required' });
              break;
            }

            if (!schedulingEngine) {
              sendResponse({ success: false, error: 'Scheduling engine not initialized' });
              break;
            }

            const result = await schedulingEngine.resumeTemplate(request.templateId);
            sendResponse({ success: result });
          } catch (error: unknown) {
            logger.error('Error resuming template scheduling:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error: unknown) {
      logger.error('Error handling message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ success: false, error: errorMessage });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Handle side panel opening
async function handleOpenSidePanel(sendResponse: (response: unknown) => void) {
  try {
    logger.info('Attempting to open side panel...');

    // Check if sidePanel API is available
    if (!chrome.sidePanel || !chrome.sidePanel.open) {
      const errorMsg = 'Chrome sidePanel API not available';
      logger.error(errorMsg);
      sendResponse({ success: false, error: errorMsg });
      return;
    }

    // Get the current active tab to open the side panel
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    logger.debug('Found tabs:', tabs.length);

    if (tabs[0]?.id) {
      logger.info('Opening side panel for tab:', tabs[0].id);
      logger.debug('Tab details:', { id: tabs[0].id, url: tabs[0].url, active: tabs[0].active });

      // Use callback-based approach for better compatibility
      chrome.sidePanel.open({ tabId: tabs[0].id }, () => {
        if (chrome.runtime.lastError) {
          const errorMsg =
            chrome.runtime.lastError.message ||
            JSON.stringify(chrome.runtime.lastError) ||
            'Unknown error opening side panel';
          logger.error(
            'Error opening side panel with tabId:',
            JSON.stringify(chrome.runtime.lastError, null, 2)
          );
          sendResponse({ success: false, error: errorMsg });
        } else {
          logger.info('Side panel opened successfully');
          sendResponse({ success: true });
        }
      });
    } else {
      logger.info('No active tab found, trying with window...');
      // Fallback: try to get current window
      const window = await chrome.windows.getCurrent();
      if (window.id) {
        logger.info('Opening side panel for window:', window.id);

        // Use callback-based approach for better compatibility
        chrome.sidePanel.open({ windowId: window.id }, () => {
          if (chrome.runtime.lastError) {
            const errorMsg =
              chrome.runtime.lastError.message ||
              JSON.stringify(chrome.runtime.lastError) ||
              'Unknown error opening side panel';
            logger.error(
              'Error opening side panel with windowId:',
              JSON.stringify(chrome.runtime.lastError, null, 2)
            );
            sendResponse({ success: false, error: errorMsg });
          } else {
            logger.info('Side panel opened successfully for window');
            sendResponse({ success: true });
          }
        });
      } else {
        const errorMsg = 'Could not determine window or tab';
        logger.error(errorMsg);
        sendResponse({ success: false, error: errorMsg });
      }
    }
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown error in handleOpenSidePanel';
    logger.error('Error in handleOpenSidePanel:', error);
    sendResponse({ success: false, error: errorMsg });
  }
}

// Set up alarm for token expiry checking (runs every hour)
void chrome.alarms.create('checkTokenExpiry', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  void (async () => {
    if (alarm.name === 'checkTokenExpiry') {
      const token = await TokenManager.getCurrentToken();

      if (token && TokenManager.isTokenExpired(token)) {
        // Show notification about expired token
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'expense-icon.png',
            title: 'Xpensabl - Token Expired',
            message: 'Your authorization token has expired. Please visit Navan to refresh.',
          });
        }
      }
    }
  })();
});

// Set up side panel behavior (alternative method)
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => {
      logger.info('Side panel behavior set to open on action click');
    })
    .catch((error) => {
      logger.info('Could not set panel behavior (this is normal):', error.message);
    });
}

// Log extension startup
logger.info('Xpensabl background script initialized');
