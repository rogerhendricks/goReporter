# Microsoft Teams Adaptive Card Integration

## Overview

The webhook system now **automatically detects Microsoft Teams webhooks** and sends beautifully formatted **Adaptive Cards** instead of raw JSON. This provides a much better user experience in Teams channels.

## How It Works

### Automatic Detection

The system detects Teams webhooks by checking if the URL contains:
- `office.com/webhook`
- `outlook.office.com`
- `outlook.office365.com`

When a Teams URL is detected, the payload is automatically formatted as an Adaptive Card.

### Supported Event Types

Each event type has its own custom-designed Adaptive Card:

#### 1. Battery Critical (`battery.critical`)
- **Color**: Red (Attention)
- **Icon**: 🚨
- **Title**: "Battery Alert - Critical"
- **Fields**: Patient ID, Battery Status (ERI/EOL), Voltage, Percentage, Report ID
- **Message**: "A device battery has reached a critical status and requires immediate attention."

#### 2. Battery Low (`battery.low`)
- **Color**: Yellow (Warning)
- **Icon**: ⚠️
- **Title**: "Battery Alert - Low"
- **Fields**: Patient ID, Battery Percentage, Voltage, Report ID
- **Message**: "A device battery is running low. Please schedule replacement soon."

#### 3. Report Created (`report.created`)
- **Color**: Green (Good)
- **Icon**: 📄
- **Title**: "New Report Created"
- **Fields**: Report ID, Patient ID, Report Type, Status
- **Message**: "A new device report has been created and is ready for review."

#### 4. Task Created (`task.created`)
- **Color**: Blue (Emphasis)
- **Icon**: ✅
- **Title**: "New Task Created"
- **Fields**: Task ID, Title, Priority, Due Date, Patient ID
- **Message**: Shows the task description

#### 5. Task Due (`task.due`)
- **Color**: Yellow (Warning)
- **Icon**: ⏰
- **Title**: "Task Due Today"
- **Fields**: Task ID, Title, Priority
- **Message**: "This task is due today and requires your attention."

#### 6. Task Overdue (`task.overdue`)
- **Color**: Red (Attention)
- **Icon**: 🔴
- **Title**: "Task Overdue"
- **Fields**: Task ID, Title, Was Due Date
- **Message**: "This task is overdue and requires immediate attention."

#### 7. Generic Events (any other event)
- **Color**: Blue (Emphasis)
- **Icon**: 📢
- **Title**: Event name
- **Fields**: All data fields from the event
- **Message**: "Event notification from goReporter"

## Example: Battery Critical Alert in Teams

### JSON Sent to Teams:
```json
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4",
        "body": [
          {
            "type": "Container",
            "style": "attention",
            "items": [
              {
                "type": "TextBlock",
                "text": "🚨 Battery Alert - Critical",
                "weight": "Bolder",
                "size": "Large",
                "color": "Attention"
              }
            ]
          },
          {
            "type": "TextBlock",
            "text": "A device battery has reached a critical status...",
            "wrap": true,
            "spacing": "Medium"
          },
          {
            "type": "FactSet",
            "facts": [
              {"title": "Patient ID:", "value": "45"},
              {"title": "Battery Status:", "value": "ERI"},
              {"title": "Battery Voltage:", "value": "2.30V"},
              {"title": "Battery Percentage:", "value": "12.0%"},
              {"title": "Report ID:", "value": "123"}
            ],
            "spacing": "Medium"
          },
          {
            "type": "TextBlock",
            "text": "Alert triggered at Dec 26, 2025 3:30 PM",
            "size": "Small",
            "color": "Accent",
            "spacing": "Medium"
          }
        ]
      }
    }
  ]
}
```

### What Users See in Teams:

![Teams Adaptive Card Example]

```
┌────────────────────────────────────────┐
│                                        │
│  🚨 Battery Alert - Critical           │  ← Red background
│                                        │
├────────────────────────────────────────┤
│ A device battery has reached a         │
│ critical status and requires immediate │
│ attention.                             │
│                                        │
│ Patient ID:          45                │
│ Battery Status:      ERI               │
│ Battery Voltage:     2.30V             │
│ Battery Percentage:  12.0%             │
│ Report ID:          123                │
│                                        │
│ Alert triggered at Dec 26, 2025 3:30 PM│
│                                        │
└────────────────────────────────────────┘
```

## Code Structure

### File: `internal/services/webhookService.go`

**Key Functions:**

1. **`isTeamsWebhook(url string) bool`**
   - Detects if URL is a Microsoft Teams webhook
   - Checks for Teams-specific domains

2. **`formatTeamsMessage(event, data) ([]byte, error)`**
   - Routes to appropriate card creator based on event type
   - Falls back to generic card for unknown events

3. **Event-Specific Card Creators:**
   - `createBatteryCriticalCard(data)` - Red alert card
   - `createBatteryLowCard(data)` - Yellow warning card
   - `createReportCreatedCard(data)` - Green success card
   - `createTaskCreatedCard(data)` - Blue info card
   - `createTaskDueCard(data)` - Yellow reminder card
   - `createTaskOverdueCard(data)` - Red urgent card
   - `createGenericCard(event, data)` - Fallback for any event

4. **`deliverWebhook()`** - Modified to:
   ```go
   // Check if this is a Microsoft Teams webhook
   isTeams := ws.isTeamsWebhook(webhook.URL)
   
   if isTeams {
       // Format as Teams Adaptive Card
       payloadBytes, err = ws.formatTeamsMessage(event, data)
   } else {
       // Standard JSON payload for Slack and others
       payload := WebhookPayload{...}
       payloadBytes, err = json.Marshal(payload)
   }
   ```

## Comparison: Slack vs Teams

| Aspect | Slack | Microsoft Teams |
|--------|-------|-----------------|
| **Format** | Raw JSON | Adaptive Card |
| **Appearance** | Plain text | Styled with colors/icons |
| **Detection** | Default | Auto-detected by URL |
| **Colors** | No | Yes (attention, warning, good) |
| **Icons** | No | Yes (emoji in title) |
| **Layout** | Linear | Structured with containers |
| **User Experience** | Developer-friendly | Business-user-friendly |

## Benefits

### For Teams Users:
✅ **Visual Priority** - Color coding shows urgency at a glance
✅ **Professional Look** - Matches Teams' native notification style
✅ **Scannable** - Key-value pairs in FactSet format
✅ **Accessible** - Proper semantic structure for screen readers
✅ **Mobile-Friendly** - Adaptive Cards render well on mobile

### For Developers:
✅ **Automatic** - No configuration needed, just paste Teams URL
✅ **Backward Compatible** - Slack and other services still get JSON
✅ **Extensible** - Easy to add new event types
✅ **Testable** - Test button works with both formats

## Testing Your Teams Integration

### 1. Get a Teams Webhook URL
```
Settings → Connectors → Incoming Webhook → Configure
```

### 2. Create Webhook in goReporter
- Name: `Teams Alerts`
- URL: `https://outlook.office.com/webhook/...`
- Events: Select desired events
- Active: ON

### 3. Test It
- Click "Test" button
- Check Teams channel for formatted card
- Create a report with low battery to see real alert

### 4. Expected Results
You should see:
- Professional-looking cards with color coding
- Clear titles with emoji icons
- Structured data in easy-to-read format
- Timestamp at the bottom

## Troubleshooting

### Card Not Appearing in Teams
1. Check webhook URL is correct
2. Ensure connector is still active in Teams
3. Verify you're in the right channel
4. Check delivery logs in goReporter for errors

### Seeing JSON Instead of Card
1. Webhook URL might not be detected as Teams
2. Check URL contains `office.com/webhook`
3. Look in delivery logs to see what was sent

### Card Looks Wrong
1. Ensure Teams supports Adaptive Cards v1.4
2. Some Teams versions have rendering differences
3. Test on both desktop and mobile

## Future Enhancements

Possible improvements for Teams integration:

1. **Action Buttons**
   - "View Report" button linking to goReporter
   - "Acknowledge" button to mark as seen
   - "Assign Task" button

2. **More Event Types**
   - Consent expiring/expired
   - Device implanted/explanted
   - Report completed/reviewed

3. **Richer Data**
   - Patient name (if available)
   - Device manufacturer/model
   - Historical trends

4. **Theming**
   - Custom colors per organization
   - Logo integration

## Resources

- [Microsoft Teams Webhooks](https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Adaptive Cards Schema](http://adaptivecards.io/schemas/adaptive-card.json)

## Summary

The webhook system now provides **first-class support for Microsoft Teams** with:
- ✅ Automatic URL detection
- ✅ Beautiful Adaptive Card formatting
- ✅ Color-coded alerts (red, yellow, green, blue)
- ✅ 6+ event-specific card designs
- ✅ Professional appearance for business users
- ✅ Zero configuration required

Simply paste a Teams webhook URL and get gorgeous notifications automatically! 🎉
