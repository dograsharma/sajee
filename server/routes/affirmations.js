const express = require('express');

const router = express.Router();

// Curated affirmations categorized by themes
const affirmations = {
  self_worth: [
    "I am worthy of love and respect just as I am.",
    "My value doesn't decrease based on someone's inability to see my worth.",
    "I deserve happiness and inner peace.",
    "I am enough, exactly as I am right now.",
    "I choose to honor my feelings and treat myself with kindness.",
    "I am deserving of good things and positive experiences.",
    "My opinion of myself matters more than others' opinions of me.",
    "I accept myself unconditionally and embrace my uniqueness.",
    "I am worthy of taking up space in this world.",
    "I deserve love, especially from myself."
  ],
  
  strength: [
    "I have overcome challenges before, and I can do it again.",
    "I am stronger than my struggles and braver than my fears.",
    "Every challenge I face is an opportunity to grow stronger.",
    "I have the inner strength to handle whatever comes my way.",
    "I am resilient and capable of bouncing back from setbacks.",
    "My courage grows stronger every time I face my fears.",
    "I trust in my ability to navigate through difficult times.",
    "I am powerful beyond measure and capable of amazing things.",
    "I choose to focus on my strengths and celebrate my progress.",
    "I am becoming stronger and more confident each day."
  ],
  
  peace: [
    "I release what I cannot control and focus on what I can.",
    "I choose peace over perfection in this moment.",
    "I breathe in calm and breathe out tension.",
    "I am at peace with who I am becoming.",
    "I allow myself to rest and recharge without guilt.",
    "Inner peace is my natural state, and I return to it easily.",
    "I create calm in my mind by focusing on the present moment.",
    "I let go of worries that serve no purpose in my life.",
    "I deserve moments of quiet and tranquility.",
    "I trust that everything will work out for my highest good."
  ],
  
  growth: [
    "I am constantly learning and growing from my experiences.",
    "Every day offers me new opportunities to become better.",
    "I embrace change as a pathway to growth and new possibilities.",
    "I am patient with myself as I continue to evolve.",
    "My mistakes are lessons that help me grow wiser.",
    "I celebrate small victories and acknowledge my progress.",
    "I am open to learning new things about myself and the world.",
    "Growth happens at my own pace, and that's perfectly okay.",
    "I trust the process of my personal development.",
    "I am becoming the person I want to be, one day at a time."
  ],
  
  hope: [
    "Tomorrow is a new day full of possibilities and hope.",
    "I choose to believe that good things are coming my way.",
    "Even in darkness, I carry a light within me that cannot be extinguished.",
    "This difficult moment will pass, and brighter days are ahead.",
    "I have survived 100% of my worst days so far.",
    "There is always hope, even when I can't see it yet.",
    "I trust that life has beautiful surprises waiting for me.",
    "Every ending creates space for a new beginning.",
    "I am exactly where I need to be in this moment.",
    "My future is bright and full of potential."
  ],
  
  gratitude: [
    "I am grateful for this moment and all the gifts it brings.",
    "I appreciate the small joys that surround me every day.",
    "I am thankful for my body and all it does for me.",
    "Gratitude transforms my perspective and opens my heart.",
    "I acknowledge the good in my life, no matter how small.",
    "I am grateful for the lessons that challenges have taught me.",
    "I appreciate the people who love and support me.",
    "I find reasons to be thankful in every day.",
    "Gratitude helps me see the abundance that already exists in my life.",
    "I am thankful for my ability to feel and experience emotions."
  ],
  
  self_care: [
    "Taking care of myself is a priority, not a luxury.",
    "I honor my needs and listen to what my body and mind require.",
    "Rest is productive and necessary for my well-being.",
    "I set healthy boundaries to protect my energy and peace.",
    "I treat myself with the same compassion I show others.",
    "Self-care is an act of self-love and self-respect.",
    "I make time for activities that bring me joy and fulfillment.",
    "I nourish my body, mind, and soul with care and intention.",
    "I am worthy of taking breaks and moments of solitude.",
    "Caring for myself allows me to show up better for others."
  ]
};

// Get daily affirmation based on date
router.get('/daily', (req, res) => {
  try {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    
    // Get all affirmations and flatten the array
    const allAffirmations = Object.values(affirmations).flat();
    
    // Use day of year to select consistent daily affirmation
    const dailyAffirmation = allAffirmations[dayOfYear % allAffirmations.length];
    
    // Get the category for this affirmation
    let category = 'general';
    for (const [cat, affirmationList] of Object.entries(affirmations)) {
      if (affirmationList.includes(dailyAffirmation)) {
        category = cat;
        break;
      }
    }
    
    res.json({
      affirmation: dailyAffirmation,
      category: category.replace('_', ' '),
      date: today.toISOString().split('T')[0],
      dayOfYear: dayOfYear,
      message: "Here's your daily affirmation. Take a moment to reflect on these words."
    });
    
  } catch (error) {
    console.error('Error getting daily affirmation:', error);
    res.status(500).json({ 
      error: 'Failed to get daily affirmation',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get random affirmation by category
router.get('/random/:category?', (req, res) => {
  try {
    const { category } = req.params;
    
    let selectedAffirmations;
    let selectedCategory = category;
    
    if (category && affirmations[category]) {
      selectedAffirmations = affirmations[category];
    } else {
      // If no valid category specified, pick random category
      const categories = Object.keys(affirmations);
      selectedCategory = categories[Math.floor(Math.random() * categories.length)];
      selectedAffirmations = affirmations[selectedCategory];
    }
    
    const randomAffirmation = selectedAffirmations[Math.floor(Math.random() * selectedAffirmations.length)];
    
    res.json({
      affirmation: randomAffirmation,
      category: selectedCategory.replace('_', ' '),
      timestamp: new Date().toISOString(),
      availableCategories: Object.keys(affirmations).map(cat => cat.replace('_', ' '))
    });
    
  } catch (error) {
    console.error('Error getting random affirmation:', error);
    res.status(500).json({ 
      error: 'Failed to get random affirmation',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get multiple affirmations
router.get('/collection', (req, res) => {
  try {
    const count = Math.min(parseInt(req.query.count) || 5, 20); // Max 20 affirmations
    const { category } = req.query;
    
    let sourceAffirmations;
    if (category && affirmations[category]) {
      sourceAffirmations = affirmations[category];
    } else {
      // Mix from all categories
      sourceAffirmations = Object.values(affirmations).flat();
    }
    
    // Shuffle and select requested count
    const shuffled = [...sourceAffirmations].sort(() => 0.5 - Math.random());
    const selectedAffirmations = shuffled.slice(0, count);
    
    res.json({
      affirmations: selectedAffirmations.map((affirmation, index) => {
        // Find category for each affirmation
        let affirmationCategory = 'general';
        for (const [cat, affirmationList] of Object.entries(affirmations)) {
          if (affirmationList.includes(affirmation)) {
            affirmationCategory = cat.replace('_', ' ');
            break;
          }
        }
        
        return {
          id: index + 1,
          text: affirmation,
          category: affirmationCategory
        };
      }),
      count: selectedAffirmations.length,
      timestamp: new Date().toISOString(),
      requestedCategory: category || 'mixed'
    });
    
  } catch (error) {
    console.error('Error getting affirmation collection:', error);
    res.status(500).json({ 
      error: 'Failed to get affirmation collection',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all available categories
router.get('/categories', (req, res) => {
  try {
    const categories = Object.keys(affirmations).map(category => ({
      key: category,
      name: category.replace('_', ' '),
      count: affirmations[category].length,
      description: getCategoryDescription(category)
    }));
    
    res.json({
      categories,
      totalCategories: categories.length,
      totalAffirmations: Object.values(affirmations).flat().length
    });
    
  } catch (error) {
    console.error('Error getting affirmation categories:', error);
    res.status(500).json({ 
      error: 'Failed to get categories',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get affirmations based on mood
router.get('/mood/:mood', (req, res) => {
  try {
    const { mood } = req.params;
    let recommendedCategory;
    
    // Map moods to appropriate affirmation categories
    switch (mood.toLowerCase()) {
      case 'sad':
      case 'down':
      case 'depressed':
        recommendedCategory = 'hope';
        break;
      case 'anxious':
      case 'worried':
      case 'stressed':
        recommendedCategory = 'peace';
        break;
      case 'angry':
      case 'frustrated':
        recommendedCategory = 'peace';
        break;
      case 'insecure':
      case 'worthless':
        recommendedCategory = 'self_worth';
        break;
      case 'overwhelmed':
      case 'tired':
        recommendedCategory = 'self_care';
        break;
      case 'stuck':
      case 'confused':
        recommendedCategory = 'growth';
        break;
      default:
        recommendedCategory = 'self_worth';
    }
    
    const selectedAffirmations = affirmations[recommendedCategory];
    const randomAffirmation = selectedAffirmations[Math.floor(Math.random() * selectedAffirmations.length)];
    
    res.json({
      affirmation: randomAffirmation,
      category: recommendedCategory.replace('_', ' '),
      mood: mood,
      message: `Here's an affirmation selected for when you're feeling ${mood}.`,
      suggestion: "Take a deep breath and repeat this affirmation to yourself slowly."
    });
    
  } catch (error) {
    console.error('Error getting mood-based affirmation:', error);
    res.status(500).json({ 
      error: 'Failed to get mood-based affirmation',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to get category descriptions
function getCategoryDescription(category) {
  const descriptions = {
    self_worth: "Affirmations to remind you of your inherent value and worth",
    strength: "Affirmations to help you feel strong and capable",
    peace: "Affirmations for finding calm and inner peace",
    growth: "Affirmations to encourage personal development and learning",
    hope: "Affirmations to inspire optimism and positive outlook",
    gratitude: "Affirmations to cultivate appreciation and thankfulness",
    self_care: "Affirmations to encourage healthy self-care practices"
  };
  
  return descriptions[category] || "Positive affirmations for mental well-being";
}

module.exports = router;