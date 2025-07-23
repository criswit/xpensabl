---
id: task-38
title: Fix custom interval scheduling drift bug
status: To Do
assignee: []
created_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

The custom interval scheduling system has a timing drift bug where subsequent executions are calculated from current time instead of the original scheduled time, causing intervals to gradually shift later. For example, a 10-minute interval starting at 5:30 AM should execute at 5:30, 5:40, 5:50, etc., but instead executes at 5:30:00, 5:40:05, 5:50:10, etc., with increasing drift.

## Acceptance Criteria

- [ ] Custom intervals maintain precise timing without drift
- [ ] First execution respects configured start time
- [ ] Subsequent executions are exactly start_time + N * interval_duration
- [ ] System handles edge cases like missed executions and restarts
- [ ] Existing test suite passes without regressions
