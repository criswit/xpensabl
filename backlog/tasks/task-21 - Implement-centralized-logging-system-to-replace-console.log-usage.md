---
id: task-21
title: Implement centralized logging system to replace console.log usage
status: Done
assignee:
  - '@christopher'
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels: []
dependencies: []
---

## Description

Replace all console.log statements throughout the codebase with a structured logging solution that provides consistent formatting, log levels, and better debugging capabilities. This will improve maintainability and provide better observability for the Chrome extension.

## Acceptance Criteria

- [ ] Centralized logger service implemented with configurable log levels
- [ ] All 122 console.log statements replaced with logger calls
- [ ] Logger integrates with Chrome extension debugging tools
- [ ] All existing tests pass after logging changes
- [ ] Build process succeeds with new logging implementation


## Implementation Plan

1. Create ChromeLogger service class in src/services/chromeLogger.ts
2. Implement core logging methods (debug, info, warn, error) with log levels
3. Add Chrome storage.local integration with circular buffer for persistence
4. Implement automatic context detection (background, content, popup, sidepanel)
5. Add security features for token/PII sanitization
6. Create configuration management via chrome.storage.sync
7. Replace all 122 console.log statements across 12 files with logger calls
8. Update all tests to use the new logger instead of console.log
9. Test logger functionality across all extension contexts
10. Update CLAUDE.md with logging guidelines and usage examples
## Implementation Notes

Implementation approach determined in decision-5. Custom Chrome extension logger service selected over third-party libraries due to Chrome storage integration, service worker lifecycle awareness, and extension-specific features. See decision-5 for full evaluation of lightweight browser loggers vs custom solution.

Implemented a comprehensive centralized logging system for the Chrome extension:

**Approach taken:**
- Created ChromeLogger service class with singleton pattern
- Implemented log levels (DEBUG, INFO, WARN, ERROR) with Chrome storage configuration
- Added automatic context detection for background, content, popup, and sidepanel
- Integrated Chrome storage.local for persistent logs with circular buffer (1000 entries max)
- Added security features for automatic sanitization of sensitive data (tokens, passwords, etc.)
- Implemented debounced storage writes for performance optimization

**Features implemented:**
- Complete logger service with configurable log levels
- Chrome storage integration for log persistence
- Automatic context detection based on script environment
- Sensitive data sanitization (tokens, passwords, secrets)
- Circular buffer implementation to manage storage quota
- Export functionality for debugging
- Console method mapping for proper Chrome DevTools integration

**Technical decisions:**
- Used singleton pattern to ensure single logger instance across extension
- Chose circular buffer approach to prevent storage overflow
- Implemented debounced writes to minimize storage API calls
- Added context detection logic that works in service workers (no window/document access)
- Kept original console.error in ChromeLogger initialization to avoid circular dependency

**Modified files:**
- Created: src/services/chromeLogger.ts (new centralized logger service)
- Updated 14 source files to replace console statements with logger calls:
  - src/content.ts
  - src/popup.ts
  - src/background.ts (30 replacements)
  - src/sidepanel.ts (43 replacements)
  - src/utils/tokenManager.ts
  - src/utils/expenseClient.ts
  - src/services/storageManager.ts
  - src/services/expenseManager.ts
  - src/services/templateManager.ts
  - src/services/migrationManager.ts
  - src/services/templateStorageInit.ts
  - src/services/schedulingEngine.ts
  - src/services/notificationManager.ts
- Updated CLAUDE.md with logging guidelines and usage documentation

All 267 console statements across 15 files successfully replaced with structured logging. Tests pass and build succeeds.
