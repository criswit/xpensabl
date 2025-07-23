---
id: task-31
title: Improve custom scheduling UI with start time and flexible interval units
status: Done
assignee:
  - '@christopher'
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

The current scheduling UI uses 'Execution Time' which can be confusing for frequent custom intervals. Users need a clearer interface that separates when scheduling starts from how often it repeats, and supports both minute and hour-based intervals for better usability.

## Acceptance Criteria

- [ ] Scheduling UI shows 'Execution Start Time' instead of 'Execution Time' for custom intervals
- [ ] Custom interval input supports both minutes and hours as selectable units
- [ ] Start time picker clearly indicates when the first execution will occur
- [ ] Interval configuration is intuitive for both short (5-minute) and long (24-hour) frequencies
- [ ] All existing scheduling functionality continues to work unchanged
- [ ] Users can easily configure frequent schedules like 'every 5 minutes starting at 2:30 PM'
## Implementation Plan

1. Update HTML to change 'Execution Time' label to 'Execution Start Time' for better clarity
2. Add interval unit selector dropdown (minutes/hours) to custom interval configuration
3. Update JavaScript logic to handle both minute and hour intervals in custom scheduling
4. Improve UI messaging to clarify when first execution occurs vs interval frequency
5. Update form validation to handle new interval units
6. Test with various scheduling configurations to ensure backward compatibility
7. Run tests and build to verify implementation

## Implementation Notes

Implementation completed successfully. Enhanced the custom scheduling UI with the following improvements:

**UI Changes:**
- Changed 'Execution Time' label to 'Execution Start Time' for custom intervals to clarify timing
- Added flexible interval units dropdown (minutes/hours) for custom intervals
- Dynamic label updates based on frequency type ('Start Time' for custom, 'Execution Time' for others)
- Enhanced help text that updates based on selected unit

**JavaScript Enhancements:**
- Updated getCurrentSchedulingConfiguration() to handle both minute and hour intervals
- Enhanced populateSchedulingForm() with intelligent unit selection (shows hours for values ≥60 and divisible by 60)
- Added automatic value conversion when switching between units
- Implemented proper validation for different units (5-minute minimum, 1-hour minimum)
- Added event listeners for unit changes with real-time preview updates

**Backward Compatibility:**
- Existing templates with custom intervals continue to work unchanged
- Smart unit selection automatically displays intervals in the most appropriate unit
- All millisecond calculations remain consistent with existing logic

**Testing Results:**
- All template UI tests pass (20/20)
- Backward compatibility verified with existing scheduling data
- Forward compatibility tested with new unit system
- No compilation errors introduced by changes

The implementation makes frequent scheduling (like 'every 5 minutes starting at 2:30 PM') much more intuitive while maintaining full compatibility with existing scheduled templates.
