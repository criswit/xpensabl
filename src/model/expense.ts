// Basic expense type (legacy - keeping for backward compatibility)
export type expense = {
    id: string
    name: string
}

// Comprehensive expense interfaces based on Navan API response structure

export interface ExpenseUser {
  dateCreated: string;
  dateModified: string;
  uuid: string;
  companyUuid: string;
  email: string;
  givenName: string;
  familyName: string;
  fullName: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
  guest: boolean;
  enabled: boolean;
  deactivationDate?: string;
  companyDelegate: boolean;
  employeeId?: string;
  title?: string;
  policyLevel: string;
  companyPolicyLevelUuid: string;
  department?: string;
  billTo?: string;
  region?: string;
  subsidiary?: string;
  physicalCardCount: number;
  physicalCardStatus: string;
  companyOfficeUuid: string;
  managerUuid?: string;
  travelApproverUuid?: string;
  hotelFolioRequestEnabled: boolean;
}

export interface ExpenseMerchant {
  uuid: string;
  name: string;
  logo?: string;
  category: string;
  online: boolean;
  perDiem: boolean;
  timeZone: string;
  formattedAddress: string;
  categoryGroup: string;
}

export interface ExpenseReportingData {
  department?: string;
  billTo?: string;
  region?: string;
  subsidiary?: string;
  billableEntityUuid: string;
}

export interface ExpenseParticipant {
  uuid: string;
  email: string;
  givenName: string;
  familyName: string;
  fullName: string;
  pictureHash?: string;
  guest: boolean;
  picture?: string;
}

export interface ExpenseTaxDetails {
  vatNumber?: string;
  taxLines: any[];
  country: string;
  address?: string;
  noTax: boolean;
  reverseCharge: boolean;
  syncedFromLedger: boolean;
  ledgerMerchantName?: string;
  taxRateDecimal: boolean;
  netAmount?: number;
  tax?: number;
  grossAmount?: number;
}

export interface ExpenseDetails {
  customFieldValues: any[];
  glCode?: string;
  dateCreated: string;
  dateModified: string;
  id: string;
  companyUuid: string;
  userUuid: string;
  postedDate?: string;
  participants: ExpenseParticipant[];
  calendarEventUrl?: string;
  calendarEventName?: string;
  calendarEventLocation?: string;
  description?: string;
  tripUuid?: string;
  personal: boolean;
  personalAmount?: number;
  personalMerchantAmount?: number;
  supplierUuid?: string;
  taxDetails: ExpenseTaxDetails;
  taxDetailsLastUpdatedOn: string;
  lastUpdatedByUserUuid: string;
  verified: boolean;
  itemized: boolean;
  itemizedByUserUuid?: string;
  managerUuid?: string;
  travelApproverUuid?: string;
  invoiceDate?: string;
  invoiceNumber?: string;
  estimatedDocumentDate?: string;
  estimatedDocumentNumber?: string;
  fxFeeAmount: number;
  fxFeePercentage: number;
  directReimbursementFeeAmount: number;
  directReimbursementFeePercentage: number;
  approvedByUuid?: string;
  approvedByEmail?: string;
  adminApprovalRequired: boolean;
  assignedApproverUuids: string[];
}

export interface ExpenseFlag {
  status?: string;
  reasons: Record<string, any>;
  reason?: string;
  refundAmount?: number;
  refundPolicyAmount?: number;
  refundedAmount: number;
  refundedPolicyAmount: number;
  note?: string;
  autoRejectReason?: string;
  reasonList: string[];
  adminNote?: string;
}

export interface ExpensePolicyDescription {
  type: string;
  customPolicyUuid?: string;
  name: string;
  description: string;
  customPolicyMerchantCategoryGroups?: any;
  picture?: string;
  newPicture?: string;
  defaultFlagSpendIntervals: string[];
  defaultDeclineSpendIntervals: string[];
  warningAmounts: Record<string, Record<string, number>>;
}

export interface ExpenseLinks {
  self: { href: string };
  activity: { href: string };
  flagComments?: { href: string };
  'action.edit'?: { href: string };
  relatedTransactions?: { href: string };
}

export interface ExpenseData {
  dateReimbursementScheduled?: string;
  dateCreated: string;
  dateModified: string;
  uuid: string;
  user: ExpenseUser;
  source: string;
  plaidTransaction?: any;
  status: string;
  reimbursementMethod: string;
  date: string;
  instant: string;
  dateSubmitted: string;
  dateApproved?: string;
  dateReimbursementInitiated?: string;
  dateReimbursementCompleted?: string;
  accountAmount: number;
  accountCurrency: string;
  merchantAmount: number;
  merchantCurrency: string;
  billableEntityAmount: number;
  billableEntityCurrency: string;
  approvedAmount: number;
  merchant: ExpenseMerchant;
  reportingData: ExpenseReportingData;
  receiptRequired: boolean;
  receiptKey?: string;
  receiptThumbnailKey?: string;
  receiptPageCount?: number;
  details: ExpenseDetails;
  policy: string;
  customPolicyUuid?: string;
  policyAddedInstant: string;
  flagged: boolean;
  flag: ExpenseFlag;
  reimbursementAmount?: number;
  reimbursementCurrency?: string;
  reimbursementAccountAmount?: number;
  repaymentId?: string;
  bookingUuids: string[];
  bookingIds: string[];
  creditLineUuid?: string;
  creditLineTransactionUuid?: string;
  currency: string;
  ereceiptKey?: string;
  ereceiptThumbnailKey?: string;
  amount: number;
  postedInstant?: string;
  chargeType: string;
  authorizationInstant: string;
  authorizationDate: string;
  reconciliationType?: string;
  postedAmount: number;
  userPolicyRevisionId: string;
  approvedPolicyAmount: number;
  cardMccUpdateAllowed: boolean;
  tripUuid?: string;
  itemized: boolean;
  adminApprovalRequired: boolean;
  policyName: string;
  priceQuote?: any;
  managerUuid?: string;
  travelApproverUuid?: string;
  mileageExpense: boolean;
  perDiemExpense: boolean;
  mileageExpenseV2: boolean;
  basicMileage: boolean;
  advancedMileage: boolean;
  mileageExpenseV1: boolean;
  travelRelatedPayLaterHotelTransaction: boolean;
  _trip?: any;
  _bookings?: any;
  '@type': string;
  prettyMerchantName: string;
  _type: string;
  dateOnly: boolean;
  perDiem: boolean;
  repayable: boolean;
  tags: string[];
  flagDescriptions: string[];
  glCodeRequired: boolean;
  approvedByEmail?: string;
  policyAmount: number;
  policyCurrency: string;
  noReceipt: boolean;
  approvedByUuid?: string;
  needsUserAction: boolean;
  assignedApproverUuids: string[];
  canChangeApprover: boolean;
  personalPolicyAmount: number;
  autoRejected: boolean;
  policyDescription: ExpensePolicyDescription;
  _links: ExpenseLinks;
}

// Response wrapper for single expense API call
export interface ExpenseResponse {
  data: ExpenseData;
}

// Response wrapper for expense list API calls
export interface ExpenseListResponse {
  data: ExpenseData[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Merchant object for expense creation
export interface ExpenseCreateMerchant {
  category: string;
  categoryGroup: string;
  description: string;
  formattedAddress: string;
  logo?: string;
  name: string;
  online: boolean;
  perDiem: boolean;
  timeZone: string;
}

// Details object for expense creation
export interface ExpenseCreateDetails {
  customFieldValues: any[];
  description: string;
  participants: ExpenseParticipant[];
  personal: boolean;
  personalMerchantAmount?: number;
  taxDetails: {
    address?: string;
    country: string;
    grossAmount?: number;
    ledgerMerchantName?: string;
    netAmount?: number;
    noTax: boolean;
    reverseCharge: boolean;
    syncedFromLedger: boolean;
    tax?: number;
    taxLines: any[];
    taxRateDecimal: boolean;
    vatNumber?: string;
  };
}

// Reporting data for expense creation
export interface ExpenseCreateReportingData {
  billTo?: string;
  department?: string;
  region?: string;
  subsidiary?: string;
}

// Expense creation payload - updated to match actual API structure
export interface ExpenseCreatePayload {
  date: string;
  merchant: ExpenseCreateMerchant;
  merchantAmount: number;
  merchantCurrency: string;
  policy: string;
  details: ExpenseCreateDetails;
  reportingData: ExpenseCreateReportingData;
}

// Expense filtering options
export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  policy?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  merchant?: string;
  flagged?: boolean;
  needsUserAction?: boolean;
  limit?: number;
  offset?: number;
}

// Error response structure
export interface ExpenseApiError {
  error: string;
  message?: string;
  status?: number;
  details?: any;
}