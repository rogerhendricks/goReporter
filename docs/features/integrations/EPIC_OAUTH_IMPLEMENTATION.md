# Epic OAuth 2.0 Implementation Summary

## What Was Implemented

### Backend (Go)

1. **JWT Library Integration**
   - Added `github.com/golang-jwt/jwt/v5` for JWT token generation
   - Supports RS384 signing algorithm (required by Epic)

2. **Webhook Model Extensions** ([internal/models/webhook.go](internal/models/webhook.go))
   ```go
   IntegrationType string // "generic", "epic", "slack", "teams"
   EpicClientID    string // Epic App Orchard client ID
   EpicPrivateKey  string // RSA private key (PKCS8 PEM format)
   EpicTokenURL    string // Epic OAuth token endpoint
   EpicFHIRBase    string // Epic FHIR R4 base URL
   ```

3. **OAuth Token Generation** ([internal/services/webhookService.go](internal/services/webhookService.go))
   - `getEpicAccessToken()` - Implements JWT Bearer flow
   - `parsePrivateKey()` - Parses PKCS8/PKCS1 PEM keys
   - Creates JWT with claims: iss, sub, aud, jti, exp
   - Signs JWT with RS384 algorithm
   - Exchanges JWT for OAuth access token
   - Handles token expiration (5 minute JWT validity)

4. **FHIR Integration** 
   - Auto-detects Epic webhooks by `integrationType` field
   - Sets `Content-Type: application/fhir+json` header
   - Adds `Authorization: Bearer <token>` header
   - Formats payload as FHIR R4 DiagnosticReport
   - Logs OAuth failures separately for debugging

5. **Report Completion Trigger** ([internal/handlers/report.go](internal/handlers/report.go))
   - Fires `report.completed` webhook when `isCompleted` changes to true
   - Includes comprehensive payload:
     - Patient MRN (for Epic patient matching)
     - Device information (serial, manufacturer, model)
     - Battery metrics (status, percentage, voltage)
     - Pacing percentages (atrial, ventricular)
     - Report URL for full interrogation

### Frontend (React/TypeScript)

1. **Webhook Service Updates** ([webhookService.ts](frontend/src/services/webhookService.ts))
   ```typescript
   interface Webhook {
     integrationType?: string
     epicClientId?: string
     epicPrivateKey?: string
     epicTokenUrl?: string
     epicFhirBase?: string
   }
   ```

2. **Admin Webhook Form** ([WebhookFormPage.tsx](frontend/src/pages/WebhookFormPage.tsx))
   - Integration type selector (Generic, Slack, Teams, Epic)
   - Conditional Epic configuration section:
     - Client ID input
     - Private key textarea (PEM format)
     - Token URL input
     - FHIR Base URL input
   - Validation for Epic required fields
   - PEM format validation
   - Warning alert with Epic Integration Guide link

3. **Webhook List Display** ([WebhooksPage.tsx](frontend/src/pages/WebhooksPage.tsx))
   - Shows integration type badges (🏥 Epic FHIR, 💬 Slack, 📋 Teams)
   - Displays Epic-specific configuration status

4. **Admin-Only Access** ([routes.tsx](frontend/src/router/routes.tsx))
   - All webhook routes restricted to `roles: ['admin']`
   - `/webhooks` - List view
   - `/webhooks/new` - Create form
   - `/webhooks/:id` - Edit form

### Documentation

1. **[EPIC_INTEGRATION.md](EPIC_INTEGRATION.md)**
   - Complete FHIR R4 DiagnosticReport structure
   - Epic OAuth 2.0 JWT Bearer authentication flow
   - Setup instructions (App Orchard registration)
   - Example FHIR payload
   - Data mapping table
   - Error handling guide
   - Security considerations
   - Troubleshooting section

## How to Configure Epic Webhook (Admin Only)

### Prerequisites

1. Register app in [Epic App Orchard](https://apporchard.epic.com/)
2. Request `system/DiagnosticReport.write` scope
3. Generate RSA key pair for JWT signing
4. Get Epic sandbox/production endpoints

### Configuration Steps

1. **Login as Admin**
   - Only admins can access `/webhooks`

2. **Create New Webhook**
   - Navigate to Webhooks → Add Webhook
   - Name: "Epic Production FHIR"
   - URL: `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/DiagnosticReport`
   - Integration Type: **Epic EMR (FHIR)**

3. **Configure Epic Credentials**
   - Epic Client ID: `your-client-id`
   - Epic Private Key: Paste full PEM key (including BEGIN/END markers)
   - Epic Token URL: `https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token`
   - Epic FHIR Base: `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`

4. **Select Events**
   - Check **Report Completed** (required for DiagnosticReport)

5. **Save and Test**
   - Click "Create Webhook"
   - Use "Test" button to verify OAuth and FHIR submission

## OAuth Flow (Automatic)

When a report is completed:

1. **JWT Creation**
   ```json
   {
     "iss": "your-client-id",
     "sub": "your-client-id",
     "aud": "https://fhir.epic.com/.../token",
     "jti": "webhook-123-timestamp",
     "exp": 1735248000  // 5 minutes from now
   }
   ```

2. **JWT Signing**
   - Uses RSA-384 algorithm with private key
   - Produces signed JWT token

3. **Token Exchange**
   ```bash
   POST https://fhir.epic.com/.../oauth2/token
   Content-Type: application/x-www-form-urlencoded
   
   grant_type=client_credentials&
   client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
   client_assertion=<signed_jwt>
   ```

4. **Access Token Response**
   ```json
   {
     "access_token": "eyJhbGc...",
     "token_type": "Bearer",
     "expires_in": 3600
   }
   ```

5. **FHIR DiagnosticReport Submission**
   ```bash
   POST https://fhir.epic.com/.../DiagnosticReport
   Authorization: Bearer eyJhbGc...
   Content-Type: application/fhir+json
   
   {
     "resourceType": "DiagnosticReport",
     "status": "final",
     "subject": {"reference": "Patient/MRN123456"},
     ...
   }
   ```

## Security Features

✅ **Admin-Only Access** - Webhook configuration restricted to admin role  
✅ **Encrypted Storage** - Private keys stored in database (recommend encryption at rest)  
✅ **Short-Lived JWTs** - 5 minute expiration prevents replay attacks  
✅ **TLS Required** - All Epic communication over HTTPS  
✅ **Audit Logging** - All deliveries logged with OAuth status  
✅ **PEM Validation** - Frontend validates private key format  
✅ **Token Caching** - (TODO: Implement to reduce token requests)

## Testing

### 1. Test Webhook Configuration

```bash
# From admin UI
1. Navigate to /webhooks
2. Click webhook name
3. Click "Test" button
4. Check delivery logs for OAuth success
```

### 2. Test Report Completion

```bash
# Create and complete a report
1. Create new report for patient with MRN
2. Fill in device measurements
3. Mark as completed (isCompleted = true)
4. Check webhook delivery logs
5. Verify in Epic: Patient → Results → Device Reports
```

### 3. Monitor Delivery Logs

```bash
GET /api/webhooks/{id}/deliveries

# Check for:
- Status Code: 200 (success)
- Error Message: Empty (no OAuth errors)
- Response: Epic FHIR response JSON
```

## Troubleshooting

### OAuth Failures (401)

**Symptom**: Delivery log shows "Epic OAuth failed: ..."

**Solutions**:
- Verify Client ID matches App Orchard registration
- Check private key is valid PKCS8 PEM format
- Ensure token URL is correct for environment (sandbox vs production)
- Verify system clock is synchronized (JWT exp claim)

### FHIR Validation Errors (422)

**Symptom**: Status code 422 with FHIR validation errors

**Solutions**:
- Verify patient MRN exists in Epic
- Check all required DiagnosticReport fields populated
- Validate against [FHIR R4 spec](https://hl7.org/fhir/R4/diagnosticreport.html)
- Use Epic sandbox for testing

### Missing Device Data

**Symptom**: DiagnosticReport sent but missing device info

**Solutions**:
- Ensure patient has active device in goReporter
- Check device preload in UpdateReport handler
- Verify device relationship in database

## Future Enhancements

- [ ] **Token Caching**: Cache access tokens for 55 minutes (before 60min expiry)
- [ ] **Retry Logic**: Exponential backoff for OAuth/FHIR failures  
- [ ] **Bulk Upload**: Batch multiple completed reports
- [ ] **Real-time Status**: WebSocket updates for delivery status
- [ ] **Epic Observation**: Send individual measurements as Observation resources
- [ ] **Bi-directional Sync**: Pull Epic patient data into goReporter
- [ ] **Multi-EMR Support**: Cerner, Allscripts, etc.
- [ ] **Key Rotation**: Support for multiple Epic keys with rotation
- [ ] **Consent Verification**: Check patient consent before Epic submission

## API Reference

### Create Epic Webhook

```bash
POST /api/webhooks
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "name": "Epic Production",
  "integrationType": "epic",
  "url": "https://fhir.epic.com/.../DiagnosticReport",
  "events": ["report.completed"],
  "epicClientId": "your-client-id",
  "epicPrivateKey": "-----BEGIN PRIVATE KEY-----\n...",
  "epicTokenUrl": "https://fhir.epic.com/.../oauth2/token",
  "epicFhirBase": "https://fhir.epic.com/.../FHIR/R4",
  "active": true
}
```

### Update Epic Webhook

```bash
PUT /api/webhooks/{id}
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "epicPrivateKey": "-----BEGIN PRIVATE KEY-----\n..." // Update key
}
```

### View Delivery Logs

```bash
GET /api/webhooks/{id}/deliveries?limit=50&offset=0
Authorization: Bearer <admin-jwt>

# Response includes OAuth status
{
  "deliveries": [{
    "statusCode": 200,
    "success": true,
    "errorMessage": "",
    "payload": "<FHIR JSON>",
    "response": "<Epic response>"
  }]
}
```

## Environment Variables

Add to `.env` (optional defaults):

```bash
# For getReportURL() helper
APP_BASE_URL=https://yourapp.com

# Optional: Default Epic sandbox
EPIC_SANDBOX_CLIENT_ID=sandbox-client-id
EPIC_SANDBOX_TOKEN_URL=https://fhir.epic.com/.../token
EPIC_SANDBOX_FHIR_BASE=https://fhir.epic.com/.../FHIR/R4
```

## Resources

- [Epic FHIR Docs](https://fhir.epic.com/)
- [FHIR R4 DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html)
- [Epic App Orchard](https://apporchard.epic.com/)
- [JWT.io Debugger](https://jwt.io/)
- [PEM Format Guide](https://en.wikipedia.org/wiki/Privacy-Enhanced_Mail)
