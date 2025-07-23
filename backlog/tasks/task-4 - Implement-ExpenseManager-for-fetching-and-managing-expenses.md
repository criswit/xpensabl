---
id: task-4
title: Implement ExpenseManager for fetching and managing expenses
status: Done
assignee: []
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

Create an ExpenseManager class that leverages the existing token management system to fetch expenses from Navan's API, following the established pattern from the reference content.js implementation.

## Acceptance Criteria

- [ ] ExpenseManager class created with fetchExpense() method
- [ ] ExpenseManager class supports getSampledExpenses() method
- [ ] ExpenseManager class supports createExpense() method
- [ ] API client integrates with existing TokenManager for authentication
- [ ] Comprehensive TypeScript types match Navan API response structure
- [ ] Background script handlers added for expense operations
- [ ] Error handling follows established patterns
- [ ] All methods return properly typed responses

## Implementation Plan

1. Analyze existing codebase structure and TokenManager integration
2. Create enhanced expense model with comprehensive TypeScript types based on Navan API
3. Implement ExpenseManager class with core methods (fetchExpense, getSampledExpenses, createExpense)
4. Add API helper methods (fetchWithAuth, postWithAuth) following reference pattern
5. Integrate with background script for message handling
6. Add comprehensive error handling and validation
7. Test integration with existing token management system


## Implementation Notes

Successfully implemented ExpenseManager with complete integration:

## Implementation Summary

Created a comprehensive expense management system following the established patterns:

### 1. Enhanced Expense Model (src/model/expense.ts)
- Comprehensive TypeScript interfaces matching Navan API structure
- Support for full expense data including user, merchant, policy, and tax details
- Response wrappers and error handling types
- Filtering and creation payload interfaces

### 2. ExpenseManager Service (src/services/expenseManager.ts)
- Core methods: fetchExpense(), getSampledExpenses(), createExpense()
- Additional utilities: searchTransactions(), getExpenseCategories(), getExpenseStats()
- Integration with existing TokenManager for authentication
- Comprehensive error handling and validation
- Logging following established patterns

### 3. Background Script Integration (src/background.ts)
- Added expense-related message handlers
- Validation and error handling for all operations
- Consistent response format with existing handlers
- Support for all expense operations

### 4. Client Utilities (src/utils/expenseClient.ts)
- Chrome extension messaging abstraction
- Two implementations: standard and compatibility mode
- Error handling and logging
- Type-safe interfaces

### 5. Features Implemented
- ✅ Single expense fetching with ID validation
- ✅ Expense list retrieval with filtering support
- ✅ Expense creation with comprehensive validation
- ✅ Transaction search capabilities
- ✅ Expense categories management
- ✅ Statistics and analytics
- ✅ Full TypeScript type coverage
- ✅ Error handling following established patterns
- ✅ TokenManager integration for authentication

### 6. API Endpoints Supported
- GET /api/liquid/user/expenses/{uuid} - Single expense
- GET /api/liquid/user/search/transactions - Expense list/search
- POST /api/liquid/user/expenses/manual - Create expense

The implementation follows the reference content.js pattern while integrating seamlessly with the existing Chrome extension architecture and TokenManager system.
## Reference Materials

### Example Implementation Pattern (content.js)

The following content.js shows the established pattern for API integration:

```javascript
async function getBearerToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('bearerToken', (result) => {
      if (result.bearerToken) resolve(result.bearerToken);
      else reject('No bearer token found.');
    });
  });
}

async function fetchWithBearer(url) {
  const token = await getBearerToken();
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en",
      "authorization": token
    }
  });
  return res.json();
}

async function postExpenseWithBearer(url, payload) {
  const token = await getBearerToken();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en",
      "authorization": token,
      "content-type": "application/json",
      "x-timezone": "America/Los_Angeles"
    },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new Error(`API Error ${res.status}: ${errorData.message || errorData.error || 'Unknown error'}`);
  }
  
  return res.json();
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.action === 'fetchExpense') {
        const guid = msg.selectedTxn.id;
        const url = `https://app.navan.com/api/liquid/user/expenses/${guid}`;
        const data = await fetchWithBearer(url);
        sendResponse({ data });
      } else if (msg.action === 'getSampledExpenses') {
        const url = 'https://app.navan.com/api/liquid/user/search/transactions';
        const data = await fetchWithBearer(url);
        sendResponse({ data });
      } else if (msg.action === 'createExpense') {
        const url = 'https://app.navan.com/api/liquid/user/expenses/manual';
        const apiResponse = await postExpenseWithBearer(url, msg.expenseData);
        sendResponse({ success: true, data: apiResponse });
      }
    } catch (error) {
      sendResponse({ error: error.toString() });
    }
  })();
  return true;
});
```

### API Endpoints to Implement

1. **Single Expense**: `GET /api/liquid/user/expenses/{uuid}`
2. **Expense List**: `GET /api/liquid/user/search/transactions` 
3. **Create Expense**: `POST /api/liquid/user/expenses/manual`

### Sample Navan API Response Structure

The expense API returns comprehensive data structures. Here's a sample response from fetching a single expense:

```json
{
  "data": {
    "dateReimbursementScheduled": null,
    "dateCreated": "2025-07-02T08:07:07.912516Z",
    "dateModified": "2025-07-02T08:07:47.693155Z",
    "uuid": "2d36e42e-6ece-4052-947c-399c519bf632",
    "user": {
      "dateCreated": "2025-03-31T02:08:15.191867Z",
      "dateModified": "2025-03-31T02:08:15.191867Z",
      "uuid": "10fe0d79-63f9-46e0-8cf7-73868c585182",
      "companyUuid": "3165ea56-a15f-47bd-9f48-d69657de7b6d",
      "email": "chris@extendabl.dev",
      "givenName": "Chris",
      "familyName": "Whitfield",
      "fullName": "Chris Whitfield"
    },
    "source": "MANUAL",
    "status": "APPROVED",
    "reimbursementMethod": "PAYROLL",
    "date": "2025-07-02",
    "instant": "2025-07-02T19:00:00.111111Z",
    "dateSubmitted": "2025-07-02T08:07:46.104556Z",
    "dateApproved": "2025-07-02T08:07:46.805206Z",
    "accountAmount": 3,
    "accountCurrency": "USD",
    "merchantAmount": 3,
    "merchantCurrency": "USD",
    "billableEntityAmount": 3,
    "billableEntityCurrency": "USD",
    "approvedAmount": 3,
    "merchant": {
      "uuid": "10a51d0d-ff67-412f-8fa6-0cd2b4f5e580",
      "name": "Valvoline Instant Oil Change",
      "logo": "https://d3no0udchlzlus.cloudfront.net/merchantChains/86a0673f-2dc9-4736-986b-d9ecf9e4e09b_valvoline.jpeg",
      "category": "auto_service_shops",
      "online": true,
      "perDiem": false,
      "timeZone": "Z",
      "formattedAddress": "",
      "categoryGroup": "OTHER"
    },
    "reportingData": {
      "department": null,
      "billTo": null,
      "region": null,
      "subsidiary": null,
      "billableEntityUuid": "8f789cbb-e9af-4a0c-bd95-83515e6ce769"
    },
    "receiptRequired": false,
    "receiptKey": null,
    "receiptThumbnailKey": null,
    "receiptPageCount": null,
    "details": {
      "customFieldValues": [],
      "glCode": null,
      "dateCreated": "2025-07-02T08:07:07.905996Z",
      "dateModified": "2025-07-02T08:07:47.693155Z",
      "id": "2d36e42e-6ece-4052-947c-399c519bf632",
      "companyUuid": "3165ea56-a15f-47bd-9f48-d69657de7b6d",
      "userUuid": "10fe0d79-63f9-46e0-8cf7-73868c585182",
      "participants": [
        {
          "uuid": "10fe0d79-63f9-46e0-8cf7-73868c585182",
          "email": "chris@extendabl.dev",
          "givenName": "Chris",
          "familyName": "Whitfield",
          "fullName": "Chris Whitfield"
        }
      ],
      "description": null,
      "personal": false,
      "verified": false,
      "itemized": false
    },
    "policy": "MEALS_SELF",
    "customPolicyUuid": null,
    "flagged": false,
    "flag": {
      "status": null,
      "reasons": {},
      "reason": null,
      "refundAmount": null
    },
    "currency": "USD",
    "amount": 3,
    "chargeType": "PHYSICAL",
    "authorizationInstant": "2025-07-02T19:00:00.111111Z",
    "authorizationDate": "2025-07-02",
    "adminApprovalRequired": true,
    "policyName": "Meals for myself",
    "mileageExpense": false,
    "perDiemExpense": false,
    "prettyMerchantName": "Valvoline Instant Oil Change",
    "flagDescriptions": [],
    "glCodeRequired": true,
    "needsUserAction": false,
    "assignedApproverUuids": [],
    "canChangeApprover": false,
    "autoRejected": false,
    "policyDescription": {
      "type": "MEALS_SELF",
      "customPolicyUuid": null,
      "name": "Meals for myself",
      "description": "This policy covers meal expenses for individuals.",
      "picture": "https://d3no0udchlzlus.cloudfront.net/policy-image/meals.png"
    },
    "_links": {
      "self": {
        "href": "https://app.navan.com/api/liquid/user/expenses/2d36e42e-6ece-4052-947c-399c519bf632"
      },
      "activity": {
        "href": "https://app.navan.com/api/liquid/user/expenses/2d36e42e-6ece-4052-947c-399c519bf632/activities"
      }
    }
  }
}
```

### Key Implementation Requirements

1. **TypeScript Integration**: Create comprehensive interfaces matching the API response structure
2. **Token Management**: Use existing `TokenManager.getCurrentToken()` instead of direct storage access
3. **Error Handling**: Follow the established pattern with structured error responses
4. **Headers**: Match the reference implementation headers including timezone
5. **Message Handling**: Integrate with existing background script message system
6. **Chrome Extension APIs**: Leverage existing storage and messaging patterns
