# Smart Report Pre-population

## Overview
When creating a new device report, automatically fill in device settings from the patient's previous report to save time on routine follow-ups.

## Who Can Use This
- **Doctors** and **medical staff** creating device reports
- Available when creating NEW reports only (not when editing)

## How It Works

### Automatic Detection
When you start creating a report, the system checks if the patient has previous reports. If so, a **"Load from Previous"** button appears.

### What Gets Pre-populated

**Device Settings (typically unchanged):**
- Pacing mode (AAI, VVI, DDD, etc.)
- Rate limits (LRL, MTR, MSR)
- AV delays (SAV, PAV)
- All tachy settings (VT1, VT2, VF zones)

**Total: ~30 parameters auto-filled**

### What Stays Blank (visit-specific):
- Lead impedances and sensing amplitudes
- Battery voltage and longevity
- Pacing percentages
- Arrhythmia events
- Clinical comments

## Using the Feature

1. **Create a new report** for a patient
2. **Click "Load from Previous"** button (top-right of form)
3. **Review pre-populated values** - verify they match current device settings
4. **Fill in today's measurements** - enter current clinical data
5. **Save the report**

### Button States

- **Available**: Button shows when previous report exists
- **Loaded**: Badge shows "Loaded from previous report" with option to clear
- **Hidden**: No button for first-time patients

## Benefits

**Time Savings:**
- Routine follow-ups: **~75% faster** (8 min → 2 min)
- No manual re-entry of stable device settings
- Reduces transcription errors

**Best Practices:**
- Always verify loaded settings match current device programming
- Override any fields that have changed since last visit
- Use for routine follow-ups, not post-programming visits

## Example Scenarios

**Routine ICD Check:**
1. Click "Load from Previous"
2. All DDD settings, VT/VF zones auto-fill
3. Enter today's battery voltage and impedances
4. Done!

**Post-Programming Visit:**
1. **Do NOT** click "Load from Previous"
2. Enter new settings manually
3. Future reports will use these new baselines
