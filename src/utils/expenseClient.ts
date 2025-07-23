import {
  ExpenseResponse,
  ExpenseListResponse,
  ExpenseCreatePayload,
  ExpenseFilters,
} from '../model/expense';
import { logger } from '../services/chromeLogger';

// Client-side utility for communicating with the background script for expense operations
export class ExpenseClient {
  // Send message to background script and handle response
  private static sendMessage<T = unknown>(action: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime) {
        reject(new Error('Chrome runtime not available'));
        return;
      }

      chrome.runtime.sendMessage({ action, payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  // Fetch a single expense by ID
  static async fetchExpense(expenseId: string): Promise<ExpenseResponse> {
    try {
      return await this.sendMessage('fetchExpense', { selectedTxn: { id: expenseId } });
    } catch (error) {
      logger.error('ExpenseClient: Failed to fetch expense', error);
      throw error;
    }
  }

  // Get a list of expenses
  static async getSampledExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    try {
      return await this.sendMessage('getSampledExpenses', filters);
    } catch (error) {
      logger.error('ExpenseClient: Failed to get sampled expenses', error);
      throw error;
    }
  }

  // Create a new expense
  static async createExpense(expenseData: ExpenseCreatePayload): Promise<ExpenseResponse> {
    try {
      return await this.sendMessage('createExpense', { expenseData });
    } catch (error) {
      logger.error('ExpenseClient: Failed to create expense', error);
      throw error;
    }
  }

  // Search transactions
  static async searchTransactions(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    try {
      return await this.sendMessage('searchTransactions', filters);
    } catch (error) {
      logger.error('ExpenseClient: Failed to search transactions', error);
      throw error;
    }
  }

  // Get available expense categories
  static async getExpenseCategories(): Promise<string[]> {
    try {
      return await this.sendMessage('getExpenseCategories');
    } catch (error) {
      logger.error('ExpenseClient: Failed to get expense categories', error);
      throw error;
    }
  }

  // Get expense statistics
  static async getExpenseStats(filters?: Partial<ExpenseFilters>): Promise<{
    totalExpenses: number;
    totalAmount: number;
    currency: string;
    avgAmount: number;
    pendingExpenses: number;
    approvedExpenses: number;
  }> {
    try {
      return await this.sendMessage('getExpenseStats', filters);
    } catch (error) {
      logger.error('ExpenseClient: Failed to get expense stats', error);
      throw error;
    }
  }
}

// Helper function for sending messages with different parameter structures
// This maintains compatibility with the reference implementation
function sendMessageCompat<T = unknown>(
  action: string,
  payload?: unknown,
  selectedTxn?: unknown,
  expenseData?: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    const message: Record<string, unknown> = { action };

    if (payload) message.payload = payload;
    if (selectedTxn) message.selectedTxn = selectedTxn;
    if (expenseData) message.expenseData = expenseData;

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response?.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

// Updated ExpenseClient methods that match the reference pattern more closely
export class ExpenseClientCompat {
  // Fetch a single expense by ID (matching reference pattern)
  static async fetchExpense(expenseId: string): Promise<ExpenseResponse> {
    try {
      return await sendMessageCompat('fetchExpense', undefined, { id: expenseId });
    } catch (error) {
      logger.error('ExpenseClient: Failed to fetch expense', error);
      throw error;
    }
  }

  // Create a new expense (matching reference pattern)
  static async createExpense(expenseData: ExpenseCreatePayload): Promise<ExpenseResponse> {
    try {
      return await sendMessageCompat('createExpense', undefined, undefined, expenseData);
    } catch (error) {
      logger.error('ExpenseClient: Failed to create expense', error);
      throw error;
    }
  }

  // Get sampled expenses
  static async getSampledExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    try {
      return await sendMessageCompat('getSampledExpenses', filters);
    } catch (error) {
      logger.error('ExpenseClient: Failed to get sampled expenses', error);
      throw error;
    }
  }
}
