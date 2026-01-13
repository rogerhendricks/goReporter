## TODO

## Patient notes
- ~~Create a note page for each patient that the user can make notes. Should have created date, deletable with whome deleted it and when, and should be in chronological order~~ **DONE**

## Fix arrhythmias
- The backend and frontend is different.
  - Name, Type, Duration, Count in backend
  - Name, Symptoms, Rate, Termination, therapies in frontend
- Decide how to store AF episodes
  - AF episode seperate / AF burden %
  - AF episode in arrhythmias without burden or only burden.
### Database encryption
 - Encrypted on server
 - No need as of yet for per column postgres encryption

### Future ideas
- Trend Analysis: Add time-series charts showing device failure patterns, report completion rates over time
- Predictive Analytics: Implement ML models to predict device maintenance needs based on historical data
- Export Options: Add PDF, Excel, and CSV exports for all analytics views

#### Notification and Alert System
```
// New service: frontend/src/services/notificationService.ts
interface Notification {
  type: 'task_due' | 'consent_expiring' | 'device_recall' | 'report_pending'
  priority: 'low' | 'medium' | 'high' | 'critical'
  message: string
  actionUrl?: string
}
```
- Real-time notifications for task deadlines, consent expiration, device recalls
- Email/SMS integration for critical alerts
- In-app notification center with read/unread status
- Notification preferences per user
#### Audit Trail Enhancement
Building on your existing security.go:

- Add data change tracking (before/after values)
- Visual diff viewer for report/patient modifications
- Compliance reports for HIPAA audits
Automated alerts for suspicious activity patterns
#### Document Management System
- Secure file upload for device manuals, patient forms, consent documents
- Version control for documents
- OCR for scanned documents
- Full-text search across all documents
- Integration with your existing file.go handler

####  Scheduling & Appointment System
```
// New model: internal/models/appointment.go
type Appointment struct {
    ID          uint
    PatientID   uint
    DoctorID    uint
    DeviceID    *uint
    StartTime   time.Time
    EndTime     time.Time
    Type        string // "follow-up", "device-check", "emergency"
    Status      string
    Notes       string
}
```
- **Done** ~~Calendar view for device checks and patient appointments~~
- Automated appointment reminders
- Recurring appointment templates
- Integration with task system

#### Mobile-Responsive Design Improvements
- Progressive Web App (PWA) capabilities
- Offline mode for critical data entry
- Mobile-optimized forms and tables
- Touch-friendly UI components
- Camera integration for quick photo capture

 #### Collaborative Features
- Team comments on reports (enhance existing report.go)
- @mentions for team members
- Activity feed showing team actions
- Real-time collaborative editing indicators
- Shared task lists with assignments

#### Data Import/Export Enhancements
Building on your FileImporter.tsx:

- Bulk patient import from CSV/Excel
- HL7/FHIR integration for EMR systems (Partial-> Epic)
- Automated data validation during import
- Import history and rollback capability
- Template downloads for batch imports

#### Workflow Automation
```
// New feature: Workflow Engine
interface WorkflowRule {
  trigger: 'report_created' | 'device_implanted' | 'consent_expiring'
  conditions: Array<{field: string, operator: string, value: any}>
  actions: Array<{type: 'create_task' | 'send_email' | 'assign_user'}>
}
```
- Automated task creation based on events
- Email workflows for consent renewals
- Escalation rules for overdue tasks
- Custom workflow builder UI

### Technical Improvements
#### Performance Optimizations
```
// Backend caching in internal/middleware/cache.go
type CacheMiddleware struct {
    cache map[string]interface{}
    ttl   time.Duration
}
```
- Redis/in-memory caching for frequent queries
- Database query optimization with indexes
- Lazy loading for large datasets
- Response compression
- CDN integration for static assets

#### API Enhancements
- GraphQL endpoint alongside REST
- API versioning (/api/v1/, /api/v2/)
- Rate limiting per endpoint (enhance your existing limiter)
- API documentation with Swagger/OpenAPI
- **Done** Webhook support for third-party integrations

#### Testing Infrastrucure
```
# Add comprehensive testing
├── internal/
│   ├── handlers/
│   │   ├── patient_test.go
│   │   ├── report_test.go
├── frontend/
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── components/
│   │   │   ├── hooks/
```
- Unit tests for all handlers
- Integration tests for API endpoints
- E2E tests with Playwright/Cypress
- Load testing with k6
- Test coverage reporting

#### Security Enhancements
Building on your security.go:

-Two-factor authentication (TOTP)
- Password complexity requirements
- Session management improvements
- API key management for integrations
- Biometric authentication support
- Automatic session timeout
- IP whitelisting for admin access

#### Backup & Disaster Recovery
```
// New utility: internal/utils/backup.go
func CreateDatabaseBackup() error {
    // Automated SQLite backup
    timestamp := time.Now().Format("20060102_150405")
    backupPath := fmt.Sprintf("./backups/db_%s.sqlite", timestamp)
    // Copy database file
}
```
- Automated daily backups
- Point-in-time recovery
- Backup encryption
- Cloud backup storage (S3, Azure Blob)
- Backup verification and testing

### UI/UX Enhancements
#### Dashboard Customization
- Draggable widget system
- User-specific dashboard layouts
- Saved dashboard templates
- **Done** ~~Dark/light theme improvements (smooth transitions, system sync, theme-aware toasts)~~
- Accessibility improvements (ARIA labels, keyboard navigation)
#### Data Visualization
Enhance your DonutChart.tsx:

- Interactive charts with drill-down
- Timeline visualizations for patient history
- Heatmaps for device usage patterns
- Geographic maps for patient distribution
- Real-time data streaming for active monitoring
#### Form Improvements
Building on ReportForm.tsx:

- **Done** ~~Field validation with helpful error messages~~
- **Done** ~~Conditional field display~~
- **Not implemented** ~~Multi-step forms with progress indicators~~
- Form templates for common scenarios
- **Done** ~~Smart field pre-population~~

#### Onboarding & Help System
- Interactive product tour for new users
- Contextual help tooltips
- Video tutorials library
-  **Woking on this** In-app knowledge base
- Guided workflows for common tasks

### Compliance & HIPAA Features
#### Enhanced Consent Management
Building on ConsentManager.tsx:

- Digital signature capture
- Consent renewal workflow automation
- Multi-language consent forms
- Consent audit trail with version history
- Automated expiration notifications
#### Data Retention Policies
```
// New handler: internal/handlers/retention.go
type RetentionPolicy struct {
    EntityType string
    RetentionPeriod time.Duration
    ArchiveAfter time.Duration
    DeleteAfter time.Duration
}
```
- Configurable retention rules
- Automated data archival
- Secure data deletion
- Retention compliance reports

#### Access Control Granularity
- Field-level permissions
- Data masking for sensitive fields
- Temporary access grants
- Access request workflow
- Permission templates by role

### Integration Features
####  Third-Party Integrations
- **Done** ~~EMR system connectors (Epic, Cerner)~~
- Medical device data import APIs
- Calendar integration (Google Calendar, Outlook)
- **Done** ~~Slack/Teams notifications~~
- Zapier integration for custom workflows
#### API for Mobile Apps
- Dedicated mobile API endpoints
- Push notification support
- Offline sync protocol
- Mobile-optimized data payloads
- QR code generation/scanning for quick access


### Workflow & Productivity
#### Report Review Reminders / Push notifications

- Unsigned reports pending >24/48 hours
- Reports awaiting co-signature
- Escalate to supervisor after threshold
- Upcoming Appointment Reminders

- Scheduled in-clinic visits approaching
- Pre-appointment task checklists incomplete
- Patient confirmation status
- Bulk Task Completion Summaries

- Daily digest of completed tasks
- **Done** ~~Weekly productivity reports to managers~~
- Team performance metrics
- Audit & Compliance Alerts

- Security log anomalies (multiple failed logins, unusual access patterns)
- HIPAA compliance violations detected
- Required documentation missing before deadlines
- Consent renewal windows closing


### Nice-to-Have Features
- **Multi-tenancy**: Support for multiple healthcare facilities
- **Language Localization**: i18n support for multiple languages
- **Patient Portal**: Self-service portal for patients to view their data
- **Reporting Scheduler**: Automated report generation and distribution
- **Device Recall Management**: Track and manage device recalls
- **Inventory Management**: Track device stock levels
- **Billing Integration**: Connect with billing systems
- **Clinical Decision Support**: AI-powered recommendations
- **Telemedicine Integration**: Video consultation support

### Quick Wins (Start Here)
- **Add toast notifications** across the app (you're using Sonner)
- **Done** ~~Implement dark mode polish with smooth transitions~~
- **Done** ~~Add loading skeletons (you have Skeleton)~~
- **Create a changelog page** to track updates
- **Done** ~~Add keyboard shortcuts for power users~~
- **Implement bulk operations** (delete, export, assign)
- **Add data export to Excel/PDF** for all list views
- **Create email templates** for common notifications
- **Add "Recently Viewed"** section to dashboards
- **Implement auto-complete** for patient/device search