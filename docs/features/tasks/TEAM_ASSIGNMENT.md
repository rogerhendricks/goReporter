# Task Team Assignment Feature

This document describes the team assignment feature for tasks in the GoReporter application.

## Overview

Tasks can now be assigned to either:
- **Individual Users** (existing functionality)
- **Teams** (new functionality)

This allows for better task distribution and collaboration among team members.

## How It Works

### Backend Changes

#### Database Model (`internal/models/task.go`)
```go
type Task struct {
    // ... other fields
    AssignedToID     *uint  `json:"assignedToId" gorm:"index"`
    AssignedTo       *User  `json:"assignedTo,omitempty" gorm:"foreignKey:AssignedToID"`
    AssignedToTeamID *uint  `json:"assignedToTeamId" gorm:"index"`
    AssignedToTeam   *Team  `json:"assignedToTeam,omitempty" gorm:"foreignKey:AssignedToTeamID"`
    // ... other fields
}
```

**Rules:**
- A task can be assigned to EITHER a user OR a team, but not both
- If `assignedToTeamId` is set, `assignedToId` should be null
- If `assignedToId` is set, `assignedToTeamId` should be null

#### API Endpoints

**Create Task**
```bash
POST /api/tasks
{
  "title": "Review Patient Files",
  "description": "Review all pending patient files",
  "priority": "high",
  "assignedToTeamId": 5  // Assign to team ID 5
}
```

**Update Task**
```bash
PUT /api/tasks/:id
{
  "assignedToTeamId": 3  // Reassign to team ID 3 (clears user assignment)
}
```

**Filter Tasks by Team**
```bash
GET /api/tasks?assignedToTeam=5
```

#### Permission Model

**Viewing Tasks:**
- Admins and Doctors: See all tasks
- Regular Users: See tasks that are:
  - Assigned to them individually
  - Created by them
  - Assigned to a team they are a member of

**Updating Tasks:**
- Admins and Doctors: Can update any task and reassign to users or teams
- Regular Users: Can update tasks:
  - Assigned to them individually
  - Created by them
  - Assigned to a team they are a member of
- Regular Users CANNOT reassign tasks

### Frontend Changes

#### Task Store (`frontend/src/stores/taskStore.ts`)
```typescript
export interface Task {
  // ... other fields
  assignedToId?: number
  assignedTo?: {
    id: number
    username: string
    fullName: string
  }
  assignedToTeamId?: number
  assignedToTeam?: {
    id: number
    name: string
    color?: string
  }
  // ... other fields
}

export interface CreateTaskData {
  // ... other fields
  assignedToId?: number
  assignedToTeamId?: number
}

export interface UpdateTaskData {
  // ... other fields
  assignedToId?: number
  assignedToTeamId?: number
}
```

#### Task Form (`frontend/src/components/forms/TaskForm.tsx`)

The task creation form now includes a tabbed interface for admins and doctors:

**User Assignment Tab:**
- Select an individual user from dropdown
- Default: "Assign to myself"
- Shows all users with their roles

**Team Assignment Tab:**
- Select a team from dropdown
- Shows team name and color indicator
- Lists all available teams

**Regular Users:**
- Cannot assign to teams
- Tasks are automatically assigned to themselves

## Usage Examples

### Creating a Task Assigned to a Team

**Scenario:** Admin wants to create a task for the "Cardiology Team" to review patient reports.

```typescript
const taskData: CreateTaskData = {
  title: "Review Daily Patient Reports",
  description: "Review all patient reports from today",
  priority: "medium",
  patientId: 123,
  assignedToTeamId: 5, // Cardiology Team ID
  dueDate: new Date('2026-01-16')
}

await createTask(taskData)
```

### Team Members Viewing Their Tasks

When a task is assigned to a team, all team members can:
- See the task in their task list
- View task details
- Update task status
- Add notes to the task
- Mark the task as complete

### Reassigning from User to Team

**Scenario:** Admin realizes a task needs team collaboration instead of individual work.

```typescript
const updateData: UpdateTaskData = {
  assignedToTeamId: 5, // Assign to Cardiology Team
  // assignedToId is automatically cleared
}

await updateTask(taskId, updateData)
```

### Reassigning from Team to User

**Scenario:** Task needs more focused attention from a specific user.

```typescript
const updateData: UpdateTaskData = {
  assignedToId: 42, // Assign to Dr. Smith
  // assignedToTeamId is automatically cleared
}

await updateTask(taskId, updateData)
```

## Migration

### Database Migration

GORM AutoMigrate will automatically add the new columns:
- `assigned_to_team_id` (nullable uint)
- Index on `assigned_to_team_id`

**Migration happens automatically on server start.**

### Existing Data

- Existing tasks with `assignedToId` will remain unchanged
- `assignedToTeamId` will be `null` for all existing tasks
- No data migration needed

## Benefits

### For Administrators
- Better workload distribution across teams
- Visibility into team task assignments
- Flexibility to assign complex tasks to entire teams

### For Team Members
- Shared responsibility for team-assigned tasks
- Any team member can work on the task
- Better collaboration opportunities

### For Workflow
- Tasks requiring multiple people can be assigned to teams
- On-call rotations can be managed through team assignments
- Department-specific tasks can be routed to appropriate teams

## UI Components Affected

### Task List
- Shows team name and color badge if assigned to team
- Shows user name if assigned to individual
- Filter by team assignment

### Task Detail
- Displays "Assigned to Team: [Team Name]" with color indicator
- Or displays "Assigned to: [User Name]"
- Edit allows switching between user and team assignment

### Task Form
- Tabs to choose between user and team assignment
- Team dropdown shows all available teams with colors
- User dropdown shows all users with roles

## API Reference

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `assignedTo` | number | Filter tasks by user ID |
| `assignedToTeam` | number | Filter tasks by team ID |
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |

### Response Fields

```json
{
  "id": 123,
  "title": "Review Patient Files",
  "assignedToTeamId": 5,
  "assignedToTeam": {
    "id": 5,
    "name": "Cardiology Team",
    "color": "#3b82f6"
  },
  "assignedToId": null,
  "assignedTo": null
}
```

## Best Practices

### When to Assign to a Team
- Tasks requiring multiple skill sets
- Department-wide responsibilities
- On-call or rotation-based tasks
- Tasks where any team member should be able to respond

### When to Assign to a User
- Tasks requiring specific expertise
- Personal follow-ups
- Tasks with clear individual accountability
- Time-sensitive tasks for specific people

### Team Management
- Keep teams small and focused (3-10 members)
- Assign teams based on expertise areas
- Use team colors for easy visual identification
- Regularly review team assignments

## Troubleshooting

### Task Not Visible to Team Member
**Check:**
1. Is the user actually a member of the team?
2. Go to Admin > Team Management
3. Verify user is in the team member list
4. If not, add them using "Add Members" button

### Cannot Assign to Team
**Check:**
1. Is the user an admin or doctor?
2. Regular users cannot assign tasks to teams
3. Only admins and doctors have team assignment permissions

### Both User and Team Assigned
**This should not happen.** If it does:
1. The API will return an error
2. Backend enforces the rule: tasks can be assigned to EITHER user OR team
3. When updating, one assignment clears the other

## Future Enhancements

Potential features to consider:

1. **Task Assignment Notifications**
   - Notify all team members when task assigned to their team
   - Notify team manager when task completed

2. **Team-Based Task Templates**
   - Create templates automatically assigned to specific teams
   - Recurring team tasks

3. **Team Performance Metrics**
   - Track completion rates by team
   - Team productivity reports
   - Response time analytics

4. **Team Task Claiming**
   - Allow team members to "claim" a team task
   - Converts team assignment to user assignment
   - Prevents duplicate work

5. **Team Workload Balancing**
   - Visualize task distribution across teams
   - Suggest reassignment for overloaded teams
   - Auto-balance based on capacity

