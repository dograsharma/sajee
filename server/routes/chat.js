const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redisService = require('../services/redis');
const openaiService = require('../services/openai');

const router = express.Router();

// Initialize Redis connection
(async () => {
  try {
    await redisService.connect();
  } catch (error) {
    console.error('Failed to connect to Redis for chat:', error);
  }
})();

// Send a message to the AI chatbot
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message must be 1000 characters or less' });
    }

    // Get or create session ID
    const chatSessionId = sessionId || uuidv4();

    // Moderate user message
    const moderation = await openaiService.moderateContent(message);
    
    if (!moderation.safe) {
      return res.status(400).json({ 
        error: 'Message violates community guidelines',
        details: 'Your message contains content that may be harmful. Please revise and try again.',
        blocked: true
      });
    }

    // Check for crisis indicators
    const crisisDetection = openaiService.detectCrisis(message);
    
    // Get chat history for context
    const chatHistory = await redisService.getChatHistory(chatSessionId);
    
    // Save user message
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      crisisDetected: crisisDetection.needsSupport,
      severityLevel: crisisDetection.severity
    };

    await redisService.saveChatMessage(chatSessionId, userMessage);

    // Generate AI response
    const aiResponse = await openaiService.generateChatResponse(
      message,
      chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
      crisisDetection.immediateCrisis
    );

    // Save AI response
    const assistantMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date().toISOString(),
      tokensUsed: aiResponse.tokensUsed || 0,
      fallback: aiResponse.fallback || false
    };

    await redisService.saveChatMessage(chatSessionId, assistantMessage);

    // Prepare response
    const response = {
      sessionId: chatSessionId,
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        timestamp: userMessage.timestamp
      },
      aiResponse: {
        id: assistantMessage.id,
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp
      }
    };

    // Add crisis resources if needed
    if (crisisDetection.immediateCrisis) {
      response.crisisAlert = {
        severity: 'high',
        message: "I'm concerned about what you've shared. Please know that immediate help is available.",
        resources: [
          {
            name: "National Suicide Prevention Lifeline",
            phone: "988",
            text: "Call or text",
            available: "24/7"
          },
          {
            name: "Crisis Text Line",
            text: "Text HOME to 741741",
            available: "24/7"
          },
          {
            name: "Emergency Services",
            phone: "911",
            note: "For immediate danger"
          }
        ],
        copingStrategies: [
          "Take slow, deep breaths - in for 4, hold for 4, out for 6",
          "Try grounding: name 5 things you can see, 4 you can touch, 3 you can hear",
          "Reach out to a trusted friend or family member",
          "Consider going to a safe place with other people"
        ]
      };
    } else if (crisisDetection.emotionalDistress) {
      response.supportResources = {
        message: "I notice you might be going through a difficult time. Here are some resources that might help.",
        resources: [
          {
            name: "Crisis Text Line",
            text: "Text HOME to 741741",
            available: "24/7"
          },
          {
            name: "Mental Health America",
            website: "https://mhanational.org/finding-help",
            note: "Find local resources"
          }
        ],
        copingStrategies: [
          "Try deep breathing exercises",
          "Consider journaling your thoughts",
          "Take a short walk if possible",
          "Listen to calming music"
        ]
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get chat history for a session
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const chatHistory = await redisService.getChatHistory(sessionId);
    
    // Limit and sanitize chat history
    const sanitizedHistory = chatHistory
      .slice(-limit)
      .map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));

    res.json({
      sessionId,
      messages: sanitizedHistory,
      total: sanitizedHistory.length
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat history',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get breathing exercise guidance
router.get('/breathing-exercise', (req, res) => {
  const exercises = [
    {
      name: "4-7-8 Breathing",
      description: "A calming technique to reduce anxiety",
      steps: [
        "Exhale completely through your mouth",
        "Close your mouth and inhale through your nose for 4 counts",
        "Hold your breath for 7 counts",
        "Exhale through your mouth for 8 counts",
        "Repeat 3-4 times"
      ],
      duration: "2-3 minutes"
    },
    {
      name: "Box Breathing",
      description: "Used by Navy SEALs for stress management",
      steps: [
        "Inhale for 4 counts",
        "Hold for 4 counts",
        "Exhale for 4 counts",
        "Hold for 4 counts",
        "Repeat 4-6 times"
      ],
      duration: "2-4 minutes"
    },
    {
      name: "Belly Breathing",
      description: "Deep breathing to activate relaxation response",
      steps: [
        "Place one hand on chest, one on belly",
        "Breathe slowly through your nose",
        "Feel your belly rise while chest stays still",
        "Exhale slowly through pursed lips",
        "Continue for 5-10 breaths"
      ],
      duration: "3-5 minutes"
    }
  ];

  const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];
  
  res.json({
    exercise: randomExercise,
    message: "Here's a breathing exercise that might help you feel more centered.",
    tip: "Find a quiet, comfortable place to practice this exercise."
  });
});

// Get grounding techniques
router.get('/grounding', (req, res) => {
  const techniques = [
    {
      name: "5-4-3-2-1 Technique",
      description: "Use your senses to ground yourself in the present",
      steps: [
        "Name 5 things you can see",
        "Name 4 things you can touch",
        "Name 3 things you can hear",
        "Name 2 things you can smell",
        "Name 1 thing you can taste"
      ],
      type: "sensory"
    },
    {
      name: "Physical Grounding",
      description: "Use physical sensations to anchor yourself",
      steps: [
        "Feel your feet on the ground",
        "Press your palms together firmly",
        "Hold a cold object or ice cube",
        "Stretch your arms above your head",
        "Clench and release your fists"
      ],
      type: "physical"
    },
    {
      name: "Mental Grounding",
      description: "Use your mind to stay present",
      steps: [
        "Count backwards from 100 by 7s",
        "Name all the animals you can think of",
        "Recite the alphabet backwards",
        "Describe your surroundings in detail",
        "Plan your next meal in detail"
      ],
      type: "mental"
    }
  ];

  const randomTechnique = techniques[Math.floor(Math.random() * techniques.length)];
  
  res.json({
    technique: randomTechnique,
    message: "Try this grounding technique to help you feel more present and calm.",
    tip: "Practice these techniques regularly, not just during difficult moments."
  });
});

// Start a new chat session
router.post('/session', (req, res) => {
  const sessionId = uuidv4();
  
  res.json({
    sessionId,
    message: "New chat session created. I'm here to listen and support you.",
    welcomeMessage: "Hi! I'm Sanjeevani, your AI mental health support companion. You can share your feelings with me in complete confidence. How are you doing today?"
  });
});

module.exports = router;