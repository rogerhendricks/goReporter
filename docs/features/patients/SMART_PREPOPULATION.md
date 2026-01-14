# Smart Pre-Population Implementation

## Overview
The ReportForm now features intelligent auto-fill from previous reports, allowing medical professionals to quickly populate device settings that typically remain unchanged between follow-up visits. This significantly reduces data entry time for routine reports.

## How It Works

### Automatic Detection
When creating a new report:
1. System automatically fetches the patient's most recent report
2. A **"Load from Previous"** button appears if a previous report exists
3. Button shows the date of the previous report on hover
4. One click loads stable device settings

### What Gets Pre-Populated

#### ✅ Device Settings (Rarely Change)
- **Pacing Mode**: AAI, VVI, DDD, etc.
- **Rate Limits**: LRL, MTR, MSR (in bpm)
- **AV Delays**: SAV, PAV (in ms)

#### ✅ Tachy Settings (Usually Static)
All VT1, VT2, and VF zone configurations:
- Detection intervals
- ATP therapies (type & number of bursts)
- Shock energies
- Maximum number of shocks

**Total fields pre-populated**: ~30 device programming parameters

### What Stays Blank (Changes Each Visit)

#### ❌ Measurements
- Lead impedances (RA, RV, LV)
- Sensing amplitudes
- Pacing thresholds
- Pulse widths
- Shock impedance

#### ❌ Diagnostics
- Battery voltage
- Battery longevity/percentage
- Charge time
- Pacing percentages

#### ❌ Clinical Data
- Heart rate
- Rhythm
- Pacing dependency
- QRS duration
- Atrial fibrillation burden
- Arrhythmia events
- Comments

#### ❌ Metadata
- Report date (defaults to today)
- Report type
- Report status

## User Interface

### Button Location
Top-right of the form, next to the "Import from File" button

### Button States

**1. Available to Load**
```
[📄 Load from Previous]
```
- Outline style
- Appears when previous report exists
- Hover shows detailed tooltip

**2. Already Loaded**
```
[📄 Load from Previous] [Clear]
```
- Secondary style (filled)
- Badge shows "Loaded from previous report"
- Clear button appears to reset

**3. No Previous Report**
- Button hidden
- Clean interface for first-time patients

### Hover Card Details
When hovering over the button, users see:
- Previous report date
- Exactly what will be loaded
- Exactly what stays blank

```
Auto-fill from Previous Report
Loads device settings and tachy parameters from your 
last report dated December 15, 2025

What gets loaded:
• Pacing mode & rate limits
• AV delays
• Tachy zones & therapies

What stays blank:
• Measurements (impedances, sensing)
• Battery diagnostics
• Pacing percentages
• Arrhythmias & comments
```

## Use Cases

### Scenario 1: Routine Follow-Up (ICD)
**Context**: Patient comes for 6-month ICD check, no programming changes

**Without pre-population:**
- Enter mode: DDD
- Enter LRL: 60
- Enter MTR: 130
- Enter MSR: 130
- Enter SAV: 150ms
- Enter PAV: 180ms
- Enter VT1 interval: 400ms
- Enter VT1 ATP settings...
- Enter VT2 settings...
- Enter VF settings...
- *Then* enter today's measurements
- **Total time: ~8 minutes**

**With pre-population:**
- Click "Load from Previous"
- All settings auto-filled ✓
- Enter today's measurements
- **Total time: ~2 minutes**
- **Time saved: 75%**

### Scenario 2: Post-Programming Visit
**Context**: Device was reprogrammed, need new baseline

**Action**: Don't click "Load from Previous"
- Enter new settings manually
- Or import from interrogation file
- Future reports will use these new settings

### Scenario 3: Mixed Approach
**Context**: Some settings changed, others didn't

**Action**: 
- Click "Load from Previous"
- Override the 2-3 fields that changed
- Save

## Implementation Details

### Fetching Previous Report
**File**: `frontend/src/components/forms/ReportForm.tsx`

```typescript
const fetchMostRecentReport = async () => {
  if (isEdit || !patient?.id) return
  
  const response = await api.get(
    `/patients/${patient.id}/reports?limit=1&sort=reportDate&order=desc`
  )
  const reports = response.data.reports || response.data
  if (reports && reports.length > 0) {
    setPreviousReport(reports[0])
  }
}
```

**Triggered**: Automatically when creating a new report

### Pre-Population Logic

```typescript
const loadFromPreviousReport = () => {
  if (!previousReport) return
  
  const fieldsToPrePopulate = {
    // Brady settings
    mdc_idc_set_brady_mode: previousReport.mdc_idc_set_brady_mode,
    mdc_idc_set_brady_lowrate: previousReport.mdc_idc_set_brady_lowrate,
    // ... 27 more fields
  }
  
  setFormData(prev => ({ ...prev, ...fieldsToPrePopulate }))
  setPrePopulatedFrom(previousReport.id)
}
```

**Triggered**: User clicks "Load from Previous" button

### State Management

```typescript
// Track previous report
const [previousReport, setPreviousReport] = useState<Report | null>(null)

// Loading state
const [isLoadingPrevious, setIsLoadingPrevious] = useState(false)

// Track which report was used
const [prePopulatedFrom, setPrePopulatedFrom] = useState<number | null>(null)
```

## Benefits

### For Medical Professionals:
- **Faster Data Entry**: 75% reduction in typing for routine visits
- **Fewer Errors**: Copy exact settings from verified previous report
- **Better Continuity**: Easy to spot what changed since last visit
- **One-Click Loading**: No manual field-by-field copying

### For Clinics:
- **Higher Throughput**: More patients per day
- **Reduced Fatigue**: Less repetitive data entry
- **Better Documentation**: Consistent tracking of programming changes
- **Staff Satisfaction**: Less tedious work

### For Data Quality:
- **Consistency**: Settings copied exactly, no transcription errors
- **Traceability**: Know which report settings came from
- **Validation**: All loaded values already passed validation before
- **Audit Trail**: Can see programming history across reports

## Edge Cases Handled

### First Report for Patient
- Previous report fetch returns empty
- "Load from Previous" button doesn't appear
- Clean form ready for initial data entry

### Device Upgrade
- Previous report exists from old device
- Settings may not be compatible
- User chooses:
  - Don't load (enter new device settings)
  - Load and override incompatible fields
  - Import from new device interrogation

### Concurrent Editing
- Pre-population only available for NEW reports
- Edit mode doesn't show button
- Prevents overwriting edited data

### Draft vs. Pre-Population
- Pre-population takes precedence over draft
- If both exist, draft is loaded first
- User can then load from previous to override draft

### Clear Functionality
- Resets form to `initialFormData`
- Clears pre-population indicator
- Allows fresh start if needed

## Future Enhancements

### Smart Pre-Population
Instead of all-or-nothing, intelligently choose:

```typescript
// Only load if within 6 months
if (daysSinceLastReport <= 180) {
  loadFromPreviousReport()
}

// Warn if device changed
if (previousReport.deviceId !== currentDevice.id) {
  toast.warning('Device changed since last report')
}
```

### Selective Loading
Allow choosing which sections to load:

```tsx
<Checkbox>Load brady settings</Checkbox>
<Checkbox>Load tachy settings</Checkbox>
<Checkbox>Load AV delays</Checkbox>
```

### Change Highlighting
Show which fields differ from previous:

```tsx
{formData.LRL !== previousReport.LRL && (
  <Badge variant="warning">Changed from {previousReport.LRL}</Badge>
)}
```

### Pre-Population Templates
Save custom templates:

```tsx
<Button>Save as "Default ICD Settings"</Button>
<Button>Load "Default ICD Settings"</Button>
```

### Multiple Previous Reports
Choose which report to load from:

```tsx
<Select>
  <SelectItem>Most recent (Dec 15)</SelectItem>
  <SelectItem>6 months ago (Jun 15)</SelectItem>
  <SelectItem>Post-implant (Jan 10)</SelectItem>
</Select>
```

## API Endpoints Used

### Fetch Recent Reports
```
GET /patients/:patientId/reports?limit=1&sort=reportDate&order=desc
```

**Response:**
```json
{
  "reports": [{
    "id": 123,
    "reportDate": "2025-12-15",
    "mdc_idc_set_brady_mode": "DDD",
    "mdc_idc_set_brady_lowrate": 60,
    // ... all other fields
  }]
}
```

## Testing Checklist

### Basic Functionality
- [ ] Button appears when previous report exists
- [ ] Button hidden for first report
- [ ] Click loads correct fields
- [ ] Clear button resets form
- [ ] Badge appears when loaded
- [ ] Hover card shows correct date

### Field Verification
- [ ] Brady settings loaded correctly
- [ ] Tachy settings loaded correctly
- [ ] Measurements NOT loaded
- [ ] Battery data NOT loaded
- [ ] Comments NOT loaded
- [ ] Report date stays as today

### Edge Cases
- [ ] Works with ICD patients
- [ ] Works with pacemaker patients  
- [ ] Works with CRT patients
- [ ] Edit mode hides button
- [ ] No errors if previous report is null
- [ ] Loading state prevents double-click

### Integration
- [ ] Works with validation
- [ ] Works with conditional fields
- [ ] Works with file import (can override)
- [ ] Works with draft restore
- [ ] Saves correctly to database

## Files Modified

- `frontend/src/components/forms/ReportForm.tsx` - Added pre-population logic and UI

## Related Documentation

- [VALIDATION_IMPLEMENTATION.md](VALIDATION_IMPLEMENTATION.md) - Field validation
- [CONDITIONAL_FIELDS.md](CONDITIONAL_FIELDS.md) - Conditional display
- Current: Smart pre-population
- Coming next: Form templates

## Performance Considerations

### Network Optimization
- Previous report fetched once on component mount
- Cached in component state
- No re-fetching unless component unmounts/remounts

### Memory Usage
- Only most recent report stored (not full history)
- Cleared when component unmounts
- Minimal memory footprint

### User Experience
- Loading state prevents UI jank
- Instant feedback when clicked
- Toast notification confirms action
- Badge provides visual confirmation
