# Microsoft Teams Integration

## Overview
Receive real-time notifications in Microsoft Teams when important events occur in goReporter.

## Who Can Use This
- **Administrators** - Configure Teams webhooks
- **All users** - Receive notifications in Teams channels

## Notification Types

### Battery Alerts
- **Critical** - Battery at ERI/EOL (immediate attention needed)
- **Low** - Battery below 20% (schedule replacement)

### Task Notifications
- New tasks created
- Tasks due today
- Overdue tasks

### Report Notifications
- New reports completed

## What You'll See in Teams

Notifications appear as beautifully formatted cards with:
- **Color-coded urgency** (red for critical, yellow for warnings)
- **Clear titles** with emoji icons
- **Key details** in easy-to-read format
- **Timestamps** showing when event occurred

### Example: Battery Critical Alert
```
🚨 Battery Alert - Critical

A device battery has reached critical status and requires immediate attention.

Patient ID: 45
Battery Status: ERI
Battery Voltage: 2.30V
Battery Percentage: 12.0%
Report ID: 123

Alert triggered at Dec 26, 2025 3:30 PM
```

## Setup (Administrator)

### Step 1: Get Teams Webhook URL
1. Open Microsoft Teams
2. Go to channel where you want notifications
3. Click **... → Connectors**
4. Search for **"Incoming Webhook"**
5. Click **Configure**
6. Name it "goReporter Alerts"
7. Copy the webhook URL

### Step 2: Create Webhook in goReporter
1. Navigate to **Admin Dashboard → Webhooks**
2. Click **"New Webhook"**
3. Enter:
   - Name: "Teams Alerts"
   - URL: Paste your Teams webhook URL
4. Select events to monitor:
   - Battery Critical (recommended)
   - Battery Low (recommended)
   - Task Created
   - Task Due
   - Task Overdue
   - Report Created
5. Click **Create**
6. Click **Test** to verify it works

### Step 3: Verify in Teams
Check your Teams channel for the test message with a sample notification.

## Using Teams Notifications

**For Medical Staff:**
- Monitor critical battery alerts in real-time
- Never miss an urgent task
- See report completions instantly

**For Administrators:**
- Set up dedicated channels for different alert types
- Route critical alerts to on-call teams
- Keep staff informed without checking goReporter constantly

**For Managers:**
- Track task assignments and deadlines
- Monitor team productivity
- Ensure follow-ups aren't missed

## Best Practices

**Alert Fatigue Prevention:**
- Only subscribe to relevant events
- Use separate channels for different alert types
- Consider routing critical vs. routine alerts to different channels

**Channel Organization:**
- **#device-alerts** - Battery and device notifications
- **#task-notifications** - Task assignments and due dates
- **#report-updates** - New report completions

**Response Protocols:**
- Set clear expectations for response times
- Assign team members to monitor specific channels
- Use Teams reactions to acknowledge alerts

## Troubleshooting

**Notifications not appearing:**
1. Check webhook URL is correct
2. Verify connector is still active in Teams
3. Confirm you're in the right channel
4. Check webhook delivery logs in goReporter

**Seeing raw JSON instead of cards:**
- Webhook URL might not be recognized as Teams
- Ensure URL contains `office.com/webhook`
- Check delivery logs to see what was sent

**Too many notifications:**
- Reduce number of subscribed events
- Create filters for specific criteria
- Use different channels for different priorities

## Security

- Teams webhooks use HTTPS encryption
- No patient names in notifications (Patient ID only)
- Webhook URLs should be kept confidential
- Only administrators can create webhooks
