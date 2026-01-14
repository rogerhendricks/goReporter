# Timezone Handling Guide

## The Problem

When importing files with dates (e.g., `01/09/2026 09:40:24`), JavaScript's `Date` object and `.toISOString()` were converting dates to UTC, causing them to shift by a day.

### Example of the Issue:
- **Input file**: `01/09/2026 09:40:24` (9:40 AM on January 9, 2026)
- **Browser timezone**: Australia/Sydney (UTC+11)
- **Using** `new Date("01/09/2026 09:40:24").toISOString()` **returns**: `2026-01-08T22:40:24.000Z`
  - This is 10:40 PM on January 8 UTC (previous day!)
- **What we wanted**: `2026-01-09T09:40:24` (preserve the actual date/time)

### Why This Happened:
1. JavaScript's `new Date()` interprets date strings in the **local timezone** (Australia/Sydney)
2. `.toISOString()` converts that to **UTC** by subtracting the timezone offset (11 hours)
3. This subtraction pushes the date to the previous day

## The Solution

We've implemented timezone-aware date parsing that preserves the actual dates from files without UTC conversion.

### Changes Made:

#### 1. Created Date Helper Utilities (`frontend/src/utils/dateHelpers.ts`)
- `formatDateToISO(date)` - Formats date as `YYYY-MM-DD` without timezone conversion
- `formatDateTimeToISO(date)` - Formats datetime as `YYYY-MM-DDTHH:mm:ss` without timezone conversion
- `parseDateToISO(dateString)` - Parse any date string to ISO format without timezone issues
- `parseDateTimeToISO(dateString)` - Parse datetime string to ISO format

#### 2. Updated File Parser (`frontend/src/utils/fileParser.ts`)
All date parsing now uses the helper functions instead of `.toISOString()`:

```typescript
// ❌ OLD (causes timezone issues):
parsedData.report_date = new Date(parsedData.report_date).toISOString();

// ✅ NEW (preserves actual date):
parsedData.report_date = formatDateTimeToISO(new Date(parsedData.report_date));
```

Updated in:
- `parseLogFile()` - Abbott .log files
- `parseBnkFile()` - Biotronik .bnk files  
- `parseXmlFile()` - XML files
- `convertMedtronicDate()` - Medtronic date conversion

#### 3. Environment Configuration
Added `TZ=Australia/Sydney` to `.env` file to explicitly set the application timezone.

## Best Practices Going Forward

### ✅ DO:
- Use the helper functions from `dateHelpers.ts` for all date formatting
- Keep dates in local timezone format (not UTC) when parsing from files
- Use `YYYY-MM-DD` format for date-only fields
- Use `YYYY-MM-DDTHH:mm:ss` format for datetime fields (without timezone suffix)

### ❌ DON'T:
- Don't use `.toISOString()` when parsing dates from files
- Don't assume UTC conversion is needed for local dates
- Don't mix timezones within the application

## When to Use UTC vs Local Time

### Use Local Time (Australia/Sydney):
- ✅ Dates/times from imported files (device interrogations, reports)
- ✅ User-entered dates (DOB, implant dates, report dates)
- ✅ Display dates to users
- ✅ Scheduling/appointments within the clinic

### Use UTC:
- ❌ Generally not needed in this application since it's for a local clinic
- If ever needed for API timestamps or multi-timezone support

## Backend Timezone Handling

The Go backend already has timezone awareness for appointments:
```go
sydneyLoc, err := time.LoadLocation("Australia/Sydney")
```

This is used in:
- `internal/handlers/appointment.go` - For appointment slot validation
- Ensures 8:00 AM - 11:30 AM Sydney time slot restrictions

## Testing

To verify dates are parsed correctly:

1. Import a file with a known date (e.g., `01/09/2026 09:40:24`)
2. Check the parsed date in the form
3. Expected result: `2026-01-09` at `09:40:24` (not shifted to previous day)

## Common Date Formats in Files

- **Abbott .log files**: `01/09/2026 09:40:24` (DD/MM/YYYY HH:mm:ss)
- **Biotronik .bnk files**: `29 Dec 2020` (DD Mon YYYY)
- **XML files**: `20260109T094024` (YYYYMMDDTHHMMSS)
- **Medtronic PDFs**: `29-Dec-2020` or `29/Dec/2020`

All are now parsed correctly without timezone shifting.

## Summary

The fix ensures that when you import a file with date `01/09/2026 09:40:24`, it stays as `2026-01-09 09:40:24` throughout the application, not converting to `2026-01-08 22:40:24` UTC.

**You no longer need to manually convert dates after import** - the file parser handles this automatically.
