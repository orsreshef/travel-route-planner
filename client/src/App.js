/**
 * Main React Application Component
 * Travel Planner - Personal Route Planning Application
 * Author: Or Reshef S
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import LoadingSpinner from './components/Layout/LoadingSpinner';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import RoutePlanningPage from './pages/Routes/RoutePlanningPage';
import RouteHistoryPage from './pages/Routes/RouteHistoryPage';
import RouteDetailsPage from './pages/Routes/RouteDetailsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import AboutPage from './pages/About/AboutPage';

// Services
import { authService } from './services/authService';
import { AuthContext } from './contexts/AuthContext';

// Global error boundary for Leaflet errors
class LeafletErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Map Loading Issue</h2>
            <p className="text-gray-600 mb-4">
              There was an issue loading the map. This is usually temporary.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await authService.verifyToken();
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Protected Route Component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };

  // Public Route Component (redirect if authenticated)
  const PublicRoute = ({ children }) => {
    if (loading) {
      return <LoadingSpinner />;
    }
    
    return !isAuthenticated ? children : <Navigate to="/about" replace />;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const authContextValue = {
    user,
    isAuthenticated,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <LeafletErrorBoundary>
        <Router>
          <div className="App min-h-screen bg-gradient-to-br from-green-50 to-brown-50">
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#10B981',
                  color: '#FFFFFF',
                },
                success: {
                  style: {
                    background: '#10B981',
                  },
                },
                error: {
                  style: {
                    background: '#EF4444',
                  },
                },
              }}
            />

            {/* Navigation */}
            {isAuthenticated && <Navbar />}

            {/* Main Content */}
            <main className={`${isAuthenticated ? 'pt-16' : 'pt-0'} min-h-screen`}>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/routes/plan"
                  element={
                    <ProtectedRoute>
                      <RoutePlanningPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/routes/history"
                  element={
                    <ProtectedRoute>
                      <RouteHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/routes/:id"
                  element={
                    <ProtectedRoute>
                      <RouteDetailsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <ProtectedRoute>
                      <AboutPage />
                    </ProtectedRoute>
                  }
                />

                {/* Default Routes */}
                <Route
                  path="/"
                  element={
                    isAuthenticated ? 
                      <Navigate to="/about" replace /> : 
                      <Navigate to="/login" replace />
                  }
                />
                
                {/* 404 Route */}
                <Route
                  path="*"
                  element={
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-brown-50">
                      <div className="text-center">
                        <h1 className="text-6xl font-bold text-green-600 mb-4">404</h1>
                        <p className="text-xl text-gray-600 mb-8">Page not found</p>
                        <button
                          onClick={() => window.history.back()}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                          Go Back
                        </button>
                      </div>
                    </div>
                  }
                />
              </Routes>
            </main>

            {/* Footer */}
            {isAuthenticated && <Footer />}
          </div>
        </Router>
      </LeafletErrorBoundary>
    </AuthContext.Provider>
  );
}

export default App;