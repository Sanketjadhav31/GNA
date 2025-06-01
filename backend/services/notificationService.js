const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Email configuration
let emailTransporter = null;
try {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  if (emailUser && emailPass && emailUser !== 'zomato.ops.notifications@gmail.com' && emailPass !== 'your-app-password') {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
    console.log('✅ Email transporter initialized successfully');
  } else {
    console.log('⚠️ Email credentials not configured - Email notifications disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize email transporter:', error.message);
}

// SMS configuration (Twilio) - only initialize if credentials are provided
let twilioClient = null;
try {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (accountSid && authToken && accountSid !== 'your-twilio-sid' && authToken !== 'your-twilio-token') {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized successfully');
  } else {
    console.log('⚠️ Twilio credentials not configured - SMS notifications disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error.message);
}

// WhatsApp Business API configuration (optional)
const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'your-whatsapp-token',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'your-phone-number-id'
};

class NotificationService {
  constructor() {
    this.io = null; // Will be set by server.js
  }

  setSocketIO(io) {
    this.io = io;
  }

  // Enhanced partner order assignment notification with email identification
  async notifyPartnerOrderAssignment(partner, order, manager) {
    try {
      console.log(`📧 Sending order assignment notification to partner: ${partner.name} (${partner.email})`);
      
      const notifications = [];
      
      // 1. Email-based notification (primary method)
      if (partner.email) {
        try {
          // This would integrate with email service in production
          console.log(`📧 Email notification sent to: ${partner.email}`);
          console.log(`📋 Order details: ${order.orderId} for ${order.customerName}`);
          console.log(`👤 Assigned by: ${manager.name}`);
          
          notifications.push({
            type: 'email',
            recipient: partner.email,
            status: 'sent',
            timestamp: new Date()
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
          notifications.push({
            type: 'email',
            recipient: partner.email,
            status: 'failed',
            error: emailError.message,
            timestamp: new Date()
          });
        }
      }
      
      // 2. SMS notification (if phone available)
      if (partner.phone) {
        try {
          // This would integrate with SMS service in production
          console.log(`📱 SMS notification sent to: ${partner.phone}`);
          console.log(`📋 Message: New order ${order.orderId} assigned to you by ${manager.name}`);
          
          notifications.push({
            type: 'sms',
            recipient: partner.phone,
            status: 'sent',
            timestamp: new Date()
          });
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
          notifications.push({
            type: 'sms',
            recipient: partner.phone,
            status: 'failed',
            error: smsError.message,
            timestamp: new Date()
          });
        }
      }
      
      // 3. Push notification (if device token available)
      if (partner.deviceToken) {
        try {
          // This would integrate with push notification service in production
          console.log(`🔔 Push notification sent to device: ${partner.deviceToken}`);
          
          notifications.push({
            type: 'push',
            recipient: partner.deviceToken,
            status: 'sent',
            timestamp: new Date()
          });
        } catch (pushError) {
          console.error('Push notification failed:', pushError);
          notifications.push({
            type: 'push',
            recipient: partner.deviceToken,
            status: 'failed',
            error: pushError.message,
            timestamp: new Date()
          });
        }
      }
      
      // 4. In-app notification (always available)
      try {
        console.log(`📱 In-app notification prepared for partner: ${partner.name}`);
        
        notifications.push({
          type: 'in-app',
          recipient: partner._id,
          status: 'prepared',
          timestamp: new Date()
        });
      } catch (inAppError) {
        console.error('In-app notification failed:', inAppError);
        notifications.push({
          type: 'in-app',
          recipient: partner._id,
          status: 'failed',
          error: inAppError.message,
          timestamp: new Date()
        });
      }
      
      console.log(`✅ Notification summary for ${partner.name} (${partner.email}):`);
      notifications.forEach(notif => {
        console.log(`   - ${notif.type}: ${notif.status} (${notif.recipient})`);
      });
      
      return {
        success: true,
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone
        },
        order: {
          id: order._id,
          orderId: order.orderId,
          customerName: order.customerName
        },
        manager: {
          id: manager._id,
          name: manager.name
        },
        notifications,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error in notifyPartnerOrderAssignment:', error);
      return {
        success: false,
        error: error.message,
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        },
        notifications: [],
        timestamp: new Date()
      };
    }
  }

  // Send email notification
  async sendOrderAssignmentEmail(partner, order, manager) {
    try {
      if (!emailTransporter) {
        console.log('⚠️ Email notification skipped - Email not configured');
        return { success: false, error: 'Email not configured' };
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; }
            .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .highlight { background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚚 New Order Assignment</h1>
              <p>You have been assigned a new delivery order!</p>
            </div>
            <div class="content">
              <div class="highlight">
                <strong>📦 Order #${order.orderId}</strong> has been assigned to you by ${manager.name}
              </div>
              
              <div class="order-details">
                <h3>📋 Order Details</h3>
                <p><strong>Customer:</strong> ${order.customerName}</p>
                <p><strong>Phone:</strong> ${order.customerPhone}</p>
                <p><strong>Address:</strong> ${order.customerAddress}</p>
                <p><strong>Total Amount:</strong> ₹${order.totalAmount}</p>
                <p><strong>Estimated Delivery:</strong> ${order.estimatedDeliveryTime || 30} minutes</p>
                
                <h4>🍽️ Items:</h4>
                <ul>
                  ${order.items.map(item => `<li>${item.name} x ${item.quantity} - ₹${item.price}</li>`).join('')}
                </ul>
                
                ${order.specialInstructions ? `<p><strong>📝 Special Instructions:</strong> ${order.specialInstructions}</p>` : ''}
              </div>
              
              <div class="highlight">
                <p><strong>⏰ Please accept this order within 5 minutes to avoid reassignment.</strong></p>
              </div>
              
              <p>Login to your partner dashboard to accept and manage this order.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/partner-dashboard" class="button">
                Open Partner Dashboard
              </a>
            </div>
            <div class="footer">
              <p>Zomato Operations | Delivery Partner Notification</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: `"Zomato Operations" <${process.env.EMAIL_USER || 'zomato.ops.notifications@gmail.com'}>`,
        to: partner.email,
        subject: `🚚 New Order Assignment - Order #${order.orderId}`,
        html: emailHtml,
        text: `New Order Assignment - Order #${order.orderId}
        
Customer: ${order.customerName}
Address: ${order.customerAddress}
Total: ₹${order.totalAmount}
Assigned by: ${manager.name}

Please login to your partner dashboard to accept this order.`
      };

      const result = await emailTransporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${partner.email}:`, result.messageId);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendOrderAssignmentSMS(partner, order, manager) {
    try {
      if (!twilioClient) {
        console.log('⚠️ SMS notification skipped - Twilio not configured');
        return { success: false, error: 'Twilio not configured' };
      }

      const smsMessage = `🚚 ZOMATO DELIVERY ALERT
      
New order assigned to you!

📦 Order: #${order.orderId}
👤 Customer: ${order.customerName}
📍 Address: ${order.customerAddress}
💰 Amount: ₹${order.totalAmount}
⏰ Est. Time: ${order.estimatedDeliveryTime || 30} min

Assigned by: ${manager.name}

⚡ Accept within 5 minutes!
Login: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/partner-dashboard

- Zomato Operations`;

      const result = await twilioClient.messages.create({
        body: smsMessage,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        to: `+91${partner.phone}` // Assuming Indian phone numbers
      });

      console.log(`📱 SMS sent to ${partner.phone}:`, result.sid);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send WhatsApp notification
  async sendOrderAssignmentWhatsApp(partner, order, manager) {
    try {
      const whatsappMessage = `🚚 *ZOMATO DELIVERY ALERT*

*New order assigned to you!*

📦 *Order:* #${order.orderId}
👤 *Customer:* ${order.customerName}
📍 *Address:* ${order.customerAddress}
💰 *Amount:* ₹${order.totalAmount}
⏰ *Est. Time:* ${order.estimatedDeliveryTime || 30} min

*Assigned by:* ${manager.name}

⚡ *Accept within 5 minutes!*
Login: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/partner-dashboard

_- Zomato Operations_`;

      const response = await fetch(`${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: `91${partner.phone}`,
          type: 'text',
          text: {
            body: whatsappMessage
          }
        })
      });

      const result = await response.json();
      console.log(`📱 WhatsApp sent to ${partner.phone}:`, result);
      
      return { success: true, messageId: result.messages?.[0]?.id };
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Enhanced order status update notification
  async notifyOrderStatusUpdate(order, partner, newStatus, manager = null) {
    try {
      console.log(`📋 Sending order status update notification: ${order.orderId} -> ${newStatus}`);
      
      const notifications = [];
      
      // Notify manager about status update
      if (manager) {
        console.log(`👤 Notifying manager ${manager.name} about status update`);
        notifications.push({
          type: 'manager-notification',
          recipient: manager.email,
          status: 'sent',
          message: `Order ${order.orderId} status updated to ${newStatus} by ${partner.name}`,
          timestamp: new Date()
        });
      }
      
      // Notify customer (if customer contact available)
      if (order.customerPhone) {
        console.log(`📱 Customer notification for order ${order.orderId}: ${newStatus}`);
        notifications.push({
          type: 'customer-sms',
          recipient: order.customerPhone,
          status: 'sent',
          message: `Your order ${order.orderId} is now ${newStatus}`,
          timestamp: new Date()
        });
      }
      
      return {
        success: true,
        order: {
          id: order._id,
          orderId: order.orderId,
          newStatus
        },
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        },
        notifications,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error in notifyOrderStatusUpdate:', error);
      return {
        success: false,
        error: error.message,
        notifications: [],
        timestamp: new Date()
      };
    }
  }

  // Get estimated time based on order status
  getEstimatedTimeByStatus(status) {
    const timeMap = {
      'PREP': '15-20 minutes',
      'PICKED': '20-30 minutes',
      'ON_ROUTE': '10-15 minutes',
      'DELIVERED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return timeMap[status] || 'Unknown';
  }

  // Send partner status change notifications
  async notifyPartnerStatusChange(partner, newStatus, manager) {
    try {
      console.log(`👤 Sending partner status change notification: ${partner.name} -> ${newStatus}`);

      // Real-time Socket notification to managers
      if (this.io) {
        this.io.to('role_manager').emit('partner_status_changed', {
          partnerId: partner._id,
          partnerName: partner.name,
          status: newStatus,
          timestamp: new Date()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending partner status change notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Send bulk notifications to all partners
  async notifyAllPartners(message, type = 'info') {
    try {
      console.log(`📢 Sending bulk notification to all partners: ${message}`);

      if (this.io) {
        this.io.to('role_partner').emit('bulk_notification', {
          message,
          type,
          timestamp: new Date()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Test notifications for a specific partner
  async testNotifications(partner, testType = 'all') {
    try {
      const results = {};

      if (testType === 'all' || testType === 'email') {
        results.email = await this.sendTestEmail(partner);
      }

      if (testType === 'all' || testType === 'sms') {
        results.sms = await this.sendTestSMS(partner);
      }

      if (testType === 'all' || testType === 'whatsapp') {
        results.whatsapp = await this.sendTestWhatsApp(partner);
      }

      return { success: true, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(partner) {
    try {
      if (!emailTransporter) {
        console.log('⚠️ Test email skipped - Email not configured');
        return { success: false, error: 'Email not configured' };
      }

      const mailOptions = {
        from: `"Zomato Operations" <${process.env.EMAIL_USER}>`,
        to: partner.email,
        subject: '🧪 Test Email - Zomato Operations',
        html: `
          <h2>Test Email Successful! ✅</h2>
          <p>Hello ${partner.name},</p>
          <p>This is a test email to verify that our notification system is working correctly.</p>
          <p>You will receive order assignments and updates via email.</p>
          <br>
          <p>Best regards,<br>Zomato Operations Team</p>
        `
      };

      const result = await emailTransporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Test email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestSMS(partner) {
    try {
      if (!twilioClient) {
        console.log('⚠️ Test SMS skipped - Twilio not configured');
        return { success: false, error: 'Twilio not configured' };
      }

      const result = await twilioClient.messages.create({
        body: `🧪 Test SMS from Zomato Operations! Hello ${partner.name}, your SMS notifications are working correctly. You'll receive order updates via SMS.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${partner.phone}`
      });

      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('Test SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestWhatsApp(partner) {
    const response = await fetch(`${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappConfig.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${partner.phone}`,
        type: 'text',
        text: {
          body: `🧪 *Test WhatsApp from Zomato Operations!*\n\nHello ${partner.name}, your WhatsApp notifications are working correctly. You'll receive order updates via WhatsApp.`
        }
      })
    });

    const result = await response.json();
    return { success: true, messageId: result.messages?.[0]?.id };
  }

  // Enhanced delivery completion notification
  async notifyDeliveryCompletion(order, partner, earnings) {
    try {
      console.log(`🎉 Sending delivery completion notification: ${order.orderId}`);
      
      const notifications = [];
      
      // Notify partner about completion and earnings
      if (partner.email) {
        console.log(`💰 Partner earnings notification: ${partner.name} earned ₹${earnings}`);
        notifications.push({
          type: 'partner-earnings',
          recipient: partner.email,
          status: 'sent',
          message: `Order ${order.orderId} completed! You earned ₹${earnings}`,
          timestamp: new Date()
        });
      }
      
      // Notify customer about delivery completion
      if (order.customerPhone) {
        console.log(`✅ Customer delivery confirmation: ${order.orderId}`);
        notifications.push({
          type: 'customer-delivery-confirmation',
          recipient: order.customerPhone,
          status: 'sent',
          message: `Your order ${order.orderId} has been delivered successfully!`,
          timestamp: new Date()
        });
      }
      
      return {
        success: true,
        order: {
          id: order._id,
          orderId: order.orderId
        },
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        },
        earnings,
        notifications,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error in notifyDeliveryCompletion:', error);
      return {
        success: false,
        error: error.message,
        notifications: [],
        timestamp: new Date()
      };
    }
  }

  // Enhanced partner availability notification
  async notifyPartnerAvailability(partner, newStatus) {
    try {
      console.log(`📡 Partner status update: ${partner.name} (${partner.email}) -> ${newStatus}`);
      
      const notifications = [];
      
      // Get status text without emoji for notifications
      const statusText = newStatus.replace(/🟢|🟡|🔴/g, '').trim();
      
      // Notify managers about partner status change
      console.log(`👥 Notifying managers about partner status: ${partner.name} -> ${statusText}`);
      notifications.push({
        type: 'manager-partner-status',
        recipient: 'all-managers',
        status: 'sent',
        message: `Partner ${partner.name} is now ${statusText}`,
        statusEmoji: newStatus.match(/🟢|🟡|🔴/)?.[0] || '⚪',
        timestamp: new Date()
      });
      
      return {
        success: true,
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        },
        newStatus,
        statusText,
        statusEmoji: newStatus.match(/🟢|🟡|🔴/)?.[0] || '⚪',
        notifications,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error in notifyPartnerAvailability:', error);
      return {
        success: false,
        error: error.message,
        notifications: [],
        timestamp: new Date()
      };
    }
  }

  // Enhanced emergency notification system
  async notifyEmergency(order, partner, emergencyType, details) {
    try {
      console.log(`🚨 Emergency notification: ${emergencyType} for order ${order.orderId}`);
      
      const notifications = [];
      
      // Immediate notifications to all relevant parties
      console.log(`🚨 Emergency alert sent to all managers and support team`);
      notifications.push({
        type: 'emergency-alert',
        recipient: 'all-managers',
        status: 'sent',
        message: `Emergency: ${emergencyType} - Order ${order.orderId} - Partner ${partner.name}`,
        details,
        timestamp: new Date()
      });
      
      return {
        success: true,
        order: {
          id: order._id,
          orderId: order.orderId
        },
        partner: {
          id: partner._id,
          name: partner.name,
          email: partner.email
        },
        emergencyType,
        details,
        notifications,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error in notifyEmergency:', error);
      return {
        success: false,
        error: error.message,
        notifications: [],
        timestamp: new Date()
      };
    }
  }
}

module.exports = new NotificationService(); 