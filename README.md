# 🌟 Sanjeevani - Anonymous Mental Health Support Platform

A comprehensive, privacy-first mental health support platform built for hackathons and real-world deployment. Features anonymous community posting, AI-powered chatbot support, mood tracking, journaling, affirmations, and professional therapy booking with payment integration.

## ✨ Features

### 🔐 Privacy-First Design
- **Anonymous Sessions**: No registration required, UUID-based session management
- **Ephemeral Data**: Posts expire after 1 hour, journal entries after 24 hours
- **No Personal Tracking**: Complete anonymity maintained throughout
- **Crisis Support**: Always available emergency resources

### 🤖 AI-Powered Support
- **OpenAI Integration**: GPT-powered empathetic chatbot responses
- **Content Moderation**: Automatic content scanning using OpenAI Moderation API
- **Crisis Detection**: Real-time analysis for crisis keywords and emotional distress
- **Sentiment Analysis**: Google Cloud Natural Language API integration with fallback

### 🏥 Core Features
1. **Anonymous Community Posting**: Share feelings safely with AI moderation
2. **AI Chatbot Support**: 24/7 empathetic responses with crisis intervention
3. **Guided Journaling**: AI-generated prompts with session-based storage
4. **Daily Affirmations**: Categorized positive messages with daily rotation
5. **Mood Tracking**: Emoji-based mood check-ins with analytics
6. **Therapy Booking**: Professional therapist booking with Stripe payments
7. **Push Notifications**: Firebase Cloud Messaging for reminders and support

### 💳 Payment & Booking
- **Stripe Integration**: Secure payment processing for therapy sessions
- **Google Calendar**: Automated appointment scheduling
- **Email Confirmations**: Automated booking confirmations
- **Refund Support**: Built-in cancellation and refund handling

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Redis server (for in-memory storage)
- API keys for:
  - OpenAI (GPT and Moderation APIs)
  - Stripe (payment processing)
  - Google Cloud (sentiment analysis, optional)
  - Firebase (push notifications, optional)

### 1. Clone and Install
```bash
git clone <repository-url>
cd sanjeevani
npm run install-all
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Stripe Configuration  
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Optional: Google Cloud, Firebase, Email
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
EMAIL_USER=your_email_here
EMAIL_PASS=your_email_password_here
```

### 3. Start Redis Server
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally (macOS)
brew install redis
redis-server

# Ubuntu/Debian
sudo apt-get install redis-server
sudo service redis-server start
```

### 4. Update Stripe Key
Edit `client/src/index.js` and replace the Stripe publishable key:
```javascript
const stripePromise = loadStripe('your_stripe_publishable_key_here');
```

### 5. Run the Application
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or run separately
npm run server  # Backend on :5000
npm run client  # Frontend on :3000
```

## 📁 Project Structure

```
sanjeevani/
├── server/                 # Node.js/Express backend
│   ├── index.js           # Main server entry point
│   ├── routes/            # API route handlers
│   │   ├── posts.js       # Anonymous community posts
│   │   ├── chat.js        # AI chatbot support
│   │   ├── journal.js     # Guided journaling
│   │   ├── affirmations.js # Daily affirmations
│   │   ├── mood.js        # Mood tracking & analytics
│   │   ├── booking.js     # Therapy booking & payments
│   │   └── notifications.js # Push notifications
│   └── services/          # External service integrations
│       ├── redis.js       # Redis data management
│       └── openai.js      # OpenAI API integration
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── contexts/      # React contexts (Session management)
│   │   └── utils/         # API utilities and helpers
│   └── public/            # Static assets
├── package.json           # Root package configuration
└── README.md             # This file
```

## 🔌 API Endpoints

### Community Posts
- `POST /api/posts` - Create anonymous post
- `GET /api/posts` - Get recent posts feed
- `POST /api/posts/:id/support` - Add support to post
- `GET /api/posts/stats` - Community statistics

### AI Chat Support
- `POST /api/chat/message` - Send message to AI
- `GET /api/chat/history/:sessionId` - Get chat history
- `GET /api/chat/breathing-exercise` - Get breathing exercise
- `GET /api/chat/grounding` - Get grounding technique

### Journaling
- `POST /api/journal/entry` - Create journal entry
- `GET /api/journal/entries/:sessionId` - Get user entries
- `GET /api/journal/prompt` - Get AI-generated prompt
- `GET /api/journal/prompts` - Get multiple prompts

### Affirmations
- `GET /api/affirmations/daily` - Today's affirmation
- `GET /api/affirmations/random/:category` - Random by category
- `GET /api/affirmations/mood/:mood` - Mood-based affirmation
- `GET /api/affirmations/categories` - Available categories

### Mood Tracking
- `POST /api/mood/checkin` - Record mood entry
- `GET /api/mood/history/:sessionId` - Mood history
- `GET /api/mood/analytics/:sessionId` - Mood analytics
- `GET /api/mood/options` - Available mood options

### Therapy Booking
- `GET /api/booking/therapists` - Available therapists
- `GET /api/booking/therapists/:id/slots` - Available time slots
- `POST /api/booking/intent` - Create payment intent
- `POST /api/booking/confirm` - Confirm booking
- `GET /api/booking/booking/:id` - Get booking details

## 🔒 Privacy & Security Features

### Data Retention
- **Posts**: 1-hour TTL (automatically expire)
- **Journal Entries**: 24-hour TTL (session-based)
- **Mood Data**: 30-day TTL (trend analysis)
- **Chat History**: 1-hour TTL (conversation context)

### AI Moderation
- **Content Filtering**: OpenAI Moderation API for all user content
- **Crisis Detection**: Automatic detection of crisis keywords
- **Fallback Moderation**: Local keyword-based filtering if API unavailable
- **Support Resources**: Immediate crisis resources when needed

### Anonymous Architecture
- **No User Accounts**: UUID-based session management
- **Ephemeral Storage**: Redis with TTL for all data
- **No Cross-Session Tracking**: Each session is isolated
- **Privacy-First APIs**: No personal data stored or transmitted

## 🚨 Crisis Intervention

The platform includes comprehensive crisis intervention:

### Automatic Detection
- Crisis keywords monitoring
- Emotional distress indicators
- Real-time content analysis

### Immediate Response
- Crisis hotline information (988, Crisis Text Line)
- Breathing exercises and grounding techniques
- Professional therapy booking options
- Emergency services contact (911)

### Always Available
- Fixed crisis support button on all pages
- Global crisis resources in footer
- Embedded emergency contacts in HTML

## 🎨 UI/UX Features

### Modern Design
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Consistent icon system
- **Responsive Design**: Mobile-first approach

### Accessibility
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Clear focus indicators

### User Experience
- **Loading States**: Smooth loading indicators
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Real-time feedback
- **Progressive Enhancement**: Works without JavaScript

## 🔧 Development

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests  
cd client && npm test
```

### Building for Production
```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🌐 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
REDIS_URL=your-production-redis-url
# ... other production configs
```

### Recommended Infrastructure
- **Frontend**: Vercel, Netlify, or CDN
- **Backend**: Railway, Heroku, or VPS
- **Database**: Redis Cloud or AWS ElastiCache
- **CDN**: Cloudflare for global performance

## 🤝 Contributing

This project was built for hackathons with scalability in mind. Key areas for contribution:

1. **Additional AI Integrations**: More sentiment analysis providers
2. **Enhanced UI Components**: Additional interactive elements
3. **Therapy Provider Integrations**: More booking platforms
4. **Internationalization**: Multi-language support
5. **Mobile App**: React Native implementation

## 📄 License

MIT License - feel free to use this project for hackathons, personal projects, or commercial applications.

## 🆘 Support & Crisis Resources

### Immediate Help
- **National Suicide Prevention Lifeline**: 988 (call or text)
- **Crisis Text Line**: Text HOME to 741741
- **Emergency Services**: 911

### Online Resources
- [Crisis Text Line](https://www.crisistextline.org/)
- [National Suicide Prevention Lifeline](https://suicidepreventionlifeline.org/)
- [Mental Health America](https://www.mhanational.org/)

---

**Remember: You are not alone. Help is always available. 💙**

Built with ❤️ for mental health awareness and support.
