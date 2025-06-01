// Notification Service Configuration
// Copy this file and rename to .env for production use

const notificationConfig = {
  // Email Configuration (Gmail)
  email: {
    enabled: process.env.EMAIL_NOTIFICATIONS === 'true' || true,
    service: 'gmail',
    user: process.env.EMAIL_USER || 'zomato.ops.notifications@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-gmail-app-password',
    from: process.env.EMAIL_FROM || '"Zomato Operations" <zomato.ops.notifications@gmail.com>'
  },

  // SMS Configuration (Twilio)
  sms: {
    enabled: process.env.SMS_NOTIFICATIONS === 'true' || true,
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'your-twilio-account-sid',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'your-twilio-auth-token',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+1234567890'
  },

  // WhatsApp Business API Configuration
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true' || false,
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'your-whatsapp-access-token',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'your-whatsapp-phone-number-id'
  },

  // General Settings
  general: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    notificationsEnabled: process.env.NOTIFICATIONS_ENABLED !== 'false',
    retryAttempts: 3,
    retryDelay: 1000 // milliseconds
  },

  // Message Templates
  templates: {
    orderAssignment: {
      email: {
        subject: '🚚 New Order Assignment - Order #{orderNumber}',
        priority: 'high'
      },
      sms: {
        maxLength: 160,
        priority: 'high'
      },
      whatsapp: {
        priority: 'high'
      }
    },
    orderStatusUpdate: {
      email: {
        subject: '📝 Order Status Update - Order #{orderNumber}',
        priority: 'medium'
      },
      sms: {
        maxLength: 160,
        priority: 'medium'
      }
    }
  }
};

module.exports = notificationConfig;

/*
SETUP INSTRUCTIONS:

1. EMAIL SETUP (Gmail):
   - Go to your Google Account settings
   - Enable 2-factor authentication
   - Generate an App Password for "Mail"
   - Use this App Password as EMAIL_PASS

2. SMS SETUP (Twilio):
   - Sign up at https://www.twilio.com
   - Get your Account SID and Auth Token from the dashboard
   - Purchase a phone number for sending SMS
   - Add these to your environment variables

3. WHATSAPP SETUP (Optional):
   - Set up WhatsApp Business API
   - Get access token and phone number ID
   - Enable in environment variables

4. ENVIRONMENT VARIABLES:
   Create a .env file in the backend root with:
   
   EMAIL_USER=your-gmail-address@gmail.com
   EMAIL_PASS=your-gmail-app-password
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=+1234567890
   WHATSAPP_ENABLED=false
   
5. TEST NOTIFICATIONS:
   Use the test endpoints to verify setup:
   POST /api/notifications/test-email
   POST /api/notifications/test-sms
*/ 