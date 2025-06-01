const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { auth } = require('../middleware/auth');

// Test email notification
router.post('/test-email', auth, async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      });
    }

    const testPartner = {
      _id: 'test_partner_id',
      name: name,
      email: email,
      phone: '9999999999'
    };

    const result = await notificationService.sendTestEmail(testPartner);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully!' : 'Failed to send test email',
      data: result
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test email',
      error: error.message
    });
  }
});

// Test SMS notification
router.post('/test-sms', auth, async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone and name are required'
      });
    }

    // Validate phone number (should be 10 digits)
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    const testPartner = {
      _id: 'test_partner_id',
      name: name,
      email: 'test@partner.com',
      phone: phone
    };

    const result = await notificationService.sendTestSMS(testPartner);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully!' : 'Failed to send test SMS',
      data: result
    });

  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test SMS',
      error: error.message
    });
  }
});

// Test WhatsApp notification
router.post('/test-whatsapp', auth, async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone and name are required'
      });
    }

    // Validate phone number (should be 10 digits)
    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be 10 digits'
      });
    }

    const testPartner = {
      _id: 'test_partner_id',
      name: name,
      email: 'test@partner.com',
      phone: phone
    };

    const result = await notificationService.sendTestWhatsApp(testPartner);
    
    res.json({
      success: result.success,
      message: result.success ? 'Test WhatsApp sent successfully!' : 'Failed to send test WhatsApp',
      data: result
    });

  } catch (error) {
    console.error('Test WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending test WhatsApp',
      error: error.message
    });
  }
});

// Test all notifications
router.post('/test-all', auth, async (req, res) => {
  try {
    const { email, phone, name } = req.body;
    
    if (!email || !phone || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, phone, and name are required'
      });
    }

    const testPartner = {
      _id: 'test_partner_id',
      name: name,
      email: email,
      phone: phone
    };

    const results = await notificationService.testNotifications(testPartner, 'all');
    
    res.json({
      success: results.success,
      message: 'Test notifications completed',
      data: results
    });

  } catch (error) {
    console.error('Test all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing notifications',
      error: error.message
    });
  }
});

// Get notification settings
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = {
      email: {
        enabled: process.env.EMAIL_NOTIFICATIONS !== 'false',
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
      },
      sms: {
        enabled: process.env.SMS_NOTIFICATIONS !== 'false',
        configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
      },
      whatsapp: {
        enabled: process.env.WHATSAPP_ENABLED === 'true',
        configured: !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
      }
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting notification settings',
      error: error.message
    });
  }
});

// Send bulk notification to all partners
router.post('/bulk', auth, async (req, res) => {
  try {
    const { message, type = 'info' } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const result = await notificationService.notifyAllPartners(message, type);
    
    res.json({
      success: result.success,
      message: result.success ? 'Bulk notification sent successfully!' : 'Failed to send bulk notification',
      data: result
    });

  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending bulk notification',
      error: error.message
    });
  }
});

module.exports = router; 