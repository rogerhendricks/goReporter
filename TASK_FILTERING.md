# Task Filtering Implementation

## Overview
Comprehensive task filtering system supporting status, priority, and due date filters with both preset and custom date range options.

## Features

### 1. Status Filtering
Filter tasks by their current status:
- **All** - Show all tasks
- **Pending** - Not yet started
- **In Progress** - Currently being worked on
- **Completed** - Finished tasks
- **Cancelled** - Cancelled tasks

### 2. Priority Filtering
Filter tasks by priority level:
- **All** - Show all priorities
- **Low** - Low priority tasks
- **Medium** - Medium priority tasks
- **High** - High priority tasks
- **Urgent** - Urgent tasks requiring immediate attention

### 3. Due Date Filtering
Filter tasks by due date with preset options:
- **All Dates** - Show all tasks regardless of due date
- **Overdue** - Tasks with due dates in the past (excludes completed tasks)
- **Today** - Tasks due today
- **Tomorrow** - Tasks due tomorrow
- **This Week** - Tasks due in the next 7 days
- **This Month** - Tasks due this month
- **Upcoming** - Tasks due in the future (excluding today)
- **No Due Date** - Tasks without an assigned due date

### 4. Custom Date Range (API Only)
For advanced filtering, the API supports custom date ranges:
- `dueDateFrom` - Tasks due on or after this date (YYYY-MM-DD)
- `dueDateTo` - Tasks due before this date (YYYY-MM-DD)

## API Usage

### Endpoint
```
GET /api/tasks
```

### Query Parameters

| Parameter | Type | Options | Description |
|-----------|------|---------|-------------|
| `status` | string | `pending`, `in_progress`, `completed`, `cancelled` | Filter by task status |
| `priority` | string | `low`, `medium`, `high`, `urgent` | Filter by priority level |
| `dueDate` | string | `overdue`, `today`, `tomorrow`, `this_week`, `this_month`, `upcoming`, `no_due_date` | Preset due date filters |
| `dueDateFrom` | string | YYYY-MM-DD | Tasks due on or after this date |
| `dueDateTo` | string | YYYY-MM-DD | Tasks due before this date |
| `patientId` | number | - | Filter by patient ID |
| `assignedTo` | number | - | Filter by assigned user ID |

### Examples

#### Get all overdue high priority tasks
```
GET /api/tasks?priority=high&dueDate=overdue
```

#### Get tasks due this week with pending status
```
GET /api/tasks?status=pending&dueDate=this_week
```

#### Get tasks due between specific dates
```
GET /api/tasks?dueDateFrom=2025-01-01&dueDateTo=2025-01-31
```

#### Get urgent tasks for a specific patient
```
GET /api/tasks?patientId=123&priority=urgent
```

## Frontend Implementation

### Component: TaskList.tsx
The task list component provides three filter dropdowns in the header:

1. **Status Filter** - Dropdown with all status options
2. **Priority Filter** - Dropdown with all priority levels  
3. **Due Date Filter** - Dropdown with preset date filters

### Usage
Filters are combined using AND logic - tasks must match ALL selected filters.

Example:
- Status: `in_progress`
- Priority: `high`
- Due Date: `this_week`

Result: Shows only high priority tasks that are currently in progress and due within the next 7 days.

## Backend Implementation

### Handler: internal/handlers/task.go
The `GetTasks` function processes all filter query parameters:

1. **Basic Filters** - Direct database column matching
   - Status, Priority, Patient ID, Assigned To

2. **Due Date Preset Filters** - Computed date ranges
   - Uses Go's `time` package to calculate date boundaries
   - Handles timezone-aware date comparisons
   - Excludes completed tasks from "overdue" filter

3. **Custom Date Range** - Flexible date boundary filtering
   - Parses ISO 8601 date strings (YYYY-MM-DD)
   - Includes entire day for `dueDateTo` by adding 24 hours

### Database Query
All filters are applied as `WHERE` clauses in the GORM query, ensuring efficient database-level filtering rather than post-processing in application code.

## Store: taskStore.ts

### Types
```typescript
export type DueDateFilter = 
  | 'all' 
  | 'overdue' 
  | 'today' 
  | 'tomorrow' 
  | 'this_week' 
  | 'this_month' 
  | 'no_due_date' 
  | 'upcoming'

interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  patientId?: number
  assignedTo?: number
  dueDate?: DueDateFilter
  dueDateFrom?: string
  dueDateTo?: string
}
```

### Methods
```typescript
fetchTasks(filters?: TaskFilters): Promise<void>
```

Constructs URL query parameters from filter object and fetches filtered tasks from API.

## Role-Based Access Control

Task filtering respects user roles:
- **Regular Users** - See only tasks assigned to them (automatically filtered)
- **Admin Users** - See all tasks in the system

Filters are applied on top of role-based access control, so regular users can filter their own tasks but never see tasks assigned to others.

## Performance Considerations

1. **Database Indexing** - Ensure indexes exist on:
   - `status`
   - `priority`
   - `due_date`
   - `patient_id`
   - `assigned_to_id`

2. **Query Optimization** - All filters are applied at the database level before data is loaded into memory

3. **Date Calculations** - Date boundaries are computed once per request, not per task

## Future Enhancements

Potential improvements for future releases:

1. **Multi-Select Filters** - Allow selecting multiple statuses or priorities
2. **Tag Filtering** - Filter by task tags
3. **Search** - Full-text search across title and description
4. **Saved Filters** - Save frequently used filter combinations
5. **Filter Presets UI** - Quick access buttons for common filters (e.g., "My Urgent Tasks", "Overdue This Week")
6. **Date Range Picker** - Visual calendar for custom date range selection
7. **Filter Chips** - Visual indicators showing active filters with quick removal
8. **URL Persistence** - Save filter state in URL query params for bookmarking
