# Missed Appointment Letters

## Overview
Generate and track mailed letters for patients who miss their scheduled appointments.

## Who Can Use This
- **Administrators** - Access to generate missed appointment letters
- **Staff** - May assist with letter generation (role-dependent)

## How It Works

### Identifying Missed Appointments
The system automatically identifies missed appointments as those that:
- Were scheduled but never marked as completed
- Have passed their scheduled time
- Occurred within the last 7 days

### Grace Period
Appointments are flagged as "missed" 15 minutes after the scheduled start time, giving patients a small buffer.

## Generating Letters

### Step 1: View Missed Appointments
1. Navigate to **Admin Dashboard**
2. Click **"Missed Appointments"** tab
3. View list of missed appointments from the last 7 days

### Step 2: Select Appointments
1. Review the list of missed appointments
2. Check the box next to each patient who needs a letter
3. You can select multiple appointments at once

### Step 3: Generate Letters
1. Click **"Generate Letters"** button
2. System creates PDF with:
   - Patient address (for windowed envelopes)
   - Patient name and MRN
   - Missed appointment details
   - Standard letter template
3. PDF opens in new tab for printing

### Step 4: Mark as Sent
After printing and mailing:
1. System automatically marks appointments as "Letter Sent"
2. Badge appears next to those appointments
3. Action button changes to "Re-send" for future use

## Letter Format

**PDF Specifications:**
- **Size:** A5 format (148×210mm)
- **Layout:** Address block at top-left for windowed envelopes
- **Content:**
  - Patient name and address
  - Medical record number (MRN)
  - Missed appointment date/time
  - Professional letter text

## Tracking

**Visual Indicators:**
- **No badge:** Letter not yet sent
- **"Letter Sent" badge:** Letter was generated and marked sent
- **Date stamp:** Shows when letter was sent

**History:**
- All letter sends are tracked
- Can re-send if needed
- Shows original appointment date

## Best Practices

**Timing:**
- Generate letters within 1-2 days of missed appointment
- Mail promptly to maintain professional standards
- Keep copies for patient records

**Selection:**
- Only generate for patients who truly missed (no-shows)
- Don't generate for appointments that were cancelled properly
- Consider patient history before sending

**Documentation:**
- Always mark letters as sent after mailing
- Keep physical copies in patient files
- Note in patient chart that letter was sent

## Benefits

**For Clinic:**
- Professional follow-up for no-shows
- Documented communication trail
- Reduces repeat no-shows
- Maintains patient care standards

**For Patients:**
- Clear communication about missed appointment
- Opportunity to reschedule
- Maintains care continuity

**For Compliance:**
- Audit trail of all communications
- Demonstrates due diligence
- Supports quality metrics

## Troubleshooting

**Patient address missing?**
- Verify patient has complete address on file
- Update patient profile before generating letter
- Contact patient directly if address unknown

**Letter not generating?**
- Check that appointment is within 7-day window
- Verify patient address is complete
- Try selecting fewer appointments at once

**Can't find missed appointment?**
- Check if it's past the 7-day lookback window
- Verify appointment wasn't marked complete
- Check grace period (15 min after start time)
