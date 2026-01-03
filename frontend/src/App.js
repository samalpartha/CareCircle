import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Alerts from './pages/Alerts';
import CareHistory from './pages/CareHistory';
import Reports from './pages/Reports';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getCurrentUser } from 'aws-amplify/auth';
import './App.css';

// Pages
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import CallInterface from './pages/CallInterface';
import FamilyManagement from './pages/FamilyManagement';
import Medications from './pages/Medications';
import EmergencyHub from './pages/EmergencyHub';
import About from './pages/About';

// Components
import StandardizedNavigation from './components/StandardizedNavigation';
import TopHeader from './components/TopHeader';
import LoadingSpinner from './components/LoadingSpinner';
import { ToastProvider } from './components/Toast';

// New standardized pages
import Today from './pages/Today';
import Timeline from './pages/Timeline';

function App() {
  const [, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Authenticator
      hideSignUp={false}
      formFields={{
        signUp: {
          preferred_username: {
            label: 'Username',
            placeholder: 'Enter your username',
            isRequired: true,
            order: 1,
          },
          email: {
            label: 'Email',
            placeholder: 'Enter your email',
            isRequired: true,
            order: 2,
          },
          password: {
            label: 'Password',
            placeholder: 'Enter your password',
            isRequired: true,
            order: 3,
          },
          'custom:language': {
            label: 'Preferred Language',
            placeholder: 'Select your language',
            isRequired: true,
            order: 4,
          },
          'custom:zipcode': {
            label: 'ZIP Code',
            placeholder: 'Enter your ZIP code',
            isRequired: true,
            order: 5,
          },
        },
      }}
    >
      {({ signOut, user }) => (
        <ToastProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/* Accessibility: Skip to main content link */}
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>

            <div className="app-layout">
              {/* Standardized Left Navigation */}
              <StandardizedNavigation signOut={signOut} user={user} />

              {/* Main Content Area */}
              <div className="app-main">
                {/* Top Header */}
                <TopHeader />

                {/* Page Content */}
                <main id="main-content" className="main-content" role="main">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />

                    {/* New standardized routes */}
                    <Route path="/today" element={<Today />} />
                    <Route path="/timeline" element={<Timeline />} />

                    {/* Legacy route mappings for backward compatibility */}
                    <Route path="/tasks" element={<Navigate to="/today" replace />} />
                    <Route path="/actions" element={<Navigate to="/today" replace />} />
                    <Route path="/alerts" element={<Navigate to="/today" replace />} />
                    <Route path="/history" element={<Navigate to="/timeline" replace />} />
                    <Route path="/profile" element={<Navigate to="/settings" replace />} />

                    {/* Existing routes */}
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Profile />} />
                    <Route path="/call" element={<CallInterface />} />
                    <Route path="/family" element={<FamilyManagement />} />
                    <Route path="/medications" element={<Medications />} />
                    <Route path="/emergency" element={<EmergencyHub />} />
                    <Route path="/about" element={<About />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </div>
          </Router>
        </ToastProvider>
      )}
    </Authenticator>
  );
}

export default App;

