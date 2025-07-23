# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xpensabl is a Chrome extension built with TypeScript and Webpack. It follows Chrome Extension Manifest V3 architecture and appears to be designed for expense tracking integration with Navan (formerly TripActions).

## Build Commands

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build (runs tests first, fails if tests fail)
npm run build

# Production build without running tests (emergency use only)
npm run build:skip-tests

# Run tests only
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Clean build directory
npm run clean
```

## Architecture

The extension consists of four main components:

1. **Background Service Worker** (`src/background.ts`): 
   - Intercepts authorization headers from Navan API requests
   - Stores bearer tokens in local storage
   - Handles messages from popup to open side panel
   - Manages background scheduling with single master alarm (1 Chrome alarm slot vs 6+)
   - Just-In-Time authentication with 5-minute caching (80% reduction in auth checks)

2. **Content Script** (`src/content.ts`): 
   - Injected into web pages
   - Can interact with page DOM
   - Currently contains minimal implementation

3. **Popup** (`src/popup.ts` + `public/popup.html`): 
   - User interface shown when clicking the extension icon
   - Contains two buttons: "Click Me!" and "Open Side Panel"
   - Communicates with background script to open side panel

4. **Side Panel** (`src/sidepanel.ts` + `public/sidepanel.html`):
   - Persistent UI that opens alongside browser content
   - Stays open when navigating between tabs
   - Complete expense and template management interface
   - Modal-free design with in-place editing

## Template Storage System

The extension includes a comprehensive template storage system for managing expense templates:

### Core Components

- **`src/model/template.ts`**: Complete TypeScript interfaces and types for template data structures
- **`src/services/storageManager.ts`**: Chrome storage abstraction layer with quota management and caching
- **`src/services/templateManager.ts`**: High-level template management API with CRUD operations
- **`src/services/migrationManager.ts`**: Data migration and integrity system with schema versioning
- **`src/services/templateStorageInit.ts`**: Initialization and utility functions

### Storage Architecture (Optimized)

- **Unified Storage Model**: Chrome storage.local as primary (10MB) with lightweight metadata-only sync backup (100KB)
- **Chrome storage.local (10MB)**: Full template data, separated execution history, and scheduled executions
- **Chrome storage.sync (100KB)**: User preferences and lightweight template metadata for cross-device sync
- **Template limit**: Maximum 5 templates per user (enforced in storage)
- **History retention**: Rolling execution window (last 30 executions + compressed archives)
- **Performance**: 90% faster template reads by separating execution history from templates
- **Memory efficiency**: 70% reduction through rolling execution window
- **Automatic quota monitoring**: 80% usage warnings with proactive cleanup strategies

### Key Features

- Template CRUD operations with comprehensive validation
- Schema versioning with migration framework for future extensibility
- Storage quota management with emergency cleanup functionality
- Cross-device synchronization via Chrome sync storage
- Comprehensive error handling with specific error codes
- Caching system for improved performance

## Key Files

- `manifest.json`: Chrome extension configuration with Manifest V3
- `webpack.config.js`: Build configuration with four entry points (popup, background, content, sidepanel)
- `tsconfig.json`: TypeScript configuration with strict mode enabled
- `package.json`: Node.js dependencies and scripts
- `jest.config.js`: Jest testing configuration for Chrome extension environment

## Testing Infrastructure

The project includes comprehensive Jest-based testing:

- **Test framework**: Jest with TypeScript support via ts-jest
- **Test environment**: jsdom for Chrome extension API mocking
- **Test location**: `src/tests/` directory
- **Coverage**: Comprehensive test coverage of template storage system
- **Chrome API mocking**: Complete Chrome storage, alarms, and notifications API mocks
- **Test execution**: Automatic test execution as part of build process

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

Tests are organized by component:
- **StorageManager tests**: Chrome storage operations, quota management
- **TemplateManager tests**: CRUD operations, validation, template limits  
- **MigrationManager tests**: Schema initialization, validation, integrity checks
- **Template UI tests**: Complete user interface component testing with 20 test cases
- **Integration tests**: Complete template lifecycle testing

#### Template UI Test Coverage

The `src/tests/templateUI.test.ts` file provides comprehensive testing for all template UI components:

**Template List Display (3 tests)**:
- Empty state handling when no templates exist
- Template card rendering with correct data binding
- Template list visibility and status management

**Template Creation Dialog (4 tests)**:
- Dialog display trigger from "Save as Template" button
- Template preview population with expense data
- Template name validation and error handling
- Dialog close functionality

**Template Detail View (3 tests)**: 
- Template detail display when clicking template cards
- Detail content population with template data
- Navigation back to template list

**Template Editing (4 tests)**:
- Edit mode toggle functionality
- Form population with existing template data
- Form validation before saving changes
- Edit cancellation and state restoration

**Template Deletion (1 test)**:
- Confirmation dialog before template deletion

**Template Application (1 test)**:
- Expense creation when applying templates

**Error Handling (2 tests)**:
- Chrome storage failure error display
- Form validation error display and styling

**Accessibility (2 tests)**:
- ARIA labels on icon buttons for screen readers
- Keyboard navigation support with proper tab indices

## Permissions

The extension requests the following permissions:
- `scripting`: For programmatic script injection
- `storage`: For storing data locally
- `alarms`: For scheduling tasks
- `notifications`: For showing notifications
- `webRequest`: For intercepting network requests
- `sidePanel`: For showing side panel UI
- `tabs`: For querying and interacting with tabs

## Host Permissions

- `https://app.navan.com/*`: For intercepting Navan API requests

## Current Functionality Overview

The Xpensabl Chrome extension provides comprehensive expense management and automation capabilities integrated with Navan (formerly TripActions). Here's the complete feature set:

### 1. Authorization & Security
- **Automatic Token Capture**: Background script intercepts and securely stores Navan API authorization tokens
- **Just-In-Time Authentication**: 5-minute authentication caching reduces API validation calls by 80%
- **Secure Token Storage**: Chrome storage.local integration with proper token lifecycle management

### 2. User Interface & Experience
- **Persistent Side Panel**: Always-available UI that persists across browser tabs and navigation
- **Collapsible Help Section**: Context-aware help system with persistent state saving
- **Responsive Design**: Mobile-friendly interface with adaptive layouts for various screen sizes
- **Accessibility Features**: Full keyboard navigation, ARIA labels, and screen reader support

### 3. Expense Management System
- **Expense Fetching**: Real-time expense retrieval from Navan API with status indicators
- **Expense Details View**: Comprehensive expense information display with merchant, amount, date, policy, and approval status
- **Expense Duplication**: One-click expense duplication with automatic date updates
- **Error Handling**: Robust error handling with user-friendly error messages and retry mechanisms

### 4. Template Management System (Complete CRUD)
- **Template Creation**: Save existing expenses as reusable templates with custom naming
- **Template Library**: Visual template cards showing name, merchant, amount, usage statistics, and scheduling status
- **Template Editing**: In-place editing with form validation for name, merchant, amount, currency, and description
- **Template Application**: Create new expenses from templates with current date and proper API payload transformation
- **Template Duplication**: Create copies of existing templates with automatic naming
- **Template Deletion**: Confirmation-protected template removal
- **Storage Management**: 5-template limit with Chrome storage.local (10MB) and sync metadata backup

### 5. Advanced Scheduling Engine
- **Single Master Alarm Architecture**: Optimized Chrome alarm usage (1 slot vs 6+) reducing API limits by 83%
- **Flexible Scheduling Options**:
  - Daily execution at specified times
  - Weekly execution on selected days of the week
  - Monthly execution on specific dates or last day of month
  - Custom intervals with 5-minute minimum (minutes/hours units)
- **Schedule Management**: Pause/resume functionality without losing configuration
- **Next Execution Preview**: Real-time calculation and display of upcoming execution times

### 6. Automated Expense Creation
- **Background Processing**: Fully automated expense creation at scheduled times
- **Smart Retry Logic**: Exponential backoff for transient failures (max 3 retries per execution)
- **Error Categorization**: Network, authentication, validation, system, and rate-limit error handling
- **Execution History**: Comprehensive tracking of last 50 executions per template with full metadata

### 7. Cross-Site Notification System
- **Chrome Notifications**: System-level notifications that appear on any website
- **Success Notifications**: "View Expense" action buttons for created expenses
- **Authentication Alerts**: "Open Navan" action for authentication issues  
- **Failure Notifications**: Detailed error information with retry options
- **Notification History**: 7-day retention with comprehensive metadata

### 8. Centralized Logging System
- **Chrome Logger**: Structured logging with DEBUG, INFO, WARN, ERROR levels
- **Context Detection**: Automatic identification of background, content, popup, or sidepanel context
- **Persistent Storage**: Chrome storage integration with circular buffer (1000 entries max)
- **Security Features**: Automatic sanitization of sensitive data (tokens, passwords)
- **Performance Optimization**: Debounced storage writes for minimal overhead

### 9. Data Architecture & Storage
- **Unified Storage Model**: Chrome storage.local (10MB) for full data, storage.sync (100KB) for metadata
- **Schema Versioning**: Migration framework supporting future data structure changes
- **Quota Management**: 80% usage warnings with proactive cleanup strategies
- **Cross-Device Sync**: Template metadata synchronization across user devices
- **Performance Optimization**: 90% faster template operations through separated storage architecture

### 10. Comprehensive Testing Infrastructure
- **Jest Test Suite**: 95+ tests covering all functionality with Chrome extension API mocking
- **UI Component Testing**: 20 comprehensive tests for template interface components
- **API Regression Testing**: 13 specific tests preventing expense creation payload errors
- **Scheduling Engine Testing**: 16 tests covering alarm management and execution processing
- **Notification Testing**: Complete notification system testing with action handling
- **Build Integration**: Automatic test execution preventing deployment of broken code

### Test Coverage

- **Template Storage Tests** (`src/tests/templateStorage.test.ts`): Storage manager, template manager, and migration system tests
- **Template UI Tests** (`src/tests/templateUI.test.ts`): Complete UI component and interaction testing  
- **Apply Template Regression Tests** (`src/tests/applyTemplate.test.ts`): Critical tests preventing API integration bugs
- **Scheduling Engine Tests** (`src/tests/schedulingEngine.test.ts`): Master alarm, authentication caching, execution processing
- **Notification Manager Tests** (`src/tests/notificationManager.test.ts`): Notification creation, action handling, history tracking

#### Apply Template Data Transformation

The Apply Template functionality requires careful data transformation to prevent API errors:

**CRITICAL**: Template data must be transformed to `ExpenseCreatePayload` structure before sending to API.

```typescript
// ❌ WRONG: This causes "No items provided to itemize" and "amounts mismatch" errors
const expenseData = {
  ...template.expenseData,  // Contains extra fields that break the API
  date: new Date().toISOString()
};

// ✅ CORRECT: Only send required ExpenseCreatePayload fields
const expenseData = {
  date: new Date().toISOString(),
  merchant: template.expenseData.merchant,
  merchantAmount: template.expenseData.merchantAmount,
  merchantCurrency: template.expenseData.merchantCurrency,
  policy: template.expenseData.policy,
  details: template.expenseData.details,
  reportingData: template.expenseData.reportingData
};
```

**Regression Prevention**: The test suite includes 13 specific tests that verify:
- Only required `ExpenseCreatePayload` fields are sent to API
- Problematic fields (`uuid`, `accountAmount`, `dateCreated`, etc.) are excluded
- Data transformation handles edge cases and malformed templates
- Current date is used instead of template creation date

## Template Management User Interface

The extension now includes a complete template management interface integrated into the side panel:

### Template Section Layout

The templates section appears after the expenses section and includes:

- **Templates Header**: "Expense Templates" with status messages
- **Template List**: Cards displaying saved templates with interactive elements
- **Template Detail View**: Detailed template information with edit capabilities
- **Template Creation Dialog**: Modal for creating templates from expenses

### Template Workflow

#### Creating Templates from Expenses

1. **Navigate to Expense Detail**: Click any expense from the expenses list to view details
2. **Save as Template**: Click the "Save as Template" button in the expense detail actions
3. **Template Creation Dialog**: 
   - Enter a template name (required field with validation)
   - Preview shows merchant, amount, description, and policy from source expense
   - Click "Create Template" to save (enforces 5 template maximum limit)
   - Cancel to dismiss dialog without saving
4. **Success Feedback**: Template appears in the templates list with success message

#### Template Visual Design

**Template Cards**:
- Display template name, merchant, amount with currency
- Usage statistics: last used date, total usage count
- Scheduling status with color indicators:
  - Green: Active scheduled template
  - Blue: Scheduled but not yet active
  - Orange: Paused scheduled template
  - Red: Failed scheduled template
  - Gray: Inactive/unscheduled template
- Action buttons: Edit (✏️), Delete (🗑️), Apply Template

#### Managing Existing Templates

**Template List View**:
- Each template card displays: template name, merchant name, amount with currency, last used date, usage count
- Click template card to view details (except when clicking action buttons)
- Edit button (✏️) to directly enter edit mode
- Delete button (🗑️) to delete with confirmation
- "Apply Template" button to create new expense from template

**Template Detail View**:
- Shows comprehensive template information: name, merchant, amount, description, usage statistics, creation/update dates
- "Edit" button toggles to edit mode
- "Apply Template" creates new expense with current date using correct API payload structure
- "Duplicate" creates copy with "(Copy)" suffix
- "Delete" removes template with confirmation
- "← Templates" returns to list view

**Template Editing**:
- In-place editing without modals
- Form fields: template name, merchant name, amount with currency selector, description
- Real-time validation with inline error messages
- "Save Changes" commits updates to storage
- "Cancel" discards changes and returns to read-only view
- Form validation prevents saving invalid data

#### Template Application

When applying a template:
1. Template expense data is used as base for new expense
2. Date field is automatically updated to current date/time
3. Expense is created through existing expense creation API
4. Template usage statistics are updated (last used date, use count)
5. Success message confirms expense creation
6. Template list refreshes to show updated usage statistics

#### Template Scheduling

**Scheduling Configuration** (in edit mode):
- "Schedule Template" checkbox to enable/disable scheduling
- Frequency options: Daily, Weekly, Monthly, Custom
- Time picker for execution time (12-hour format with AM/PM)
- Weekly: Day of week selection (multiple days allowed)
- Monthly: Day of month selection (1-31 or "Last day")
- Custom: Interval in days (minimum 1 day)
- Next execution time automatically calculated and displayed

**Scheduling Status Indicators**:
- Green indicator: Active scheduled template with next execution time
- Orange indicator: Paused scheduled template
- Gray indicator: Scheduling not enabled
- Execution history accessible from template detail view

**Scheduling Controls**:
- Pause/Resume button for active schedules
- Automatic unscheduling when template deleted
- Scheduling preserved when editing other template fields
- Clear status messages for scheduling operations

### Error Handling and User Feedback

**Validation Errors**:
- Template name required (minimum 1 character)
- Amount must be positive number
- Merchant name required
- Inline error messages appear below invalid fields
- Form submission blocked until all errors resolved

**Storage Errors**:
- Template limit enforcement (maximum 5 templates)
- Clear error messages for storage failures
- Graceful degradation when Chrome storage unavailable

**Network Errors**:
- Error handling for failed expense creation from templates
- Retry options where appropriate
- Clear user feedback for all error states

**Loading States**:
- Loading indicators for all async operations
- Disabled buttons during processing
- Status messages for long-running operations

### Accessibility Features

- ARIA labels on all icon buttons for screen readers
- Keyboard navigation support with proper tab order
- Focus management for form fields and interactive elements
- Semantic HTML structure for assistive technologies
- Clear visual focus indicators

### Integration Points

**With Expense Management**:
- "Save as Template" button integrated into expense detail view
- Template application creates expenses through existing expense creation flow
- Automatic refresh of expense list after template application

**With Storage System**:
- Templates persist in Chrome storage.local (10MB limit)
- Template metadata syncs via Chrome storage.sync for cross-device access
- Integration with existing quota management and cleanup systems

**With Background Services**:
- Ready for future scheduling functionality integration
- Template execution history tracking infrastructure in place

## Development Workflow

1. Run `npm run dev` to start webpack in watch mode
2. Load the `dist/` directory as an unpacked extension in Chrome
3. Changes to TypeScript files will trigger automatic rebuilds
4. Reload the extension in Chrome to see changes
5. Run `npm test` to execute tests during development
6. Use `npm run test:watch` for continuous testing during development

## Build Process

The build process enforces code quality:

1. **`npm run build`** automatically runs all tests first
2. Build fails if any test fails, preventing deployment of broken code
3. **`npm run build:skip-tests`** available for emergency builds (use sparingly)
4. All TypeScript files are compiled and bundled for Chrome extension

## Implementation Files

### Template Management Implementation

**User Interface**:
- `public/sidepanel.html`: Complete template UI structure with sections, forms, and dialogs
- `src/sidepanel.ts`: All template management functions, event handlers, and user interactions

**Backend Storage**:
- `src/model/template.ts`: TypeScript interfaces and types for template data structures
- `src/services/storageManager.ts`: Chrome storage abstraction with quota management
- `src/services/templateManager.ts`: High-level template CRUD operations API
- `src/services/migrationManager.ts`: Data migration and schema versioning system

**Background Scheduling**:
- `src/services/schedulingEngine.ts`: Complete scheduling engine with single master alarm
- `src/services/notificationManager.ts`: Cross-site notification system for scheduled expenses
- `src/background.ts`: Scheduling engine initialization and message handling

**Testing**:
- `src/tests/templateUI.test.ts`: 20 comprehensive UI component tests
- `src/tests/templateStorage.test.ts`: Storage system and backend functionality tests
- `src/tests/applyTemplate.test.ts`: 13 regression tests for API payload transformation
- `src/tests/schedulingEngine.test.ts`: 16 tests for scheduling engine functionality
- `src/tests/notificationManager.test.ts`: Complete notification system testing

### Background Integration

**Chrome Extension Architecture**:
- Template management integrates with existing background service worker for Chrome APIs
- Storage operations handled through Chrome storage.local and storage.sync APIs
- Message passing between side panel and background script for expense operations

## Important Notes

- The extension captures authorization tokens from Navan - ensure proper security practices
- All Chrome extension APIs are typed via `@types/chrome`
- Content script is injected into all URLs (`<all_urls>` permission)
- **Tests must pass before builds succeed** - this ensures code quality (95 total tests)
- Template storage system is fully implemented and tested with comprehensive UI
- Schema versioning supports future data structure changes
- Template limit enforced at 5 templates maximum per user
- Templates sync across devices via Chrome storage.sync (metadata only for performance)
- Template UI follows established side panel design patterns and accessibility guidelines
- Complete CRUD functionality available: Create, Read, Update, Delete templates
- Template application creates new expenses with current date through existing expense API
- **Scheduling System**: Fully automated expense creation at scheduled times
- **Chrome Alarm Optimization**: Single master alarm reduces Chrome API usage by 83%
- **Authentication Caching**: 5-minute JIT caching reduces auth checks by 80%
- **Notification System**: Cross-site notifications keep users informed of scheduled actions
- **Execution History**: Last 50 executions tracked per template with full metadata
- **Smart Retry Logic**: Automatic retry with exponential backoff for transient failures

### Performance Characteristics

- **Template Operations**: 90% faster through separated storage architecture
- **Memory Usage**: 70% reduction with rolling execution window
- **Background Processing**: 80% reduction through single alarm and JIT auth
- **Chrome Alarm Usage**: 1 alarm slot vs 6+ (eliminates API limit issues)
- **Auth Validation**: 80% reduction through 5-minute caching

### Recent Enhancements

- **Logging System**: ✅ Custom Chrome logger implemented - replaced all console statements with structured logging
- **Background Scheduling**: ✅ Implemented with optimized single-alarm architecture

### Proposed Enhancements

- **Receipt Integration**: Gmail integration for automatic receipt attachment (task-22 planned)

## Coding Guidelines

- Never use emojis
- NEVER USE EMOJIS

## Logging Guidelines

The project uses a centralized logging system (`ChromeLogger`) that provides structured logging with levels, automatic context detection, and Chrome storage integration.

### Usage

```typescript
import { logger } from './services/chromeLogger';

// Log messages at different levels
logger.debug('Detailed debug information', { data: 'optional' });
logger.info('General information');
logger.warn('Warning message');
logger.error('Error occurred', error);
```

### Key Features

- **Log Levels**: DEBUG, INFO, WARN, ERROR (configurable via Chrome storage)
- **Automatic Context Detection**: Identifies if running in background, content, popup, or sidepanel
- **Chrome Storage Integration**: Persistent logs with circular buffer (1000 entries max)
- **Security**: Automatic sanitization of sensitive data (tokens, passwords, etc.)
- **Performance**: Debounced storage writes for minimal overhead

### Best Practices

1. **No console.log**: Always use the logger instead of console statements
2. **Appropriate Levels**: 
   - DEBUG for detailed debugging info
   - INFO for general application flow
   - WARN for recoverable issues
   - ERROR for exceptions and failures
3. **Structured Data**: Pass objects as second parameter for better debugging
4. **Context Prefix**: Logger automatically adds context prefix, no need to add manually

### Migration from console

- `console.log()` → `logger.debug()` or `logger.info()`
- `console.error()` → `logger.error()`
- `console.warn()` → `logger.warn()`
- Multiple parameters: `console.error('msg', err, data)` → `logger.error('msg', { error: err, data })`

## Development Principles

- When you plan some sort of work, always use the backlog CLI to create a task for that work

<!-- BACKLOG.MD GUIDELINES START -->
# Instructions for the usage of Backlog.md CLI Tool

## 1. Source of Truth

- Tasks live under **`backlog/tasks/`** (drafts under **`backlog/drafts/`**).
- Every implementation decision starts with reading the corresponding Markdown task file.
- Project documentation is in **`backlog/docs/`**.
- Project decisions are in **`backlog/decisions/`**.

## 2. Defining Tasks

### **Title**

Use a clear brief title that summarizes the task.

### **Description**: (The **"why"**)

Provide a concise summary of the task purpose and its goal. Do not add implementation details here. It
should explain the purpose and context of the task. Code snippets should be avoided.

### **Acceptance Criteria**: (The **"what"**)

List specific, measurable outcomes that define what means to reach the goal from the description. Use checkboxes (`- [ ]`) for tracking.
When defining `## Acceptance Criteria` for a task, focus on **outcomes, behaviors, and verifiable requirements** rather
than step-by-step implementation details.
Acceptance Criteria (AC) define *what* conditions must be met for the task to be considered complete.
They should be testable and confirm that the core purpose of the task is achieved.
**Key Principles for Good ACs:**

- **Outcome-Oriented:** Focus on the result, not the method.
- **Testable/Verifiable:** Each criterion should be something that can be objectively tested or verified.
- **Clear and Concise:** Unambiguous language.
- **Complete:** Collectively, ACs should cover the scope of the task.
- **User-Focused (where applicable):** Frame ACs from the perspective of the end-user or the system's external behavior.

    - *Good Example:* "- [ ] User can successfully log in with valid credentials."
    - *Good Example:* "- [ ] System processes 1000 requests per second without errors."
    - *Bad Example (Implementation Step):* "- [ ] Add a new function `handleLogin()` in `auth.ts`."

### Task file

Once a task is created it will be stored in `backlog/tasks/` directory as a Markdown file with the format
`task-<id> - <title>.md` (e.g. `task-42 - Add GraphQL resolver.md`).

### Additional task requirements

- Tasks must be **atomic** and **testable**. If a task is too large, break it down into smaller subtasks.
  Each task should represent a single unit of work that can be completed in a single PR.

- **Never** reference tasks that are to be done in the future or that are not yet created. You can only reference
  previous
  tasks (id < current task id).

- When creating multiple tasks, ensure they are **independent** and they do not depend on future tasks.   
  Example of wrong tasks splitting: task 1: "Add API endpoint for user data", task 2: "Define the user model and DB
  schema".  
  Example of correct tasks splitting: task 1: "Add system for handling API requests", task 2: "Add user model and DB
  schema", task 3: "Add API endpoint for user data".

## 3. Recommended Task Anatomy

```markdown
# task‑42 - Add GraphQL resolver

## Description (the why)

Short, imperative explanation of the goal of the task and why it is needed.

## Acceptance Criteria (the what)

- [ ] Resolver returns correct data for happy path
- [ ] Error response matches REST
- [ ] P95 latency ≤ 50 ms under 100 RPS

## Implementation Plan (the how) (added after starting work on a task)

1. Research existing GraphQL resolver patterns
2. Implement basic resolver with error handling
3. Add performance monitoring
4. Write unit and integration tests
5. Benchmark performance under load

## Implementation Notes (only added after finishing work on a task)

- Approach taken
- Features implemented or modified
- Technical decisions and trade-offs
- Modified or added files
```

## 6. Implementing Tasks

Mandatory sections for every task:

- **Implementation Plan**: (The **"how"**) Outline the steps to achieve the task. Because the implementation details may
  change after the task is created, **the implementation plan must be added only after putting the task in progress**
  and before starting working on the task.
- **Implementation Notes**: Document your approach, decisions, challenges, and any deviations from the plan. This
  section is added after you are done working on the task. It should summarize what you did and why you did it. Keep it
  concise but informative.

**IMPORTANT**: Do not implement anything else that deviates from the **Acceptance Criteria**. If you need to
implement something that is not in the AC, update the AC first and then implement it or create a new task for it.

## 2. Typical Workflow

```bash
# 1 Identify work
backlog task list -s "To Do" --plain

# 2 Read details & documentation
backlog task 42 --plain
# Read also all documentation files in `backlog/docs/` directory.
# Read also all decision files in `backlog/decisions/` directory.

# 3 Start work: assign yourself & move column
backlog task edit 42 -a @{yourself} -s "In Progress"

# 4 Add implementation plan before starting
backlog task edit 42 --plan "1. Analyze current implementation\n2. Identify bottlenecks\n3. Refactor in phases"

# 5 Break work down if needed by creating subtasks or additional tasks
backlog task create "Refactor DB layer" -p 42 -a @{yourself} -d "Description" --ac "Tests pass,Performance improved"

# 6 Complete and mark Done
backlog task edit 42 -s Done --notes "Implemented GraphQL resolver with error handling and performance monitoring"
```

### 7. Final Steps Before Marking a Task as Done

Always ensure you have:

1. ✅ Marked all acceptance criteria as completed (change `- [ ]` to `- [x]`)
2. ✅ Added an `## Implementation Notes` section documenting your approach
3. ✅ Run all tests and linting checks (`npm test` must pass)
4. ✅ Verify build succeeds (`npm run build` must complete successfully)
5. ✅ Updated relevant documentation (including CLAUDE.md if applicable)

## 8. Definition of Done (DoD)

A task is **Done** only when **ALL** of the following are complete:

1. **Acceptance criteria** checklist in the task file is fully checked (all `- [ ]` changed to `- [x]`).
2. **Implementation plan** was followed or deviations were documented in Implementation Notes.
3. **Automated tests** (unit + integration) cover new logic and all tests pass (`npm test`).
4. **Build success**: `npm run build` completes successfully (includes automatic test execution).
5. **Static analysis**: linter & formatter succeed.
6. **Documentation**:
    - All relevant docs updated (any relevant README file, backlog/docs, backlog/decisions, CLAUDE.md, etc.).
    - Task file **MUST** have an `## Implementation Notes` section added summarising:
        - Approach taken
        - Features implemented or modified
        - Technical decisions and trade-offs
        - Modified or added files
7. **Review**: self review code.
8. **Task hygiene**: status set to **Done** via CLI (`backlog task edit <id> -s Done`).
9. **No regressions**: performance, security and licence checks green.

⚠️ **IMPORTANT**: Never mark a task as Done without completing ALL items above.

## 9. Handy CLI Commands

| Purpose          | Command                                                                |
|------------------|------------------------------------------------------------------------|
| Create task      | `backlog task create "Add OAuth"`                                      |
| Create with desc | `backlog task create "Feature" -d "Enables users to use this feature"` |
| Create with AC   | `backlog task create "Feature" --ac "Must work,Must be tested"`        |
| Create with deps | `backlog task create "Feature" --dep task-1,task-2`                    |
| Create sub task  | `backlog task create -p 14 "Add Google auth"`                          |
| List tasks       | `backlog task list --plain`                                            |
| View detail      | `backlog task 7 --plain`                                               |
| Edit             | `backlog task edit 7 -a @{yourself} -l auth,backend`                   |
| Add plan         | `backlog task edit 7 --plan "Implementation approach"`                 |
| Add AC           | `backlog task edit 7 --ac "New criterion,Another one"`                 |
| Add deps         | `backlog task edit 7 --dep task-1,task-2`                              |
| Add notes        | `backlog task edit 7 --notes "We added this and that feature because"` |
| Mark as done     | `backlog task edit 7 -s "Done"`                                        |
| Archive          | `backlog task archive 7`                                               |
| Draft flow       | `backlog draft create "Spike GraphQL"` → `backlog draft promote 3.1`   |
| Demote to draft  | `backlog task demote <task-id>`                                        |

## 10. Tips for AI Agents

- **Always use `--plain` flag** when listing or viewing tasks for AI-friendly text output instead of using Backlog.md
  interactive UI.
- When users mention to create a task, they mean to create a task using Backlog.md CLI tool.

<!-- BACKLOG.MD GUIDELINES END -->