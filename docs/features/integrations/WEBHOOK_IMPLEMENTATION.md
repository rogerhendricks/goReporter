# Webhook System

## Overview
Connect goReporter to external services to receive real-time notifications when important events occur.

## Who Can Use This
- **Administrators** - Full access to create and manage webhooks
- **Technical staff** - May assist with webhook configuration

## Supported Integrations

### Slack
- Raw JSON notifications
- Best for technical monitoring
- Simple setup

### Microsoft Teams
- Beautiful Adaptive Cards
- Color-coded alerts
- Professional appearance
- Recommended for clinical teams

### Epic EMR
- FHIR R4 DiagnosticReport format
- Automatic EMR integration
- HIPAA-compliant

### Generic Webhooks
- Standard JSON payloads
- Compatible with any HTTP endpoint
- Custom integrations

## Common Use Cases

**Clinical Alerts:**
- Battery critical notifications
- Overdue task reminders
- Missed appointment follow-up

**Administrative:**
- Report completion notifications
- New patient registrations
- Access request approvals

**Monitoring:**
- System health checks
- Daily summary reports
- Error notifications

## Events Available

### Report Events
- `report.created` - New report created
- `report.completed` - Report marked complete

### Battery Events
- `battery.low` - Battery below 20%
- `battery.critical` - Battery at ERI/EOL

### Task Events
- `task.created` - New task created
- `task.due` - Task due today
- `task.overdue` - Task past due date

## Quick Setup Guide

### For Slack
1. Create incoming webhook in Slack
2. Copy webhook URL
3. In goReporter: Admin → Webhooks → New
4. Paste URL and select events
5. Test and save

### For Microsoft Teams
See [Teams Integration Guide](TEAMS_INTEGRATION.md)

### For Epic EMR
See [Epic Integration Guide](EPIC_INTEGRATION.md)

### For Custom Services
1. Ensure your service can receive HTTP POST requests
2. Create webhook with your endpoint URL
3. Optional: Add secret for signature verification
4. Test payload delivery

## Monitoring Webhooks

**View All Webhooks:**
- Admin Dashboard → Webhooks
- See status, success rate, last triggered

**View Delivery Logs:**
- Click webhook name → View Deliveries
- See every delivery attempt
- Check success/failure status
- Review response codes

**Webhook Health:**
- Green: Working normally
- Yellow: Some failures
- Red: Multiple consecutive failures

## Best Practices

**Security:**
- Use HTTPS URLs only
- Enable secret verification when possible
- Keep webhook URLs confidential
- Monitor for unauthorized access

**Reliability:**
- Test webhooks before relying on them
- Monitor delivery logs regularly
- Set up alerts for webhook failures
- Have backup notification methods

**Organization:**
- Name webhooks descriptively
- Document what each webhook does
- Group related events together
- Review and clean up unused webhooks

## Troubleshooting

**Webhook not firing:**
- Check webhook is active
- Verify event subscription
- Review delivery logs for errors

**Authentication failures:**
- Verify credentials (Client ID, tokens)
- Check secret/key format
- Ensure endpoint accepts authentication

**Missing notifications:**
- Confirm webhook subscribed to event
- Check if event actually occurred
- Review delivery logs for the timeframe

**Too many notifications:**
- Reduce number of subscribed events
- Add filters for specific criteria
- Consider batch notifications

## Security Considerations

- All webhooks use HTTPS encryption
- Optional HMAC signature verification
- JWT authentication for Epic integration
- Delivery logs stored for audit
- Admin-only access to configuration
