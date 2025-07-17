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
    console.error('Failed to connect to Redis for posts:', error);
  }
})();

// Create a new anonymous post
router.post('/', async (req, res) => {
  try {
    const { content, feeling } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Content must be 500 characters or less' });
    }

    // Moderate content using OpenAI
    const moderation = await openaiService.moderateContent(content);
    
    if (!moderation.safe) {
      console.log('Blocked post due to moderation:', {
        flagged: moderation.flagged,
        categories: moderation.categories
      });
      
      return res.status(400).json({ 
        error: 'Content violates community guidelines',
        details: 'Your post contains content that may be harmful. Please revise and try again.',
        blocked: true
      });
    }

    // Check for crisis indicators
    const crisisDetection = openaiService.detectCrisis(content);
    
    if (crisisDetection.immediateCrisis) {
      // Still allow the post but flag for additional support resources
      console.log('Crisis detected in post, adding support resources');
    }

    // Create post object
    const postId = uuidv4();
    const post = {
      id: postId,
      content: content.trim(),
      feeling: feeling || 'anonymous',
      timestamp: new Date().toISOString(),
      supportCount: 0,
      crisisDetected: crisisDetection.needsSupport,
      severityLevel: crisisDetection.severity
    };

    // Save to Redis with 1-hour TTL
    await redisService.savePost(postId, post, 3600); // 1 hour

    // Return response with crisis resources if needed
    const response = {
      success: true,
      post: {
        id: post.id,
        content: post.content,
        feeling: post.feeling,
        timestamp: post.timestamp,
        supportCount: post.supportCount
      }
    };

    if (crisisDetection.needsSupport) {
      response.supportResources = {
        crisis: crisisDetection.immediateCrisis,
        message: crisisDetection.immediateCrisis 
          ? "We noticed you might be going through a difficult time. Please consider reaching out for support."
          : "Remember that support is available if you need it.",
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
          },
          {
            name: "International Association for Suicide Prevention",
            website: "https://www.iasp.info/resources/Crisis_Centres/",
            available: "Global resources"
          }
        ]
      };
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      error: 'Failed to create post',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all recent posts (anonymous feed)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const includeSupport = req.query.includeSupport === 'true';

    // Get all posts from Redis
    const posts = await redisService.getAllPosts();
    
    // Limit and sanitize posts
    const sanitizedPosts = posts
      .slice(0, limit)
      .map(post => ({
        id: post.id,
        content: post.content,
        feeling: post.feeling,
        timestamp: post.timestamp,
        supportCount: post.supportCount || 0,
        // Only include crisis info if specifically requested (for admin/support)
        ...(includeSupport && post.crisisDetected && {
          needsSupport: true,
          severityLevel: post.severityLevel
        })
      }));

    res.json({
      posts: sanitizedPosts,
      total: sanitizedPosts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch posts',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Add support/reaction to a post (anonymous)
router.post('/:postId/support', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Get the post
    const post = await redisService.getPost(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found or expired' });
    }

    // Increment support count
    post.supportCount = (post.supportCount || 0) + 1;
    
    // Save back to Redis with same TTL
    await redisService.savePost(postId, post, 3600);

    res.json({
      success: true,
      supportCount: post.supportCount,
      message: 'Support added to post'
    });

  } catch (error) {
    console.error('Error adding support to post:', error);
    res.status(500).json({ 
      error: 'Failed to add support',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get community stats (anonymous)
router.get('/stats', async (req, res) => {
  try {
    const posts = await redisService.getAllPosts();
    
    const stats = {
      totalPosts: posts.length,
      totalSupport: posts.reduce((sum, post) => sum + (post.supportCount || 0), 0),
      postsToday: posts.filter(post => {
        const postDate = new Date(post.timestamp);
        const today = new Date();
        return postDate.toDateString() === today.toDateString();
      }).length,
      mostCommonFeelings: {},
      lastUpdated: new Date().toISOString()
    };

    // Calculate feeling distribution
    posts.forEach(post => {
      const feeling = post.feeling || 'anonymous';
      stats.mostCommonFeelings[feeling] = (stats.mostCommonFeelings[feeling] || 0) + 1;
    });

    res.json(stats);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;