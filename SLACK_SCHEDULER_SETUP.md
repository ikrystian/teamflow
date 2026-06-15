# Slack Scheduler Setup Guide

## Overview

The Slack Scheduler allows you to schedule sending task change notes to Slack channels for later delivery. The scheduler runs as a background cron job that processes pending scheduled messages every 5 minutes.

## Features

- 📅 **Schedule Notifications**: Choose a specific date and time to send task changes to Slack
- 🔄 **Automatic Processing**: Cron job automatically checks and sends scheduled messages every 5 minutes
- 📝 **Full Markdown Support**: Task notes are sent with proper Slack markdown formatting
- 🔗 **Share Links**: Recipients receive a link to view the full task details (read-only)
- 🖼️ **Image Attachments**: Any images attached to the task are uploaded and posted together with the note as attachments on the same message

> **Slack scope:** Posting image attachments uses Slack's file upload API, so the bot token needs the `files:write` scope in addition to `chat:write`. Add it under **OAuth & Permissions** in your Slack app, then reinstall the app to the workspace. Non-image attachments are ignored; messages without images keep using `chat.postMessage` as before.

## UI Usage

1. Edit a task and expand the "Pokaż notatki ze zmian" (Show change notes) section
2. Click the "Wyślij" (Send) button to open the scheduling popover
3. Use the datetime picker to select when you want to send the notification
4. Click "Zaplanuj" to schedule, or "Wyślij teraz" to send immediately

## Setting Up the Cron Job

### Option 1: Using HTTP Endpoint (Recommended for Cloud Deployments)

This option calls your app's HTTP endpoint, which is ideal for cloud deployments.

#### Setup:

1. Set a `CRON_SECRET` environment variable (recommended for security):
   ```bash
   CRON_SECRET="your-secure-random-string-here"
   ```

2. Add to your system crontab:
   ```bash
   crontab -e
   ```

3. Add this line to run every 5 minutes:
   ```cron
   */5 * * * * curl -s "http://localhost:3000/api/cron/slack-scheduler" -H "Authorization: Bearer your-secure-random-string-here"
   ```

   **For production (with domain and HTTPS):**
   ```cron
   */5 * * * * curl -s "https://your-domain.com/api/cron/slack-scheduler" -H "Authorization: Bearer your-secure-random-string-here"
   ```

### Option 2: Using Direct Node Script (Recommended for Local Development)

This option runs the Node.js script directly.

#### Setup:

1. Add to your system crontab:
   ```bash
   crontab -e
   ```

2. Add this line to run every 5 minutes:
   ```cron
   */5 * * * * cd /path/to/teamflow && node scripts/process-slack-scheduler.js >> /var/log/slack-scheduler.log 2>&1
   ```

   **Make sure to replace `/path/to/teamflow` with your actual project path.**

### Verifying the Cron Setup

1. **Check if cron is running:**
   ```bash
   # List current cron jobs
   crontab -l
   ```

2. **Test the scheduler manually:**

   **Using HTTP endpoint:**
   ```bash
   curl -H "Authorization: Bearer your-secret-here" \
     http://localhost:3000/api/cron/slack-scheduler
   ```

   **Using Node script:**
   ```bash
   node /path/to/teamflow/scripts/process-slack-scheduler.js
   ```

3. **Monitor the logs:**
   - Check application logs for scheduler messages
   - For cron script: `tail -f /var/log/slack-scheduler.log`

## Cron Syntax Explained

```
*/5 * * * * command
│   │ │ │ │
│   │ │ │ └─── Day of week (0-6, Sunday=0)
│   │ │ └───── Month (1-12)
│   │ └─────── Day of month (1-31)
│   └───────── Hour (0-23)
└───────────── Minute (*/5 = every 5 minutes)
```

- `*/5 * * * *` = Every 5 minutes, all day, every day
- `0 * * * *` = Every hour at minute 0
- `0 0 * * *` = Every day at midnight
- `0 9 * * 1-5` = Monday to Friday at 9 AM

## Environment Variables

Required:
- `SLACK_BOT_TOKEN` - Your Slack bot token (required to send messages)

Optional:
- `CRON_SECRET` - Secret token for securing the HTTP endpoint (recommended)
- `NEXTAUTH_URL` - Your app's base URL (used for generating share links)
- `DATABASE_URL` - Your database connection string

## Troubleshooting

### Messages not sending

1. **Check Slack token**: Ensure `SLACK_BOT_TOKEN` is set correctly
2. **Check channel ID**: Verify the project has a valid Slack channel ID configured
3. **Check database**: Ensure tasks with scheduled sends exist in the database
4. **Check cron execution**: Verify cron job is actually running

### Cron not running

1. **Verify cron service is running:**
   ```bash
   sudo service cron status  # Linux
   sudo launchctl list | grep cron  # macOS
   ```

2. **Check crontab syntax:**
   ```bash
   crontab -l  # List cron jobs
   ```

3. **Check logs:**
   ```bash
   # Linux
   grep CRON /var/log/syslog
   
   # macOS
   log stream --predicate 'process == "cron"'
   ```

### Permission issues

If using the Node script method:
- Ensure the user running cron has permission to access the project directory
- Ensure `SLACK_BOT_TOKEN` environment variables are accessible to the cron user

## Database Schema

The scheduling feature uses the following Task fields:
- `changesScheduledSendAt` - DateTime when the message should be sent
- `changesSentAt` - DateTime when the message was actually sent
- `changes` - The message content to send

## API Reference

### POST /api/tasks/{taskId}/slack

Send or schedule a Slack notification.

**Request body:**
```json
{
  "scheduledFor": "2024-03-15T14:30:00Z"  // Optional: ISO datetime for scheduled send
}
```

**Response (scheduled):**
```json
{
  "success": true,
  "scheduled": true,
  "changesScheduledSendAt": "2024-03-15T14:30:00.000Z"
}
```

**Response (sent immediately):**
```json
{
  "success": true,
  "changesSentAt": "2024-03-15T14:20:00.000Z"
}
```

### GET /api/cron/slack-scheduler

Manually trigger the scheduler to process pending messages.

**Headers (optional):**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "processed": 5,
  "failed": 0,
  "errors": null
}
```

## Testing

To test the scheduling feature locally without waiting for cron:

1. **Create a task with change notes** and schedule it for a time just after now
2. **Call the scheduler endpoint manually:**
   ```bash
   curl -H "Authorization: Bearer your-secret" \
     http://localhost:3000/api/cron/slack-scheduler
   ```
3. **Check that the message was sent** in your Slack channel

## Security Considerations

1. **Use CRON_SECRET**: Always set a strong `CRON_SECRET` in production
2. **Use HTTPS**: Ensure the cron endpoint is called over HTTPS in production
3. **Restrict access**: Only allow your cron server's IP to call the endpoint
4. **Monitor logs**: Regularly check logs for failed sends or errors
