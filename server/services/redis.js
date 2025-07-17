const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('❌ Disconnected from Redis');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  // Posts with TTL (1 hour by default)
  async savePost(postId, postData, ttlSeconds = 3600) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    await this.client.setEx(`post:${postId}`, ttlSeconds, JSON.stringify(postData));
  }

  async getPost(postId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    const data = await this.client.get(`post:${postId}`);
    return data ? JSON.parse(data) : null;
  }

  async getAllPosts() {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    const keys = await this.client.keys('post:*');
    const posts = [];
    
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        posts.push(JSON.parse(data));
      }
    }
    
    // Sort by timestamp (newest first)
    return posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Session management
  async saveSession(sessionId, sessionData, ttlSeconds = 86400) { // 24 hours
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    await this.client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(sessionData));
  }

  async getSession(sessionId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    await this.client.del(`session:${sessionId}`);
  }

  // Journal entries with session-based storage
  async saveJournalEntry(sessionId, entryId, entryData, ttlSeconds = 86400) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    await this.client.setEx(`journal:${sessionId}:${entryId}`, ttlSeconds, JSON.stringify(entryData));
  }

  async getJournalEntries(sessionId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    const keys = await this.client.keys(`journal:${sessionId}:*`);
    const entries = [];
    
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        entries.push(JSON.parse(data));
      }
    }
    
    return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Mood tracking
  async saveMoodEntry(sessionId, moodData, ttlSeconds = 2592000) { // 30 days
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    const key = `mood:${sessionId}:${Date.now()}`;
    await this.client.setEx(key, ttlSeconds, JSON.stringify(moodData));
  }

  async getMoodEntries(sessionId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    const keys = await this.client.keys(`mood:${sessionId}:*`);
    const moods = [];
    
    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        moods.push(JSON.parse(data));
      }
    }
    
    return moods.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Chat history (temporary)
  async saveChatMessage(sessionId, messageData, ttlSeconds = 3600) { // 1 hour
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    await this.client.lPush(`chat:${sessionId}`, JSON.stringify(messageData));
    await this.client.expire(`chat:${sessionId}`, ttlSeconds);
  }

  async getChatHistory(sessionId) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    const messages = await this.client.lRange(`chat:${sessionId}`, 0, -1);
    return messages.map(msg => JSON.parse(msg)).reverse();
  }

  // Utility methods
  async exists(key) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    return await this.client.exists(key);
  }

  async delete(key) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    return await this.client.del(key);
  }

  async setTTL(key, ttlSeconds) {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }
    return await this.client.expire(key, ttlSeconds);
  }
}

// Create a singleton instance
const redisService = new RedisService();

module.exports = redisService;