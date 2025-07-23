---
id: task-7
title: Fix ExpenseCreatePayload interface and duplicate expense functionality
status: Done
assignee: []
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

The current ExpenseCreatePayload interface is oversimplified and doesn't match the actual Navan API structure for creating expenses. This causes the duplicate expense functionality to fail or create malformed requests. The interface needs to be updated to match the proper API structure with merchant object, details, reportingData, and other required fields.

## Acceptance Criteria

- [ ] ExpenseCreatePayload interface updated to match actual API structure with proper merchant object
- [ ] ExpenseCreatePayload includes all required fields: date
- [ ] merchant
- [ ] merchantAmount
- [ ] merchantCurrency
- [ ] policy
- [ ] details
- [ ] reportingData
- [ ] Duplicate expense functionality creates proper payload from existing expense data
- [ ] User (Chris) manually verifies that duplicate expense functionality works end-to-end
- [ ] User can click on expense item to view details
- [ ] User can click Duplicate Expense button and new expense is created successfully
- [ ] New expense appears in expense list with today's date
- [ ] All other expense data (merchant
- [ ] amount
- [ ] policy) is preserved from original

## Implementation Plan

1. Read task-7 requirements and understand current ExpenseCreatePayload
2. Update ExpenseCreatePayload interface to match actual API structure with proper merchant object, details, and reportingData
3. Fix duplicate expense functionality to create proper payload from existing expense data
4. Update ExpenseManager validation methods to work with new structure
5. Test build compilation and resolve TypeScript errors
6. Ready for user manual verification of complete duplicate expense flow

## Implementation Notes

Successfully implemented proper ExpenseCreatePayload interface and duplicate expense functionality:

**Implementation Completed:**
- ✅ Updated ExpenseCreatePayload interface to match actual Navan API structure with proper merchant object, details, and reportingData
- ✅ Added ExpenseCreateMerchant, ExpenseCreateDetails, and ExpenseCreateReportingData interfaces
- ✅ Fixed duplicate expense functionality to create proper payload from existing expense data
- ✅ Updated ExpenseManager validation methods to work with new structure
- ✅ Build compiles successfully with no TypeScript errors

**User Manual Verification Results:**
- ✅ User (Chris) confirmed duplicate expense functionality works end-to-end
- ✅ User can click on expense item to view details
- ✅ User can click Duplicate Expense button and new expense is created successfully
- ✅ New expense appears in expense list with today's date
- ✅ All other expense data (merchant, amount, policy) is preserved from original

**Technical Details:**
- ExpenseCreatePayload now includes proper nested structure: date, merchant, merchantAmount, merchantCurrency, policy, details, reportingData
- Duplicate functionality maps all fields correctly from original expense to new expense
- Today's date is properly set using ISO string format
- All validation methods updated to handle new payload structure

**Files Modified:**
- src/model/expense.ts: Updated ExpenseCreatePayload and added supporting interfaces
- src/sidepanel.ts: Updated duplicateExpense function to create proper payload
- src/services/expenseManager.ts: Updated validation methods for new structure

The duplicate expense feature now works correctly with the proper API payload structure.
