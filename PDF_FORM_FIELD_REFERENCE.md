# PDF Form Field Reference

This document describes all available fields that can be populated in the PDF report template.

## Patient Information

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `patient_name` | Text | Full patient name | "John Doe" |
| `patient_mrn` | Text | Medical Record Number | "MRN12345" |
| `patient_dob` | Text | Date of birth | "01/15/1980" |
| `patient_phone` | Text | Contact phone number | "+1-555-1234" |
| `patient_address` | Text | Street address | "123 Main St" |
| `patient_city` | Text | City | "New York" |
| `patient_state` | Text | State/Province | "NY" |
| `patient_country` | Text | Country | "USA" |
| `patient_postal` | Text | Postal/ZIP code | "10001" |

## Doctor Information

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `doctor_name` | Text | Primary doctor's name | "Dr. Jane Smith" |
| `doctor_email` | Text | Doctor's email | "jsmith@hospital.com" |
| `doctor_phone` | Text | Doctor's phone | "+1-555-5678" |
| `doctor_address` | Text | Doctor's address | "456 Medical Plaza" |

## Implanted Device Information

### Primary Device
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `device_manufacturer` | Text | Device manufacturer | "Medtronic" |
| `device_name` | Text | Device name | "Micra AV" |
| `device_model` | Text | Device model number | "MC1AVR1" |
| `device_type` | Text | Device type | "Pacemaker" |
| `device_serial` | Text | Serial number | "PJN123456" |
| `device_is_mri` | Text | MRI compatibility | "No" |
| `device_implant_date` | Text | Implantation date | "03/15/2023" |

### Additional Devices
For systems with multiple devices (e.g., ICD + Pacemaker), use suffixed fields:

| Field Name | Type | Description |
|------------|------|-------------|
| `device_manufacturer_2` | Text | Second device manufacturer |
| `device_name_2` | Text | Second device name |
| `device_model_2` | Text | Second device model |
| `device_type_2` | Text | Second device type |
| `device_serial_2` | Text | Second device serial |
| `device_implant_date_2` | Text | Second device implant date |
| `device_is_mri_2` | Text | Second device MRI compatibility | "No" |
| `device_manufacturer_3` | Text | Third device manufacturer |
| ... | ... | (follows same pattern) |

## Implanted Lead Information

Supports up to 4 leads. First lead has no suffix, subsequent leads use `_2`, `_3`, `_4`.

### Lead 1 (Primary)
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `lead_manufacturer` | Text | Lead manufacturer | "Medtronic" |
| `lead_name` | Text | Lead name | "CapSure Sense" |
| `lead_model` | Text | Lead model | "5076-58" |
| `lead_serial` | Text | Lead serial number | "LN987654" |
| `lead_chamber` | Text | Chamber location | "RV" |
| `lead_isMri` | Text | MRI compatibility | "No" |
| `lead_implant_date` | Text | Implantation date | "03/15/2023" |

### Additional Leads
| Field Name | Type | Description |
|------------|------|-------------|
| `lead_manufacturer_2` | Text | Second lead manufacturer |
| `lead_name_2` | Text | Second lead name |
| `lead_model_2` | Text | Second lead model |
| `lead_serial_2` | Text | Second lead serial |
| `lead_chamber_2` | Text | Second lead chamber (e.g., "RA") |
| `lead_isMri_2` | Text | Second lead MRI compatibility | "No" |
| `lead_implant_date_2` | Text | Second lead implant date |
| ... | ... | (pattern continues for _3 and _4) |

## Report Details

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `report_date` | Text | Report date | "01/05/2026" |
| `report_type` | Text | Type of report | "In Clinic" / "Remote" / "Triage" |
| `report_status` | Text | Report status | "pending" / "reviewed" / "archived" |
| `heart_rate` | Text | Current heart rate | "72" |
| `current_rhythm` | Text | Current cardiac rhythm | "NSR" / "AFib" / "Paced" |
| `pacing_dependency` | Text | Pacing dependency | "Dependent" / "Non-Dependent" |
| `comments` | Text | Report comments | Free text |
| `is_completed` | Checkbox | Report completion status | Checked/Unchecked |

## Bradycardia Settings

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `brady_mode` | Text | Pacing mode | "DDD" / "DDDR" / "VVI" |
| `brady_lower_rate` | Text | Lower rate limit (bpm) | "60" |
| `brady_max_tracking` | Text | Max tracking rate (bpm) | "130" |
| `brady_max_sensor` | Text | Max sensor rate (bpm) | "130" |

## Pacing Statistics

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `ra_paced_percent` | Text | Right atrial pacing % | "15.5" |
| `rv_paced_percent` | Text | Right ventricular pacing % | "98.2" |
| `lv_paced_percent` | Text | Left ventricular pacing % | "95.0" |
| `biv_paced_percent` | Text | Biventricular pacing % | "94.5" |

## Battery & Device Diagnostics

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `battery_voltage` | Text | Battery voltage (V) | "2.85" |
| `battery_longevity` | Text | Estimated longevity (years) | "8.5" |
| `battery_status` | Dropdown | Battery status | "BOL" / "OK" / "MOS" / "ERI" / "EOL" |
| `charge_time` | Text | Capacitor charge time (s) | "5.2" |

## Lead Measurements

### Right Atrium (RA)
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `ra_impedance` | Text | Impedance (Ω) | "520" |
| `ra_sensing` | Text | Sensing amplitude (mV) | "3.5" |
| `ra_threshold` | Text | Pacing threshold (V) | "0.75" |
| `ra_pulse_width` | Text | Pulse width (ms) | "0.4" |

### Right Ventricle (RV)
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `rv_impedance` | Text | Impedance (Ω) | "485" |
| `rv_sensing` | Text | Sensing amplitude (mV) | "12.5" |
| `rv_threshold` | Text | Pacing threshold (V) | "0.5" |
| `rv_pulse_width` | Text | Pulse width (ms) | "0.4" |

### Left Ventricle (LV)
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `lv_impedance` | Text | Impedance (Ω) | "650" |
| `lv_sensing` | Text | Sensing amplitude (mV) | "8.0" |
| `lv_threshold` | Text | Pacing threshold (V) | "1.25" |
| `lv_pulse_width` | Text | Pulse width (ms) | "0.4" |

### Shock Lead
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `shock_impedance` | Text | Shock coil impedance (Ω) | "45" |

## Arrhythmia Events

Supports up to 3 arrhythmia events. First event has no suffix, subsequent use `_2`, `_3`.

### Arrhythmia 1
| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `arrhythmia_name` | Text | Arrhythmia type | "Atrial Fibrillation" |
| `arrhythmia_symptoms` | Text | Associated symptoms | "Palpitations" |
| `arrhythmia_rate` | Text | Heart rate (bpm) | "150" |
| `arrhythmia_termination` | Text | How it terminated | "Spontaneous" |
| `arrhythmia_therapies` | Text | Therapies delivered | "ATP" |

### Additional Arrhythmias
Follow the same pattern with `_2` and `_3` suffixes.

## Metadata

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `generated_date` | Text | PDF generation date | "01/05/2026" |
| `generated_time` | Text | PDF generation time | "14:30:45" |

---

## Notes for PDF Template Creation

1. **Field Naming Convention**: Use the exact field names listed above in your PDF template
2. **Text Fields**: Most fields are text fields that accept string input
3. **Dropdowns**: Battery status should be a dropdown with predefined options
4. **Checkboxes**: Use checkboxes for boolean fields like `is_completed`
5. **Suffixes**: When supporting multiple items (devices, leads, arrhythmias), increment the suffix: `_2`, `_3`, etc.
6. **Optional Fields**: All fields are optional - the code handles missing data gracefully

## Creating the PDF Template

Use Adobe Acrobat or similar PDF form editor to:

1. Create form fields with the exact names listed above
2. Set appropriate field types (text, dropdown, checkbox)
3. Configure dropdown options for fields like `battery_status` and `report_type`
4. Test with the "Debug Fields" button in the application to verify field names