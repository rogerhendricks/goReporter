# Appointment Slot System

## Overview

The appointment system now uses a slot-based booking mechanism for **clinic** appointments only. Remote and televisit appointments can be booked at any time without slot restrictions.

## Key Features

### Slot Configuration
- **Slot Duration**: 15 minutes
- **Capacity**: 4 patients per slot
- **Location**: Clinic only (remote and televisit are unrestricted)
- **Available Hours**: 8:00 AM - 11:30 AM **Sydney time (Australia/Sydney)**
- **Time Rounding**: All clinic appointment times are automatically rounded to the nearest 15-minute interval (e.g., 8:00, 8:15, 8:30, 8:45)

### How It Works

1. **Clinic Appointments**:
   - Only available between 8:00 AM and 11:30 AM (Sydney time - Australia/Sydney timezone)
   - When creating/updating a clinic appointment, the system checks slot availability
   - Time is automatically rounded to 15-minute intervals
   - End time is automatically set to 15 minutes after start if not specified
   - System prevents booking if slot is full (4 patients already booked)
   - System prevents booking outside of 8:00 AM - 11:30 AM time window (validated in Sydney timezone)
   - Slot capacity is managed automatically on create/update/delete
   - **Timezone Handling**: Frontend sends times in ISO 8601 format (UTC), backend converts to Sydney time for validation

2. **Remote & Televisit Appointments**:
   - No slot restrictions
   - Can be booked at any time
   - No automatic time rounding
   - No capacity limits

## Database Schema

### `appointment_slots` Table
```sql
id              SERIAL PRIMARY KEY
slot_time       TIMESTAMPTZ NOT NULL
location        VARCHAR(32) NOT NULL DEFAULT 'clinic'
max_capacity    INTEGER NOT NULL DEFAULT 4
booked_count    INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL
```

### `appointments` Table (Updated)
Added `slot_id` column:
```sql
slot_id         INTEGER REFERENCES appointment_slots(id) ON DELETE SET NULL
```

## API

### Get Available Slots
```
GET /api/appointments/slots/available
Query Parameters:
  - start: ISO 8601 date string (required)
  - end: ISO 8601 date string (required)
  - location: 'clinic' | 'remote' | 'televisit' (default: 'clinic')

Response:
[
  {
    "slotTime": "2026-01-08T08:00:00Z",
    "remaining": 3,
    "total": 4
  },
  ...
]
```

### Create Appointment
```
POST /api/appointments
Body:
{
  "title": "Follow-up Visit",
  "location": "clinic",
  "startAt": "2026-01-08T08:15:00Z",
  "patientId": 123
}

Success Response: 201 Created
Error Responses:
  - 409 SLOT_FULL: No available slots for this time
  - 409 SLOT_BOOKING_FAILED: Failed to reserve slot (race condition)
```

## Frontend Integration

### AppointmentFormDialog
- Shows "X of 4 slots available" for clinic appointments (8:00 AM - 11:30 AM only)
- Displays warning when slot is full
- Automatically rounds time input to 15-minute intervals for clinic
- Validates slot availability before submission
- Validates time is within 8:00 AM - 11:30 AM window for clinic appointments
- Shows specific error messages for slot-related failures

### Time Input
- For clinic appointments: 15-minute step (900 seconds), restricted to 8:00 AM - 11:30 AM
- For other locations: 1-minute step (60 seconds)

## Error Handling

### Invalid Time Error
```json
{
  "error": "Clinic appointments are only available between 8:00 AM and 11:30 AM (Sydney time)",
  "code": "INVALID_TIME"
}
```
Frontend shows: "Clinic appointments are only available between 8:00 AM and 11:30 AM (Sydney time)"

### Slot Full Error
```json
{
  "error": "No available slots for this time",
  "code": "SLOT_FULL"
}
```
Frontend shows: "This time slot is full. Please select a different time."

### Slot Booking Failed Error
```json
{
  "error": "Failed to reserve slot - may be full",
  "code": "SLOT_BOOKING_FAILED"
}
```
Frontend shows: "Failed to reserve slot. It may have just been filled by another user."

## Slot Management

### Automatic Management
- **Create**: Increments `booked_count` when clinic appointment is created
- **Update**: Manages slot transitions when time/location changes
  - Releases old slot if moving from clinic to another location
  - Reserves new slot if moving to clinic from another location
  - Handles slot changes when time is updated
- **Delete**: Decrements `booked_count` when clinic appointment is deleted

### Race Condition Protection
- Database constraint: `CHECK (booked_count >= 0 AND booked_count <= max_capacity)`
- Atomic increment/decrement operations
- Optimistic updates with rollback on failure

## Migration

Run the migration to add slot support:
```bash
# Apply migration
psql -d your_database -f migrations/20260108_create_appointment_slots.sql
```

## Example Usage

### Booking a Clinic Appointment
```typescript
const appointment = await appointmentService.createAppointment({
  title: 'Annual Checkup',
  location: 'clinic',
  startAt: '2026-01-08T08:30:00Z', // Must be between 8:00 AM - 11:30 AM, rounded to 15-min
  patientId: 456
})
// startAt becomes '2026-01-08T08:30:00Z'
// endAt automatically set to '2026-01-08T08:45:00Z'
// Slot reserved with 3 remaining capacity
```

### Attempting to Book Outside Available Hours
```typescript
const appointment = await appointmentService.createAppointment({
  title: 'Late Appointment',
  location: 'clinic',
  startAt: '2026-01-08T14:30:00Z', // 2:30 PM - INVALID
  patientId: 456
})
// Error: "Clinic appointments are only available between 8:00 AM and 11:30 AM"
// Error code: INVALID_TIME
```

### Booking a Remote Appointment
```typescript
const appointment = await appointmentService.createAppointment({
  title: 'Remote Check',
  location: 'remote',
  startAt: '2026-01-08T14:37:00Z', // No rounding or time restrictions for remote
  endAt: '2026-01-08T15:07:00Z',
  patientId: 456
})
// Time is preserved exactly as specified
// No slot restrictions
```

## Notes

- Slots are created on-demand when first appointment is booked
- Slots persist even when `booked_count` reaches 0 (for historical data)
- Only clinic location uses the slot system
- Slot times are stored in UTC in the database and displayed in user's timezone
- **Timezone Handling**: All time validations (8:00 AM - 11:30 AM) are performed in **Australia/Sydney** timezone on the backend
- Frontend uses browser's local timezone for display, but sends times as UTC (ISO 8601 format)
- When you select 9:15 AM in Sydney, it's sent as `2026-01-11T22:15:00.000Z` (UTC), then validated as 9:15 AM Sydney time on backend
