# Report Tags Feature

## Overview
The application now supports separate tags for reports and patients. This allows you to organize and filter reports independently from patients using tags like "treated arrhythmias", "abnormal findings", "follow-up required", etc.

## Changes Made

### Backend Changes

1. **Tag Model** (`internal/models/tag.go`)
   - Added `Type` field to distinguish between "patient" and "report" tags
   - Changed unique constraint from name-only to name+type combination
   - This allows the same tag name to exist for both patients and reports

2. **Tag Handlers** (`internal/handlers/tag.go`)
   - Updated `GetAllTags` to support filtering by type using query parameter `?type=patient|report|all`
   - Updated `CreateTag` to validate and set tag type
   - Added `GetReportTagStats` endpoint to get statistics about report tags
   - Tags default to "patient" type if not specified for backward compatibility

3. **Router** (`internal/router/router.go`)
   - Added new endpoint: `GET /api/tags/report-stats?tagId={id}`

### Frontend Changes

1. **Tag Service** (`frontend/src/services/tagService.ts`)
   - Added `TagType` type: `'patient' | 'report'`
   - Updated `Tag` interface to include `type` field
   - Updated `getAll()` to accept optional type filter
   - Added `getReportStats()` method

2. **Component Updates**
   - **ReportForm**: Fetches only report tags using `tagService.getAll('report')`
   - **PatientForm**: Fetches only patient tags using `tagService.getAll('patient')`
   - **PatientDetail**: Fetches only patient tags
   - **PatientSearch**: Fetches only patient tags
   - **TagManagement**: 
     - Added type selector to filter tags by type
     - Added type field to tag creation form
     - Displays tag type in the table
     - Type cannot be changed after tag creation

### Database Migration

A migration file has been created at `migrations/add_tag_type.sql` that:
- Adds the `type` column to the tags table
- Creates an index on the type field
- Updates the unique constraint to include both name and type
- Sets existing tags to "patient" type

## Usage

### Creating Report Tags

1. Go to Admin Dashboard → Tag Management
2. Click "Create Tag"
3. Enter tag name (e.g., "Treated Arrhythmias")
4. Select "Report Tag" as the type
5. Choose a color and add description
6. Click "Create"

### Using Report Tags

1. When creating or editing a report, you'll see only report tags in the tag selector
2. Add relevant tags to categorize and organize reports
3. Tags appear on the report details and can be used for filtering

### Filtering Tags

In the Tag Management interface:
- Use the dropdown to filter between "All Tags", "Patient Tags", or "Report Tags"
- Each tag displays its type in the table

## API Examples

### Get all report tags
```bash
GET /api/tags?type=report
```

### Get all patient tags
```bash
GET /api/tags?type=patient
```

### Get all tags
```bash
GET /api/tags
# or
GET /api/tags?type=all
```

### Create a report tag
```bash
POST /api/tags
{
  "name": "Treated Arrhythmias",
  "type": "report",
  "color": "#FF5733",
  "description": "Reports where arrhythmias were treated"
}
```

### Get report tag statistics
```bash
GET /api/tags/report-stats?tagId=5
```

Response:
```json
{
  "tagId": 5,
  "tagName": "Treated Arrhythmias",
  "totalReports": 150,
  "reportsWithTag": 23,
  "reportsWithoutTag": 127
}
```

## Migration Instructions

1. **Run the database migration**:
   ```bash
   # Apply the SQL migration
   psql -d your_database < migrations/add_tag_type.sql
   ```

2. **Rebuild and restart the backend**:
   ```bash
   cd /home/roger/Development/goReporter
   ./build.bash
   ./bin/api
   ```

3. **Rebuild the frontend** (if needed):
   ```bash
   cd frontend
   npm run build
   ```

## Notes

- Existing tags will automatically be set to "patient" type
- Tag names can be duplicated across types (e.g., "Critical" can exist as both a patient and report tag)
- Tag type cannot be changed after creation to maintain data integrity
- The frontend automatically filters tags based on context (report forms show report tags, patient forms show patient tags)
