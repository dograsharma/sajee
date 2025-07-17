const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Crisis keywords for immediate detection
    this.crisisKeywords = [
      'suicide', 'kill myself', 'end my life', 'want to die', 'hurt myself',
      'self harm', 'cut myself', 'overdose', 'jump off', 'hang myself',
      'worthless', 'hopeless', 'can\'t go on', 'give up', 'end it all'
    ];
  }

  // Content moderation using OpenAI Moderation API
  async moderateContent(text) {
    try {
      const response = await this.openai.moderations.create({
        input: text,
      });

      const moderation = response.results[0];
      
      return {
        flagged: moderation.flagged,
        categories: moderation.categories,
        categoryScores: moderation.category_scores,
        safe: !moderation.flagged
      };
    } catch (error) {
      console.error('Moderation API error:', error);
      // Fallback to keyword detection if API fails
      return this.fallbackModeration(text);
    }
  }

  // Fallback moderation using keyword detection
  fallbackModeration(text) {
    const lowerText = text.toLowerCase();
    const flaggedCategories = {};
    let flagged = false;

    // Check for crisis keywords
    const hasCrisisKeywords = this.crisisKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    if (hasCrisisKeywords) {
      flagged = true;
      flaggedCategories['self-harm'] = true;
    }

    // Check for basic harmful content patterns
    const harmfulPatterns = [
      /\b(hate|kill|hurt|violence)\b/gi,
      /\b(drug|illegal|weapon)\b/gi,
    ];

    harmfulPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        flagged = true;
        flaggedCategories['harmful'] = true;
      }
    });

    return {
      flagged,
      categories: flaggedCategories,
      categoryScores: {},
      safe: !flagged,
      fallback: true
    };
  }

  // Crisis detection specifically for chat messages
  detectCrisis(text) {
    const lowerText = text.toLowerCase();
    
    // Immediate crisis indicators
    const immediateCrisis = this.crisisKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    // Emotional distress indicators
    const distressIndicators = [
      'depressed', 'anxiety', 'panic', 'overwhelmed', 'alone',
      'scared', 'afraid', 'cry', 'tears', 'help me'
    ];

    const hasDistress = distressIndicators.some(indicator => 
      lowerText.includes(indicator)
    );

    return {
      immediateCrisis,
      emotionalDistress: hasDistress,
      needsSupport: immediateCrisis || hasDistress,
      severity: immediateCrisis ? 'high' : hasDistress ? 'medium' : 'low'
    };
  }

  // Generate empathetic chatbot response
  async generateChatResponse(userMessage, chatHistory = [], crisisDetected = false) {
    try {
      let systemPrompt = `You are Sanjeevani, a compassionate AI mental health support assistant. Your role is to:

1. Provide empathetic, non-judgmental responses
2. Offer gentle affirmations and validation
3. Suggest healthy coping strategies like breathing exercises, journaling prompts, or mindfulness
4. NEVER provide medical advice or diagnosis
5. Encourage professional help when appropriate
6. Keep responses concise but warm (2-3 sentences max)

Guidelines:
- Use gentle, supportive language
- Acknowledge their feelings without minimizing them
- Offer practical, immediate coping strategies
- Suggest journaling prompts or reflection questions
- Mention breathing exercises or grounding techniques when relevant`;

      if (crisisDetected) {
        systemPrompt += `

IMPORTANT: Crisis indicators detected. Your response should:
- Acknowledge their pain with deep empathy
- Gently encourage reaching out to crisis resources
- Provide immediate coping strategies
- Reassure them that help is available
- Do NOT dismiss or minimize their feelings`;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-6), // Keep last 6 messages for context
        { role: 'user', content: userMessage }
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      return {
        message: response.choices[0].message.content.trim(),
        tokensUsed: response.usage.total_tokens
      };
    } catch (error) {
      console.error('Chat completion error:', error);
      return this.getFallbackResponse(crisisDetected);
    }
  }

  // Fallback responses when OpenAI API is unavailable
  getFallbackResponse(crisisDetected = false) {
    if (crisisDetected) {
      const crisisResponses = [
        "I hear that you're going through something really difficult right now. Your feelings are valid, and you don't have to face this alone. Have you considered reaching out to a crisis helpline? They have trained counselors available 24/7.",
        "It sounds like you're in a lot of pain right now. Please know that there are people who want to help. Crisis support is available - would it be helpful if I shared some resources with you?",
        "I'm concerned about how you're feeling. Your life has value, and there are people trained to help during these difficult moments. Would you like me to share some immediate support resources?"
      ];
      return {
        message: crisisResponses[Math.floor(Math.random() * crisisResponses.length)],
        tokensUsed: 0,
        fallback: true
      };
    }

    const supportiveResponses = [
      "Thank you for sharing how you're feeling. It takes courage to express your emotions. Remember that it's okay to feel what you're feeling, and these emotions will pass.",
      "I hear you, and your feelings are completely valid. Sometimes it helps to take a few deep breaths - try breathing in for 4 counts, holding for 4, and exhaling for 6.",
      "It sounds like you're going through something challenging. Would it help to write down what you're feeling right now? Sometimes putting thoughts on paper can provide clarity.",
      "Your emotions are important and deserve to be acknowledged. Consider taking a moment to do something kind for yourself today, even something small.",
      "Thank you for trusting me with your feelings. Remember that seeking support is a sign of strength, not weakness. How are you taking care of yourself today?"
    ];

    return {
      message: supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)],
      tokensUsed: 0,
      fallback: true
    };
  }

  // Generate journaling prompts
  async generateJournalingPrompt(mood = null, previousEntries = []) {
    try {
      const moodContext = mood ? `The user's current mood is: ${mood}. ` : '';
      const historyContext = previousEntries.length > 0 ? 
        `Previous journaling themes: ${previousEntries.slice(0, 3).map(e => e.theme || 'general').join(', ')}. ` : '';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'system',
          content: `Generate a thoughtful, non-invasive journaling prompt for mental health reflection. ${moodContext}${historyContext}The prompt should:
          - Be open-ended and encouraging
          - Help process emotions constructively
          - Not be too heavy or triggering
          - Encourage self-compassion
          - Be suitable for any mental health level
          
          Provide just the prompt, nothing else. Keep it to 1-2 sentences.`
        }],
        max_tokens: 100,
        temperature: 0.8
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Journaling prompt generation error:', error);
      return this.getFallbackJournalingPrompt();
    }
  }

  getFallbackJournalingPrompt() {
    const prompts = [
      "What is one thing you're grateful for today, and how did it make you feel?",
      "Describe a moment recently when you felt peaceful or content. What contributed to that feeling?",
      "What would you say to a friend who was going through what you're experiencing right now?",
      "Write about a small accomplishment from this week, no matter how minor it might seem.",
      "What emotions are you carrying today, and what do they need from you?",
      "If today was a color, what would it be and why?",
      "What is one way you've grown or learned something about yourself recently?",
      "Describe something in nature that brings you comfort or peace.",
      "What does self-compassion look like for you right now?",
      "Write about a person, place, or activity that brings you joy."
    ];

    return prompts[Math.floor(Math.random() * prompts.length)];
  }
}

// Create a singleton instance
const openaiService = new OpenAIService();

module.exports = openaiService;