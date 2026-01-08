# Testing the Appointment Slot System

## How to Test the Slot System

### 1. Open the Appointment Form
- Navigate to the appointments calendar page
- Click "New Appointment" or click on a day in the calendar

### 2. Test Clinic Location Slot Features

#### Feature: Location Selection
1. Select **"Clinic"** as the location
2. You should see: `"Clinic appointments use 15-minute time slots with max 4 patients per slot"`

#### Feature: Time Auto-Rounding
1. With "Clinic" selected, pick a start time (e.g., 10:07 AM)
2. The time should automatically round to the nearest 15-minute interval (10:00 AM or 10:15 AM)
3. The time picker should show 15-minute increments (step=900 seconds)

#### Feature: Slot Availability Display
1. After selecting a clinic time slot, you should see ONE of these messages:
   - `"4 of 4 slots available (new time slot)"` - Green text (first booking for this slot)
   - `"3 of 4 slots available"` - Green text (1 person already booked)
   - `"2 of 4 slots available"` - Green text (2 people already booked)
   - `"1 of 4 slots available"` - Green text (3 people already booked)
   - `"This time slot is full"` - Red text (all 4 slots taken)

#### Feature: Loading State
1. When you select a new date for a clinic appointment
2. You should briefly see: `"Loading available slots..."`
3. Then the availability message appears

#### Feature: Auto End Time
1. Select a start time (e.g., 2:00 PM)
2. Leave the end time empty
3. Submit the form
4. The appointment should automatically have an end time 15 minutes later (2:15 PM)

### 3. Test Remote/Televisit (No Restrictions)

1. Select **"Remote"** or **"Televisit"** as location
2. You should NOT see:
   - The slot availability message
   - The 15-minute time slot notice
   - Auto-rounding of times
3. Time picker should allow any minute (step=60 seconds)
4. You can book at any time (e.g., 10:37 AM is allowed)

### 4. Test Slot Full Error

1. Create 4 clinic appointments for the same time slot (e.g., 10:00 AM)
2. Try to create a 5th appointment for 10:00 AM
3. You should see error: `"This time slot is full. Please select a different time."`
4. The appointment should NOT be created

### 5. Test Location Change Behavior

1. Start with "Remote" location, pick time 10:07 AM
2. Change to "Clinic"
3. Time should auto-round to 10:00 AM or 10:15 AM
4. Slot availability should appear

### 6. Check Browser Console

Open browser DevTools (F12) and check the Console tab. You should see:
```
Fetching slots for: 2026-01-08
Received slots: [...]
Looking for slot at: 2026-01-08T10:00:00.000Z
Available slots: [{ time: "...", remaining: 4 }]
```

## Expected Behavior Summary

| Location | Time Rounding | Slot Check | Time Step | Capacity |
|----------|---------------|------------|-----------|----------|
| Clinic | Yes (15 min) | Yes | 15 min | 4 max |
| Remote | No | No | 1 min | Unlimited |
| Televisit | No | No | 1 min | Unlimited |

## Troubleshooting

### Issue: Not seeing slot availability message
**Check:**
1. Location is set to "Clinic"
2. Start time is filled in
3. Check browser console for errors
4. Verify backend is running and `/api/appointments/slots/available` endpoint is accessible

### Issue: Times not auto-rounding
**Check:**
1. Location must be "Clinic"
2. You need to change the time AFTER selecting Clinic location
3. Or switch TO Clinic location (which triggers auto-round)

### Issue: Can book more than 4 slots
**Check:**
1. Backend migration was applied: `20260108_create_appointment_slots.sql`
2. Backend server is restarted after code changes
3. Check backend logs for slot booking errors

### Issue: "Loading available slots..." never goes away
**Check:**
1. Backend is running
2. Network tab shows successful API call
3. Check browser console for JavaScript errors

## Backend Verification

### Check if migration was applied:
```sql
SELECT * FROM appointment_slots;
```

### Check slot counts:
```sql
SELECT slot_time, location, booked_count, max_capacity 
FROM appointment_slots 
WHERE location = 'clinic'
ORDER BY slot_time;
```

### Manually verify booking counts:
```sql
SELECT 
  a.slot_id,
  s.slot_time,
  COUNT(a.id) as actual_appointments,
  s.booked_count as tracked_count
FROM appointments a
JOIN appointment_slots s ON a.slot_id = s.id
WHERE a.location = 'clinic' AND a.deleted_at IS NULL
GROUP BY a.slot_id, s.slot_time, s.booked_count;
```

## API Testing with curl

### Get available slots:
```bash
curl -X GET "http://localhost:8080/api/appointments/slots/available?start=2026-01-08T00:00:00Z&end=2026-01-08T23:59:59Z&location=clinic" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
[
  {
    "slotTime": "2026-01-08T14:00:00Z",
    "remaining": 4,
    "total": 4
  },
  {
    "slotTime": "2026-01-08T14:15:00Z",
    "remaining": 2,
    "total": 4
  }
]
```

### Try to book when full (should fail):
```bash
curl -X POST "http://localhost:8080/api/appointments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Appointment",
    "location": "clinic",
    "startAt": "2026-01-08T14:00:00Z",
    "patientId": 1
  }'
```

Expected error when full:
```json
{
  "error": "No available slots for this time",
  "code": "SLOT_FULL"
}
```

## Success Criteria

✅ All tests pass
✅ Clinic appointments show slot availability
✅ Times auto-round to 15-minute intervals for clinic
✅ Can't book more than 4 patients per clinic slot
✅ Remote/televisit appointments work without restrictions
✅ Loading state appears when fetching slots
✅ Error messages appear for full slots
✅ Console logs show slot fetching activity
