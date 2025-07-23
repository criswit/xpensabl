---
id: task-10
title: Add expense persistence as templates functionality
status: To Do
assignee: []
created_date: '2025-07-23'
updated_date: '2025-07-23'
labels:
  - template-persistence-and-storage
dependencies:
  - task-16
  - task-17
  - task-19
---

## Description

Enable users to save expenses as reusable templates that persist in Chrome extension storage, allowing quick creation of similar expenses even after the original is removed from Navan.

## Acceptance Criteria

- [ ] User can create a template from any existing expense via a Save as Template button
- [ ] Templates are stored in Chrome extension storage (maximum 5 templates)
- [ ] Side panel displays a Templates section showing all saved templates
- [ ] User can apply a template to auto-populate a new expense form
- [ ] User can edit existing templates (name and expense data)
- [ ] User can delete templates from the templates section
- [ ] Templates contain all core expense data from the original expense
- [ ] When applying a template date fields automatically update to current date
- [ ] Templates sync across devices/browsers using Chrome sync storage
- [ ] Each template has a user-defined name for easy identification
- [ ] User can configure scheduling for each template with intervals: daily weekly monthly or custom intervals
- [ ] Each template supports only one schedule configuration at a time
- [ ] User can pause and resume scheduling for individual templates
- [ ] Scheduled expenses are automatically created using current date when schedule triggers
- [ ] System notifies user to login to Navan when scheduled expense is ready to be created
- [ ] Notifications appear as pop-ups regardless of what website user is currently on
- [ ] User can view execution history of scheduled templates
- [ ] User can see when next scheduled expense will be created for each template
- [ ] Scheduling metadata (next execution time and interval) is stored alongside template in Chrome storage
- [ ] Automatically created expenses are submitted directly to Navan
- [ ] System creates notification when scheduled expense is successfully created
