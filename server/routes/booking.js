const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const router = express.Router();

// Email transporter setup
const emailTransporter = nodemailer.createTransporter({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Mock therapist data (in production, this would come from a database)
const therapists = [
  {
    id: 'th_001',
    name: 'Dr. Sarah Johnson',
    specialties: ['Anxiety', 'Depression', 'Trauma'],
    bio: 'Licensed clinical psychologist with 10+ years experience in cognitive behavioral therapy.',
    price: 150, // USD
    duration: 60, // minutes
    availableSlots: generateAvailableSlots('th_001'),
    image: '/images/therapist-1.jpg'
  },
  {
    id: 'th_002',
    name: 'Dr. Michael Chen',
    specialties: ['Couples Therapy', 'Family Therapy', 'Relationship Issues'],
    bio: 'Marriage and family therapist specializing in relationship dynamics and communication.',
    price: 180,
    duration: 75,
    availableSlots: generateAvailableSlots('th_002'),
    image: '/images/therapist-2.jpg'
  },
  {
    id: 'th_003',
    name: 'Dr. Emily Rodriguez',
    specialties: ['Teen Therapy', 'ADHD', 'Behavioral Issues'],
    bio: 'Child and adolescent psychologist with expertise in developmental and behavioral concerns.',
    price: 140,
    duration: 50,
    availableSlots: generateAvailableSlots('th_003'),
    image: '/images/therapist-3.jpg'
  }
];

// Get all available therapists
router.get('/therapists', (req, res) => {
  try {
    const { specialty, priceRange } = req.query;
    
    let filteredTherapists = [...therapists];
    
    // Filter by specialty
    if (specialty) {
      filteredTherapists = filteredTherapists.filter(therapist =>
        therapist.specialties.some(s => 
          s.toLowerCase().includes(specialty.toLowerCase())
        )
      );
    }
    
    // Filter by price range
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      filteredTherapists = filteredTherapists.filter(therapist =>
        therapist.price >= min && therapist.price <= max
      );
    }
    
    // Remove available slots from the response for privacy
    const sanitizedTherapists = filteredTherapists.map(therapist => ({
      id: therapist.id,
      name: therapist.name,
      specialties: therapist.specialties,
      bio: therapist.bio,
      price: therapist.price,
      duration: therapist.duration,
      image: therapist.image,
      nextAvailable: getNextAvailableSlot(therapist.availableSlots)
    }));
    
    res.json({
      therapists: sanitizedTherapists,
      total: sanitizedTherapists.length,
      filters: {
        specialties: [...new Set(therapists.flatMap(t => t.specialties))],
        priceRange: {
          min: Math.min(...therapists.map(t => t.price)),
          max: Math.max(...therapists.map(t => t.price))
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching therapists:', error);
    res.status(500).json({ 
      error: 'Failed to fetch therapists',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get available slots for a specific therapist
router.get('/therapists/:therapistId/slots', (req, res) => {
  try {
    const { therapistId } = req.params;
    const { date, week } = req.query;
    
    const therapist = therapists.find(t => t.id === therapistId);
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist not found' });
    }
    
    let availableSlots = therapist.availableSlots;
    
    // Filter by specific date
    if (date) {
      const targetDate = new Date(date);
      availableSlots = availableSlots.filter(slot => {
        const slotDate = new Date(slot.datetime);
        return slotDate.toDateString() === targetDate.toDateString();
      });
    }
    
    // Filter by week
    if (week) {
      const weekStart = new Date(week);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      availableSlots = availableSlots.filter(slot => {
        const slotDate = new Date(slot.datetime);
        return slotDate >= weekStart && slotDate < weekEnd;
      });
    }
    
    // Group slots by date for easier frontend handling
    const slotsByDate = {};
    availableSlots.forEach(slot => {
      const date = slot.datetime.split('T')[0];
      if (!slotsByDate[date]) {
        slotsByDate[date] = [];
      }
      slotsByDate[date].push({
        id: slot.id,
        time: slot.datetime.split('T')[1].substring(0, 5), // HH:MM format
        datetime: slot.datetime,
        available: slot.available
      });
    });
    
    res.json({
      therapistId,
      therapistName: therapist.name,
      duration: therapist.duration,
      price: therapist.price,
      slots: slotsByDate,
      totalSlots: availableSlots.length
    });
    
  } catch (error) {
    console.error('Error fetching therapist slots:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available slots',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create a booking intent (before payment)
router.post('/intent', async (req, res) => {
  try {
    const { therapistId, slotId, clientEmail, clientName, notes } = req.body;
    
    if (!therapistId || !slotId || !clientEmail || !clientName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['therapistId', 'slotId', 'clientEmail', 'clientName']
      });
    }
    
    const therapist = therapists.find(t => t.id === therapistId);
    if (!therapist) {
      return res.status(404).json({ error: 'Therapist not found' });
    }
    
    const slot = therapist.availableSlots.find(s => s.id === slotId);
    if (!slot || !slot.available) {
      return res.status(400).json({ error: 'Slot not available' });
    }
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: therapist.price * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        therapistId,
        slotId,
        clientEmail,
        clientName,
        notes: notes || ''
      }
    });
    
    // Create booking record (temporary, until payment is confirmed)
    const bookingId = uuidv4();
    const booking = {
      id: bookingId,
      therapistId,
      therapistName: therapist.name,
      slotId,
      datetime: slot.datetime,
      clientEmail,
      clientName,
      notes: notes || '',
      price: therapist.price,
      duration: therapist.duration,
      status: 'pending_payment',
      paymentIntentId: paymentIntent.id,
      createdAt: new Date().toISOString()
    };
    
    // In production, save booking to database
    console.log('Booking intent created:', booking);
    
    res.json({
      bookingId,
      clientSecret: paymentIntent.client_secret,
      booking: {
        id: booking.id,
        therapistName: booking.therapistName,
        datetime: booking.datetime,
        price: booking.price,
        duration: booking.duration,
        status: booking.status
      }
    });
    
  } catch (error) {
    console.error('Error creating booking intent:', error);
    res.status(500).json({ 
      error: 'Failed to create booking intent',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Handle Stripe webhook for payment confirmation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment success
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    await handlePaymentSuccess(paymentIntent);
  }

  res.json({ received: true });
});

// Confirm booking after manual payment verification (for testing)
router.post('/confirm', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' });
    }
    
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }
    
    const result = await handlePaymentSuccess(paymentIntent);
    res.json(result);
    
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ 
      error: 'Failed to confirm booking',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get booking details
router.get('/booking/:bookingId', (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // In production, fetch from database
    // For now, return mock data
    const booking = {
      id: bookingId,
      therapistName: 'Dr. Sarah Johnson',
      datetime: '2024-01-15T14:00:00Z',
      duration: 60,
      price: 150,
      status: 'confirmed',
      clientName: 'Anonymous Client',
      meetingLink: `https://meet.sanjeevani.com/session/${bookingId}`,
      instructions: 'Please join the meeting 5 minutes early. You will receive a reminder email 1 hour before your session.'
    };
    
    res.json({ booking });
    
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ 
      error: 'Failed to fetch booking',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Cancel booking
router.post('/booking/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    
    // In production, update booking status in database
    console.log(`Booking ${bookingId} cancelled. Reason: ${reason || 'Not specified'}`);
    
    // Process refund if within cancellation window
    // This would involve Stripe refund API
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refund: {
        status: 'pending',
        amount: 150,
        estimatedDays: '5-10 business days'
      }
    });
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      error: 'Failed to cancel booking',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to handle successful payment
async function handlePaymentSuccess(paymentIntent) {
  const { therapistId, slotId, clientEmail, clientName, notes } = paymentIntent.metadata;
  
  // Mark slot as booked
  const therapist = therapists.find(t => t.id === therapistId);
  if (therapist) {
    const slot = therapist.availableSlots.find(s => s.id === slotId);
    if (slot) {
      slot.available = false;
      slot.bookedBy = clientEmail;
    }
  }
  
  // Create confirmed booking
  const confirmedBooking = {
    id: uuidv4(),
    therapistId,
    therapistName: therapist.name,
    slotId,
    datetime: therapist.availableSlots.find(s => s.id === slotId).datetime,
    clientEmail,
    clientName,
    notes,
    price: paymentIntent.amount / 100,
    duration: therapist.duration,
    status: 'confirmed',
    paymentIntentId: paymentIntent.id,
    meetingLink: `https://meet.sanjeevani.com/session/${uuidv4()}`,
    createdAt: new Date().toISOString()
  };
  
  // Send confirmation email
  try {
    await sendConfirmationEmail(confirmedBooking);
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError);
  }
  
  // Create calendar event (mock)
  try {
    await createCalendarEvent(confirmedBooking);
  } catch (calendarError) {
    console.error('Failed to create calendar event:', calendarError);
  }
  
  return {
    success: true,
    booking: confirmedBooking
  };
}

// Generate available slots for therapists (mock data)
function generateAvailableSlots(therapistId) {
  const slots = [];
  const now = new Date();
  
  // Generate slots for the next 30 days
  for (let day = 1; day <= 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    // Skip weekends for simplicity
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Generate time slots (9 AM to 5 PM, hourly)
    for (let hour = 9; hour < 17; hour++) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, 0, 0, 0);
      
      slots.push({
        id: `${therapistId}_${slotTime.toISOString()}`,
        datetime: slotTime.toISOString(),
        available: Math.random() > 0.3 // 70% availability rate
      });
    }
  }
  
  return slots;
}

// Get next available slot
function getNextAvailableSlot(slots) {
  const availableSlots = slots.filter(slot => 
    slot.available && new Date(slot.datetime) > new Date()
  );
  
  if (availableSlots.length === 0) return null;
  
  const nextSlot = availableSlots.sort((a, b) => 
    new Date(a.datetime) - new Date(b.datetime)
  )[0];
  
  return {
    datetime: nextSlot.datetime,
    humanReadable: new Date(nextSlot.datetime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
}

// Send confirmation email
async function sendConfirmationEmail(booking) {
  if (!process.env.EMAIL_USER) {
    console.log('Email not configured, skipping confirmation email');
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: booking.clientEmail,
    subject: 'Therapy Session Confirmation - Sanjeevani',
    html: `
      <h2>Your therapy session is confirmed!</h2>
      <p>Dear ${booking.clientName},</p>
      <p>Your therapy session with ${booking.therapistName} has been confirmed.</p>
      
      <h3>Session Details:</h3>
      <ul>
        <li><strong>Date & Time:</strong> ${new Date(booking.datetime).toLocaleString()}</li>
        <li><strong>Duration:</strong> ${booking.duration} minutes</li>
        <li><strong>Therapist:</strong> ${booking.therapistName}</li>
        <li><strong>Meeting Link:</strong> <a href="${booking.meetingLink}">Join Session</a></li>
      </ul>
      
      <h3>Important Notes:</h3>
      <ul>
        <li>Please join the meeting 5 minutes before your scheduled time</li>
        <li>Ensure you have a stable internet connection</li>
        <li>Find a quiet, private space for your session</li>
        <li>You will receive a reminder email 1 hour before your session</li>
      </ul>
      
      <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
      
      <p>Best regards,<br>The Sanjeevani Team</p>
    `
  };

  await emailTransporter.sendMail(mailOptions);
}

// Create calendar event (mock - would integrate with Google Calendar API)
async function createCalendarEvent(booking) {
  console.log('Creating calendar event for booking:', booking.id);
  
  // In production, integrate with Google Calendar API:
  /*
  const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/calendar']
  });
  
  const calendar = google.calendar({ version: 'v3', auth });
  
  const event = {
    summary: `Therapy Session - ${booking.clientName}`,
    description: `Session with ${booking.therapistName}\nMeeting Link: ${booking.meetingLink}`,
    start: {
      dateTime: booking.datetime,
      timeZone: 'America/New_York'
    },
    end: {
      dateTime: new Date(new Date(booking.datetime).getTime() + booking.duration * 60000).toISOString(),
      timeZone: 'America/New_York'
    },
    attendees: [
      { email: booking.clientEmail }
    ]
  };
  
  await calendar.events.insert({
    calendarId: 'primary',
    resource: event
  });
  */
}

module.exports = router;