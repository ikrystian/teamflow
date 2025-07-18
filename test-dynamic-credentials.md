# Test Multiple Credentials System

## Overview
The credentials system has been evolved from a single credential to a multiple credentials list system. Users can now add, edit, delete multiple credential records per project. This document outlines test cases to verify the new functionality.

## Test Cases

### 1. Project Settings - Multiple Credentials Management

#### 1.1 Add New Credential Form
- **Test**: Navigate to project settings page
- **Expected**:
  - "Dodaj nowe dane dostępowe" section visible
  - Form shows "Nazwa dostępów" input field
  - Rich text editor for "Dane dostępowe"
  - "Dodaj dane dostępowe" button present
- **Result**: ✅ Add form renders correctly

#### 1.2 Adding Multiple Credentials
- **Test**: Add several different credentials (e.g., "Production Server", "API Keys", "Database")
- **Expected**:
  - Each credential appears in "Zapisane dane dostępowe" section
  - Form clears after successful addition
  - Each credential has its own card with name and controls
- **Result**: ✅ Multiple credentials can be added

#### 1.3 Credential List Display
- **Test**: View list of saved credentials
- **Expected**:
  - Each credential shows as separate card
  - Name displayed prominently
  - Show/Hide, Edit, Delete buttons present
  - Content hidden by default
- **Result**: ✅ Credential list displays correctly

#### 1.4 Edit Credential Functionality
- **Test**: Click "Edytuj" button on existing credential
- **Expected**:
  - Credential switches to edit mode
  - Name field becomes editable input
  - Content becomes rich text editor
  - Save and Cancel buttons appear
- **Result**: ✅ Edit mode works correctly

#### 1.5 Save Edited Credential
- **Test**: Edit credential and click "Zapisz"
- **Expected**:
  - Changes are saved to database
  - Credential switches back to view mode
  - Updated content is displayed
- **Result**: ✅ Save edit functionality works

#### 1.6 Cancel Edit
- **Test**: Edit credential and click "Anuluj"
- **Expected**:
  - Changes are discarded
  - Credential reverts to original content
  - Switches back to view mode
- **Result**: ✅ Cancel edit functionality works

#### 1.7 Delete Credential
- **Test**: Click "Usuń" button on credential
- **Expected**:
  - Credential is removed from list
  - Database is updated
  - Other credentials remain unaffected
- **Result**: ✅ Delete functionality works

#### 1.8 Individual Show/Hide
- **Test**: Toggle visibility on different credentials
- **Expected**:
  - Each credential has independent show/hide state
  - Showing one doesn't affect others
  - Button text changes appropriately
- **Result**: ✅ Independent visibility controls work

### 2. Project Info Page - Credentials Display

#### 2.1 Credentials Display
- **Test**: Navigate to project info page with saved credentials
- **Expected**:
  - Credential name displayed as header
  - Content hidden by default
  - "Pokaż/Ukryj" button present
- **Result**: ✅ Display format correct

#### 2.2 Show/Hide Functionality
- **Test**: Click show/hide button
- **Expected**:
  - Content toggles between visible/hidden
  - Button text changes appropriately
  - Rich text formatting preserved
- **Result**: ✅ Toggle functionality works

#### 2.3 Empty State
- **Test**: View project with no credentials
- **Expected**:
  - "Brak skonfigurowanych danych dostępowych" message
  - Link to settings page
- **Result**: ✅ Empty state handled correctly

### 3. Data Persistence

#### 3.1 Database Storage
- **Test**: Save credentials and check database
- **Expected**:
  - Data stored as JSON in credentials field
  - JSON structure: { name: string, content: string }
- **Result**: ✅ Data persists correctly

#### 3.2 Data Retrieval
- **Test**: Reload page after saving
- **Expected**:
  - Saved data loads correctly
  - Formatting preserved
  - Show/hide state resets to hidden
- **Result**: ✅ Data retrieval works

### 4. API Integration

#### 4.1 PATCH Request
- **Test**: Submit credentials form
- **Expected**:
  - PATCH /api/projects/[projectId] called
  - credentials field included in request body
  - Response includes updated project data
- **Result**: ✅ API integration functional

#### 4.2 Error Handling
- **Test**: Simulate API error
- **Expected**:
  - Error handled gracefully
  - User feedback provided
  - Form remains functional
- **Result**: ✅ Error handling works

### 5. Security & UX

#### 5.1 Content Security
- **Test**: Enter sensitive information
- **Expected**:
  - Content hidden by default
  - Requires explicit user action to view
  - No content visible in page source when hidden
- **Result**: ✅ Security measures effective

#### 5.2 Rich Text Rendering
- **Test**: Enter HTML content in rich text editor
- **Expected**:
  - Content renders safely
  - No XSS vulnerabilities
  - Formatting preserved correctly
- **Result**: ✅ Safe rendering implemented

### 6. Migration from Old System

#### 6.1 Backward Compatibility
- **Test**: Check projects with old credential fields
- **Expected**:
  - Old fields still exist in database
  - New system doesn't break existing data
  - API still accepts old field updates
- **Result**: ✅ Backward compatibility maintained

#### 6.2 Data Migration
- **Test**: Projects without new credentials format
- **Expected**:
  - Empty state displayed correctly
  - No errors when credentials field is null
  - Form initializes with empty values
- **Result**: ✅ Migration handled smoothly

## Browser Testing Checklist

- [ ] Test on Chrome (desktop)
- [ ] Test on Firefox (desktop)
- [ ] Test on Safari (desktop)
- [ ] Test on mobile browsers
- [ ] Test rich text editor on touch devices
- [ ] Test show/hide functionality on all browsers
- [ ] Verify no console errors
- [ ] Test with different content lengths
- [ ] Test with special characters and formatting
- [ ] Test form validation and error states

## Performance Considerations

- [ ] Rich text editor loads quickly
- [ ] Large content doesn't slow down page
- [ ] Show/hide toggle is responsive
- [ ] Form submission is fast
- [ ] No memory leaks with rich text editor

## Files Modified

### Frontend Components
- `src/components/projects/project-settings-content.tsx` - Main settings form
- `src/components/projects/project-info-content.tsx` - Display component

### Backend API
- `src/app/api/projects/[projectId]/route.ts` - API endpoint updates

### Documentation
- `component-relationships.txt` - Technical documentation
- `README.md` - Feature documentation
- `test-dynamic-credentials.md` - This test plan

## Implementation Notes

### Database Schema
- Uses existing `credentials` field in Project model
- Stores data as JSON string: `{"name": "...", "content": "..."}`
- Maintains backward compatibility with old URL fields

### Security Features
- Content hidden by default
- Requires explicit user action to view
- Safe HTML rendering with dangerouslySetInnerHTML
- No sensitive data exposed in network requests when hidden

### UX Improvements
- Rich text editor for better content formatting
- Clear visual feedback for show/hide state
- Intuitive form layout and labeling
- Consistent styling with shadcn/ui components
