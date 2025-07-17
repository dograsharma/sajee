const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();

// Initialize Firebase Admin (if credentials are provided)
let firebaseInitialized = false;

try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized');
  } else {
    console.log('⚠️  Firebase credentials not provided, notifications will be mocked');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error);
}

// Store device tokens (in production, use database)
const deviceTokens = new Map();
const subscriptions = new Map();

// Register device token for push notifications
router.post('/register', (req, res) => {
  try {
    const { token, userId, preferences } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    // Store device token
    const deviceId = userId || `device_${Date.now()}`;
    deviceTokens.set(deviceId, {
      token,
      registeredAt: new Date().toISOString(),
      preferences: preferences || {
        dailyAffirmations: true,
        sessionReminders: true,
        moodCheckIns: true,
        crisisAlerts: true
      }
    });

    res.json({
      success: true,
      deviceId,
      message: 'Device registered for notifications',
      preferences: deviceTokens.get(deviceId).preferences
    });

  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ 
      error: 'Failed to register device',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update notification preferences
router.put('/preferences/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { preferences } = req.body;

    const device = deviceTokens.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Update preferences
    device.preferences = { ...device.preferences, ...preferences };
    device.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      preferences: device.preferences,
      message: 'Notification preferences updated'
    });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ 
      error: 'Failed to update preferences',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send daily affirmation notification
router.post('/send-affirmation', async (req, res) => {
  try {
    const { deviceId, affirmation, category } = req.body;

    if (!affirmation) {
      return res.status(400).json({ error: 'Affirmation content is required' });
    }

    const notification = {
      title: '🌟 Daily Affirmation',
      body: affirmation,
      data: {
        type: 'affirmation',
        category: category || 'general',
        timestamp: new Date().toISOString()
      }
    };

    let result;
    if (deviceId) {
      // Send to specific device
      result = await sendNotificationToDevice(deviceId, notification);
    } else {
      // Send to all devices with affirmation preference enabled
      result = await sendNotificationToAll(notification, 'dailyAffirmations');
    }

    res.json({
      success: true,
      result,
      message: 'Daily affirmation sent'
    });

  } catch (error) {
    console.error('Error sending affirmation:', error);
    res.status(500).json({ 
      error: 'Failed to send affirmation',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send session reminder
router.post('/send-reminder', async (req, res) => {
  try {
    const { deviceId, sessionDetails, reminderType } = req.body;

    if (!deviceId || !sessionDetails) {
      return res.status(400).json({ error: 'Device ID and session details are required' });
    }

    const { therapistName, datetime, meetingLink } = sessionDetails;
    const sessionTime = new Date(datetime);
    const timeUntil = Math.round((sessionTime - new Date()) / (1000 * 60)); // minutes

    let title, body;
    if (reminderType === 'immediate') {
      title = '🔔 Session Starting Soon';
      body = `Your session with ${therapistName} starts in 5 minutes. Tap to join.`;
    } else {
      title = '📅 Upcoming Session Reminder';
      body = `Your session with ${therapistName} is in ${timeUntil} minutes.`;
    }

    const notification = {
      title,
      body,
      data: {
        type: 'session_reminder',
        reminderType: reminderType || 'advance',
        therapistName,
        datetime,
        meetingLink,
        timestamp: new Date().toISOString()
      }
    };

    const result = await sendNotificationToDevice(deviceId, notification);

    res.json({
      success: true,
      result,
      message: 'Session reminder sent'
    });

  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ 
      error: 'Failed to send reminder',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send mood check-in reminder
router.post('/send-mood-reminder', async (req, res) => {
  try {
    const { deviceId, customMessage } = req.body;

    const notification = {
      title: '💭 How are you feeling?',
      body: customMessage || 'Take a moment to check in with your emotions. Your mental health matters.',
      data: {
        type: 'mood_checkin',
        timestamp: new Date().toISOString()
      }
    };

    let result;
    if (deviceId) {
      result = await sendNotificationToDevice(deviceId, notification);
    } else {
      result = await sendNotificationToAll(notification, 'moodCheckIns');
    }

    res.json({
      success: true,
      result,
      message: 'Mood check-in reminder sent'
    });

  } catch (error) {
    console.error('Error sending mood reminder:', error);
    res.status(500).json({ 
      error: 'Failed to send mood reminder',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send crisis alert notification
router.post('/send-crisis-alert', async (req, res) => {
  try {
    const { deviceId, resources, supportMessage } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required for crisis alerts' });
    }

    const notification = {
      title: '🆘 Support Resources Available',
      body: supportMessage || 'We\'re here to help. Immediate support resources are available.',
      data: {
        type: 'crisis_alert',
        resources: JSON.stringify(resources || [
          { name: 'Crisis Text Line', contact: 'Text HOME to 741741' },
          { name: 'National Suicide Prevention Lifeline', contact: '988' }
        ]),
        timestamp: new Date().toISOString(),
        priority: 'high'
      }
    };

    const result = await sendNotificationToDevice(deviceId, notification, true); // High priority

    res.json({
      success: true,
      result,
      message: 'Crisis alert sent'
    });

  } catch (error) {
    console.error('Error sending crisis alert:', error);
    res.status(500).json({ 
      error: 'Failed to send crisis alert',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Send custom notification
router.post('/send-custom', async (req, res) => {
  try {
    const { deviceId, title, body, data, priority } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const notification = {
      title,
      body,
      data: {
        type: 'custom',
        ...data,
        timestamp: new Date().toISOString()
      }
    };

    let result;
    if (deviceId) {
      result = await sendNotificationToDevice(deviceId, notification, priority === 'high');
    } else {
      result = await sendNotificationToAll(notification);
    }

    res.json({
      success: true,
      result,
      message: 'Custom notification sent'
    });

  } catch (error) {
    console.error('Error sending custom notification:', error);
    res.status(500).json({ 
      error: 'Failed to send custom notification',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get notification history for a device
router.get('/history/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // In production, fetch from database
    // For now, return mock history
    const history = [
      {
        id: 'notif_001',
        type: 'affirmation',
        title: '🌟 Daily Affirmation',
        body: 'You are worthy of love and respect just as you are.',
        sentAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: 'delivered'
      },
      {
        id: 'notif_002',
        type: 'mood_checkin',
        title: '💭 How are you feeling?',
        body: 'Take a moment to check in with your emotions.',
        sentAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        status: 'delivered'
      }
    ].slice(0, limit);

    res.json({
      deviceId,
      history,
      total: history.length
    });

  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notification history',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Schedule recurring notifications
router.post('/schedule', (req, res) => {
  try {
    const { deviceId, type, schedule, content } = req.body;

    if (!deviceId || !type || !schedule) {
      return res.status(400).json({ 
        error: 'Device ID, notification type, and schedule are required' 
      });
    }

    // Store scheduled notification (in production, use a job queue)
    const scheduleId = `schedule_${Date.now()}`;
    subscriptions.set(scheduleId, {
      deviceId,
      type,
      schedule, // e.g., "daily", "weekly", "custom"
      content,
      createdAt: new Date().toISOString(),
      active: true
    });

    res.json({
      success: true,
      scheduleId,
      message: `${type} notifications scheduled for ${schedule}`,
      schedule: subscriptions.get(scheduleId)
    });

  } catch (error) {
    console.error('Error scheduling notifications:', error);
    res.status(500).json({ 
      error: 'Failed to schedule notifications',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Unsubscribe from notifications
router.delete('/unsubscribe/:scheduleId', (req, res) => {
  try {
    const { scheduleId } = req.params;

    if (subscriptions.has(scheduleId)) {
      subscriptions.delete(scheduleId);
      res.json({
        success: true,
        message: 'Successfully unsubscribed from notifications'
      });
    } else {
      res.status(404).json({ error: 'Subscription not found' });
    }

  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ 
      error: 'Failed to unsubscribe',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to send notification to specific device
async function sendNotificationToDevice(deviceId, notification, highPriority = false) {
  const device = deviceTokens.get(deviceId);
  
  if (!device) {
    throw new Error('Device not found');
  }

  if (!firebaseInitialized) {
    console.log('📱 Mock notification sent:', { deviceId, notification });
    return {
      success: true,
      mock: true,
      deviceId,
      notification
    };
  }

  try {
    const message = {
      token: device.token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: notification.data,
      android: {
        priority: highPriority ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channelId: 'sanjeevani_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('📱 Notification sent successfully:', response);

    return {
      success: true,
      messageId: response,
      deviceId
    };

  } catch (error) {
    console.error('Firebase notification error:', error);
    
    // If token is invalid, remove it
    if (error.code === 'messaging/registration-token-not-registered') {
      deviceTokens.delete(deviceId);
    }
    
    throw error;
  }
}

// Helper function to send notification to all devices with specific preference
async function sendNotificationToAll(notification, preferenceType = null) {
  const results = [];
  
  for (const [deviceId, device] of deviceTokens.entries()) {
    // Check preference if specified
    if (preferenceType && !device.preferences[preferenceType]) {
      continue;
    }

    try {
      const result = await sendNotificationToDevice(deviceId, notification);
      results.push({ deviceId, success: true, result });
    } catch (error) {
      results.push({ deviceId, success: false, error: error.message });
    }
  }

  return {
    totalSent: results.filter(r => r.success).length,
    totalFailed: results.filter(r => !r.success).length,
    results
  };
}

module.exports = router;