---
id: decision-5
title: Logging Solution Selection for Chrome Extension
date: '2025-07-23'
status: proposed
---
## Context

The Xpensabl Chrome extension currently has 122 console.log statements across 12 files throughout the codebase. We need to replace all console.log usage with a structured logging solution that provides:

- Consistent formatting and log levels
- Better debugging capabilities for Chrome extension development
- Compatibility with Chrome extension service worker architecture (Manifest V3)
- Persistence capabilities for debugging issues in production
- Integration with Chrome DevTools

### Current State
- 122 console.log statements distributed across: background.ts (16), sidepanel.ts (17), content.ts (2), and various service files
- No structured logging or log levels
- No persistent logging for debugging production issues
- Inconsistent logging format across components

### Chrome Extension Constraints
- Service workers terminate after 30 seconds of inactivity
- No access to Node.js specific APIs or file system
- Chrome storage.local (10MB) available for persistence
- DevTools integration required for debugging
- Must work across all extension contexts: background, content scripts, popup, sidepanel

## Decision

**Selected Solution: Custom Chrome Extension Logger Service**

After evaluating lightweight browser logging libraries against a custom solution, we recommend implementing a custom logging service specifically designed for Chrome extensions.

### Evaluation Summary

#### Lightweight Browser Libraries Evaluated

**1. loglevel (2.3K stars, 9M weekly downloads)**
- ✅ Minimal footprint (1.4KB minified+gzipped)
- ✅ No dependencies, single file
- ✅ Log level support (trace/debug/info/warn/error)
- ✅ Browser compatible
- ❌ No persistence mechanism
- ❌ Known Chrome DevTools filtering issues (debug maps to console.info)
- ❌ No Chrome extension specific features

**2. ulog (Universal Logger)**
- ✅ Works in Node.js and browsers
- ✅ Combines features from debug and loglevel
- ✅ Small footprint
- ✅ Environment-based configuration
- ❌ No built-in persistence
- ❌ No Chrome storage integration
- ❌ No service worker lifecycle awareness

**3. consola (5.1M weekly downloads)**
- ✅ Elegant API for Node.js and browser
- ✅ Good performance
- ❌ No persistence mechanism
- ❌ No Chrome extension specific features
- ❌ Larger footprint than alternatives

**4. roarr**
- ✅ Structured logging (JSON format)
- ✅ Browser compatible
- ✅ Performance optimized
- ❌ Environment variable dependent
- ❌ No Chrome storage integration
- ❌ Complex setup for extension context

#### Custom Chrome Extension Logger Service
- ✅ Chrome storage.local integration for persistence
- ✅ Service worker lifecycle awareness
- ✅ Cross-context compatibility (background, content, popup, sidepanel)
- ✅ Chrome DevTools integration
- ✅ Configurable log levels with storage persistence
- ✅ Circular buffer implementation for storage efficiency
- ✅ Debug mode with chrome.storage configuration
- ✅ Extension-specific features (context tagging, token sanitization)
- ✅ No external dependencies
- ❌ Initial development effort required

### Recommended Implementation

Implement a custom `ChromeLogger` service with the following architecture:

```typescript
// Core logger service
class ChromeLogger {
  private logLevel: LogLevel;
  private persistLogs: boolean;
  private maxLogEntries: number = 1000;
  
  // Methods: debug(), info(), warn(), error()
  // Storage: chrome.storage.local circular buffer
  // Context: automatic context detection (background, content, etc.)
}

// Usage across extension
import { logger } from './services/chromeLogger';
logger.info('User clicked expense', { expenseId: '123' });
```

**Key Features:**
1. **Log Levels**: DEBUG, INFO, WARN, ERROR with storage-persisted configuration
2. **Context Awareness**: Automatic detection of extension context (background/content/popup/sidepanel)
3. **Persistence**: Chrome storage.local with circular buffer (configurable size)
4. **Security**: Automatic sanitization of sensitive data (tokens, PII)
5. **Debug Mode**: Enable/disable via chrome.storage configuration
6. **Chrome DevTools Integration**: Proper console method mapping
7. **Performance**: Minimal overhead, async storage operations
8. **Cross-Extension Support**: Works in all extension contexts

## Consequences

### Positive Consequences
- **Consistent Logging**: Standardized format across all 122 current log statements
- **Enhanced Debugging**: Persistent logs survive service worker termination
- **Production Monitoring**: Ability to collect logs from production installations
- **Security**: Built-in sanitization prevents token/credential leakage
- **Performance**: Optimized for Chrome extension constraints
- **Maintainability**: Centralized logging configuration and behavior
- **Chrome Integration**: Native DevTools support and storage API usage

### Implementation Requirements
- **Development Effort**: ~2-3 days to implement comprehensive logging service
- **Testing**: Update all existing tests to use new logger instead of console.log
- **Migration**: Replace 122 console.log statements across 12 files
- **Documentation**: Update CLAUDE.md with logging guidelines
- **Storage Usage**: ~50-100KB for typical log buffer (configurable)

### Risks and Mitigation
- **Storage Quota**: Implement circular buffer with configurable limits
- **Performance Impact**: Use async operations and debounced storage writes  
- **Debugging Complexity**: Maintain console output in development mode
- **Migration Scope**: Systematic replacement requiring thorough testing

### Maintenance Considerations
- **Regular Cleanup**: Implement log rotation and storage management
- **Configuration Updates**: Allow runtime log level changes via storage
- **Chrome API Changes**: Monitor Chrome extension API evolution
- **Performance Monitoring**: Track storage usage and performance impact

This decision aligns with the project's requirements for a robust, Chrome extension-specific logging solution that provides better observability while maintaining performance and security standards.