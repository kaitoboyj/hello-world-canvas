# Telegram Notification Setup Guide

The website includes a Telegram notification feature that sends real-time alerts when users interact with the site (page visits, button clicks, form submissions, etc.).

## Current Status

✅ Server is configured to handle Telegram notifications  
⚠️ **You need to set up your Telegram bot credentials**

## How to Set Up Telegram Notifications

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a chat and send `/newbot`
3. Follow the instructions:
   - Choose a name for your bot (e.g., "My Website Notifications")
   - Choose a username for your bot (must end with 'bot', e.g., "mywebsite_notify_bot")
4. **Copy the bot token** you receive (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Get Your Chat ID

**Option A: Use @userinfobot (For personal notifications)**
1. Search for **@userinfobot** in Telegram
2. Start a chat and it will send you your chat ID
3. Copy the ID (format: `123456789`)

**Option B: Create a Group/Channel (For team notifications)**
1. Create a new Telegram group or channel
2. Add your bot to the group/channel as an admin
3. Send a message in the group
4. Open this URL in your browser (replace YOUR_BOT_TOKEN with your actual token):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
5. Look for `"chat":{"id":-1001234567890}` in the response
6. Copy the chat ID (will be negative for groups, like `-1001234567890`)

### Step 3: Configure the Environment Variables

1. Open the `.env` file in the `hello-world-canvas` folder
2. Replace the placeholder values:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
   TELEGRAM_CHAT_ID="-1001234567890"
   ```
3. Save the file

### Step 4: Restart the Server

Stop the current server (Ctrl+C in the terminal) and run:
```bash
npm run dev
```

## What Gets Tracked?

Once configured, the Telegram bot will send notifications for:

- 👀 **Page Visits** - When someone visits the site
  - Device info (OS, browser, screen size)
  - Location (IP, country, city, ISP)
  - Referrer information

- 🖱 **User Actions** - When someone clicks buttons/links
  - Element clicked
  - Page location
  - User information (if logged in)

- 📝 **Form Inputs** - When users fill out forms
  - Field name and value
  - Input type
  - User information (if logged in)

- 📤 **File Uploads** - When users upload files
  - File name, size, and type
  - Actual file sent to Telegram
  - Images and documents

- 📋 **Application Submissions** - Complete application data
  - All form fields
  - User information
  - Uploaded documents
  - Formatted summary

## Testing

After setup, open the website and:
1. Navigate to different pages
2. Click some buttons
3. Fill out a form field

You should receive Telegram notifications for each action!

## Troubleshooting

**No notifications appearing?**
- Check that your bot token and chat ID are correct
- Make sure your bot is added to the group/channel (if using a group)
- Verify the server restarted after updating .env
- Check the server console for error messages

**Getting "Telegram credentials not configured" error?**
- Ensure the .env file is in the correct location (hello-world-canvas/.env)
- Check that there are no typos in TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID
- Make sure to restart the server after editing .env

**Bot not sending messages to group?**
- Ensure the bot is added as an administrator in the group/channel
- Check that the chat ID is negative (e.g., -1001234567890)
- Try sending a message to the bot directly first

## Privacy & Security

- Bot token and chat ID are stored in `.env` (not committed to git)
- Sensitive data (passwords) are masked in notifications
- Location tracking uses ipapi.co service
- All data is sent only to your configured Telegram chat

## Disabling Notifications

To disable Telegram notifications:
1. Remove or comment out the lines in `.env`:
   ```env
   # TELEGRAM_BOT_TOKEN="..."
   # TELEGRAM_CHAT_ID="..."
   ```
2. Restart the server

The site will work normally, but no notifications will be sent.
