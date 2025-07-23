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

## Integration with Existing Side Panel

### Adding Templates Section

Insert the templates section after the expenses section in `sidepanel.html`:

```html
<!-- Insert after expenses-section -->
<div class="templates-section">
  <h2>Expense Templates <span class="template-count">({templateCount}/5)</span></h2>
  <div class="template-controls">
    <button id="createTemplate" class="btn btn-success" style="display: none;">Create Template</button>
    <button id="manageTemplates" class="btn btn-secondary" style="display: none;">Manage Templates</button>
  </div>
  <div class="template-content">
    <div class="template-status" id="templateStatus">No templates created yet</div>
    <div class="template-list" id="templateList" style="display: none;">
      <!-- Template cards will be populated here -->
    </div>
  </div>
</div>
```

### Template Creation Entry Points

Add "Save as Template" button to expense detail view:

```html
<!-- Add to expense detail actions -->
<div class="detail-actions">
  <button id="duplicateExpense" class="btn btn-primary">Duplicate Expense</button>
  <button id="saveAsTemplate" class="btn btn-secondary">Save as Template</button>
</div>
```

## Template List Component

### Empty State

```html
<div class="empty-state template-empty">
  <div class="empty-icon">📄</div>
  <h4>No Templates Yet</h4>
  <p>Create templates from your expenses to reuse them later with scheduling.</p>
  <button class="btn btn-primary create-first-template" disabled>
    Select an expense to create your first template
  </button>
</div>
```

### Template Card Structure

```html
<div class="template-item" data-template-id="{template.id}">
  <div class="template-header">
    <div class="template-name">{template.name}</div>
    <div class="template-actions">
      <button class="btn-icon favorite-btn" data-favorite="{template.metadata.favorite}" aria-label="Toggle favorite">
        <span class="icon-star{template.metadata.favorite ? '' : '-outline'}"></span>
      </button>
      <button class="btn-icon edit-btn" aria-label="Edit template">
        <span class="icon-edit"></span>
      </button>
      <button class="btn-icon delete-btn" aria-label="Delete template">
        <span class="icon-delete"></span>
      </button>
    </div>
  </div>
  
  <div class="template-details">
    <div class="template-merchant">{template.expenseData.merchant.name}</div>
    <div class="template-amount">{template.expenseData.merchantCurrency} {template.expenseData.merchantAmount.toFixed(2)}</div>
    <div class="template-meta">
      <span class="last-used">
        {template.metadata.lastUsed ? `Last used: ${new Date(template.metadata.lastUsed).toLocaleDateString()}` : 'Never used'}
      </span>
      <span class="use-count">Used {template.metadata.useCount} times</span>
    </div>
    <div class="scheduling-info">
      {template.scheduling?.enabled ? 
        `<span class="scheduling-indicator active">
          <span class="icon-clock"></span>
          Next: ${new Date(template.scheduling.nextExecution).toLocaleDateString()}
        </span>` :
        `<span class="scheduling-indicator inactive">
          <span class="icon-clock-outline"></span>
          No schedule
        </span>`
      }
    </div>
  </div>
  
  <div class="template-footer">
    <button class="btn btn-primary apply-template">Apply Template</button>
    <div class="execution-status {template.executionHistory[0]?.status || 'none'}">
      <span class="status-indicator"></span>
      {getLastExecutionStatus(template)}
    </div>
  </div>
</div>
```

### Template Limit Warning

```html
<div class="template-limit-warning" id="templateLimitWarning" style="display: none;">
  <div class="notification warning">
    <div class="notification-content">
      <span class="notification-icon">⚠️</span>
      <span class="notification-message">
        You have {templateCount}/5 templates. <a href="#" id="manageLimitLink">Manage templates</a> to create more.
      </span>
    </div>
    <button class="notification-close">&times;</button>
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

### Template Creation Form

```html
<div class="template-create-form" id="templateCreateForm" style="display: none;">
  <div class="form-header">
    <h3>Create Template from Expense</h3>
    <button class="btn btn-secondary close-form">×</button>
  </div>
  
  <div class="form-body">
    <div class="form-group">
      <label for="templateName">Template Name *</label>
      <input type="text" id="templateName" class="form-control" required 
             placeholder="e.g., Weekly Coffee Shop Visit">
      <div class="error-message">Template name is required</div>
    </div>
    
    <div class="form-group">
      <label>Source Expense</label>
      <div class="source-expense-display">
        <div class="expense-preview">
          <span class="merchant-name">{sourceMerchant}</span>
          <span class="expense-amount">{sourceCurrency} {sourceAmount}</span>
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <label for="templateTags">Tags (optional)</label>
      <input type="text" id="templateTags" class="form-control" 
             placeholder="travel, meals, recurring">
      <small class="form-text">Separate multiple tags with commas</small>
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="makeFavorite"> Mark as favorite template
      </label>
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="enableScheduling"> Enable scheduling
      </label>
    </div>
  </div>
  
  <div class="form-actions">
    <button class="btn btn-primary create-template">Create Template</button>
    <button class="btn btn-secondary cancel-create">Cancel</button>
  </div>
</div>
```

### Edit Mode Structure

```html
<div class="template-edit-form" id="templateEditForm" style="display: none;">
  <div class="form-header">
    <h3>Edit Template</h3>
    <button class="btn btn-secondary close-form">×</button>
  </div>
  
  <div class="form-body">
    <div class="form-group">
      <label for="editTemplateName">Template Name *</label>
      <input type="text" id="editTemplateName" class="form-control" required>
      <div class="error-message">Template name is required</div>
    </div>
    
    <div class="form-group">
      <label for="editMerchantName">Merchant Name *</label>
      <input type="text" id="editMerchantName" class="form-control" required>
      <div class="error-message">Merchant name is required</div>
    </div>
    
    <div class="form-group">
      <label for="editAmount">Amount *</label>
      <div class="input-group">
        <select id="editCurrency" class="form-control currency-select">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="CAD">CAD</option>
        </select>
        <input type="number" id="editAmount" class="form-control" step="0.01" required min="0">
      </div>
      <div class="error-message">Valid amount is required</div>
    </div>
    
    <div class="form-group">
      <label for="editDescription">Description</label>
      <textarea id="editDescription" class="form-control" rows="3" 
                placeholder="Optional description for this template"></textarea>
    </div>
    
    <div class="form-group">
      <label for="editPolicy">Policy</label>
      <select id="editPolicy" class="form-control">
        <option value="OTHER">Other</option>
        <option value="MEALS">Meals</option>
        <option value="TRAVEL">Travel</option>
        <option value="OFFICE_SUPPLIES">Office Supplies</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="editTags">Tags</label>
      <input type="text" id="editTags" class="form-control" 
             placeholder="Separate multiple tags with commas">
      <small class="form-text">Used for organizing and searching templates</small>
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="editFavorite"> Mark as favorite template
      </label>
    </div>
    
    <div class="template-metadata">
      <div class="metadata-item">
        <span class="label">Created:</span>
        <span class="value">{new Date(template.createdAt).toLocaleDateString()}</span>
      </div>
      <div class="metadata-item">
        <span class="label">Last Modified:</span>
        <span class="value">{new Date(template.updatedAt).toLocaleDateString()}</span>
      </div>
      <div class="metadata-item">
        <span class="label">Usage Count:</span>
        <span class="value">{template.metadata.useCount} times</span>
      </div>
    </div>
  </div>
  
  <div class="form-actions">
    <button class="btn btn-primary save-template">Save Changes</button>
    <button class="btn btn-secondary cancel-edit">Cancel</button>
    <button class="btn btn-danger delete-template">Delete Template</button>
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

## JavaScript Integration Patterns

### Template Data Loading

```javascript
// Load templates on side panel initialization
async function loadTemplates() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getTemplates' });
    if (response.success) {
      displayTemplates(response.data);
      updateTemplateCount(response.data.length);
    }
  } catch (error) {
    showTemplateError('Failed to load templates');
  }
}

// Update template count display
function updateTemplateCount(count) {
  const countSpan = document.querySelector('.template-count');
  countSpan.textContent = `(${count}/5)`;
  
  // Show/hide controls based on count
  const createBtn = document.getElementById('createTemplate');
  const warningDiv = document.getElementById('templateLimitWarning');
  
  if (count >= 5) {
    createBtn.style.display = 'none';
    warningDiv.style.display = 'block';
  } else if (count >= 4) {
    warningDiv.style.display = 'block';
  }
}
```

### Template Creation from Expense

```javascript
// Add event listener to "Save as Template" button in expense detail
document.getElementById('saveAsTemplate').addEventListener('click', async () => {
  const expenseData = getCurrentExpenseData();
  showTemplateCreationForm(expenseData);
});

function showTemplateCreationForm(sourceExpense) {
  const form = document.getElementById('templateCreateForm');
  const merchantSpan = form.querySelector('.merchant-name');
  const amountSpan = form.querySelector('.expense-amount');
  
  // Pre-populate form with expense data
  merchantSpan.textContent = sourceExpense.merchant?.name || 'Unknown Merchant';
  amountSpan.textContent = `${sourceExpense.merchantCurrency} ${sourceExpense.merchantAmount}`;
  
  // Show form
  form.style.display = 'block';
  document.getElementById('templateName').focus();
}
```

### Template Application Logic

```javascript
// Apply template to create new expense
async function applyTemplate(templateId) {
  try {
    const template = await getTemplate(templateId);
    const newExpenseData = {
      ...template.expenseData,
      date: new Date().toISOString(), // Update to current date
    };
    
    const response = await chrome.runtime.sendMessage({
      action: 'createExpense',
      expenseData: newExpenseData
    });
    
    if (response.success) {
      // Update template usage statistics
      await updateTemplateUsage(templateId);
      showNotification('Expense created from template successfully!', 'success');
    }
  } catch (error) {
    showNotification('Failed to create expense from template', 'error');
  }
}
```

### State Management

```javascript
let templateState = {
  templates: [],
  currentView: 'list', // 'list', 'detail', 'edit', 'create'
  selectedTemplate: null,
  isLoading: false
};

// State update function
function updateTemplateState(updates) {
  templateState = { ...templateState, ...updates };
  renderTemplateView();
}

// View rendering based on state
function renderTemplateView() {
  const { currentView, selectedTemplate, templates } = templateState;
  
  // Hide all views
  document.querySelectorAll('.template-view').forEach(view => {
    view.style.display = 'none';
  });
  
  // Show current view
  switch (currentView) {
    case 'list':
      showTemplateList(templates);
      break;
    case 'detail':
      showTemplateDetail(selectedTemplate);
      break;
    case 'edit':
      showTemplateEditForm(selectedTemplate);
      break;
    case 'create':
      showTemplateCreateForm();
      break;
  }
}
```

## Error Handling Patterns

### Form Validation

```javascript
function validateTemplateForm(formData) {
  const errors = {};
  
  if (!formData.name || formData.name.trim().length < 1) {
    errors.name = 'Template name is required';
  }
  
  if (formData.name && formData.name.length > 100) {
    errors.name = 'Template name must be less than 100 characters';
  }
  
  if (!formData.merchantAmount || formData.merchantAmount <= 0) {
    errors.amount = 'Valid amount is required';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

function showFormErrors(errors) {
  // Clear previous errors
  document.querySelectorAll('.form-group').forEach(group => {
    group.classList.remove('has-error');
  });
  
  // Show new errors
  Object.keys(errors).forEach(field => {
    const formGroup = document.querySelector(`#${field}`).closest('.form-group');
    const errorMsg = formGroup.querySelector('.error-message');
    
    formGroup.classList.add('has-error');
    errorMsg.textContent = errors[field];
  });
}
```

## Implementation Checklist

### Core Functionality
- [ ] Template section integrated into side panel
- [ ] Template data loading from Chrome storage
- [ ] Template cards display with proper data binding
- [ ] "Save as Template" button added to expense details
- [ ] Template creation form with validation
- [ ] Template editing functionality
- [ ] Template deletion with confirmation
- [ ] Template application to create expenses

### User Experience
- [ ] Empty state handling for no templates
- [ ] Template limit warnings (4/5 and 5/5)
- [ ] Template usage statistics display
- [ ] Loading states for async operations
- [ ] Error handling with user-friendly messages
- [ ] Form validation with inline error display

### Scheduling Features
- [ ] Scheduling configuration interface
- [ ] Execution history table
- [ ] Schedule enable/disable toggle
- [ ] Next execution time display
- [ ] Pause/resume scheduling controls

### Technical Requirements
- [ ] Status indicators working with proper colors
- [ ] Accessibility features (ARIA labels, keyboard nav)
- [ ] Responsive design for different screen sizes
- [ ] Performance optimizations (lazy loading, caching)
- [ ] Cross-browser compatibility testing
- [ ] Chrome extension storage integration
