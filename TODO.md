# Development Roadmap

This document tracks active work, planned features, and future ideas for goReporter.

---

## 🚧 Active Work

### Doctor Dashboard Enhancements
- [ ] Focus on improving daily workflow efficiency

### Arrhythmias Data Model
**Issue:** Backend and frontend field names don't match
- Backend: Name, Type, Duration, Count
- Frontend: Name, Symptoms, Rate, Termination, Therapies
- [ ] Decide on unified schema
- [ ] Determine AF episode storage (separate vs AF burden %)

---

## 📋 Planned Features


### Task Management
- [ ] Escalation rules for overdue tasks
- [ ] "Recently Viewed" section on dashboards

### Technical Improvements
- [ ] Response compression for API endpoints
- [ ] GraphQL endpoint alongside REST
- [ ] API versioning (/api/v1/, /api/v2/)
- [ ] Comprehensive testing infrastructure (unit, integration, E2E)
- [ ] Automated daily backups with encryption

### Security Enhancements
- [ ] IP whitelisting for admin access
- [ ] API key management for integrations

### UI/UX Improvements
- [ ] Form templates for common scenarios
- [ ] Bulk operations (delete, export, assign)
- [ ] Dashboard widget customization

### Compliance & Data
- [ ] Data retention policies with automated archival
- [ ] Field-level permissions and data masking
- [ ] Digital signature capture for consent
- [ ] Consent audit trail with version history

---

## 💡 Future Ideas

### Analytics & Intelligence
- Trend Analysis: Time-series charts for device patterns and completion rates
- Predictive Analytics: ML models for device maintenance prediction
- Clinical Decision Support: AI-powered recommendations

### Advanced Features
- Patient Portal: Self-service portal for patients
- Document Management: OCR, version control, full-text search
- Device Recall Management: Track and manage recalls
- Inventory Management: Device stock tracking
- Multi-tenancy: Support for multiple healthcare facilities
- Language Localization: i18n for multiple languages

### Patient Safety
- **Manufacturer Recall & Advisory Tracker**: Build a module that allows staff to input specific serial numbers, lot numbers, or device models that have been flagged by manufacturers (like Medtronic or Boston Scientific) for recalls or advisories. The system would then cross-reference this list against the implantedDevice and lead databases, immediately alerting staff to affected patients and automatically generating a task list for follow-ups.
- **Safety Alerts**:Threshold Alert Workflows: Create a system where clinical staff can set custom acceptable ranges for specific device metrics (e.g., battery voltage, impedance). When a new report is uploaded or parsed, the system highlights any values falling outside these predefined safety thresholds.

### Mobile & Offline
- Progressive Web App (PWA) capabilities
- Offline mode for critical data entry
- Camera integration for quick photo capture
- Mobile-optimized data payloads
- QR code generation/scanning

### Workflow Automation
- Custom workflow builder UI
- Automated task creation based on events
- Email workflows for consent renewals
- Recurring appointment templates

### Data Integration
- Medical device data import APIs
- HL7/FHIR integration for other EMR systems
- Bulk patient import from CSV/Excel

### Advanced Visualization
- Interactive charts with drill-down
- Heatmaps for device usage patterns
- Geographic maps for patient distribution
- Real-time data streaming

---

## ❌ Not Planned

### Database Encryption
- **Status:** Will not implement at this time
- **Reason:** Current server-level encryption is sufficient
- **Note:** No need for per-column PostgreSQL encryption currently

### Archive
Items moved here were previously considered but deprioritized:
- (None currently)

---

## ✅ Recently Completed

*Last updated: February 2026*

### Major Features
- Patient notes system with audit trail
- Calendar view for appointments
- Dark/light theme with smooth transitions
- Lazy loading for large datasets
- Webhook support for integrations
- Field validation with error messages
- Conditional field display
- Smart field pre-population
- Timeline visualizations for patient history
- Multi-language consent forms
- Temporary access grants
- Access request workflow
- Permission templates by role
- EMR system connectors (Epic FHIR)
- Slack/Teams notifications
- Loading skeletons
- Keyboard shortcuts
- Weekly productivity reports
- Medical Billing & Coding Export
- Automatic session timeout
- Include upcoming appointments for doctor's patients

### Quick Wins Delivered
- Toast notifications across the app
- Theme-aware components
- Smooth theme transitions

---

## How to Use This Document

**Adding New Items:**
- Place in appropriate section based on priority
- Use `[ ]` for incomplete, `[x]` for complete
- Add brief description and context

**Moving Items:**
- When starting work, move to "Active Work"
- When completed, move to "Recently Completed"
- If deprioritized, move to "Not Planned" with reason

**Review Schedule:**
- Review monthly with team
- Update priorities based on user feedback
- Archive completed items quarterly
