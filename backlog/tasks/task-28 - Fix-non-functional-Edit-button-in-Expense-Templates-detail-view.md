---
id: task-28
title: Fix non-functional Edit button in Expense Templates detail view
status: Done
assignee:
  - '@christopher'
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

The Edit button in the template detail view does not trigger edit mode, while the pencil icon in the template list view works correctly. This is due to the Edit button relying on the selectedTemplate variable which may not be properly set in all navigation scenarios. Users expect both edit triggers to work consistently.

## Acceptance Criteria

- [x] Edit button in template detail view successfully triggers edit mode when clicked
- [x] Edit functionality works regardless of navigation path (list view click or direct navigation)
- [x] selectedTemplate variable is properly set when showing template details
- [x] Manual validation confirms Edit button works in all scenarios
- [x] No regression in pencil icon edit functionality

## Implementation Plan

1. Examine the current template detail view code to understand the Edit button implementation
2. Identify why selectedTemplate might not be set properly
3. Compare with the working pencil icon implementation in list view
4. Fix the Edit button to ensure it works in all navigation scenarios
5. Test both navigation paths (clicking from list and direct navigation)
6. Verify no regression in existing functionality

## Implementation Notes

### Approach Taken
The issue was identified in the Edit button click handler in the template detail view. The Edit button was calling `showTemplateEditForm` directly, while the working pencil icon in the list view was calling `enhancedShowTemplateEditForm`. The enhanced version includes additional functionality for scheduling form population and event handler initialization.

### Features Modified
- Updated the Edit button event listener in `src/sidepanel.ts` (line 1213) to call `enhancedShowTemplateEditForm` instead of `showTemplateEditForm`
- This ensures consistent behavior between the pencil icon in list view and the Edit button in detail view

### Technical Decisions
- Chose to update the existing event handler rather than creating a new one to maintain consistency
- The fix is minimal and focused, changing only the function call to match the working implementation
- No changes were needed to the `selectedTemplate` variable handling as it was already being set correctly in `showTemplateDetail`

### Modified Files
- `src/sidepanel.ts`: Changed line 1213 from `showTemplateEditForm(selectedTemplate.id)` to `enhancedShowTemplateEditForm(selectedTemplate.id)`
