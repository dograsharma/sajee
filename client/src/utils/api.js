import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed in the future
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Posts API
export const postsAPI = {
  createPost: (data) => api.post('/api/posts', data),
  getPosts: (params) => api.get('/api/posts', { params }),
  addSupport: (postId) => api.post(`/api/posts/${postId}/support`),
  getStats: () => api.get('/api/posts/stats'),
};

// Chat API
export const chatAPI = {
  sendMessage: (data) => api.post('/api/chat/message', data),
  getChatHistory: (sessionId, params) => api.get(`/api/chat/history/${sessionId}`, { params }),
  getBreathingExercise: () => api.get('/api/chat/breathing-exercise'),
  getGroundingTechnique: () => api.get('/api/chat/grounding'),
  createSession: () => api.post('/api/chat/session'),
};

// Journal API
export const journalAPI = {
  createEntry: (data) => api.post('/api/journal/entry', data),
  getEntries: (sessionId, params) => api.get(`/api/journal/entries/${sessionId}`, { params }),
  getEntry: (sessionId, entryId) => api.get(`/api/journal/entry/${sessionId}/${entryId}`),
  getPrompt: (params) => api.get('/api/journal/prompt', { params }),
  getPrompts: (params) => api.get('/api/journal/prompts', { params }),
};

// Affirmations API
export const affirmationsAPI = {
  getDaily: () => api.get('/api/affirmations/daily'),
  getRandom: (category) => api.get(`/api/affirmations/random/${category || ''}`),
  getCollection: (params) => api.get('/api/affirmations/collection', { params }),
  getCategories: () => api.get('/api/affirmations/categories'),
  getByMood: (mood) => api.get(`/api/affirmations/mood/${mood}`),
};

// Mood API
export const moodAPI = {
  checkin: (data) => api.post('/api/mood/checkin', data),
  getHistory: (sessionId, params) => api.get(`/api/mood/history/${sessionId}`, { params }),
  getAnalytics: (sessionId, params) => api.get(`/api/mood/analytics/${sessionId}`, { params }),
  getOptions: () => api.get('/api/mood/options'),
};

// Booking API
export const bookingAPI = {
  getTherapists: (params) => api.get('/api/booking/therapists', { params }),
  getSlots: (therapistId, params) => api.get(`/api/booking/therapists/${therapistId}/slots`, { params }),
  createIntent: (data) => api.post('/api/booking/intent', data),
  confirmBooking: (data) => api.post('/api/booking/confirm', data),
  getBooking: (bookingId) => api.get(`/api/booking/booking/${bookingId}`),
  cancelBooking: (bookingId, data) => api.post(`/api/booking/booking/${bookingId}/cancel`, data),
};

// Notifications API
export const notificationsAPI = {
  register: (data) => api.post('/api/notifications/register', data),
  updatePreferences: (deviceId, data) => api.put(`/api/notifications/preferences/${deviceId}`, data),
  sendAffirmation: (data) => api.post('/api/notifications/send-affirmation', data),
  sendReminder: (data) => api.post('/api/notifications/send-reminder', data),
  sendMoodReminder: (data) => api.post('/api/notifications/send-mood-reminder', data),
  sendCrisisAlert: (data) => api.post('/api/notifications/send-crisis-alert', data),
  getHistory: (deviceId, params) => api.get(`/api/notifications/history/${deviceId}`, { params }),
  schedule: (data) => api.post('/api/notifications/schedule', data),
  unsubscribe: (scheduleId) => api.delete(`/api/notifications/unsubscribe/${scheduleId}`),
};

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
};

// Error handling helper
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      status,
      message: data.message || data.error || 'An error occurred',
      details: data.details || null,
    };
  } else if (error.request) {
    // Request made but no response received
    return {
      status: 0,
      message: 'No response from server. Please check your connection.',
      details: null,
    };
  } else {
    // Something else happened
    return {
      status: -1,
      message: error.message || 'An unexpected error occurred',
      details: null,
    };
  }
};

export default api;