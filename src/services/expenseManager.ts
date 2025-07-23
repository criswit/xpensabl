import { TokenManager } from '../utils/tokenManager';
import {
  ExpenseResponse,
  ExpenseListResponse,
  ExpenseCreatePayload,
  ExpenseFilters,
  ExpenseData,
} from '../model/expense';
import { logger } from './chromeLogger';

export class ExpenseManager {
  private static readonly BASE_URL = 'https://app.navan.com/api/liquid/user';
  private static readonly DEFAULT_TIMEZONE = 'America/Los_Angeles';

  // Get authentication token from TokenManager
  private static async getAuthToken(): Promise<string> {
    try {
      const tokenData = await TokenManager.getCurrentToken();
      if (!tokenData) {
        throw new Error('No authentication token available');
      }
      return tokenData.token;
    } catch (error) {
      logger.error('Failed to get auth token', error);
      throw new Error('Authentication token not found or expired');
    }
  }

  // Generic GET request with authentication
  private static async fetchWithAuth<T = unknown>(url: string): Promise<T> {
    try {
      const token = await this.getAuthToken();

      logger.debug(`Making GET request to: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en',
          authorization: token,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response',
          status: response.status,
        }));

        logger.error(`API request failed with status ${response.status}`, errorData);

        throw new Error(
          `API Error ${response.status}: ${errorData.message || errorData.error || 'Unknown error'}`
        );
      }

      const data = await response.json();
      logger.debug(`GET request successful for: ${url}`);

      return data;
    } catch (error) {
      logger.error(`fetchWithAuth failed for URL: ${url}`, error);
      throw error;
    }
  }

  // Generic POST request with authentication
  private static async postWithAuth<T = unknown>(url: string, payload: unknown): Promise<T> {
    try {
      const token = await this.getAuthToken();

      logger.debug(`Making POST request to: ${url}`, payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en',
          authorization: token,
          'content-type': 'application/json',
          'x-timezone': this.DEFAULT_TIMEZONE,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response',
          status: response.status,
        }));

        logger.error(`API POST request failed with status ${response.status}`, errorData);

        throw new Error(
          `API Error ${response.status}: ${errorData.message || errorData.error || 'Unknown error'}`
        );
      }

      const data = await response.json();
      logger.debug(`POST request successful for: ${url}`);

      return data;
    } catch (error) {
      logger.error(`postWithAuth failed for URL: ${url}`, error);
      throw error;
    }
  }

  // Generic PATCH request with authentication
  private static async patchWithAuth<T = unknown>(url: string, payload: unknown): Promise<T> {
    try {
      const token = await this.getAuthToken();

      logger.debug(`Making PATCH request to: ${url}`, payload);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en',
          authorization: token,
          'content-type': 'application/json',
          'x-timezone': this.DEFAULT_TIMEZONE,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response',
          status: response.status,
        }));

        logger.error(`API PATCH request failed with status ${response.status}`, errorData);

        throw new Error(
          `API Error ${response.status}: ${errorData.message || errorData.error || 'Unknown error'}`
        );
      }

      const data = await response.json();
      logger.debug(`PATCH request successful for: ${url}`);

      return data;
    } catch (error) {
      logger.error(`patchWithAuth failed for URL: ${url}`, error);
      throw error;
    }
  }

  // Fetch a single expense by ID
  static async fetchExpense(expenseId: string): Promise<ExpenseResponse> {
    try {
      logger.info(`Fetching expense with ID: ${expenseId}`);

      if (!expenseId || typeof expenseId !== 'string') {
        throw new Error('Invalid expense ID provided');
      }

      const url = `${this.BASE_URL}/expenses/${expenseId}`;
      const response = await this.fetchWithAuth(url);

      logger.info(`Successfully fetched expense: ${expenseId}`);

      // Transform response to match expected structure (consistent with getSampledExpenses)
      return {
        data: response,
      } as ExpenseResponse;
    } catch (error) {
      logger.error(`Failed to fetch expense: ${expenseId}`, error);
      throw error;
    }
  }

  // Fetch a list of expenses (transactions)
  static async getSampledExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    try {
      logger.info('Fetching sampled expenses', filters);

      let url = `${this.BASE_URL}/search/transactions`;

      // Add query parameters if filters are provided
      if (filters) {
        const params = new URLSearchParams();

        if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.append('dateTo', filters.dateTo);
        if (filters.status) params.append('status', filters.status);
        if (filters.policy) params.append('policy', filters.policy);
        if (filters.minAmount !== undefined)
          params.append('minAmount', filters.minAmount.toString());
        if (filters.maxAmount !== undefined)
          params.append('maxAmount', filters.maxAmount.toString());
        if (filters.currency) params.append('currency', filters.currency);
        if (filters.merchant) params.append('merchant', filters.merchant);
        if (filters.flagged !== undefined) params.append('flagged', filters.flagged.toString());
        if (filters.needsUserAction !== undefined)
          params.append('needsUserAction', filters.needsUserAction.toString());
        if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
        if (filters.offset !== undefined) params.append('offset', filters.offset.toString());

        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      const response = await this.fetchWithAuth(url);

      logger.info('Successfully fetched sampled expenses');

      // Transform response to match expected structure
      if (
        response &&
        typeof response === 'object' &&
        'data' in response &&
        Array.isArray((response as unknown as ExpenseListResponse).data)
      ) {
        return response as ExpenseListResponse;
      } else {
        // Handle case where API returns data directly
        return {
          data: Array.isArray(response) ? (response as ExpenseData[]) : [response as ExpenseData],
        } as ExpenseListResponse;
      }
    } catch (error) {
      logger.error('Failed to fetch sampled expenses', error);
      throw error;
    }
  }

  // Create a new expense
  static async createExpense(expenseData: ExpenseCreatePayload): Promise<ExpenseResponse> {
    try {
      logger.debug('🚀 ExpenseManager.createExpense called with data:', expenseData);
      logger.info('Creating new expense', expenseData);

      // Validate required fields based on new structure
      if (
        !expenseData.merchantAmount ||
        !expenseData.merchantCurrency ||
        !expenseData.date ||
        !expenseData.merchant?.name
      ) {
        throw new Error(
          'Missing required fields: merchantAmount, merchantCurrency, date, merchant.name'
        );
      }

      if (expenseData.merchantAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Step 1: Create expense in draft state
      logger.debug('📝 Step 1: Creating draft expense via POST...');
      const createUrl = `${this.BASE_URL}/expenses/manual`;
      const draftExpense = await this.postWithAuth(createUrl, expenseData);

      logger.debug('✅ Draft expense created:', draftExpense);
      logger.info('Successfully created draft expense', {
        id: (draftExpense as ExpenseData)?.uuid || (draftExpense as Record<string, unknown>)?.id,
      });

      // Step 2: Extract expense ID and finalize expense with PATCH
      const expenseId =
        (draftExpense as ExpenseData)?.uuid || (draftExpense as Record<string, unknown>)?.id;
      logger.debug('🔍 Extracted expense ID:', expenseId);

      if (!expenseId) {
        logger.error('❌ No expense ID found in response:', draftExpense);
        throw new Error('No expense ID returned from draft creation');
      }

      logger.debug('🔧 Step 2: Finalizing expense via PATCH...');
      const finalizeUrl = `${this.BASE_URL}/expenses/${expenseId}`;
      const finalExpense = await this.patchWithAuth(finalizeUrl, expenseData);

      logger.debug('✅ Expense finalized:', finalExpense);
      logger.info('Successfully finalized expense', { id: expenseId });

      // Step 3: Submit expense to move it out of draft state
      logger.debug('📤 Step 3: Submitting expense via POST...');
      const submitUrl = `${this.BASE_URL}/expenses/${expenseId}/submit`;
      const submittedExpense = await this.postWithAuth(submitUrl, {});

      logger.debug('✅ Expense submitted:', submittedExpense);
      logger.info('Successfully submitted expense', { id: expenseId });

      // Transform response to match expected structure
      return {
        data: submittedExpense,
      } as ExpenseResponse;
    } catch (error) {
      logger.error('❌ ExpenseManager.createExpense failed:', error);
      logger.error('Failed to create expense', error);
      throw error;
    }
  }

  // Search transactions with advanced filtering
  static async searchTransactions(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    try {
      logger.info('Searching transactions', filters);

      // Use the same endpoint as getSampledExpenses but with different semantic meaning
      return await this.getSampledExpenses(filters);
    } catch (error) {
      logger.error('Failed to search transactions', error);
      throw error;
    }
  }

  // Get expense categories/policies available to the user
  static async getExpenseCategories(): Promise<string[]> {
    try {
      logger.info('Fetching expense categories');

      // This would typically come from a user policy endpoint
      // For now, return common categories based on the sample data
      const commonCategories = [
        'MEALS_SELF',
        'TRAVELING_MEALS_SELF',
        'INTERNET',
        'PHONE',
        'OFFICE_SUPPLIES',
        'SOFTWARE',
        'CONFERENCES',
        'MARKETING',
        'OTHER',
      ];

      logger.info('Returning common expense categories');

      return commonCategories;
    } catch (error) {
      logger.error('Failed to get expense categories', error);
      throw error;
    }
  }

  // Get expense statistics/summary
  static async getExpenseStats(filters?: Partial<ExpenseFilters>): Promise<{
    totalExpenses: number;
    totalAmount: number;
    currency: string;
    avgAmount: number;
    pendingExpenses: number;
    approvedExpenses: number;
  }> {
    try {
      logger.info('Calculating expense statistics', filters);

      const expenses = await this.getSampledExpenses(filters);

      if (!expenses.data || expenses.data.length === 0) {
        return {
          totalExpenses: 0,
          totalAmount: 0,
          currency: 'USD',
          avgAmount: 0,
          pendingExpenses: 0,
          approvedExpenses: 0,
        };
      }

      const totalExpenses = expenses.data.length;
      const totalAmount = expenses.data.reduce((sum, expense) => sum + expense.amount, 0);
      const avgAmount = totalAmount / totalExpenses;
      const pendingExpenses = expenses.data.filter((e) => e.status === 'PENDING').length;
      const approvedExpenses = expenses.data.filter((e) => e.status === 'APPROVED').length;
      const currency = expenses.data[0]?.currency || 'USD';

      const stats = {
        totalExpenses,
        totalAmount,
        currency,
        avgAmount: Math.round(avgAmount * 100) / 100,
        pendingExpenses,
        approvedExpenses,
      };

      logger.info('Successfully calculated expense statistics', stats);

      return stats;
    } catch (error) {
      logger.error('Failed to calculate expense statistics', error);
      throw error;
    }
  }

  // Validate expense data before creation
  static validateExpenseData(expenseData: ExpenseCreatePayload): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!expenseData.merchantAmount) {
      errors.push('Merchant amount is required');
    } else if (expenseData.merchantAmount <= 0) {
      errors.push('Merchant amount must be greater than 0');
    }

    if (!expenseData.merchantCurrency) {
      errors.push('Merchant currency is required');
    }

    if (!expenseData.date) {
      errors.push('Date is required');
    } else {
      const date = new Date(expenseData.date);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date format');
      }
    }

    if (!expenseData.merchant?.name || expenseData.merchant.name.trim().length === 0) {
      errors.push('Merchant name is required');
    }

    if (!expenseData.policy) {
      errors.push('Policy is required');
    }

    if (!expenseData.details) {
      errors.push('Expense details are required');
    }

    if (!expenseData.reportingData) {
      errors.push('Reporting data is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
