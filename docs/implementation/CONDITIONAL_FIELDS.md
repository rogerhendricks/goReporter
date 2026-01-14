# Conditional Field Display Implementation

## Overview
The ReportForm now intelligently shows/hides fields based on the patient's implanted device type. This reduces form complexity and prevents confusion by only displaying relevant fields for each device configuration.

## Device Capability Detection

### Three Key Capabilities Detected:

#### 1. **hasDefibrillator** (ICD/CRT-D devices)
Detects devices with defibrillation capability by checking:
- Device type/name contains: `defib`, `defibrillator`, `icd`, `crt-d`, `cardioverter`

**Fields shown only for ICDs:**
- ✅ Tachy Settings Card (VT1, VT2, VF zones)
- ✅ Capacitor Charge Time
- ✅ RV Shock Impedance

#### 2. **hasBiventricularPacing** (CRT/BiV devices)
Detects cardiac resynchronization therapy devices by checking:
- Device type/name contains: `crt`, `biventricular`, `bi-v`, `biv`
- OR patient has an active LV lead

**Fields shown only for CRT/BiV:**
- ✅ LV Paced (%)
- ✅ BiV Paced (%)
- ✅ LV Lead Measurements (impedance, sensing, threshold, pulse width)

#### 3. **hasAtrialPacing** (Dual-chamber devices)
Detects dual-chamber pacing by checking:
- Device type/name/model contains: `dual`, `ddd`, `crt`
- OR patient has an active RA/atrial lead

**Fields shown only for dual-chamber:**
- ✅ RA Paced (%)
- ✅ RA Lead Measurements (impedance, sensing, threshold, pulse width)

## Form Behavior Examples

### Single-Chamber Pacemaker (VVI)
**Shows:**
- General information
- Bradycardia settings
- RV pacing percentage
- RV measurements only
- Battery diagnostics

**Hides:**
- ❌ RA measurements
- ❌ LV measurements
- ❌ Tachy settings
- ❌ Charge time
- ❌ Shock impedance

### Dual-Chamber Pacemaker (DDD)
**Shows:**
- All VVI fields PLUS:
- ✅ RA pacing percentage
- ✅ RA lead measurements

**Hides:**
- ❌ LV measurements
- ❌ Tachy settings
- ❌ Charge time
- ❌ Shock impedance

### Single-Chamber ICD (VVI-ICD)
**Shows:**
- All VVI fields PLUS:
- ✅ Tachy settings (VT1, VT2, VF)
- ✅ Charge time
- ✅ Shock impedance

**Hides:**
- ❌ RA measurements
- ❌ LV measurements

### Dual-Chamber ICD (DDD-ICD)
**Shows:**
- All DDD fields PLUS:
- ✅ Tachy settings
- ✅ Charge time
- ✅ Shock impedance

**Hides:**
- ❌ LV measurements

### CRT-Pacemaker (CRT-P)
**Shows:**
- All DDD fields PLUS:
- ✅ LV pacing percentage
- ✅ BiV pacing percentage
- ✅ LV lead measurements

**Hides:**
- ❌ Tachy settings
- ❌ Charge time
- ❌ Shock impedance

### CRT-Defibrillator (CRT-D)
**Shows:**
- ✅ ALL fields (most complex device)
- All chambers (RA, RV, LV)
- All pacing percentages
- Tachy settings
- Charge time
- Shock impedance

## Implementation Details

### Detection Logic Location
**File:** `frontend/src/components/forms/ReportForm.tsx`
**Lines:** ~810-866

```typescript
const activeDevices = patient?.devices?.filter(
  d => d.status === 'active' && !d.explantedAt
)

const hasDefibrillator = activeDevices.some(d => 
  d.device?.name?.toLowerCase().includes('icd')
)

const hasBiventricularPacing = activeDevices.some(d =>
  d.device?.name?.toLowerCase().includes('crt')
) || patient?.leads?.some(l => 
  l.status === 'active' && 
  l.chamber?.toLowerCase().includes('lv')
)

const hasAtrialPacing = activeDevices.some(d =>
  d.device?.name?.toLowerCase().includes('ddd')
) || patient?.leads?.some(l =>
  l.status === 'active' && 
  l.chamber?.toLowerCase().includes('ra')
)
```

### Conditional Rendering Patterns

**Full section conditional:**
```tsx
{hasDefibrillator && (
  <Card>
    <CardTitle>Tachy Settings</CardTitle>
    {/* ICD-specific content */}
  </Card>
)}
```

**Single field conditional:**
```tsx
{hasDefibrillator && (
  <div>
    <Label>Charge Time (s)</Label>
    <ValidatedInput {...props} />
  </div>
)}
```

**Table row conditional:**
```tsx
<TableBody>
  {hasAtrialPacing && (
    <TableRow>
      <TableCell>RA</TableCell>
      {/* RA measurements */}
    </TableRow>
  )}
  <TableRow>
    <TableCell>RV</TableCell>
    {/* Always shown */}
  </TableRow>
</TableBody>
```

## Benefits

### For Users:
- **Cleaner Interface**: Only see relevant fields
- **Less Confusion**: No ICD settings for pacemaker patients
- **Faster Data Entry**: Fewer fields to skip
- **Reduced Errors**: Can't enter LV data when no LV lead exists

### For Data Quality:
- **Logical Validation**: Form structure matches device capability
- **Better Organization**: Fields appear based on actual hardware
- **Prevents Invalid Data**: Can't save shock energy for a pacemaker

### For System:
- **Automatic Detection**: No manual device type selection needed
- **Based on Truth**: Uses actual implanted device/lead data
- **Flexible**: Handles mixed configurations (e.g., upgraded device)

## Edge Cases Handled

### Multiple Active Devices
If a patient has multiple active devices, capabilities are OR'd together:
- One CRT + one pacemaker → Shows all CRT fields
- Detection uses `.some()` to catch any matching device

### Lead-Based Detection
Even if device name doesn't indicate BiV, an active LV lead triggers BiV fields:
```typescript
hasBiventricularPacing = 
  deviceCheck || leadCheck  // Either/or
```

### Missing Device Information
If device type/name is empty or unclear:
- RA fields: Check for RA lead presence
- LV fields: Check for LV lead presence
- ICD fields: Conservative - requires explicit ICD/defibrillator match

### Fallback Behavior
RV measurements and basic pacing are **always shown** (every device has RV lead).

## Testing Scenarios

### Test Case 1: VVI Pacemaker
1. Create patient with VVI pacemaker
2. Add RV lead only
3. Create report
4. **Verify:** Only RV measurements visible

### Test Case 2: CRT-D Device
1. Create patient with CRT-D
2. Add RA, RV, LV leads
3. Create report
4. **Verify:** All sections visible (tachy, all chambers)

### Test Case 3: Device Upgrade
1. Patient originally had DDD pacemaker
2. Upgraded to DDD-ICD
3. **Verify:** Tachy settings now appear automatically

### Test Case 4: Lead Extraction
1. Patient has CRT with RA, RV, LV leads
2. LV lead explanted (status changed)
3. **Verify:** LV measurements hidden

## Future Enhancements

Potential improvements to consider:

1. **Visual Indicators**: Badge showing detected device type
   ```tsx
   <Badge>Detected: CRT-D</Badge>
   ```

2. **Override Option**: Allow manual override for edge cases
   ```tsx
   <Checkbox>Show all fields anyway</Checkbox>
   ```

3. **Smart Defaults**: Pre-populate based on device model
   - Boston Scientific ICD → VT detection defaults
   - Medtronic CRT → BiV pacing mode defaults

4. **Mode-Based Logic**: Show/hide based on programmed mode
   - VVI mode → Hide atrial fields even if dual-chamber
   - AAI mode → Hide ventricular fields

5. **Warnings**: Alert if data entered for hidden capability
   ```tsx
   ⚠️ VT detection entered but no ICD detected
   ```

## Files Modified

- `frontend/src/components/forms/ReportForm.tsx` - Detection logic and conditional rendering

## Related Documentation

- [VALIDATION_IMPLEMENTATION.md](VALIDATION_IMPLEMENTATION.md) - Field validation (step #1)
- Current implementation: Conditional display (step #2)
- Coming next: Form templates (step #3) or Smart pre-population (step #4)
