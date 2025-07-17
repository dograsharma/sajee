import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Users, 
  BookOpen, 
  Smile, 
  Star, 
  Calendar,
  Shield,
  Brain,
  Clock,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { affirmationsAPI, postsAPI, handleAPIError } from '../utils/api';
import { useSession } from '../contexts/SessionContext';
import toast from 'react-hot-toast';

const Home = () => {
  const { sessionId } = useSession();
  const [dailyAffirmation, setDailyAffirmation] = useState(null);
  const [communityStats, setCommunityStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [affirmationRes, statsRes] = await Promise.all([
          affirmationsAPI.getDaily(),
          postsAPI.getStats()
        ]);
        
        setDailyAffirmation(affirmationRes.data);
        setCommunityStats(statsRes.data);
      } catch (error) {
        const apiError = handleAPIError(error);
        console.error('Failed to fetch home data:', apiError);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const features = [
    {
      icon: Users,
      title: 'Anonymous Community',
      description: 'Share your feelings in a safe, supportive community where every voice matters.',
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      path: '/community'
    },
    {
      icon: MessageCircle,
      title: 'AI Support Chat',
      description: 'Get immediate emotional support from our compassionate AI companion, available 24/7.',
      color: 'bg-green-500',
      lightColor: 'bg-green-50',
      textColor: 'text-green-600',
      path: '/chat'
    },
    {
      icon: BookOpen,
      title: 'Guided Journaling',
      description: 'Process your thoughts and emotions with AI-powered prompts and reflective exercises.',
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      path: '/journal'
    },
    {
      icon: Smile,
      title: 'Mood Tracking',
      description: 'Monitor your emotional patterns and gain insights into your mental wellness journey.',
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      path: '/mood'
    },
    {
      icon: Star,
      title: 'Daily Affirmations',
      description: 'Start each day with personalized, uplifting messages to boost your confidence.',
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      path: '/affirmations'
    },
    {
      icon: Calendar,
      title: 'Therapy Booking',
      description: 'Connect with licensed therapists when you\'re ready for professional support.',
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      path: '/therapy'
    }
  ];

  const privacyFeatures = [
    'No registration required',
    'Anonymous sessions',
    'Encrypted communication',
    'Data auto-expires',
    'No personal tracking',
    'Crisis support always available'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="px-4 pt-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center justify-center p-4 bg-indigo-100 rounded-full mb-6">
              <Heart className="w-12 h-12 text-indigo-600" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Your Safe Space for
              <span className="text-indigo-600 block">Mental Wellness</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Sanjeevani provides anonymous, AI-powered mental health support with community connection, 
              professional therapy booking, and crisis intervention—all while protecting your privacy.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/chat"
                className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Start Chat Support
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              
              <Link
                to="/community"
                className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors border-2 border-indigo-200 hover:border-indigo-300"
              >
                <Users className="w-5 h-5 mr-2" />
                Join Community
              </Link>
            </div>
          </motion.div>

          {/* Daily Affirmation */}
          {dailyAffirmation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white text-center mb-16 shadow-xl"
            >
              <Star className="w-8 h-8 mx-auto mb-4 text-yellow-300" />
              <h3 className="text-xl font-semibold mb-3">Today's Affirmation</h3>
              <p className="text-lg italic mb-4 max-w-2xl mx-auto">
                "{dailyAffirmation.affirmation}"
              </p>
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm">
                {dailyAffirmation.category}
              </span>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Mental Health Support
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need for your mental wellness journey, designed with privacy and accessibility in mind.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                >
                  <Link
                    to={feature.path}
                    className="block p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 group"
                  >
                    <div className={`inline-flex items-center justify-center w-12 h-12 ${feature.lightColor} rounded-lg mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${feature.textColor}`} />
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                      {feature.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                    
                    <div className="flex items-center mt-4 text-indigo-600 font-medium">
                      <span>Explore</span>
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy & Security */}
      <section className="px-4 py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Your Privacy is Our Priority
              </h2>
              
              <p className="text-lg text-gray-600 mb-8">
                We've built Sanjeevani with privacy-first principles. Your mental health journey 
                remains completely anonymous and secure.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {privacyFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-xl"
            >
              <div className="text-center">
                <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  AI-Powered Support
                </h3>
                <p className="text-gray-600 mb-6">
                  Our compassionate AI provides immediate emotional support, detects crisis situations, 
                  and connects you with appropriate resources when needed.
                </p>
                
                {communityStats && (
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {communityStats.totalPosts || 0}
                      </div>
                      <div className="text-sm text-gray-500">Community Posts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {communityStats.totalSupport || 0}
                      </div>
                      <div className="text-sm text-gray-500">Support Given</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Start Your Wellness Journey?
            </h2>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
              Take the first step towards better mental health. Our supportive community and AI-powered 
              tools are here to help you every step of the way.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/mood"
                className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Smile className="w-5 h-5 mr-2" />
                Check Your Mood
              </Link>
              
              <Link
                to="/affirmations"
                className="inline-flex items-center px-8 py-4 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-400 transition-colors border-2 border-white/20"
              >
                <Star className="w-5 h-5 mr-2" />
                Get Affirmations
              </Link>
            </div>
            
            <div className="mt-8 flex items-center justify-center space-x-2 text-indigo-200">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Available 24/7 • Completely Anonymous</span>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;