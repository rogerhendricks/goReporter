# Backend File Parser Implementation

This document describes the backend file parser implementation that mirrors the functionality of the frontend `fileParser.ts`.

## Overview

The parser has been implemented in `/internal/handlers/parser.go` and supports parsing the following file types:
- `.xml` - Biotronik IEEE 11073 Export files
- `.log` - Abbott device interrogation files
- `.bnk` - Boston Scientific device files
- `.pdf` - PDF files with embedded XML (partial support)

## API Endpoint

**POST** `/api/parse-file`

### Request
- Content-Type: `multipart/form-data`
- Field name: `file`
- Supported file types: `.xml`, `.log`, `.bnk`, `.pdf`

### Response
Returns a JSON object matching the `ParsedData` model structure defined in `/internal/models/parsed_data.go`

### Example Usage

```bash
curl -X POST http://localhost:8080/api/parse-file \
  -F "file=@/path/to/device-file.xml"
```

## Supported File Formats

### 1. XML Files (.xml)
Parses Biotronik IEEE 11073 Export format files.

**Extracted Data:**
- Patient information (name, DOB, MRN)
- Device information (serial number, model, manufacturer, implant date)
- Lead information (RA, RV, LV leads with serial numbers, models, implant dates)
- Session/report date
- Statistics (brady pacing percentages, AF burden, arrhythmia counts)
- Measurements (battery status, impedances, sensing, pacing thresholds)
- Settings (brady mode, rate limits, AV delays)
- Tachytherapy zones (VT1, VT2, VF detection and therapy settings)

### 2. LOG Files (.log)
Parses Abbott device interrogation files.

**Extracted Data:**
- Patient and device information
- Lead information for all chambers
- Brady settings and statistics
- Measurements (impedances, sensing, thresholds)
- Battery information
- Tachytherapy settings (VT1, VT2, VF)

**Special Processing:**
- Date conversion to ISO format
- Unit removal (V, Ohm, %, bpm, ms, mV, J)
- Manufacturer set to "Abbott"

### 3. BNK Files (.bnk)
Parses Boston Scientific device files.

**Extracted Data:**
- Patient information (name from first/last, DOB)
- Device and lead information
- Brady settings with interval-to-BPM conversion
- Battery status and longevity
- Measurements (impedances, sensing, thresholds)
- Tachytherapy settings with burst and shock configuration

**Special Processing:**
- Header date extraction (SAVE DATE format)
- Millisecond intervals converted to BPM: `BPM = 60000 / ms`
- Pacing thresholds converted: `threshold / 1000`
- Battery remaining converted from months to years
- Shock therapy calculation for remaining shocks
- Manufacturer set to "Boston Scientific"

### 4. PDF Files (.pdf)
Partial support for PDFs with embedded XML files.

**Current Status:**
- Basic PDF structure reading
- Encryption handling
- **Note:** Full embedded file extraction not yet implemented

**Recommendation:** Extract the embedded XML from the PDF manually and upload it directly, or use the frontend parser which has full PDF support.

## Implementation Details

### Helper Functions

#### `msToBpm(ms string) string`
Converts millisecond intervals to beats per minute.
```go
BPM = round(60000 / milliseconds)
```

#### `convertThreshold(threshold string) string`
Converts pacing thresholds from microvolts to volts.
```go
volts = threshold / 1000
```

#### `getMonthNumber(monthName string) int`
Converts month names (Jan, Feb, etc.) to numeric values (1-12).

#### `calculateRemainingShocks(rawData map[string]string, zoneType string) string`
Calculates the number of remaining shocks for tachytherapy zones based on max configured shocks minus already programmed shock therapies.

### XML Parsing Helpers

- `parseStatSection()` - Parses statistics section (brady, AT, tachy, CRT, arrhythmia)
- `parseMsmtSection()` - Parses measurements (battery, leads, HV)
- `parseLeadChannel()` - Parses individual lead channel data (RA/RV/LV)
- `parseSetSection()` - Parses device settings (brady, tachy)
- `parseZones()` - Parses tachytherapy zone configurations
- `parseVT1Zone()`, `parseVT2Zone()`, `parseVFZone()` - Zone-specific parsing

## Integration with Frontend

### Option 1: Use Backend Parser (Recommended for new implementations)

Update your frontend to send files directly to the backend:

```typescript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/parse-file', {
  method: 'POST',
  body: formData,
});

const parsedData = await response.json();
// Use parsedData to populate your form
```

### Option 2: Keep Frontend Parser (Current approach)

Continue using the existing `fileParser.ts` in the frontend for immediate compatibility. The backend parser is available as an alternative or for server-side processing needs.

## Model Structure

The parsed data matches the `ParsedData` struct in `/internal/models/parsed_data.go`:

```go
type ParsedData struct {
    Mrn                               *string
    Name                              *string
    Dob                               *string
    ReportDate                        *string
    MdcIdcDevSerialNumber             *string
    MdcIdcDevModel                    *string
    MdcIdcDevManufacturer             *string
    // ... (all other fields)
}
```

All fields are pointers to handle optional/missing values gracefully.

## Testing

You can test the parser with the example files in the `/examples` directory:

```bash
# Test XML file
curl -X POST http://localhost:8080/api/parse-file \
  -F "file=@examples/BIOIEEE_60802260_Gan_Q_2025-01-09_09-08-49.xml"

# Test LOG file
curl -X POST http://localhost:8080/api/parse-file \
  -F "file=@examples/8906955.log"

# Test BNK file
curl -X POST http://localhost:8080/api/parse-file \
  -F "file=@examples/0250bfa5.bnk"
```

## Future Enhancements

1. **PDF Support:** Complete implementation of embedded file extraction from PDFs
2. **Validation:** Add data validation and error handling for malformed files
3. **Additional Formats:** Support for other device manufacturer formats
4. **Caching:** Cache parsed results to avoid re-parsing the same file
5. **Streaming:** Support for large file parsing with streaming
6. **Error Reporting:** Detailed error messages for parsing failures

## Notes

- The parser handles missing data gracefully by using pointers (`*string`)
- Date formats are converted to ISO 8601 where possible
- Unit suffixes are removed for numeric fields
- Manufacturer-specific defaults are applied (e.g., Abbott, Boston Scientific)
- The implementation closely mirrors the TypeScript version for consistency
