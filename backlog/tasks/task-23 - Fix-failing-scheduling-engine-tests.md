---
id: task-23
title: Fix failing scheduling engine tests
status: Done
assignee: []
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
priority: high
---

## Description

The schedulingEngine.test.ts file has 10 failing tests due to incorrect mock setup and template manager interactions. The tests are failing because the mock template manager is not returning the expected template data when scheduleTemplate() is called, causing the 'Template not found or scheduling not enabled' error.

## Acceptance Criteria

- [x] All 10 failing scheduling engine tests pass
- [x] Test suite runs without console errors
- [x] Mock setup correctly simulates template manager behavior
- [x] Tests accurately validate scheduling engine functionality

## Implementation Notes

Fixed all 10 failing scheduling engine tests by addressing mock setup issues and ensuring proper template manager interactions.

## Approach taken
- Analyzed test failures caused by incorrect mock setup
- Fixed mock template manager to return expected template data
- Corrected storage mock implementation to handle execution queue properly
- Added proper singleton instance reset in beforeEach to avoid test pollution
- Ensured mock returns correct structure for auth cache and bearer tokens

## Features implemented or modified
- Updated test mock setup in beforeEach hook to properly handle Chrome storage API
- Fixed template scheduling tests to correctly handle null/disabled templates
- Corrected pause/resume template tests to ensure updateTemplate is called
- Fixed execution processing tests with proper mock data

## Technical decisions and trade-offs
- Reset singleton instance before each test to ensure clean state
- Used comprehensive default mocks for Chrome storage to handle all test scenarios
- Maintained test isolation while ensuring realistic mock behavior

## Modified files
- src/tests/schedulingEngine.test.ts - Fixed all test mock setups and assertions
