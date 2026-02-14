# Appointment Booking System

## Overview
Book patient appointments with intelligent slot management for clinic visits. Remote and televisit appointments have no restrictions.

## Who Can Use This
- **Administrators** - Full access to all appointments
- **Doctors** - Can book and manage appointments for their patients
- **Staff** - Can create and manage appointments

## Appointment Types

### Clinic Appointments
- **Available hours:** 8:00 AM - 11:30 AM (Sydney time)
- **Slot duration:** 15 minutes
- **Capacity:** 4 patients per time slot
- **Time rounding:** Automatically rounds to nearest 15 minutes

### Remote Appointments
- **Available:** Any time
- **No slot restrictions**
- **No capacity limits**

### Televisit Appointments
- **Available:** Any time
- **No slot restrictions**
- **No capacity limits**

## How to Book an Appointment

1. **Click "New Appointment"** or select a time slot
2. **Choose appointment type:**
   - Clinic (requires slot availability)
   - Remote (unrestricted)
   - Televisit (unrestricted)
3. **Select date and time**
4. **Choose patient**
5. **Add details** (title, notes)
6. **Submit**

## Slot Availability

When booking clinic appointments, you'll see:

- **Green:** "X of 4 slots available" - Time slot is open
- **Red:** "This time slot is full" - Choose a different time
- **New slot:** "4 of 4 slots available (new time slot)" - First booking at this time

## Time Restrictions

**Clinic appointments must be:**
- Between 8:00 AM and 11:30 AM
- In 15-minute increments (8:00, 8:15, 8:30, etc.)

**You'll see an error if you try to book:**
- Outside business hours
- When the slot is full (4 patients already booked)

## Managing Appointments

### Rescheduling
- Update the time or date
- System automatically manages slot availability
- Moving from clinic to remote removes slot restrictions

### Canceling
- Delete the appointment
- Slot is automatically released for others

### Viewing
- Calendar view shows all appointments
- Filter by location, date, or patient

## Tips for Efficient Booking

**For Clinic Appointments:**
- Book popular times early (8:00-9:00 AM fills up fastest)
- Check availability before promising a specific time
- Consider remote appointments for flexible scheduling

**For Remote/Televisit:**
- No time restrictions - book anytime
- Good option for follow-ups that don't require in-person device checks
- Patients appreciate the convenience

## Troubleshooting

**"This time slot is full"**
- Choose a different time
- Try 15 minutes earlier or later
- Consider remote appointment instead

**"Invalid time"**
- Clinic appointments only available 8:00 AM - 11:30 AM
- Time is automatically rounded to 15-minute increments
- Remote/televisit have no time restrictions
