import { ExpenseCreateMerchant, ExpenseParticipant, ExpenseCreateReportingData } from './expense';

export const CURRENT_SCHEMA_VERSION = 1;

export type ScheduleInterval = 'daily' | 'weekly' | 'monthly' | 'custom';
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';
export type ExecutionStatus = 'success' | 'failed' | 'pending' | 'skipped' | 'retry';

export interface TemplateTaxDetails {
  country: string;
  noTax: boolean;
  reverseCharge: boolean;
  taxRateDecimal: boolean;
  vatNumber?: string;
  address?: string;
}

export interface TemplateExpenseData {
  merchantAmount: number;
  merchantCurrency: string;
  policy: string;
  merchant: ExpenseCreateMerchant;
  details: {
    description: string;
    personal: boolean;
    personalMerchantAmount?: number;
    participants: ExpenseParticipant[];
    customFieldValues: Array<{
      fieldId: string;
      value: string | number | boolean;
    }>;
    taxDetails: TemplateTaxDetails;
  };
  reportingData: ExpenseCreateReportingData;
}

export interface TemplateScheduling {
  enabled: boolean;
  interval: ScheduleInterval;
  startDate: number;
  endDate?: number;

  intervalConfig: {
    daysOfWeek?: DayOfWeek[];
    dayOfMonth?: number | 'last';
    customIntervalMs?: number;
  };

  executionTime: {
    hour: number;
    minute: number;
    timeZone: string;
  };

  nextExecution: number | null;

  paused: boolean;
  pausedAt?: number;
  pauseReason?: string;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retriable: boolean;
}

export interface ExecutionMetadata {
  userNotified: boolean;
  navanSessionValid: boolean;
  tokenUsed?: string;
  duration: number;
  retryScheduledAt?: number;
}

export interface TemplateExecution {
  id: string;
  templateId: string;
  scheduledAt: number;
  executedAt: number;
  status: ExecutionStatus;
  expenseId?: string;
  error?: ExecutionError;
  retryCount: number;
  metadata: ExecutionMetadata;
}

export interface TemplateMetadata {
  sourceExpenseId?: string;
  createdFrom: 'manual' | 'expense' | 'duplicate';
  tags: string[];
  color?: string;
  favorite: boolean;
  lastUsed?: number;
  useCount: number;
  scheduledUseCount: number;
}

export interface ExpenseTemplate {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: number;

  expenseData: TemplateExpenseData;
  scheduling: TemplateScheduling | null;
  executionHistory: TemplateExecution[];
  metadata: TemplateMetadata;
}

export interface TemplatePreferences {
  maxTemplates: number;
  defaultTimeZone: string;
  notificationEnabled: boolean;
  autoCleanupDays: number;
  [key: string]: unknown;
}

export interface TemplateIndex {
  id: string;
  name: string;
  updatedAt: number;
  schedulingEnabled: boolean;
  nextExecution?: number;
}

export interface ScheduledExecution {
  id: string;
  templateId: string;
  scheduledAt: number;
  status: 'pending' | 'processing';
  retryCount: number;
}

export interface MigrationState {
  currentVersion: number;
  lastMigration?: number;
  pendingMigrations: string[];
}

export interface TemplateSyncStorage {
  version: number;
  preferences: TemplatePreferences;
  templateIndex: TemplateIndex[];
}

export interface TemplateLocalStorage {
  templates: Record<string, ExpenseTemplate>;
  executionQueue: ScheduledExecution[];
  migrationState: MigrationState;
}

export interface TemplateStorageSchema {
  'xpensabl.templates.sync': TemplateSyncStorage;
  'xpensabl.templates.local': TemplateLocalStorage;
}

export interface CreateTemplateRequest {
  name: string;
  expenseData: TemplateExpenseData;
  sourceExpenseId?: string;
  createdFrom?: 'manual' | 'expense' | 'duplicate';
  tags?: string[];
}

export interface QuotaInfo {
  used: number;
  available: number;
  percentUsed: number;
  nearLimit: boolean;
}

export interface MigrationHandler {
  version: number;
  description: string;
  migrate(data: unknown): Promise<unknown>;
  rollback?(data: unknown): Promise<unknown>;
}

export class StorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class TemplateError extends Error {
  constructor(
    public code: string,
    message: string,
    public templateId?: string
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

export const STORAGE_ERROR_CODES = {
  SYNC_READ_FAILED: 'Failed to read from sync storage',
  SYNC_WRITE_FAILED: 'Failed to write to sync storage',
  LOCAL_READ_FAILED: 'Failed to read from local storage',
  LOCAL_WRITE_FAILED: 'Failed to write to local storage',
  SYNC_QUOTA_EXCEEDED: 'Sync storage quota exceeded',
  LOCAL_QUOTA_EXCEEDED: 'Local storage quota exceeded',
} as const;

export const TEMPLATE_ERROR_CODES = {
  TEMPLATE_NOT_FOUND: 'Template not found',
  TEMPLATE_LIMIT_EXCEEDED: 'Maximum template limit exceeded',
  INVALID_NAME: 'Invalid template name',
  INVALID_EXPENSE_DATA: 'Invalid expense data',
  SCHEDULING_ERROR: 'Error in template scheduling configuration',
} as const;
