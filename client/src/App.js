import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import CommunityFeed from './pages/CommunityFeed';
import Chat from './pages/Chat';
import Journal from './pages/Journal';
import MoodTracker from './pages/MoodTracker';
import Affirmations from './pages/Affirmations';
import TherapyBooking from './pages/TherapyBooking';
import BookingConfirmation from './pages/BookingConfirmation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CrisisSupport from './pages/CrisisSupport';
import About from './pages/About';
import { useSession } from './contexts/SessionContext';

function App() {
  const location = useLocation();
  const { isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="loading-spinner"></div>
          <p className="mt-4 text-gray-600">Loading Sanjeevani...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="pt-16"> {/* Account for fixed navigation */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/community" element={<CommunityFeed />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/mood" element={<MoodTracker />} />
            <Route path="/affirmations" element={<Affirmations />} />
            <Route path="/therapy" element={<TherapyBooking />} />
            <Route path="/booking/:bookingId" element={<BookingConfirmation />} />
            <Route path="/crisis" element={<CrisisSupport />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Crisis Support Button - Always visible */}
      <button
        onClick={() => window.showCrisisResources && window.showCrisisResources()}
        className="fixed bottom-6 left-6 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50 group"
        title="Crisis Support Resources"
        aria-label="Show crisis support resources"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Crisis Support
        </span>
      </button>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sanjeevani</h3>
              <p className="text-gray-600 mb-4">
                Anonymous mental health support platform providing safe spaces for healing, 
                growth, and professional assistance when needed.
              </p>
              <p className="text-sm text-gray-500">
                🔒 Your privacy is our priority. All interactions are anonymous and ephemeral.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Support
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="/crisis" className="text-gray-600 hover:text-indigo-600 transition-colors">
                    Crisis Resources
                  </a>
                </li>
                <li>
                  <a href="/about" className="text-gray-600 hover:text-indigo-600 transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="text-gray-600 hover:text-indigo-600 transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Emergency
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="text-red-600 font-medium">
                  Call 988
                  <div className="text-gray-600 font-normal">Suicide & Crisis Lifeline</div>
                </li>
                <li className="text-red-600 font-medium">
                  Text HOME to 741741
                  <div className="text-gray-600 font-normal">Crisis Text Line</div>
                </li>
                <li className="text-red-600 font-medium">
                  Call 911
                  <div className="text-gray-600 font-normal">Emergency Services</div>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>
              © 2024 Sanjeevani. Built with care for mental health support. 
              Remember: You are not alone, and help is always available.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;