# Epic EMR Integration

## Overview
Automatically push completed device reports to Epic electronic medical records for seamless clinical documentation.

## Who Can Use This
- **Administrators** - Configure and manage Epic integration
- **Medical staff** - Reports automatically sync when marked complete

## How It Works

When a report is marked as **completed** in goReporter:
1. Report data is automatically formatted for Epic
2. Securely transmitted to your Epic system
3. Appears in patient's medical record
4. Delivery logged for audit purposes

## Data Sent to Epic

**Patient Information:**
- Patient MRN (for matching)
- Report date and time

**Device Information:**
- Device serial number
- Manufacturer and model
- Battery status and percentage
- Pacing percentages

**Report Details:**
- Link to full interrogation report
- Summary conclusion

## For Administrators

### Setup Requirements

**Prerequisites:**
- Epic App Orchard registration
- OAuth credentials from Epic
- FHIR API access permissions

**Configuration:**
1. Go to **Admin Dashboard → Webhooks**
2. Create new Epic webhook
3. Enter Epic credentials (Client ID, private key)
4. Select "Report Completed" event
5. Test the connection
6. Activate

### Monitoring

View delivery logs to verify successful transmission:
- **Admin Dashboard → Webhooks → View Deliveries**
- Check status codes (200 = success)
- Review any error messages
- Retry failed deliveries if needed

## Benefits

**For Clinics:**
- Eliminates manual data entry into Epic
- Reduces transcription errors
- Ensures complete medical records
- Saves staff time

**For Doctors:**
- Device reports appear instantly in Epic
- Complete patient history in one place
- No need to check multiple systems
- Better clinical decision making

**For Compliance:**
- Audit trail of all transmissions
- HIPAA-compliant data transfer
- Automatic logging for quality assurance

## Troubleshooting

**Report not appearing in Epic:**
1. Check webhook delivery logs
2. Verify patient MRN matches Epic
3. Confirm Epic credentials are valid
4. Ensure webhook is active

**Authentication errors:**
- Verify Epic client ID
- Check private key format
- Ensure token URL is correct

**Missing data in Epic:**
- Confirm patient has device in goReporter
- Check all required report fields are populated
- Verify device relationship is active

## Security

- All data encrypted in transit (HTTPS/TLS 1.2+)
- OAuth 2.0 authentication with Epic
- Private keys stored securely
- Full audit logging
- HIPAA-compliant integration

## Support

For integration issues:
- Check webhook delivery logs first
- Verify Epic system is accessible
- Contact your Epic administrator
- Review goReporter documentation
