---
id: task-6
title: Create New Expense From Existing
status: Done
assignee: []
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

As a user of the Expensabl Application I should be able to create a new expense from an existing one

**Acceptance Criteria**
* After clicking `Fetch Expenses` from the `Recent Expenses` i should have an option of drilling into each expense returned
* The drilling into this expense should result in the SidePanel rendering a dedicated screen with the details of this expense
* I should have the option then to `Duplicate` expense which will create a new expense using the data from the chosen one
* The only different data in this new expense would be the dates

## Implementation Plan

1. Add clickable expense items with data-expense-id attributes
2. Create expense detail view HTML structure and CSS styling  
3. Implement showExpenseDetails function to fetch single expense
4. Add duplicate expense functionality with date updates
5. Add navigation between list and detail views
6. Test complete flow from list view to detail view to expense duplication

## Implementation Notes

Successfully implemented complete expense detail view and duplication functionality:

**Features Implemented:**
- ✅ Clickable expense items with data-expense-id attributes for drilling into details
- ✅ Expense detail view with comprehensive information display (merchant, amount, date, status, policy, etc.)
- ✅ Back navigation from detail view to expense list
- ✅ Duplicate expense functionality that creates new expense with current date
- ✅ Loading states and error handling for expense operations
- ✅ Proper Chrome extension messaging integration

**Technical Details:**
- Added expense detail HTML structure and CSS styling in sidepanel.html
- Implemented showExpenseDetailsView() function to fetch single expense via 'fetchExpense' action
- Created displayExpenseDetail() function to render expense information
- Added duplicateExpense() function that creates new expense with modified date
- Global showExpenseDetails() function attached to window for onclick handlers
- Proper navigation between list and detail views with showDetailView()/showListView()
- Error handling and user feedback for all operations

**Files Modified:**
- public/sidepanel.html: Added expense detail view HTML structure and CSS
- src/sidepanel.ts: Added expense detail functionality, duplication, and navigation

**User Experience:**
- Users can click on any expense item to view full details
- Detail view shows all relevant expense information in a clean layout
- Duplicate button creates new expense with today's date while preserving other data
- Smooth navigation between views with proper button states
- Loading indicators and error messages for better UX

The implementation fulfills all acceptance criteria and provides a complete expense management workflow.
