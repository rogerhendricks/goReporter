# Epic EMR Integration Guide

## Overview

goReporter integrates with Epic EMR systems using **FHIR R4 DiagnosticReport** resources to automatically push completed cardiac device interrogation reports to hospital electronic medical record systems.

When a report is marked as completed in goReporter, the system automatically:
1. Generates a FHIR R4 DiagnosticReport with all device data
2. Authenticates with Epic using OAuth 2.0 (JWT Bearer flow)
3. Posts the DiagnosticReport to Epic's FHIR API
4. Logs the delivery for audit purposes

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  goReporter │────────>│ FHIR Webhook │────────>│ Epic FHIR   │
│  Report     │  Trigger│  Service     │  POST   │  API        │
│  Completed  │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ├─ OAuth 2.0 JWT Bearer
                              ├─ FHIR DiagnosticReport
                              └─ Delivery Logging
```

## FHIR DiagnosticReport Structure

The webhook sends a complete FHIR R4 DiagnosticReport with:

### Core Fields
- **resourceType**: "DiagnosticReport"
- **status**: "final" (completed report)
- **category**: Medical Device Communication (MDC)
- **code**: LOINC 34139-4 (Pacemaker device interrogation report)
- **subject**: Patient reference with MRN identifier
- **effectiveDateTime**: Report date
- **conclusion**: Summary text

### Contained Resources
- **Device**: Complete device information (serial, manufacturer, model)

### Results (Observations)
- Battery Status (Normal/ERI/EOL)
- Battery Percentage
- Atrial Pacing Percentage
- Ventricular Pacing Percentage

### Attachments
- **presentedForm**: Link to full HTML report in goReporter

## Example FHIR Payload

```json
{
  "resourceType": "DiagnosticReport",
  "id": "123",
  "status": "final",
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
      "code": "MDC",
      "display": "Medical Device Communication"
    }]
  }],
  "code": {
    "coding": [{
      "system": "http://loinc.org",
      "code": "34139-4",
      "display": "Pacemaker device interrogation report"
    }],
    "text": "Cardiac Device Interrogation Report"
  },
  "subject": {
    "reference": "Patient/MRN123456",
    "identifier": {
      "system": "urn:oid:2.16.840.1.113883.4.1",
      "value": "MRN123456"
    }
  },
  "effectiveDateTime": "2025-12-26T10:30:00Z",
  "issued": "2025-12-26T15:45:00Z",
  "conclusion": "Cardiac device interrogation completed. Battery status: Normal",
  "result": [
    {
      "reference": "#battery-status-123",
      "display": "Battery Status: Normal"
    },
    {
      "reference": "#battery-percentage-123",
      "display": "Battery Percentage: 85.0%"
    },
    {
      "reference": "#atrial-pacing-123",
      "display": "Atrial Pacing: 12.5%"
    },
    {
      "reference": "#ventricular-pacing-123",
      "display": "Ventricular Pacing: 95.2%"
    }
  ],
  "contained": [{
    "resourceType": "Device",
    "id": "device-123",
    "identifier": [{
      "type": {
        "coding": [{
          "system": "http://hl7.org/fhir/identifier-type",
          "code": "SNO",
          "display": "Serial Number"
        }]
      },
      "value": "ABC123456"
    }],
    "manufacturer": "Medtronic",
    "deviceName": [{
      "name": "Pacemaker Dual Chamber",
      "type": "model-name"
    }],
    "type": {
      "coding": [{
        "system": "http://snomed.info/sct",
        "code": "360129009",
        "display": "Cardiac pacemaker, device"
      }]
    }
  }],
  "presentedForm": [{
    "contentType": "text/html",
    "url": "https://yourapp.com/reports/123",
    "title": "Full Interrogation Report"
  }]
}
```

## Epic Configuration

### Prerequisites

1. **Epic App Registration**: Register your app in Epic's App Orchard
2. **FHIR API Access**: Request DiagnosticReport write permissions
3. **OAuth Credentials**: Generate JWT signing key pair
4. **Patient MRN Mapping**: Ensure goReporter patient MRNs match Epic MRNs

### Webhook Configuration

Create an Epic webhook in goReporter with:

```javascript
{
  "name": "Epic Production FHIR",
  "integrationType": "epic",
  "url": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/DiagnosticReport",
  "events": ["report.completed"],
  "epicClientId": "your-epic-client-id",
  "epicPrivateKey": "-----BEGIN PRIVATE KEY-----\nYOUR_JWT_PRIVATE_KEY\n-----END PRIVATE KEY-----",
  "epicTokenUrl": "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
  "epicFhirBase": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
  "active": true,
  "description": "Push completed reports to Epic EMR"
}
```

### Epic OAuth 2.0 Flow

goReporter uses **JWT Bearer Token** authentication:

1. **Create JWT**:
   - Header: `{"alg": "RS384", "typ": "JWT"}`
   - Claims: `{"iss": "clientId", "sub": "clientId", "aud": "tokenUrl", "exp": now+300}`
   - Sign with Epic private key

2. **Exchange for Access Token**:
   ```bash
   POST https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=client_credentials&
   client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
   client_assertion=<signed_jwt>
   ```

3. **Response**:
   ```json
   {
     "access_token": "eyJhbGc...",
     "token_type": "Bearer",
     "expires_in": 3600
   }
   ```

4. **Use Access Token**:
   ```bash
   POST https://fhir.epic.com/...api/FHIR/R4/DiagnosticReport
   Authorization: Bearer <access_token>
   Content-Type: application/fhir+json
   
   <FHIR DiagnosticReport JSON>
   ```

## Setup Instructions

### 1. Register with Epic

1. Go to [Epic App Orchard](https://apporchard.epic.com/)
2. Create a new application
3. Request these scopes:
   - `system/DiagnosticReport.write`
   - `system/Patient.read`
4. Download your JWT signing key

### 2. Configure Environment

Add to your `.env` file:

```bash
APP_BASE_URL=https://yourapp.com
EPIC_CLIENT_ID=your-client-id
EPIC_PRIVATE_KEY_PATH=/path/to/epic-private-key.pem
EPIC_TOKEN_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
EPIC_FHIR_BASE=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

### 3. Create Webhook via API

```bash
curl -X POST http://localhost:8080/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt>" \
  -d '{
    "name": "Epic Production",
    "integrationType": "epic",
    "url": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/DiagnosticReport",
    "events": ["report.completed"],
    "epicClientId": "your-client-id",
    "epicPrivateKey": "-----BEGIN PRIVATE KEY-----\n...",
    "epicTokenUrl": "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token",
    "epicFhirBase": "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    "active": true
  }'
```

### 4. Test Integration

1. Create a test report in goReporter
2. Mark the report as completed
3. Check webhook delivery logs:
   ```bash
   GET /api/webhooks/{id}/deliveries
   ```
4. Verify in Epic:
   - Log into Epic
   - Search for patient by MRN
   - Navigate to Results → Device Reports
   - Confirm DiagnosticReport appears

## Webhook Delivery Logs

Every Epic delivery is logged with:

- **Event**: "report.completed"
- **Payload**: Full FHIR JSON sent
- **Status Code**: HTTP response (200 = success, 401 = auth failure, etc.)
- **Response**: Epic's response body
- **Success**: Boolean flag
- **Error Message**: Details if failed
- **Duration**: Milliseconds to complete

View logs in the goReporter UI under **Webhooks → View Deliveries** or via API:

```bash
GET /api/webhooks/{webhookId}/deliveries?limit=50&offset=0
```

## Data Mapping

| goReporter Field              | FHIR Field                                  |
|-------------------------------|---------------------------------------------|
| Report ID                     | DiagnosticReport.id                         |
| Patient MRN                   | DiagnosticReport.subject.identifier.value   |
| Report Date                   | DiagnosticReport.effectiveDateTime          |
| Battery Status                | DiagnosticReport.result[0].display          |
| Battery Percentage            | DiagnosticReport.result[1].display          |
| Atrial Pacing %               | DiagnosticReport.result[2].display          |
| Ventricular Pacing %          | DiagnosticReport.result[3].display          |
| Device Serial                 | DiagnosticReport.contained[0].identifier    |
| Device Manufacturer           | DiagnosticReport.contained[0].manufacturer  |
| Device Model                  | DiagnosticReport.contained[0].deviceName    |
| Report URL                    | DiagnosticReport.presentedForm[0].url       |

## Error Handling

### Common Errors

| Error Code | Cause                              | Solution                                    |
|------------|------------------------------------|---------------------------------------------|
| 401        | Invalid OAuth token                | Verify Epic client ID and private key       |
| 403        | Insufficient permissions           | Request DiagnosticReport.write scope        |
| 404        | Patient MRN not found in Epic      | Verify MRN matches Epic's patient registry  |
| 422        | Invalid FHIR resource              | Check payload against FHIR R4 spec          |
| 500        | Epic server error                  | Retry or contact Epic support               |

### Retry Logic

Failed deliveries are logged but NOT automatically retried. To manually retry:

1. View webhook deliveries
2. Identify failed delivery
3. Use "Test Webhook" button to resend
4. Or update report again to re-trigger

### Monitoring

Monitor Epic webhook health:

```sql
SELECT 
  w.name,
  w.success_count,
  w.failure_count,
  ROUND(w.success_count * 100.0 / (w.success_count + w.failure_count), 2) as success_rate,
  w.last_triggered_at
FROM webhooks w
WHERE w.integration_type = 'epic'
AND w.active = true;
```

## Security Considerations

1. **Private Key Storage**: Store Epic private keys encrypted in database
2. **Token Expiry**: Access tokens expire in 60 minutes, service handles renewal
3. **HTTPS Only**: Epic requires TLS 1.2+ for all API calls
4. **Audit Logging**: All deliveries are logged for HIPAA compliance
5. **MRN Validation**: Verify patient MRNs before sending to Epic
6. **Rate Limiting**: Epic may rate-limit, implement exponential backoff

## Troubleshooting

### Webhook Not Firing

1. Check report `isCompleted` flag is set to `true`
2. Verify webhook is `active = true`
3. Confirm webhook subscribed to `report.completed` event
4. Check server logs for errors

### Authentication Failures

1. Verify Epic client ID matches App Orchard registration
2. Check private key format (must be PKCS8 PEM)
3. Ensure token URL is correct for your Epic environment
4. Verify system clock is synchronized (JWT `exp` claim)

### FHIR Validation Errors

1. Validate payload against [FHIR R4 spec](https://hl7.org/fhir/R4/diagnosticreport.html)
2. Check patient MRN exists in Epic
3. Verify all required fields are populated
4. Use Epic's sandbox for testing before production

### Missing Data

1. Ensure patient has active device in goReporter
2. Verify report has all required measurements
3. Check device preload in UpdateReport handler
4. Review webhook delivery payload in logs

## Future Enhancements

- [ ] Support for Epic Observation resources (individual measurements)
- [ ] Bi-directional sync (pull Epic patient data into goReporter)
- [ ] Batch upload for multiple reports
- [ ] Real-time notification of Epic delivery status
- [ ] Support for other EMRs (Cerner, Allscripts, etc.)
- [ ] Automatic retry with exponential backoff
- [ ] Patient consent verification before sending to Epic

## Resources

- [Epic FHIR Documentation](https://fhir.epic.com/)
- [FHIR R4 DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html)
- [Epic App Orchard](https://apporchard.epic.com/)
- [SMART on FHIR](https://docs.smarthealthit.org/)
- [LOINC Codes](https://loinc.org/)
- [SNOMED CT](https://www.snomed.org/)

## Support

For Epic integration issues:
- Epic Technical Support: [Contact Epic](https://galaxy.epic.com/)
- FHIR Community: [chat.fhir.org](https://chat.fhir.org/)
- goReporter Issues: [GitHub Issues](https://github.com/yourrepo/goReporter/issues)
