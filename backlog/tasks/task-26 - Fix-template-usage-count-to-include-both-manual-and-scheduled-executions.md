---
id: task-26
title: Fix template usage count to include both manual and scheduled executions
status: Done
assignee:
  - '@christopher'
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

The usage count displayed in the expense templates section only shows manual template applications (via Apply Template button) but does not include scheduled executions. This causes confusion when the execution history shows multiple entries but the usage count remains at 1. The UI should display the total usage count combining both useCount and scheduledUseCount fields.

## Acceptance Criteria

- [x] Usage count display shows combined total of manual and scheduled executions
- [x] Template cards show total usage count (useCount + scheduledUseCount)
- [x] Template detail view shows total usage count (useCount + scheduledUseCount)
- [x] Usage count tooltip or label clarifies it includes both manual and scheduled uses
- [x] Existing templates correctly display their total usage after update

## Implementation Plan

1. Locate where usage count is displayed in template cards and detail view
2. Check the template data structure for useCount and scheduledUseCount fields
3. Update template card display to show combined total
4. Update template detail view to show combined total
5. Test that combined counts display correctly
6. Consider adding clarification about what the count includes

## Implementation Notes

### Approach Taken
Updated the usage count display logic to calculate and show the combined total of manual applications (useCount) and scheduled executions (scheduledUseCount). Added tooltips to clarify what the count represents.

### Features Modified
- Template card display now calculates `useCount = manualCount + scheduledCount` before rendering
- Template detail view uses the same combined calculation
- Added `title` attributes to provide hover tooltips explaining the count breakdown
- Template list shows "Used X times" with tooltip "Includes manual and scheduled uses"
- Detail view shows "Total Usage: X times" with tooltip showing the breakdown (e.g., "Manual: 3, Scheduled: 7")

### Technical Decisions
- Calculated combined count at display time rather than storing it, to avoid data consistency issues
- Used HTML title attributes for tooltips as they're universally supported and accessible
- Changed detail view label from "Usage Count" to "Total Usage" for clarity
- Preserved backward compatibility by using fallback values of 0 when fields are undefined

### Modified Files
- `src/sidepanel.ts`: Updated lines 364-366 and 596-598 to calculate combined counts, added tooltips at lines 455 and 654
