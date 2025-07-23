---
id: task-40
title: Add sorting and pagination controls to Recent Expenses section
status: To Do
assignee: []
created_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

The Recent Expenses section currently fetches expenses without explicit sorting or pagination controls. The API supports sorting by various attributes (date, amount, etc.) and pagination parameters (limit, offset), but these are not exposed in the UI. Users need the ability to sort expenses by creation date and other attributes, and control how many expenses are displayed.

## Acceptance Criteria

- [ ] Users can sort expenses by creation date (newest/oldest first)
- [ ] Users can sort expenses by amount (highest/lowest)
- [ ] Users can sort expenses by merchant name (A-Z/Z-A)
- [ ] Users can change the number of expenses displayed (20/50/100)
- [ ] Sorting preference persists across sessions using Chrome storage
- [ ] UI clearly indicates current sort order
- [ ] All existing tests continue to pass
