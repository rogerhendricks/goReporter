# Webhook Testing Guide

## Phase 1: Internal Webhooks - Slack Notifications

You now have a complete webhook system that can send real-time notifications to Slack (or any other service) when important events occur in your medical device reporting app.

## What's Been Implemented

### Backend (Go)
- ✅ Webhook model with event subscriptions
- ✅ Webhook delivery service with retry logic
- ✅ HMAC signature verification for security
- ✅ Webhook management API (CRUD + test endpoint)
- ✅ Delivery logging and statistics
- ✅ Automatic triggers for:
  - `report.created` - When new reports are created
  - `battery.low` - When battery percentage < 20%
  - `battery.critical` - When battery status is ERI/EOL
  - `task.created` - When new tasks are created

### Frontend (React)
- ✅ Webhook management page (`/webhooks`)
- ✅ Create/Edit webhook form
- ✅ Test webhook button
- ✅ Delivery history viewer
- ✅ Success/failure statistics

## Testing with Slack

### Step 1: Create a Slack Webhook

1. Go to https://api.slack.com/messaging/webhooks
2. Click "Create your Slack app"
3. Choose "From scratch"
4. Name it "goReporter Notifications"
5. Select your workspace
6. Under "Incoming Webhooks", activate it
7. Click "Add New Webhook to Workspace"
8. Choose a channel (e.g., #device-alerts)
9. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

## Testing with Microsoft Teams (NEW!)

### Step 1: Create a Teams Webhook

1. Open Microsoft Teams
2. Go to the channel where you want alerts
3. Click the `•••` (More options) next to the channel name
4. Select "Connectors" or "Workflows" (varies by Teams version)
5. Search for "Incoming Webhook"
6. Click "Configure" or "Add"
7. Give it a name like "goReporter Alerts"
8. Optionally upload an icon
9. Copy the webhook URL (looks like: `https://outlook.office.com/webhook/...`)

**Note:** Teams webhooks will receive **beautifully formatted Adaptive Cards** instead of raw JSON! The system automatically detects Teams URLs and formats messages accordingly.

### What Teams Messages Look Like

**Battery Critical Alert:**
```
┌─────────────────────────────────┐
│ 🚨 Battery Alert - Critical     │ (Red background)
├─────────────────────────────────┤
│ A device battery has reached a  │
│ critical status and requires    │
│ immediate attention.            │
│                                 │
│ Patient ID:          45         │
│ Battery Status:      ERI        │
│ Battery Voltage:     2.30V      │
│ Battery Percentage:  12.0%      │
│ Report ID:          123         │
│                                 │
│ Alert triggered at Dec 26, 2025 │
│ 3:30 PM                         │
└─────────────────────────────────┘
```

**Task Created:**
```
┌─────────────────────────────────┐
│ ✅ New Task Created             │ (Blue background)
├─────────────────────────────────┤
│ Check device parameters         │
│                                 │
│ Task ID:         789            │
│ Title:          Review Patient  │
│ Priority:       high            │
│ Due Date:       2025-12-30      │
│ Patient ID:     45              │
│                                 │
│ Created at Dec 26, 2025 3:30 PM │
└─────────────────────────────────┘
```


### Step 2: Add Webhook in goReporter

1. Start your backend server:
   ```bash
   cd /home/roger/Development/goReporter
   go run cmd/api/main.go
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to http://localhost:3000/webhooks

4. Click "Add Webhook"

5. Fill in the form:
   - **For Slack:**
     - **Name**: `Slack Battery Alerts`
     - **Webhook URL**: Paste your Slack webhook URL
     - **Description**: `Sends critical battery alerts to #device-alerts`
     - **Events**: Select battery.low, battery.critical, report.created
     - **Active**: ON
   
   - **For Microsoft Teams:**
     - **Name**: `Teams Battery Alerts`
     - **Webhook URL**: Paste your Teams webhook URL
     - **Description**: `Sends formatted alerts to Teams channel`
     - **Events**: Select battery.low, battery.critical, task.created
     - **Active**: ON

6. Click "Create Webhook"

### Step 3: Test the Webhook

1. Click the "Test" button on your newly created webhook

2. **Check your notification channel:**

   **Slack** - you should see JSON like this:
   ```json
   {
     "event": "webhook.test",
     "timestamp": "2025-12-26T12:00:00Z",
     "data": {
       "test": true,
       "message": "This is a test webhook from goReporter",
       "webhook": {
         "id": 1,
         "name": "Slack Battery Alerts"
       }
     }
   }
   ```

   **Teams** - you should see a formatted Adaptive Card:
   ```
   ┌─────────────────────────────────┐
   │ 📢 webhook.test                 │
   ├─────────────────────────────────┤
   │ Event notification from         │
   │ goReporter                      │
   │                                 │
   │ test:           true            │
   │ message:        This is a test  │
   │                 webhook from    │
   │                 goReporter      │
   │ webhook.id:     1               │
   │ webhook.name:   Teams Battery   │
   │                 Alerts          │
   │                                 │
   │ Triggered at Dec 26, 2025       │
   │ 12:00 PM                        │
   └─────────────────────────────────┘
   ```

### Step 4: Test with Real Data

1. Create a new report with low battery:
   - Go to any patient
   - Create a new report
   - Set "Battery Percentage" to 15%
   - OR set "Battery Status" to "ERI"
   - Submit the report

2. **Check your notification channel:**

   **Slack** - receives JSON:
   ```json
   {
     "event": "battery.low",
     "timestamp": "2025-12-26T12:05:00Z",
     "data": {
       "reportId": 123,
       "patientId": 45,
       "batteryPercentage": 15,
       "batteryVoltage": 2.4
     }
   }
   ```

   **Teams** - receives formatted Adaptive Card:
   ```
   ┌─────────────────────────────────┐
   │ ⚠️ Battery Alert - Low          │ (Yellow background)
   ├─────────────────────────────────┤
   │ A device battery is running low.│
   │ Please schedule replacement     │
   │ soon.                           │
   │                                 │
   │ Patient ID:          45         │
   │ Battery Percentage:  15.0%      │
   │ Battery Voltage:     2.40V      │
   │ Report ID:          123         │
   │                                 │
   │ Alert triggered at Dec 26, 2025 │
   │ 12:05 PM                        │
   └─────────────────────────────────┘
   ```

## Testing Without Slack (Using webhook.site)

If you don't have Slack, you can use a free testing service:

1. Go to https://webhook.site/
2. Copy your unique URL (e.g., `https://webhook.site/12345678-1234-1234-1234-123456789012`)
3. Create a webhook in goReporter with this URL
4. Click "Test" button
5. Refresh webhook.site to see the received payload

## Webhook Payload Format

All webhooks receive this JSON structure:

```json
{
  "event": "battery.critical",
  "timestamp": "2025-12-26T12:00:00Z",
  "data": {
    "reportId": 123,
    "patientId": 45,
    "batteryStatus": "ERI",
    "batteryVoltage": 2.3,
    "batteryPercentage": 12
  }
}
```

### Headers Included:
- `Content-Type: application/json`
- `User-Agent: goReporter-Webhook/1.0`
- `X-Webhook-Event: battery.critical`
- `X-Webhook-ID: 1`
- `X-Webhook-Signature: sha256=...` (if secret is configured)

## Creating a Better Slack Message

The default JSON payload works, but you can format it nicely using Slack's Block Kit.

### Option 1: Use a Slack Bot (Better Formatting)

Instead of incoming webhooks, create a Slack bot that can send formatted messages. Example formatted message:

```
🚨 *Battery Alert - Critical*

*Patient:* John Doe (MRN: 12345)
*Battery Status:* ERI
*Battery Voltage:* 2.3V
*Battery Percentage:* 12%

<http://yourapp.com/reports/123|View Report>
```

### Option 2: Use a Middleware Service

Services like Zapier or Make (formerly Integromat) can transform your webhook payload into beautifully formatted Slack messages.

## Verifying Webhook Signatures

If you set a secret when creating the webhook, you can verify the signature in your receiving app:

```python
# Python example
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# Use it
is_valid = verify_webhook(
    request.body,
    request.headers['X-Webhook-Signature'],
    'your-secret-key'
)
```

```javascript
// Node.js example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

## Monitoring Webhooks

### View Delivery Logs

1. Go to `/webhooks`
2. Click on a webhook
3. View "Recent Deliveries" section
4. See:
   - Success/failure status
   - HTTP status code
   - Response time
   - Error messages (if failed)

### Success Metrics

The webhook card shows:
- **Success Rate**: Percentage of successful deliveries
- **Successful**: Total number of successful sends
- **Failed**: Total number of failed sends
- **Last Triggered**: When it was last called

## Troubleshooting

### Webhook Not Firing
- Check that the webhook is **Active**
- Verify you've subscribed to the correct events
- Check that the triggering action actually happened (e.g., battery is actually low)

### Test Works but Real Events Don't
- Make sure the event is implemented in the backend
- Check server logs for errors
- Verify the data being sent matches event triggers

### Slack Not Receiving
- Verify the webhook URL is correct
- Check that the Slack app is still installed
- Test URL manually with curl:
  ```bash
  curl -X POST YOUR_SLACK_URL \
    -H 'Content-Type: application/json' \
    -d '{"text":"Test from goReporter"}'
  ```

### Deliveries Failing
- Check delivery logs for HTTP status codes
- 404 = URL is wrong
- 401/403 = Authentication issue
- 500 = Their server error
- Timeout = Their server too slow

## Next Steps (Future Enhancements)

1. **Add More Event Triggers**
   - When reports are marked complete
   - When tasks become overdue
   - When consent is about to expire

2. **Retry Logic**
   - Auto-retry failed webhooks (currently sends once)
   - Exponential backoff

3. **Webhook Templates**
   - Pre-configured webhooks for common services
   - Slack, Teams, Discord, etc.

4. **Batch Notifications**
   - Daily summary webhooks
   - Grouped alerts

5. **Conditional Webhooks**
   - Only trigger if patient has certain tag
   - Only for specific device types

## API Endpoints

All webhook endpoints require authentication:

```bash
# List all webhooks
GET /api/webhooks

# Get specific webhook
GET /api/webhooks/:id

# Create webhook
POST /api/webhooks
{
  "name": "Slack Alerts",
  "url": "https://hooks.slack.com/...",
  "events": ["battery.low", "battery.critical"],
  "secret": "optional-secret",
  "active": true
}

# Update webhook
PUT /api/webhooks/:id
{
  "active": false
}

# Delete webhook
DELETE /api/webhooks/:id

# Test webhook
POST /api/webhooks/:id/test

# Get delivery logs
GET /api/webhooks/:id/deliveries?limit=50&offset=0
```

## Congratulations!

You now have a working webhook system that can notify you in real-time when critical events occur in your medical device reporting application. Start with battery alerts and expand from there!
