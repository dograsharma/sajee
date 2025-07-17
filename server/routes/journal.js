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
    console.error('Failed to connect to Redis for journal:', error);
  }
})();

// Create a new journal entry
router.post('/entry', async (req, res) => {
  try {
    const { content, sessionId, mood, prompt } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Content must be 5000 characters or less' });
    }

    // Moderate content (less strict for journaling)
    const moderation = await openaiService.moderateContent(content);
    
    // Only block extremely harmful content for journal entries
    if (moderation.flagged && moderation.categories && 
        (moderation.categories['violence'] || moderation.categories['hate'])) {
      return res.status(400).json({ 
        error: 'Content violates community guidelines',
        details: 'Journal entry contains content that may be harmful. Please revise and try again.',
        blocked: true
      });
    }

    // Check for crisis indicators but don't block the entry
    const crisisDetection = openaiService.detectCrisis(content);

    // Create journal entry
    const entryId = uuidv4();
    const entry = {
      id: entryId,
      content: content.trim(),
      mood: mood || null,
      prompt: prompt || null,
      timestamp: new Date().toISOString(),
      wordCount: content.trim().split(/\s+/).length,
      crisisDetected: crisisDetection.needsSupport,
      severityLevel: crisisDetection.severity
    };

    // Save to Redis with 24-hour TTL (session-based)
    await redisService.saveJournalEntry(sessionId, entryId, entry, 86400); // 24 hours

    // Prepare response
    const response = {
      success: true,
      entry: {
        id: entry.id,
        content: entry.content,
        mood: entry.mood,
        prompt: entry.prompt,
        timestamp: entry.timestamp,
        wordCount: entry.wordCount
      }
    };

    // Add supportive message if crisis detected
    if (crisisDetection.immediateCrisis) {
      response.supportMessage = {
        type: 'crisis',
        message: "Thank you for expressing your feelings. Writing can be healing, but please remember that professional support is available if you need it.",
        resources: [
          {
            name: "National Suicide Prevention Lifeline",
            phone: "988",
            available: "24/7"
          },
          {
            name: "Crisis Text Line",
            text: "HOME to 741741",
            available: "24/7"
          }
        ]
      };
    } else if (crisisDetection.emotionalDistress) {
      response.supportMessage = {
        type: 'support',
        message: "I notice you might be working through some difficult emotions. That takes courage. Remember that it's okay to seek support when you need it.",
        suggestions: [
          "Consider sharing your feelings with a trusted friend",
          "Try some gentle self-care activities",
          "Remember that difficult emotions are temporary"
        ]
      };
    } else {
      response.supportMessage = {
        type: 'encouragement',
        message: "Thank you for taking time to reflect and write. Journaling is a powerful tool for processing emotions and gaining clarity.",
        suggestions: [
          "Try to journal regularly, even if just for a few minutes",
          "Don't worry about perfect writing - focus on expressing yourself",
          "Consider reading past entries to see your growth"
        ]
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ 
      error: 'Failed to create journal entry',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get journal entries for a session
router.get('/entries/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const entries = await redisService.getJournalEntries(sessionId);
    
    // Limit and sanitize entries
    const sanitizedEntries = entries
      .slice(0, limit)
      .map(entry => ({
        id: entry.id,
        content: entry.content,
        mood: entry.mood,
        prompt: entry.prompt,
        timestamp: entry.timestamp,
        wordCount: entry.wordCount
      }));

    // Calculate some basic stats
    const stats = {
      totalEntries: sanitizedEntries.length,
      totalWords: sanitizedEntries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0),
      averageWordsPerEntry: sanitizedEntries.length > 0 
        ? Math.round(sanitizedEntries.reduce((sum, entry) => sum + (entry.wordCount || 0), 0) / sanitizedEntries.length)
        : 0,
      moodTrend: sanitizedEntries
        .filter(entry => entry.mood)
        .slice(0, 10)
        .map(entry => ({ mood: entry.mood, timestamp: entry.timestamp }))
    };

    res.json({
      entries: sanitizedEntries,
      stats,
      sessionId
    });

  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch journal entries',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get a specific journal entry
router.get('/entry/:sessionId/:entryId', async (req, res) => {
  try {
    const { sessionId, entryId } = req.params;

    const entries = await redisService.getJournalEntries(sessionId);
    const entry = entries.find(e => e.id === entryId);

    if (!entry) {
      return res.status(404).json({ error: 'Journal entry not found or expired' });
    }

    res.json({
      entry: {
        id: entry.id,
        content: entry.content,
        mood: entry.mood,
        prompt: entry.prompt,
        timestamp: entry.timestamp,
        wordCount: entry.wordCount
      }
    });

  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ 
      error: 'Failed to fetch journal entry',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get a journaling prompt
router.get('/prompt', async (req, res) => {
  try {
    const { sessionId, mood } = req.query;

    let previousEntries = [];
    if (sessionId) {
      try {
        previousEntries = await redisService.getJournalEntries(sessionId);
      } catch (error) {
        console.log('Could not fetch previous entries for prompts:', error);
      }
    }

    // Generate AI-powered prompt
    const prompt = await openaiService.generateJournalingPrompt(mood, previousEntries);

    res.json({
      prompt,
      timestamp: new Date().toISOString(),
      mood: mood || null,
      category: getPromptCategory(prompt)
    });

  } catch (error) {
    console.error('Error generating journal prompt:', error);
    res.status(500).json({ 
      error: 'Failed to generate prompt',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get multiple journal prompts
router.get('/prompts', async (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 3, 10); // Max 10 prompts
    const { mood } = req.query;

    const prompts = [];
    for (let i = 0; i < count; i++) {
      try {
        const prompt = await openaiService.generateJournalingPrompt(mood);
        prompts.push({
          id: uuidv4(),
          prompt,
          category: getPromptCategory(prompt),
          mood: mood || null
        });
      } catch (error) {
        // Add fallback prompt if AI generation fails
        prompts.push({
          id: uuidv4(),
          prompt: openaiService.getFallbackJournalingPrompt(),
          category: 'general',
          mood: mood || null,
          fallback: true
        });
      }
    }

    res.json({
      prompts,
      timestamp: new Date().toISOString(),
      count: prompts.length
    });

  } catch (error) {
    console.error('Error generating journal prompts:', error);
    res.status(500).json({ 
      error: 'Failed to generate prompts',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to categorize prompts
function getPromptCategory(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('grateful') || lowerPrompt.includes('thankful')) {
    return 'gratitude';
  }
  if (lowerPrompt.includes('goal') || lowerPrompt.includes('future') || lowerPrompt.includes('dream')) {
    return 'goals';
  }
  if (lowerPrompt.includes('emotion') || lowerPrompt.includes('feeling') || lowerPrompt.includes('feel')) {
    return 'emotions';
  }
  if (lowerPrompt.includes('relationship') || lowerPrompt.includes('friend') || lowerPrompt.includes('family')) {
    return 'relationships';
  }
  if (lowerPrompt.includes('self') || lowerPrompt.includes('identity') || lowerPrompt.includes('personal')) {
    return 'self-reflection';
  }
  if (lowerPrompt.includes('challenge') || lowerPrompt.includes('difficult') || lowerPrompt.includes('overcome')) {
    return 'challenges';
  }
  if (lowerPrompt.includes('memory') || lowerPrompt.includes('remember') || lowerPrompt.includes('past')) {
    return 'memories';
  }
  
  return 'general';
}

module.exports = router;