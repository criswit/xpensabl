---
id: doc-3
title: TemplateUserInterfaceGuidelines
type: other
created_date: '2025-07-23'
---

# Template User Interface Guidelines

## Overview

This document provides comprehensive UI implementation guidelines for template management components in the Xpensabl Chrome extension side panel. These guidelines ensure consistency with existing design patterns while providing clear specifications for developers implementing template functionality.

## Component Architecture

### Template Section Structure

```html
<div class="templates-section">
  <h2>Expense Templates</h2>
  <div class="template-controls">
    <!-- Template management controls -->
  </div>
  <div class="template-content">
    <!-- Template list, detail views, and editing interfaces -->
  </div>
</div>
```

### CSS Class Naming Convention

Follow the established pattern from existing sections:
- Section containers: `.templates-section`
- Headers: `.templates-section h2`
- Content areas: `.template-content`, `.template-list`, `.template-detail`
- Interactive elements: `.template-item`, `.template-actions`, `.template-form`
- Status indicators: `.template-status`, `.scheduling-status`, `.execution-status`

## Template List Component

### Template Card Structure

```html
<div class="template-item" data-template-id="{templateId}">
  <div class="template-header">
    <div class="template-name">{templateName}</div>
    <div class="template-actions">
      <button class="btn-icon favorite-btn" data-favorite="{isFavorite}">
        <span class="icon-star{-outline}"></span>
      </button>
      <button class="btn-icon edit-btn">
        <span class="icon-edit"></span>
      </button>
      <button class="btn-icon delete-btn">
        <span class="icon-delete"></span>
      </button>
    </div>
  </div>
  
  <div class="template-details">
    <div class="template-merchant">{merchantName}</div>
    <div class="template-amount">{formattedAmount}</div>
    <div class="template-meta">
      <span class="last-used">Last used: {lastUsedDate}</span>
      <span class="scheduling-indicator {schedulingStatus}">
        <span class="icon-clock"></span>
        {schedulingText}
      </span>
    </div>
  </div>
  
  <div class="template-footer">
    <button class="btn btn-primary apply-template">Apply Template</button>
    <div class="execution-status {statusClass}">
      <span class="status-indicator"></span>
      {statusText}
    </div>
  </div>
</div>
```

### Template Card CSS

```css
.template-item {
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.template-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #007bff;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.template-name {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  flex: 1;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.template-details {
  margin-bottom: 16px;
}

.template-merchant {
  font-size: 14px;
  color: #495057;
  margin-bottom: 4px;
}

.template-amount {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.template-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #6c757d;
}

.template-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f8f9fa;
}
```

## Template Detail/Edit Component

### Detail View Structure

```html
<div class="template-detail" id="templateDetail" style="display: none;">
  <div class="detail-header">
    <button class="btn btn-secondary back-to-templates">← Templates</button>
    <h3>{templateName}</h3>
    <button class="btn btn-secondary toggle-edit">Edit</button>
  </div>
  
  <div class="detail-content" id="templateDetailContent">
    <!-- Template details in read-only format -->
  </div>
  
  <div class="detail-actions">
    <button class="btn btn-primary apply-template">Apply Template</button>
    <button class="btn btn-secondary duplicate-template">Duplicate</button>
    <button class="btn btn-danger delete-template">Delete</button>
  </div>
</div>
```

### Edit Mode Structure

```html
<div class="template-edit-form" id="templateEditForm" style="display: none;">
  <div class="form-group">
    <label for="templateName">Template Name</label>
    <input type="text" id="templateName" class="form-control" required>
  </div>
  
  <div class="form-group">
    <label for="merchantName">Merchant</label>
    <input type="text" id="merchantName" class="form-control" required>
  </div>
  
  <div class="form-group">
    <label for="amount">Amount</label>
    <div class="input-group">
      <select id="currency" class="form-control currency-select">
        <option value="USD">USD</option>
        <!-- Other currencies -->
      </select>
      <input type="number" id="amount" class="form-control" step="0.01" required>
    </div>
  </div>
  
  <div class="form-group">
    <label for="description">Description</label>
    <textarea id="description" class="form-control" rows="3"></textarea>
  </div>
  
  <div class="form-actions">
    <button class="btn btn-primary save-template">Save Changes</button>
    <button class="btn btn-secondary cancel-edit">Cancel</button>
  </div>
</div>
```

## Scheduling Configuration Component

### Scheduling Interface Structure

```html
<div class="scheduling-section">
  <div class="scheduling-header">
    <h4>Schedule Template</h4>
    <div class="scheduling-toggle">
      <label class="switch">
        <input type="checkbox" id="enableScheduling">
        <span class="slider"></span>
      </label>
    </div>
  </div>
  
  <div class="scheduling-config" id="schedulingConfig" style="display: none;">
    <div class="form-group">
      <label>Frequency</label>
      <div class="frequency-options">
        <label><input type="radio" name="frequency" value="daily"> Daily</label>
        <label><input type="radio" name="frequency" value="weekly"> Weekly</label>
        <label><input type="radio" name="frequency" value="monthly"> Monthly</label>
        <label><input type="radio" name="frequency" value="custom"> Custom</label>
      </div>
    </div>
    
    <div class="form-group time-settings">
      <label>Execution Time</label>
      <div class="time-input-group">
        <select id="hour" class="form-control">
          <!-- Hours 1-12 -->
        </select>
        <select id="minute" class="form-control">
          <!-- Minutes 00, 15, 30, 45 -->
        </select>
        <select id="ampm" class="form-control">
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
    
    <div class="form-group weekly-settings" style="display: none;">
      <label>Days of Week</label>
      <div class="day-checkboxes">
        <label><input type="checkbox" value="monday"> Mon</label>
        <label><input type="checkbox" value="tuesday"> Tue</label>
        <label><input type="checkbox" value="wednesday"> Wed</label>
        <label><input type="checkbox" value="thursday"> Thu</label>
        <label><input type="checkbox" value="friday"> Fri</label>
        <label><input type="checkbox" value="saturday"> Sat</label>
        <label><input type="checkbox" value="sunday"> Sun</label>
      </div>
    </div>
    
    <div class="form-group monthly-settings" style="display: none;">
      <label>Day of Month</label>
      <select id="dayOfMonth" class="form-control">
        <!-- Days 1-31 plus "Last Day" -->
      </select>
    </div>
    
    <div class="scheduling-preview">
      <strong>Next execution:</strong> <span id="nextExecutionPreview">-</span>
    </div>
    
    <div class="scheduling-actions">
      <button class="btn btn-primary save-schedule">Save Schedule</button>
      <button class="btn btn-secondary pause-schedule" style="display: none;">Pause</button>
      <button class="btn btn-secondary resume-schedule" style="display: none;">Resume</button>
    </div>
  </div>
</div>
```

### Toggle Switch CSS

```css
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #007bff;
}

input:checked + .slider:before {
  transform: translateX(24px);
}
```

## Execution History Component

### History Table Structure

```html
<div class="execution-history">
  <h4>Execution History</h4>
  <div class="history-table">
    <div class="history-header">
      <div class="col-datetime">Date/Time</div>
      <div class="col-status">Status</div>
      <div class="col-expense">Expense</div>
      <div class="col-actions">Actions</div>
    </div>
    <div class="history-body" id="historyBody">
      <!-- History rows populated dynamically -->
    </div>
  </div>
  <div class="history-pagination">
    <button class="btn btn-secondary load-more">Load More</button>
  </div>
</div>
```

### History Row Template

```html
<div class="history-row">
  <div class="col-datetime">{formattedDateTime}</div>
  <div class="col-status">
    <span class="status-indicator {statusClass}"></span>
    {statusText}
  </div>
  <div class="col-expense">
    {expenseLink || errorMessage}
  </div>
  <div class="col-actions">
    {retryButton || viewButton}
  </div>
</div>
```

## Status Indicators

### Status Color Classes

```css
.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

.status-indicator.success { background-color: #28a745; }
.status-indicator.failed { background-color: #dc3545; }
.status-indicator.pending { background-color: #ffc107; }
.status-indicator.paused { background-color: #6c757d; }
.status-indicator.processing { 
  background-color: #007bff;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Notification Components

### In-Panel Notification Structure

```html
<div class="notification {notificationType}" id="templateNotification" style="display: none;">
  <div class="notification-content">
    <span class="notification-icon {iconClass}"></span>
    <span class="notification-message">{message}</span>
  </div>
  <button class="notification-close">&times;</button>
</div>
```

### Notification CSS

```css
.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 4px;
  border-left: 4px solid;
}

.notification.success {
  background-color: #d4edda;
  border-left-color: #28a745;
  color: #155724;
}

.notification.error {
  background-color: #f8d7da;
  border-left-color: #dc3545;
  color: #721c24;
}

.notification.warning {
  background-color: #fff3cd;
  border-left-color: #ffc107;
  color: #856404;
}

.notification.info {
  background-color: #d1ecf1;
  border-left-color: #17a2b8;
  color: #0c5460;
}
```

## Form Validation

### Validation States

Apply these classes to form groups with validation errors:

```css
.form-group.has-error .form-control {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

.form-group.has-error .error-message {
  display: block;
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
}

.form-group .error-message {
  display: none;
}
```

## Accessibility Guidelines

### ARIA Labels and Roles

- Add `role="button"` to clickable template cards
- Use `aria-label` for icon-only buttons
- Add `aria-expanded` for collapsible sections
- Use `aria-describedby` to associate error messages with form fields

### Keyboard Navigation

- Ensure all interactive elements are focusable with Tab key
- Implement Enter/Space key handlers for custom buttons
- Provide visible focus indicators
- Support Escape key to close modals/detail views

### Screen Reader Support

```html
<button class="btn-icon edit-btn" aria-label="Edit template">
  <span class="icon-edit" aria-hidden="true"></span>
</button>

<div class="template-item" role="button" tabindex="0" aria-label="Template: {templateName}, Amount: {amount}">
  <!-- Template content -->
</div>
```

## Performance Considerations

### Lazy Loading

- Load template details only when requested
- Implement virtual scrolling for large template lists
- Cache frequently accessed template data

### Animation Guidelines

- Use CSS transitions for state changes (max 300ms)
- Provide `prefers-reduced-motion` alternatives
- Limit concurrent animations to prevent performance issues

## Testing Guidelines

### Component Testing

Each template component should include tests for:
- Initial render state
- User interaction handlers
- Form validation
- Error state handling
- Accessibility features

### Integration Testing

- Template creation flow
- Scheduling configuration
- Execution history display
- Cross-component communication

## Implementation Checklist

- [ ] Template section integrated into side panel
- [ ] Template cards display correctly
- [ ] Edit mode toggle functionality
- [ ] Scheduling configuration interface
- [ ] Execution history table
- [ ] Status indicators working
- [ ] Form validation implemented
- [ ] Accessibility features added
- [ ] Responsive design verified
- [ ] Performance optimizations applied
