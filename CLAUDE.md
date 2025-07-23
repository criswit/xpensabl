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
   - Currently shows welcome message

## Template Storage System

The extension includes a comprehensive template storage system for managing expense templates:

### Core Components

- **`src/model/template.ts`**: Complete TypeScript interfaces and types for template data structures
- **`src/services/storageManager.ts`**: Chrome storage abstraction layer with quota management and caching
- **`src/services/templateManager.ts`**: High-level template management API with CRUD operations
- **`src/services/migrationManager.ts`**: Data migration and integrity system with schema versioning
- **`src/services/templateStorageInit.ts`**: Initialization and utility functions

### Storage Architecture

- **Chrome storage.sync (100KB)**: User preferences and lightweight template index for cross-device sync
- **Chrome storage.local (10MB)**: Full template data, execution history, and scheduled executions
- **Template limit**: Maximum 5 templates per user (configurable in preferences)
- **History retention**: 90 days of execution history (configurable: 30/60/90/never)
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
- **Integration tests**: Complete template lifecycle testing

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

## Current Functionality

1. **Authorization Token Capture**: The background script monitors requests to Navan API and captures TripActions bearer tokens from Authorization headers

2. **Side Panel**: Users can open a persistent side panel by clicking the "Open Side Panel" button in the popup

3. **Expense Management**: Complete expense fetching, creation, and duplication functionality with Navan API integration

4. **Template Storage System**: Comprehensive template management with:
   - Template creation, editing, and deletion (5 template limit)
   - Chrome storage integration with cross-device sync
   - Schema migration system for data structure evolution
   - Storage quota management with automatic cleanup
   - Template scheduling infrastructure (ready for background execution)

5. **Testing Infrastructure**: Full Jest test suite with Chrome extension API mocking and automatic test execution during builds

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

## Important Notes

- Icon file `expense-icon.png` is referenced but needs to be added to the `public/` directory
- The extension captures authorization tokens from Navan - ensure proper security practices
- All Chrome extension APIs are typed via `@types/chrome`
- Content script is injected into all URLs (`<all_urls>` permission)
- **Tests must pass before builds succeed** - this ensures code quality
- Template storage system is fully implemented and tested
- Schema versioning supports future data structure changes

## Coding Guidelines

- Never use emojis
- NEVER USE EMOJIS

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