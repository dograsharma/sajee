const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redisService = require('../services/redis');
const axios = require('axios');

const router = express.Router();

// Initialize Redis connection
(async () => {
  try {
    await redisService.connect();
  } catch (error) {
    console.error('Failed to connect to Redis for mood:', error);
  }
})();

// Record a mood check-in
router.post('/checkin', async (req, res) => {
  try {
    const { mood, intensity, notes, sessionId } = req.body;

    if (!mood) {
      return res.status(400).json({ error: 'Mood is required' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const validMoods = [
      'very_happy', 'happy', 'content', 'neutral', 'sad', 'very_sad',
      'excited', 'calm', 'anxious', 'angry', 'frustrated', 'grateful',
      'hopeful', 'overwhelmed', 'peaceful', 'energetic', 'tired', 'stressed'
    ];

    if (!validMoods.includes(mood)) {
      return res.status(400).json({ 
        error: 'Invalid mood',
        validMoods: validMoods
      });
    }

    // Validate intensity (1-10 scale)
    const moodIntensity = intensity ? Math.max(1, Math.min(10, parseInt(intensity))) : 5;

    let sentimentAnalysis = null;
    let aiInsight = null;

    // Perform sentiment analysis on notes if provided
    if (notes && notes.trim().length > 0) {
      try {
        sentimentAnalysis = await analyzeSentiment(notes);
        aiInsight = generateMoodInsight(mood, moodIntensity, sentimentAnalysis, notes);
      } catch (error) {
        console.error('Sentiment analysis failed:', error);
        // Continue without sentiment analysis
      }
    }

    // Create mood entry
    const moodEntry = {
      id: uuidv4(),
      mood: mood,
      intensity: moodIntensity,
      notes: notes ? notes.trim() : null,
      timestamp: new Date().toISOString(),
      sentimentScore: sentimentAnalysis ? sentimentAnalysis.score : null,
      sentimentMagnitude: sentimentAnalysis ? sentimentAnalysis.magnitude : null,
      aiInsight: aiInsight
    };

    // Save to Redis with 30-day TTL
    await redisService.saveMoodEntry(sessionId, moodEntry, 2592000); // 30 days

    // Get recent mood entries for trend analysis
    const recentEntries = await redisService.getMoodEntries(sessionId);
    const moodTrend = analyzeMoodTrend(recentEntries.slice(0, 10)); // Last 10 entries

    const response = {
      success: true,
      entry: {
        id: moodEntry.id,
        mood: moodEntry.mood,
        intensity: moodEntry.intensity,
        notes: moodEntry.notes,
        timestamp: moodEntry.timestamp
      },
      trend: moodTrend,
      insight: aiInsight
    };

    // Add sentiment analysis results if available
    if (sentimentAnalysis) {
      response.sentiment = {
        score: sentimentAnalysis.score,
        label: sentimentAnalysis.label,
        confidence: sentimentAnalysis.confidence
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error recording mood check-in:', error);
    res.status(500).json({ 
      error: 'Failed to record mood check-in',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get mood history for a session
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const days = parseInt(req.query.days) || 30;

    const allEntries = await redisService.getMoodEntries(sessionId);
    
    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredEntries = allEntries
      .filter(entry => new Date(entry.timestamp) >= cutoffDate)
      .slice(0, limit)
      .map(entry => ({
        id: entry.id,
        mood: entry.mood,
        intensity: entry.intensity,
        notes: entry.notes,
        timestamp: entry.timestamp,
        sentimentScore: entry.sentimentScore
      }));

    // Generate analytics
    const analytics = generateMoodAnalytics(filteredEntries);

    res.json({
      entries: filteredEntries,
      analytics,
      period: `${days} days`,
      total: filteredEntries.length
    });

  } catch (error) {
    console.error('Error fetching mood history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mood history',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get mood analytics for a session
router.get('/analytics/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const period = req.query.period || '7'; // days

    const allEntries = await redisService.getMoodEntries(sessionId);
    
    // Filter by period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(period));
    
    const filteredEntries = allEntries
      .filter(entry => new Date(entry.timestamp) >= cutoffDate);

    const analytics = generateMoodAnalytics(filteredEntries);
    const insights = generatePersonalInsights(filteredEntries);

    res.json({
      analytics,
      insights,
      period: `${period} days`,
      dataPoints: filteredEntries.length
    });

  } catch (error) {
    console.error('Error generating mood analytics:', error);
    res.status(500).json({ 
      error: 'Failed to generate analytics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get quick mood options
router.get('/options', (req, res) => {
  const moodOptions = [
    { value: 'very_happy', label: 'Very Happy', emoji: '😄', color: '#4CAF50' },
    { value: 'happy', label: 'Happy', emoji: '😊', color: '#8BC34A' },
    { value: 'content', label: 'Content', emoji: '😌', color: '#CDDC39' },
    { value: 'neutral', label: 'Neutral', emoji: '😐', color: '#FFC107' },
    { value: 'sad', label: 'Sad', emoji: '😢', color: '#FF9800' },
    { value: 'very_sad', label: 'Very Sad', emoji: '😭', color: '#F44336' },
    { value: 'excited', label: 'Excited', emoji: '🤩', color: '#9C27B0' },
    { value: 'calm', label: 'Calm', emoji: '😇', color: '#00BCD4' },
    { value: 'anxious', label: 'Anxious', emoji: '😰', color: '#795548' },
    { value: 'angry', label: 'Angry', emoji: '😠', color: '#D32F2F' },
    { value: 'frustrated', label: 'Frustrated', emoji: '😤', color: '#E64A19' },
    { value: 'grateful', label: 'Grateful', emoji: '🙏', color: '#689F38' },
    { value: 'hopeful', label: 'Hopeful', emoji: '🌟', color: '#1976D2' },
    { value: 'overwhelmed', label: 'Overwhelmed', emoji: '🤯', color: '#7B1FA2' },
    { value: 'peaceful', label: 'Peaceful', emoji: '☮️', color: '#388E3C' },
    { value: 'energetic', label: 'Energetic', emoji: '⚡', color: '#FFB300' },
    { value: 'tired', label: 'Tired', emoji: '😴', color: '#546E7A' },
    { value: 'stressed', label: 'Stressed', emoji: '😵', color: '#BF360C' }
  ];

  res.json({
    options: moodOptions,
    intensityScale: {
      min: 1,
      max: 10,
      labels: {
        1: 'Very Mild',
        3: 'Mild',
        5: 'Moderate',
        7: 'Strong',
        10: 'Very Strong'
      }
    }
  });
});

// Sentiment analysis function (fallback if Google Cloud is not available)
async function analyzeSentiment(text) {
  try {
    // If Google Cloud API is configured, use it
    if (process.env.GOOGLE_CLOUD_API_KEY) {
      const response = await axios.post(
        `https://language.googleapis.com/v1/documents:analyzeSentiment?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
        {
          document: {
            type: 'PLAIN_TEXT',
            content: text
          },
          encodingType: 'UTF8'
        }
      );

      const sentiment = response.data.documentSentiment;
      return {
        score: sentiment.score, // -1 to 1
        magnitude: sentiment.magnitude, // 0 to infinity
        label: sentiment.score > 0.25 ? 'positive' : sentiment.score < -0.25 ? 'negative' : 'neutral',
        confidence: Math.abs(sentiment.score)
      };
    }
  } catch (error) {
    console.error('Google Cloud sentiment analysis failed:', error);
  }

  // Fallback sentiment analysis
  return performBasicSentimentAnalysis(text);
}

// Basic sentiment analysis fallback
function performBasicSentimentAnalysis(text) {
  const positiveWords = ['happy', 'good', 'great', 'wonderful', 'amazing', 'love', 'joy', 'excited', 'grateful', 'blessed', 'peaceful', 'calm', 'content', 'proud', 'hopeful'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'worried', 'anxious', 'stressed', 'overwhelmed', 'hopeless', 'tired', 'exhausted'];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
    if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
  });

  const total = positiveCount + negativeCount;
  let score = 0;
  
  if (total > 0) {
    score = (positiveCount - negativeCount) / total;
  }

  return {
    score: Math.max(-1, Math.min(1, score)),
    magnitude: total / words.length,
    label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
    confidence: Math.abs(score),
    fallback: true
  };
}

// Generate mood insights
function generateMoodInsight(mood, intensity, sentiment, notes) {
  const insights = [];

  // Mood-based insights
  if (mood.includes('sad') && intensity > 7) {
    insights.push("I notice you're experiencing deep sadness. Remember that it's okay to feel this way, and these feelings will pass.");
  } else if (mood.includes('anxious') && intensity > 6) {
    insights.push("Anxiety can feel overwhelming. Try some deep breathing exercises or grounding techniques.");
  } else if (mood.includes('happy') || mood === 'grateful') {
    insights.push("It's wonderful that you're feeling positive! Take a moment to appreciate this feeling.");
  }

  // Sentiment-based insights
  if (sentiment && sentiment.score < -0.5) {
    insights.push("Your notes suggest you're going through a challenging time. Consider reaching out to someone you trust.");
  } else if (sentiment && sentiment.score > 0.5) {
    insights.push("Your notes reflect a positive mindset. That's a great strength to recognize.");
  }

  // Intensity-based insights
  if (intensity >= 8) {
    insights.push("You're experiencing intense emotions. Remember to be gentle with yourself during this time.");
  }

  return insights.length > 0 ? insights[0] : "Thank you for checking in with your emotions. Self-awareness is an important step in mental wellness.";
}

// Analyze mood trends
function analyzeMoodTrend(entries) {
  if (entries.length < 2) {
    return { trend: 'insufficient_data', message: 'Need more data points to analyze trends' };
  }

  // Convert moods to numerical values for trend analysis
  const moodValues = {
    'very_sad': 1, 'sad': 2, 'frustrated': 3, 'angry': 3, 'anxious': 3,
    'overwhelmed': 3, 'stressed': 3, 'tired': 4, 'neutral': 5,
    'content': 6, 'calm': 7, 'peaceful': 7, 'grateful': 8,
    'happy': 8, 'hopeful': 8, 'excited': 9, 'very_happy': 10, 'energetic': 9
  };

  const recentScores = entries.slice(0, 5).map(entry => {
    const baseScore = moodValues[entry.mood] || 5;
    // Adjust by intensity (scale from base score)
    return baseScore + (entry.intensity - 5) * 0.5;
  });

  const earlierScores = entries.slice(5, 10).map(entry => {
    const baseScore = moodValues[entry.mood] || 5;
    return baseScore + (entry.intensity - 5) * 0.5;
  });

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const earlierAvg = earlierScores.length > 0 ? earlierScores.reduce((a, b) => a + b, 0) / earlierScores.length : recentAvg;

  const difference = recentAvg - earlierAvg;

  if (difference > 1) {
    return { trend: 'improving', message: 'Your mood seems to be improving recently' };
  } else if (difference < -1) {
    return { trend: 'declining', message: 'Your mood seems to be declining. Consider self-care or reaching out for support' };
  } else {
    return { trend: 'stable', message: 'Your mood has been relatively stable' };
  }
}

// Generate mood analytics
function generateMoodAnalytics(entries) {
  if (entries.length === 0) {
    return { message: 'No mood data available for this period' };
  }

  // Mood frequency
  const moodCounts = {};
  entries.forEach(entry => {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
  });

  // Average intensity
  const avgIntensity = entries.reduce((sum, entry) => sum + entry.intensity, 0) / entries.length;

  // Most common mood
  const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);

  // Daily patterns (if enough data)
  const hourlyPatterns = {};
  entries.forEach(entry => {
    const hour = new Date(entry.timestamp).getHours();
    if (!hourlyPatterns[hour]) hourlyPatterns[hour] = [];
    hourlyPatterns[hour].push(entry.intensity);
  });

  return {
    totalEntries: entries.length,
    averageIntensity: Math.round(avgIntensity * 10) / 10,
    mostCommonMood: mostCommonMood,
    moodDistribution: moodCounts,
    hourlyPatterns: Object.keys(hourlyPatterns).length > 3 ? hourlyPatterns : null
  };
}

// Generate personal insights
function generatePersonalInsights(entries) {
  if (entries.length < 3) {
    return ["Keep tracking your mood to discover personal patterns and insights."];
  }

  const insights = [];

  // Check for patterns
  const morningEntries = entries.filter(e => new Date(e.timestamp).getHours() < 12);
  const eveningEntries = entries.filter(e => new Date(e.timestamp).getHours() >= 18);

  if (morningEntries.length > 2 && eveningEntries.length > 2) {
    const morningAvg = morningEntries.reduce((sum, e) => sum + e.intensity, 0) / morningEntries.length;
    const eveningAvg = eveningEntries.reduce((sum, e) => sum + e.intensity, 0) / eveningEntries.length;

    if (morningAvg > eveningAvg + 1) {
      insights.push("You tend to feel better in the mornings. Consider tackling important tasks early in the day.");
    } else if (eveningAvg > morningAvg + 1) {
      insights.push("Your mood tends to improve throughout the day. Gentle morning routines might help.");
    }
  }

  // Check for improvement trends
  const recentEntries = entries.slice(0, Math.floor(entries.length / 2));
  const olderEntries = entries.slice(Math.floor(entries.length / 2));

  if (recentEntries.length > 0 && olderEntries.length > 0) {
    const recentAvg = recentEntries.reduce((sum, e) => sum + e.intensity, 0) / recentEntries.length;
    const olderAvg = olderEntries.reduce((sum, e) => sum + e.intensity, 0) / olderEntries.length;

    if (recentAvg > olderAvg + 0.5) {
      insights.push("Your mood has been improving recently. Keep up the positive momentum!");
    }
  }

  if (insights.length === 0) {
    insights.push("Continue tracking to discover more about your mood patterns.");
  }

  return insights;
}

module.exports = router;