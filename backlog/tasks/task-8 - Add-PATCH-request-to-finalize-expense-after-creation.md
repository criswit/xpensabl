---
id: task-8
title: Add PATCH request to finalize expense after creation
status: Done
assignee: []
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

Currently, the createExpense method only performs a POST request which creates the expense in draft state. A PATCH request needs to be made after the POST to move the expense out of draft state and finalize it. This two-step process ensures expenses are properly created and immediately available in non-draft state.

## Acceptance Criteria

- [ ] Add patchWithAuth method to ExpenseManager for making PATCH requests
- [ ] Update createExpense to perform POST followed by PATCH request
- [ ] Extract expense ID from POST response to use in PATCH request
- [ ] PATCH request uses same payload structure as POST
- [ ] Error handling implemented for both requests
- [ ] Expenses are successfully created in finalized state (not draft)
- [ ] User can see newly created expenses immediately without draft status
- [ ] Duplicate expense functionality creates finalized expenses

## Implementation Plan

1. Add patchWithAuth method to ExpenseManager for making PATCH requests
2. Update createExpense method to perform POST (create draft) followed by PATCH (finalize)
3. Extract expense ID from POST response to use in PATCH request URL
4. Add comprehensive error handling for both requests
5. Build and test implementation - ready for user verification
6. User testing to verify expenses are created in finalized state (not draft)
