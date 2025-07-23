---
id: task-5
title: Add UI button to fetch and display expenses
status: Done
assignee: []
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

Create a user interface button in the side panel that allows users to fetch and display their expenses using the newly implemented ExpenseManager system.

## Acceptance Criteria

- [ ] Button added to side panel UI for fetching expenses
- [ ] Button integrates with ExpenseManager via ExpenseClient
- [ ] Fetched expenses are displayed in a user-friendly format
- [ ] Loading states are handled during API calls
- [ ] Error states are displayed when API calls fail
- [ ] Expenses list shows key information (amount, date, merchant, status)
- [ ] Basic styling matches existing UI components
- [ ] Button is functional and responds to user clicks
- [ ] UI provides feedback for successful expense fetching
- [ ] Expense list is scrollable if many expenses are returned

## Implementation Plan

1. Analyze existing side panel UI structure and styling
2. Add fetch expenses button to side panel HTML
3. Implement click handler that uses ExpenseClient to fetch expenses
4. Create expense display component/section in the UI
5. Add loading states and spinner during API calls
6. Implement error handling and display error messages
7. Style the expense list to show key information clearly
8. Test the complete flow from button click to expense display
9. Ensure responsive design and good user experience


## Implementation Notes

Successfully implemented expense UI with complete functionality:

## Implementation Summary

Added a comprehensive expense fetching and display UI to the side panel:

### 1. UI Components Added (public/sidepanel.html)
- ✅ Fetch Expenses button with success styling
- ✅ Refresh Expenses button (appears after first fetch)
- ✅ Status display area for feedback messages
- ✅ Scrollable expenses list container
- ✅ Comprehensive CSS styling with responsive design
- ✅ Loading spinner animation
- ✅ Status indicators (approved/pending/rejected)

### 2. Expense Display Features (src/sidepanel.ts)
- ✅ Integration with ExpenseManager via Chrome messaging
- ✅ Loading states during API calls with spinner
- ✅ Comprehensive error handling and display
- ✅ User-friendly expense formatting showing:
  - Merchant name (using prettyMerchantName)
  - Amount with currency formatting
  - Date in localized format
  - Expense policy/category
  - Status with color-coded badges
- ✅ Empty state handling
- ✅ Success feedback with expense count

### 3. User Experience Enhancements
- ✅ Responsive design for different screen sizes
- ✅ Smooth animations and transitions
- ✅ Hover effects on expense items
- ✅ Custom scrollbar styling
- ✅ Button state management (disabled during loading)
- ✅ Clear visual feedback for all states

### 4. Technical Implementation
- ✅ Chrome extension messaging integration
- ✅ TypeScript interfaces for type safety
- ✅ Error handling for network failures and token issues
- ✅ Async/await patterns for clean code
- ✅ DOM manipulation with proper element selection
- ✅ Event listener management

### 5. Styling and Design
- ✅ Consistent with existing UI components
- ✅ Clean, scannable expense list layout
- ✅ Status badges with appropriate colors
- ✅ Responsive design for mobile/narrow viewports
- ✅ Loading indicators and smooth transitions
- ✅ Proper spacing and typography

### 6. Integration with ExpenseManager
- ✅ Uses 'getSampledExpenses' action from background script
- ✅ Handles both data formats (nested and direct arrays)
- ✅ Proper error propagation from API layer
- ✅ Graceful handling of authentication failures

The implementation successfully fulfills all acceptance criteria and provides a polished, user-friendly interface for viewing expenses within the Chrome extension side panel.
## Reference Materials

### Current Side Panel Structure

The side panel UI is located in:
- **HTML**: `public/sidepanel.html` - Contains the basic structure
- **TypeScript**: `src/sidepanel.ts` - Contains the JavaScript logic
- **Existing functionality**: Currently displays welcome message

### ExpenseClient Integration

Use the ExpenseClient utility created in task-4:
```typescript
import { ExpenseClient } from '../utils/expenseClient';

// Fetch expenses example
const expenses = await ExpenseClient.getSampledExpenses();
```

### Available ExpenseManager Operations

From the completed ExpenseManager implementation:
- `ExpenseClient.getSampledExpenses(filters?)` - Get list of expenses
- `ExpenseClient.fetchExpense(id)` - Get single expense details
- `ExpenseClient.getExpenseStats(filters?)` - Get expense statistics
- `ExpenseClient.getExpenseCategories()` - Get available categories

### Expected Expense Data Structure

Each expense will contain:
- `uuid` - Unique identifier
- `amount` - Expense amount
- `currency` - Currency code (e.g., "USD")
- `date` - Expense date
- `merchant.name` - Merchant name
- `status` - Approval status (e.g., "APPROVED", "PENDING")
- `policy` - Expense category/policy
- `prettyMerchantName` - Display name for merchant

### UI Requirements

- Follow existing Chrome extension side panel patterns
- Use consistent styling with current UI components
- Provide clear visual feedback for loading and error states
- Display expenses in a clean, scannable format
- Handle cases where no expenses are returned
- Consider pagination or limiting initial results for performance

### Integration Notes

The UI should:
1. Import and use ExpenseClient from the utils directory
2. Handle Chrome extension messaging errors gracefully
3. Show appropriate messages when tokens are not available
4. Follow the established error handling patterns from the existing codebase
