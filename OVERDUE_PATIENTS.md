# Overdue Patients Tracking Feature

## Overview
This feature provides a comprehensive system for tracking patients who are overdue for scheduled device reports based on their implanted device type and the time since their last report.

## Business Rules

### Report Scheduling Requirements

#### Defibrillator Patients
- **In Clinic Reports**: Required every 6 months (183 days)
- **Remote Reports**: Required every 6 months (183 days)

#### Pacemaker Patients
- **In Clinic Reports**: Required every 12 months (365 days)
- **Remote Reports**: Required every 12 months (365 days)

### Urgency Classification
Patients are classified by urgency based on days overdue:
- **Never Reported**: No previous report exists for this type (Red badge)
- **Critical**: More than 90 days overdue (Red badge)
- **Urgent**: 31-90 days overdue (Red badge)
- **Due**: 1-30 days overdue (Gray outline badge)

## Implementation

### Backend Components

#### Database Model (`internal/models/patient.go`)
- **`OverduePatient` struct**: Represents a patient overdue for reports with relevant details
- **`GetOverduePatients()` function**: 
  - Retrieves paginated list of overdue patients
  - Filters by doctor ID for role-based access
  - Uses Common Table Expressions (CTEs) for efficient querying
  - Checks both "In Clinic" and "Remote" report types
  - Returns patients with active implanted devices only

#### API Handler (`internal/handlers/patient.go`)
- **`GetOverduePatients()` handler**:
  - Accepts pagination parameters (page, limit)
  - Implements role-based filtering (doctors see only their patients)
  - Returns JSON response with patients, total count, and pagination info

#### Routes (`internal/router/router.go`)
- **Endpoint**: `GET /api/patients/overdue`
- **Middleware**: `SetUserRole` for role-based filtering
- **Access**: Available to both admin and doctor roles

### Frontend Components

#### OverduePatientsCard Component
**Location**: `frontend/src/components/dashboard/OverduePatientsCard.tsx`

**Features**:
- Paginated table displaying overdue patients
- Color-coded urgency badges
- Device type indicators (⚡ for defibrillator, 💓 for pacemaker)
- Report type icons (Calendar for In Clinic, Activity for Remote)
- Days since last report calculation
- Direct links to patient profiles
- Responsive design with loading states

**Display Information**:
- Patient name and MRN
- Device type and serial number
- Report type needed
- Last report date and days elapsed
- Urgency status badge
- Quick action button to view patient

#### Dashboard Integration
The component is integrated into:
- **Admin Dashboard** (`frontend/src/pages/admin/AdminDashboard.tsx`): Shows all overdue patients
- **Doctor Dashboard** (`frontend/src/pages/DoctorDashboard.tsx`): Shows only the doctor's assigned patients

## Database Indexes
The following indexes were added for optimal query performance:
- `idx_devices_type`: Index on device type column
- `idx_reports_type_date`: Composite index on report type and date
- `idx_implanted_devices_status`: Composite index on implant status
- `idx_reports_patient_id`: Index on patient foreign key

## SQL Query Logic

The system uses a sophisticated SQL query with Common Table Expressions (CTEs):

1. **patient_devices CTE**: Retrieves all patients with active implanted devices (defibrillators or pacemakers)
2. **latest_reports CTE**: Finds the most recent report date for each patient and report type
3. **overdue_list CTE**: Combines the above with business rules to identify overdue patients
4. **Final Query**: Applies doctor filtering (if applicable), pagination, and sorting

## Usage

### For Administrators
1. Navigate to Admin Dashboard
2. Scroll to "Overdue Reports" card
3. View all patients across the system who are overdue
4. Click on patient name or "View Patient" to access their full profile

### For Doctors
1. Navigate to Doctor Dashboard
2. Scroll to "Overdue Reports" card
3. View only your assigned patients who are overdue
4. Take action by clicking through to patient profiles

### Pagination
- Default: 10 patients per page
- Navigation controls at bottom of card
- Shows current page, total pages, and result range

## API Response Format

```json
{
  "patients": [
    {
      "patientId": 123,
      "firstName": "John",
      "lastName": "Doe",
      "mrn": 456789,
      "deviceType": "defibrillator",
      "reportType": "In Clinic",
      "lastReportDate": "2024-01-15T00:00:00Z",
      "daysSinceReport": 200,
      "deviceSerial": "ABC123456",
      "implantedDeviceId": 789
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

## Security Considerations

### Role-Based Access Control
- **Admin users**: See all overdue patients across the system
- **Doctor users**: See only patients assigned to them via `patient_doctors` relationship
- **Regular users**: Same access as doctors (if they have patient assignments)

### Authorization
The endpoint uses the `SetUserRole` middleware which:
- Validates JWT authentication
- Sets user role in request context
- Enables role-based filtering in the handler

## Performance Considerations

1. **Indexes**: Critical indexes added for fast querying
2. **Pagination**: Prevents loading large datasets
3. **CTE Optimization**: Database handles complex logic efficiently
4. **Selective Loading**: Only retrieves necessary fields

## Future Enhancements

Potential improvements:
1. **Email Notifications**: Automated alerts for overdue patients
2. **Export Functionality**: Download overdue patient lists as CSV/PDF
3. **Filtering Options**: Filter by device type, urgency level, or clinic
4. **Dashboard Widgets**: Summary cards showing counts by urgency
5. **Report Creation Shortcuts**: Quick links to create needed reports
6. **Customizable Thresholds**: Admin-configurable timeframes per device type

## Testing Recommendations

1. **Test with various device types**: Ensure defibrillator and pacemaker rules work correctly
2. **Test role-based filtering**: Verify doctors only see their patients
3. **Test edge cases**: Patients with no reports, multiple devices, explanted devices
4. **Test pagination**: Verify correct results across multiple pages
5. **Performance testing**: Monitor query performance with large datasets

## Troubleshooting

### Common Issues

**No patients showing as overdue**:
- Verify devices have correct `type` field set
- Check that implanted devices have `status = 'Active'`
- Ensure reports have proper `report_type` values

**Wrong patients appearing**:
- Verify date calculations (6 months = 183 days, 12 months = 365 days)
- Check that `explanted_at` is null for active devices
- Confirm doctor-patient relationships are properly set

**Performance issues**:
- Run migration to add indexes
- Check database query execution plan
- Consider adding more specific indexes if needed
